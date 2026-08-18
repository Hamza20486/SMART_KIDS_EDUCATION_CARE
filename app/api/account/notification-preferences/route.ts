import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { apiError } from "@/lib/api";
import {
  defaultChannelsFor,
  type NotificationType,
} from "@/lib/notifications/catalog";
import {
  editableNotificationTypes,
  isEditableNotificationType,
} from "@/lib/notifications/preferences";

export async function GET() {
  try {
    const user = await requireUser();
    const saved = await prisma.notificationPreference.findMany({
      where: { organizationId: user.organizationId, userId: user.id },
      select: { type: true, inAppEnabled: true, emailEnabled: true },
    });
    const byType = new Map(saved.map((preference) => [preference.type, preference]));
    return NextResponse.json(
      editableNotificationTypes.map((type) => {
        const preference = byType.get(type);
        const defaults = defaultChannelsFor(type);
        return {
          type,
          inAppEnabled: preference?.inAppEnabled ?? defaults.includes("IN_APP"),
          emailEnabled: preference?.emailEnabled ?? defaults.includes("EMAIL"),
        };
      }),
    );
  } catch (error) {
    return apiError(error);
  }
}

const preferenceSchema = z.object({
  type: z.string(),
  inAppEnabled: z.boolean(),
  emailEnabled: z.boolean(),
});

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const input = preferenceSchema.parse(await request.json());
    if (!isEditableNotificationType(input.type)) {
      return NextResponse.json(
        { error: "This security notification preference cannot be changed" },
        { status: 400 },
      );
    }
    await prisma.notificationPreference.upsert({
      where: {
        organizationId_userId_type: {
          organizationId: user.organizationId,
          userId: user.id,
          type: input.type,
        },
      },
      update: {
        inAppEnabled: input.inAppEnabled,
        emailEnabled: input.emailEnabled,
      },
      create: {
        organizationId: user.organizationId,
        userId: user.id,
        type: input.type as NotificationType,
        inAppEnabled: input.inAppEnabled,
        emailEnabled: input.emailEnabled,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
