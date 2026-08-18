import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { apiError } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get("unread") === "true";
    const take = Math.min(100, Math.max(1, Number(url.searchParams.get("take")) || 50));
    const where = {
      organizationId: user.organizationId,
      userId: user.id,
      ...(unreadOnly ? { readAt: null } : {}),
      deliveries: {
        some: { channel: "IN_APP" as const, status: "DELIVERED" as const },
      },
    };
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          entityType: true,
          entityId: true,
          readAt: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({
        where: {
          organizationId: user.organizationId,
          userId: user.id,
          readAt: null,
          deliveries: {
            some: { channel: "IN_APP", status: "DELIVERED" },
          },
        },
      }),
    ]);
    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    return apiError(error);
  }
}

const readSchema = z
  .object({
    ids: z.array(z.string().min(1)).min(1).max(100).optional(),
    all: z.boolean().optional(),
  })
  .refine((value) => value.all || value.ids?.length, {
    message: "Notification IDs or all=true are required",
  });

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const input = readSchema.parse(await request.json());
    const result = await prisma.notification.updateMany({
      where: {
        organizationId: user.organizationId,
        userId: user.id,
        readAt: null,
        ...(input.all ? {} : { id: { in: input.ids } }),
      },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ ok: true, updated: result.count });
  } catch (error) {
    return apiError(error);
  }
}
