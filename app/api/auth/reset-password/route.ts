import { NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/security-tokens";
import { checkRateLimit, requestIdentifier } from "@/lib/rate-limit";
import { enqueueNotificationEvent } from "@/lib/notifications/outbox";
import { wakeNotificationWorker } from "@/lib/inngest/client";

const resetSchema = z.object({
  token: z.string().min(40).max(100),
  password: z
    .string()
    .min(12)
    .max(128)
    .regex(/[a-z]/)
    .regex(/[A-Z]/)
    .regex(/[0-9]/),
});

export async function POST(request: Request) {
  const limit = await checkRateLimit("login", requestIdentifier(request));
  if (!limit.success) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }
  const parsed = resetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  try {
    const tokenHash = hashToken(parsed.data.token);
    const completedAt = new Date();
    const event = await prisma.$transaction(
      async (tx) => {
        const token = await tx.passwordResetToken.findUnique({
          where: { tokenHash },
          include: { user: true },
        });
        if (!token || token.usedAt || token.expiresAt <= new Date() || !token.user.active) {
          throw new Error("Invalid token");
        }
        const consumed = await tx.passwordResetToken.updateMany({
          where: { id: token.id, usedAt: null },
          data: { usedAt: completedAt },
        });
        if (!consumed.count) throw new Error("Used token");
        await tx.user.update({
          where: { id: token.userId },
          data: {
            passwordHash: await hash(parsed.data.password, 12),
            failedLoginCount: 0,
            lockedUntil: null,
            mustChangePassword: false,
            sessionVersion: { increment: 1 },
          },
        });
        await tx.auditLog.create({
          data: {
            organizationId: token.user.organizationId,
            userId: token.userId,
            action: "PASSWORD_RESET_COMPLETE",
            entity: "User",
            entityId: token.userId,
          },
        });
        return enqueueNotificationEvent(tx, {
          organizationId: token.user.organizationId,
          eventKey: `password-reset:${token.userId}:${token.id}`,
          eventType: "account.password_reset",
          aggregateType: "User",
          aggregateId: token.userId,
          payload: {
            recipients: [token.userId],
            notificationType: "PASSWORD_RESET",
            title: "Mot de passe réinitialisé",
            message:
              "Votre mot de passe a été réinitialisé et les anciennes sessions ont été révoquées.",
            entityType: "User",
            entityId: token.userId,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    await wakeNotificationWorker(event.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Lien invalide ou expiré" }, { status: 400 });
  }
}
