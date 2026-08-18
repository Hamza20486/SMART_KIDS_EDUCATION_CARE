import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasPermission, requireAnyPermission } from "@/lib/permissions";
import { apiError } from "@/lib/api";
import { appUrl, createOpaqueToken } from "@/lib/security-tokens";
import { sendInvitationEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { assertCanAddStaff } from "@/lib/subscriptions/service";

const invitationSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  role: z.enum(["ADMIN", "MANAGER", "TEACHER", "ACCOUNTANT", "PARENT"]),
  parentId: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const user = await requireAnyPermission(["staff.invite", "parents.invite"]);
    const limit = await checkRateLimit("invite", user.id);
    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many invitations" },
        { status: 429, headers: { "retry-after": String(limit.retryAfter) } },
      );
    }
    const input = invitationSchema.parse(await request.json());
    const email = input.email.toLowerCase();
    if (
      input.role === "PARENT"
        ? !hasPermission(user.role, "parents.invite")
        : !hasPermission(user.role, "staff.invite")
    ) {
      return NextResponse.json({ error: "Insufficient permission" }, { status: 403 });
    }
    if (await prisma.user.findUnique({ where: { email } })) {
      return NextResponse.json({ error: "Account already exists" }, { status: 409 });
    }

    const { token, tokenHash } = createOpaqueToken();
    const invitation = await prisma.$transaction(
      async (tx) => {
        if (input.role === "PARENT") {
          if (
            !input.parentId ||
            !(await tx.parent.findFirst({
              where: { id: input.parentId, organizationId: user.organizationId },
            }))
          ) {
            throw new Error("Not found");
          }
        }
        await tx.invitationToken.deleteMany({
          where: {
            organizationId: user.organizationId,
            email,
            usedAt: null,
          },
        });
        if (input.role !== "PARENT") {
          await assertCanAddStaff(user.organizationId, 1, tx);
        }
        const created = await tx.invitationToken.create({
          data: {
            organizationId: user.organizationId,
            email,
            name: input.name,
            role: input.role,
            parentId: input.parentId || null,
            tokenHash,
            expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1_000),
            invitedById: user.id,
          },
        });
        await tx.auditLog.create({
          data: {
            organizationId: user.organizationId,
            userId: user.id,
            action: "INVITE",
            entity: "InvitationToken",
            entityId: created.id,
            metadata: { email, role: input.role },
          },
        });
        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    const organization = await prisma.organization.findUniqueOrThrow({
      where: { id: user.organizationId },
      select: { name: true },
    });
    await sendInvitationEmail(
      email,
      input.name,
      `${appUrl()}/invite/${token}`,
      organization.name,
    );
    return NextResponse.json({ ok: true, invitationId: invitation.id }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
