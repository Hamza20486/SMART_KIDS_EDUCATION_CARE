import { NextResponse } from "next/server";
import { z } from "zod";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { enqueueNotificationEvent } from "@/lib/notifications/outbox";
import { wakeNotificationWorker } from "@/lib/inngest/client";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(8).max(128),
    newPassword: z
      .string()
      .min(12)
      .max(128)
      .regex(/[a-z]/)
      .regex(/[A-Z]/)
      .regex(/[0-9]/),
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "Password must change",
  });

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const limit = await checkRateLimit("login", user.id);
    if (!limit.success) {
      return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
    }
    const input = passwordSchema.parse(await request.json());
    const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!(await compare(input.currentPassword, record.passwordHash))) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 },
      );
    }
    const changedAt = new Date();
    const event = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await hash(input.newPassword, 12),
          mustChangePassword: false,
          sessionVersion: { increment: 1 },
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: "PASSWORD_CHANGE",
          entity: "User",
          entityId: user.id,
        },
      });
      return enqueueNotificationEvent(tx, {
        organizationId: user.organizationId,
        eventKey: `password-changed:${user.id}:${changedAt.toISOString()}`,
        eventType: "account.password_changed",
        aggregateType: "User",
        aggregateId: user.id,
        payload: {
          recipients: [user.id],
          notificationType: "PASSWORD_CHANGED",
          title: "Mot de passe modifié",
          message:
            "Votre mot de passe vient d'être modifié. Contactez l'administration si vous n'êtes pas à l'origine de cette action.",
          entityType: "User",
          entityId: user.id,
        },
      });
    });
    await wakeNotificationWorker(event.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
