import { describe, expect, it } from "vitest";
import {
  deliveryBackoffSeconds,
  deliveryChannels,
  notificationPayloadSchema,
} from "@/lib/notifications/catalog";

 describe("durable notification rules", () => {
  it("deduplicates recipients at the event boundary", () => {
    const payload = notificationPayloadSchema.parse({
      recipients: ["parent-1", "parent-1", "parent-2"],
      notificationType: "HOMEWORK_PUBLISHED",
      title: "Nouveau devoir",
      message: "Un nouveau devoir est disponible.",
    });
    expect(payload.recipients).toEqual(["parent-1", "parent-2"]);
  });

  it("respects preferences for ordinary notifications", () => {
    expect(
      deliveryChannels({
        type: "ANNOUNCEMENT",
        inAppEnabled: true,
        emailEnabled: false,
      }),
    ).toEqual(["IN_APP"]);
  });

  it("cannot disable critical account-security notifications", () => {
    expect(
      deliveryChannels({
        type: "PASSWORD_RESET",
        inAppEnabled: false,
        emailEnabled: false,
      }),
    ).toEqual(["IN_APP", "EMAIL"]);
  });

  it("uses capped exponential retry delays", () => {
    expect(deliveryBackoffSeconds(1)).toBe(30);
    expect(deliveryBackoffSeconds(2)).toBe(60);
    expect(deliveryBackoffSeconds(20)).toBe(3_600);
  });
});
