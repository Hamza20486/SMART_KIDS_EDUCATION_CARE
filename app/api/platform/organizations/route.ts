import { NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { apiError } from "@/lib/api";
import { subscriptionsRepository } from "@/lib/repositories/subscriptions";

export async function GET() {
  try {
    await requirePermission("platform.manage");
    return NextResponse.json(await subscriptionsRepository.platformOverview());
  } catch (error) {
    return apiError(error);
  }
}

const organizationSchema = z.object({
  name: z.string().min(2),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  city: z.string().min(2),
  adminName: z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(12),
  planCode: z.enum(["ESSENTIAL", "PRO", "PREMIUM"]),
});

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("platform.manage");
    const input = organizationSchema.parse(await request.json());
    const plan = await prisma.subscriptionPlan.findUniqueOrThrow({
      where: { code: input.planCode },
    });
    const organization = await prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: {
          name: input.name,
          slug: input.slug,
          city: input.city,
          country: "MA",
          currency: "MAD",
          timezone: "Africa/Casablanca",
          defaultLanguage: "fr",
        },
      });
      await tx.user.create({
        data: {
          organizationId: created.id,
          name: input.adminName,
          email: input.adminEmail.toLowerCase(),
          passwordHash: await hash(input.adminPassword, 12),
          role: "ADMIN",
          mustChangePassword: true,
        },
      });
      const subscription = await tx.subscription.create({
        data: {
          organizationId: created.id,
          planId: plan.id,
          status: "TRIAL",
          trialEndsAt: new Date(Date.now() + 14 * 86_400_000),
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
        },
      });
      await tx.subscriptionEvent.create({
        data: {
          organizationId: created.id,
          subscriptionId: subscription.id,
          actorUserId: actor.id,
          action: "TRIAL_STARTED",
          toPlanCode: plan.code,
          toStatus: "TRIAL",
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: created.id,
          userId: null,
          action: "ORGANIZATION_CREATE",
          entity: "Organization",
          entityId: created.id,
          metadata: { createdBy: actor.id, planCode: plan.code },
        },
      });
      return created;
    });
    return NextResponse.json(organization, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
