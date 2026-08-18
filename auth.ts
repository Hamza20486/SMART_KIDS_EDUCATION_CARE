import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import authConfig from "./auth.config";
import { prisma } from "./lib/prisma";
import { checkRateLimit, requestIdentifier } from "./lib/rate-limit";
import { enqueueNotificationEvent } from "./lib/notifications/outbox";
import { wakeNotificationWorker } from "./lib/inngest/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw, request) {
        const parsed = z
          .object({
            email: z.string().email(),
            password: z.string().min(8).max(128),
          })
          .safeParse(raw);
        if (!parsed.success) return null;
        const limit = await checkRateLimit(
          "login",
          requestIdentifier(request, parsed.data.email),
        );
        if (!limit.success) return null;

        const user = await prisma.user.findFirst({
          where: {
            email: parsed.data.email.toLowerCase(),
            active: true,
            organization: { active: true },
          },
        });
        if (!user) return null;
        if (user.lockedUntil && user.lockedUntil > new Date()) return null;

        if (!(await compare(parsed.data.password, user.passwordHash))) {
          const count = user.failedLoginCount + 1;
          const lockedUntil = count >= 5 ? new Date(Date.now() + 15 * 60 * 1_000) : null;
          const eventId = await prisma.$transaction(async (tx) => {
            await tx.user.update({
              where: { id: user.id },
              data: { failedLoginCount: count, lockedUntil },
            });
            await tx.auditLog.create({
              data: {
                organizationId: user.organizationId,
                userId: user.id,
                action: "LOGIN_FAILURE",
                entity: "User",
                entityId: user.id,
                metadata: { locked: count >= 5 },
              },
            });
            if (!lockedUntil) return null;
            const event = await enqueueNotificationEvent(tx, {
              organizationId: user.organizationId,
              eventKey: `account-locked:${user.id}:${lockedUntil.toISOString()}`,
              eventType: "account.locked",
              aggregateType: "User",
              aggregateId: user.id,
              payload: {
                recipients: [user.id],
                notificationType: "ACCOUNT_LOCKED",
                title: "Compte temporairement verrouillé",
                message:
                  "Votre compte a été verrouillé pendant 15 minutes après plusieurs tentatives de connexion.",
                entityType: "User",
                entityId: user.id,
              },
            });
            return event.id;
          });
          if (eventId) await wakeNotificationWorker(eventId);
          return null;
        }

        await prisma.$transaction([
          prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount: 0,
              lockedUntil: null,
              lastLoginAt: new Date(),
            },
          }),
          prisma.auditLog.create({
            data: {
              organizationId: user.organizationId,
              userId: user.id,
              action: "LOGIN_SUCCESS",
              entity: "User",
              entityId: user.id,
            },
          }),
        ]);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
});
