import { NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { hashToken } from "@/lib/security-tokens";
import { checkRateLimit, requestIdentifier } from "@/lib/rate-limit";
import {
  assertCanAddStaff,
  requireActiveSubscription,
} from "@/lib/subscriptions/service";

const password = z
  .string()
  .min(12)
  .max(128)
  .regex(/[a-z]/)
  .regex(/[A-Z]/)
  .regex(/[0-9]/);
const acceptanceSchema = z.object({
  token: z.string().min(40).max(100),
  password,
  name: z.string().min(2).max(100).optional(),
});

export async function POST(request: Request) {
  try {
    const limit = await checkRateLimit("login", requestIdentifier(request));
    if (!limit.success) {
      return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
    }
    const input = acceptanceSchema.parse(await request.json());
    const tokenHash = hashToken(input.token);
    const result = await prisma.$transaction(
      async (tx) => {
        const invitation = await tx.invitationToken.findUnique({ where: { tokenHash } });
        if (!invitation || invitation.usedAt || invitation.expiresAt <= new Date()) {
          throw new Error("Invalid or expired invitation");
        }
        await requireActiveSubscription(invitation.organizationId, tx);
        if (await tx.user.findUnique({ where: { email: invitation.email } })) {
          throw new Error("Account already exists");
        }
        if (invitation.role !== "PARENT") {
          // The pending invitation is already included in projected usage.
          await assertCanAddStaff(invitation.organizationId, 0, tx);
        }
        const user = await tx.user.create({
          data: {
            organizationId: invitation.organizationId,
            email: invitation.email,
            name: input.name || invitation.name,
            role: invitation.role,
            passwordHash: await hash(input.password, 12),
            emailVerifiedAt: new Date(),
            active: true,
          },
        });
        if (invitation.parentId) {
          const updated = await tx.parent.updateMany({
            where: {
              id: invitation.parentId,
              organizationId: invitation.organizationId,
              userId: null,
            },
            data: { userId: user.id, email: invitation.email },
          });
          if (!updated.count) throw new Error("Parent profile unavailable");
        }
        const consumed = await tx.invitationToken.updateMany({
          where: { id: invitation.id, usedAt: null },
          data: { usedAt: new Date() },
        });
        if (!consumed.count) throw new Error("Invitation already used");
        await tx.auditLog.create({
          data: {
            organizationId: invitation.organizationId,
            userId: user.id,
            action: "INVITATION_ACCEPT",
            entity: "User",
            entityId: user.id,
          },
        });
        return user;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return NextResponse.json({ ok: true, userId: result.id }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      [
        "Invalid or expired invitation",
        "Account already exists",
        "Parent profile unavailable",
        "Invitation already used",
      ].includes(error.message)
    ) {
      return NextResponse.json(
        { error: "Invitation invalide ou expirée" },
        { status: 400 },
      );
    }
    return apiError(error);
  }
}
