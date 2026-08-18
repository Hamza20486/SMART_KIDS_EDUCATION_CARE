import { describe, expect, it, vi } from "vitest";
import {
  operationalStaffUserIds,
  parentUserIdsByChild,
  parentUserIdsForChildren,
} from "@/lib/notifications/recipients";
import { enqueueNotificationEvent } from "@/lib/notifications/outbox";
import {
  editableNotificationTypes,
  isEditableNotificationType,
} from "@/lib/notifications/preferences";
import {
  defaultChannelsFor,
  notificationPayloadSchema,
} from "@/lib/notifications/catalog";

describe("notification recipient and outbox services", () => {
  it("short-circuits empty child recipient lookups", async () => {
    const parent = { findMany: vi.fn() };
    await expect(
      parentUserIdsForChildren({ parent } as never, "org-a", []),
    ).resolves.toEqual([]);
    await expect(
      parentUserIdsByChild({ parent } as never, "org-a", []),
    ).resolves.toEqual(new Map());
    expect(parent.findMany).not.toHaveBeenCalled();
  });

  it("deduplicates active parent users at the tenant boundary", async () => {
    const parent = {
      findMany: vi.fn().mockResolvedValue([
        { userId: "user-a" },
        { userId: "user-a" },
        { userId: "user-b" },
        { userId: null },
      ]),
    };
    await expect(
      parentUserIdsForChildren(
        { parent } as never,
        "org-a",
        ["child-a", "child-b"],
      ),
    ).resolves.toEqual(["user-a", "user-b"]);
    expect(parent.findMany.mock.calls[0][0].where).toMatchObject({
      organizationId: "org-a",
      active: true,
      children: {
        some: {
          childId: { in: ["child-a", "child-b"] },
          canReceiveNotifications: true,
        },
      },
    });
  });

  it("groups and deduplicates recipients independently by child", async () => {
    const parent = {
      findMany: vi.fn().mockResolvedValue([
        {
          userId: "user-a",
          children: [{ childId: "child-a" }, { childId: "child-b" }],
        },
        { userId: "user-a", children: [{ childId: "child-a" }] },
        { userId: "user-b", children: [{ childId: "child-a" }] },
      ]),
    };
    const result = await parentUserIdsByChild(
      { parent } as never,
      "org-a",
      ["child-a", "child-b"],
    );
    expect(result.get("child-a")).toEqual(["user-a", "user-b"]);
    expect(result.get("child-b")).toEqual(["user-a"]);
  });

  it("selects active operational administrators and managers", async () => {
    const user = {
      findMany: vi.fn().mockResolvedValue([{ id: "admin-a" }, { id: "manager-a" }]),
    };
    await expect(
      operationalStaffUserIds({ user } as never, "org-a"),
    ).resolves.toEqual(["admin-a", "manager-a"]);
    expect(user.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org-a",
        active: true,
        role: { in: ["ADMIN", "MANAGER"] },
      },
      select: { id: true },
    });
  });

  it("validates, deduplicates, and writes an idempotent outbox event", async () => {
    const upsert = vi.fn().mockResolvedValue({ id: "event-a", status: "PENDING" });
    const availableAt = new Date("2026-08-18T00:00:00.000Z");
    const result = await enqueueNotificationEvent(
      { outboxEvent: { upsert } } as never,
      {
        organizationId: "org-a",
        eventKey: "homework-a:published",
        eventType: "homework.published",
        aggregateType: "Homework",
        aggregateId: "homework-a",
        availableAt,
        payload: {
          recipients: ["user-a", "user-a"],
          notificationType: "HOMEWORK_PUBLISHED",
          title: " Nouveau devoir ",
          message: " Consultez le devoir. ",
        },
      },
    );
    expect(result).toEqual({ id: "event-a", status: "PENDING" });
    expect(upsert).toHaveBeenCalledWith({
      where: { eventKey: "homework-a:published" },
      update: {},
      create: expect.objectContaining({
        organizationId: "org-a",
        eventKey: "homework-a:published",
        availableAt,
        payload: expect.objectContaining({
          recipients: ["user-a"],
          title: "Nouveau devoir",
          message: "Consultez le devoir.",
        }),
      }),
      select: { id: true, status: true },
    });
  });

  it("rejects invalid outbox payloads before database writes", async () => {
    const upsert = vi.fn();
    await expect(
      enqueueNotificationEvent(
        { outboxEvent: { upsert } } as never,
        {
          organizationId: "org-a",
          eventKey: "invalid",
          eventType: "invalid",
          aggregateType: "Test",
          aggregateId: "test-a",
          payload: {
            recipients: [],
            notificationType: "ANNOUNCEMENT",
            title: "Title",
            message: "Message",
          },
        },
      ),
    ).rejects.toThrow();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("defines default channels and protects security preferences", () => {
    expect(defaultChannelsFor("HOMEWORK_PUBLISHED")).toEqual(["IN_APP"]);
    expect(defaultChannelsFor("PAYMENT_DUE")).toEqual(["IN_APP", "EMAIL"]);
    expect(editableNotificationTypes).not.toContain("PASSWORD_RESET");
    expect(isEditableNotificationType("ANNOUNCEMENT")).toBe(true);
    expect(isEditableNotificationType("PASSWORD_RESET")).toBe(false);
    expect(isEditableNotificationType("UNKNOWN")).toBe(false);
  });

  it("enforces payload recipient and channel boundaries", () => {
    expect(
      notificationPayloadSchema.safeParse({
        recipients: ["user-a"],
        notificationType: "ANNOUNCEMENT",
        title: "Title",
        message: "Message",
        channels: ["SMS"],
      }).success,
    ).toBe(false);
    expect(
      notificationPayloadSchema.safeParse({
        recipients: Array.from({ length: 2_001 }, (_, index) => `user-${index}`),
        notificationType: "ANNOUNCEMENT",
        title: "Title",
        message: "Message",
      }).success,
    ).toBe(false);
  });
});
