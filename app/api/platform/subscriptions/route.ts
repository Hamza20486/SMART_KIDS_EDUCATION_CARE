import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { apiError } from "@/lib/api";
import {
  addMonths,
  nextMonthlyPeriodStart,
} from "@/lib/subscriptions/plans";
import { enqueueNotificationEvent } from "@/lib/notifications/outbox";
import { wakeNotificationWorker } from "@/lib/inngest/client";

const lifecycleSchema = z.object({
  organizationId: z.string(),
  action: z.enum([
    "START_TRIAL",
    "ACTIVATE",
    "RENEW",
    "CHANGE_PLAN",
    "MARK_PAST_DUE",
    "SUSPEND",
    "CANCEL",
  ]),
  planCode: z.enum(["ESSENTIAL", "PRO", "PREMIUM"]).optional(),
  periodMonths: z.coerce.number().int().min(1).max(24).default(1),
  trialDays: z.coerce.number().int().min(1).max(90).default(14),
  reason: z.string().max(500).optional(),
});

export async function PATCH(request: Request) {
  try {
    const actor = await requirePermission("platform.manage");
    const input = lifecycleSchema.parse(await request.json());
    const organization = await prisma.organization.findFirst({
      where: { id: input.organizationId, slug: { not: "platform" } },
      select: { id: true },
    });
    if (!organization) throw new Error("Not found");
    const current = await prisma.subscription.findFirst({
      where: { organizationId: input.organizationId },
      include: { plan: true },
      orderBy: { updatedAt: "desc" },
    });
    const actionCanChangePlan = [
      "START_TRIAL",
      "ACTIVATE",
      "RENEW",
      "CHANGE_PLAN",
    ].includes(input.action);
    const planCode = actionCanChangePlan
      ? input.planCode ?? current?.plan.code
      : current?.plan.code;
    if (!planCode) {
      return NextResponse.json({ error: "A plan is required" }, { status: 400 });
    }
    const plan = await prisma.subscriptionPlan.findUniqueOrThrow({
      where: { code: planCode },
    });
    if (!current && !["START_TRIAL", "ACTIVATE"].includes(input.action)) {
      return NextResponse.json(
        { error: "The organization has no subscription to update" },
        { status: 409 },
      );
    }

    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      let subscription;
      if (!current) {
        const isTrial = input.action === "START_TRIAL";
        subscription = await tx.subscription.create({
          data: {
            organizationId: input.organizationId,
            planId: plan.id,
            status: isTrial ? "TRIAL" : "ACTIVE",
            trialEndsAt: isTrial
              ? new Date(now.getTime() + input.trialDays * 86_400_000)
              : null,
            currentPeriodStart: now,
            currentPeriodEnd: isTrial
              ? new Date(now.getTime() + input.trialDays * 86_400_000)
              : addMonths(now, input.periodMonths),
          },
        });
      } else {
        const data: {
          planId?: string;
          status?: string;
          trialEndsAt?: Date | null;
          currentPeriodStart?: Date;
          currentPeriodEnd?: Date;
          suspendedAt?: Date | null;
          cancelledAt?: Date | null;
        } = {};
        if (input.action === "CHANGE_PLAN") data.planId = plan.id;
        if (input.action === "START_TRIAL") {
          data.planId = plan.id;
          data.status = "TRIAL";
          data.trialEndsAt = new Date(now.getTime() + input.trialDays * 86_400_000);
          data.currentPeriodStart = now;
          data.currentPeriodEnd = data.trialEndsAt;
          data.suspendedAt = null;
          data.cancelledAt = null;
        }
        if (input.action === "ACTIVATE") {
          data.planId = plan.id;
          data.status = "ACTIVE";
          data.trialEndsAt = null;
          data.currentPeriodStart = now;
          data.currentPeriodEnd = addMonths(now, input.periodMonths);
          data.suspendedAt = null;
          data.cancelledAt = null;
        }
        if (input.action === "RENEW") {
          const start = nextMonthlyPeriodStart(current.currentPeriodEnd, now);
          data.planId = plan.id;
          data.status = "ACTIVE";
          data.trialEndsAt = null;
          data.currentPeriodStart = start;
          data.currentPeriodEnd = addMonths(start, input.periodMonths);
          data.suspendedAt = null;
          data.cancelledAt = null;
        }
        if (input.action === "MARK_PAST_DUE") data.status = "PAST_DUE";
        if (input.action === "SUSPEND") {
          data.status = "SUSPENDED";
          data.suspendedAt = now;
        }
        if (input.action === "CANCEL") {
          data.status = "CANCELLED";
          data.cancelledAt = now;
        }
        subscription = await tx.subscription.update({
          where: { id: current.id },
          data,
        });
      }

      const lifecycleEvent = await tx.subscriptionEvent.create({
        data: {
          organizationId: input.organizationId,
          subscriptionId: subscription.id,
          actorUserId: actor.id,
          action: input.action,
          fromPlanCode: current?.plan.code,
          toPlanCode: plan.code,
          fromStatus: current?.status,
          toStatus: subscription.status,
          metadata: input.reason ? { reason: input.reason } : undefined,
        },
      });
      const administrators = await tx.user.findMany({
        where: {
          organizationId: input.organizationId,
          active: true,
          role: "ADMIN",
        },
        select: { id: true },
      });
      const notificationEvent = administrators.length
        ? await enqueueNotificationEvent(tx, {
            organizationId: input.organizationId,
            eventKey: `subscription-change:${lifecycleEvent.id}`,
            eventType: "subscription.changed",
            aggregateType: "Subscription",
            aggregateId: subscription.id,
            payload: {
              recipients: administrators.map((administrator) => administrator.id),
              notificationType: "SUBSCRIPTION_STATUS",
              title: "Abonnement mis à jour",
              message: `Plan ${plan.name} — statut ${subscription.status}.`,
              entityType: "Subscription",
              entityId: subscription.id,
              channels: ["IN_APP", "EMAIL"],
            },
          })
        : null;
      await tx.auditLog.create({
        data: {
          organizationId: input.organizationId,
          userId: actor.id,
          action: `SUBSCRIPTION_${input.action}`,
          entity: "Subscription",
          entityId: subscription.id,
          metadata: {
            fromPlanCode: current?.plan.code ?? null,
            toPlanCode: plan.code,
            fromStatus: current?.status ?? null,
            toStatus: subscription.status,
            reason: input.reason ?? null,
          },
        },
      });
      return { subscription, notificationEventId: notificationEvent?.id ?? null };
    });
    if (updated.notificationEventId) {
      await wakeNotificationWorker(updated.notificationEventId);
    }
    return NextResponse.json(updated.subscription);
  } catch (error) {
    return apiError(error);
  }
}
