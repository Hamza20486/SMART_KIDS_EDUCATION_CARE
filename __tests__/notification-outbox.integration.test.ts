import { afterAll, beforeAll, describe, expect, it } from "vitest";

const enabled = Boolean(process.env.TEST_DATABASE_URL);
const databaseUrl = process.env.TEST_DATABASE_URL;
const suffix = Math.random().toString(36).slice(2);
type PrismaTestClient = InstanceType<
  (typeof import("@prisma/client"))["PrismaClient"]
>;
let client: PrismaTestClient | null = null;
let role = "";
let organizationA = "";
let organizationB = "";
let userA = "";
let userB = "";
let outboxEventId = "";

describe.skipIf(!enabled)("notification outbox integration", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl;
    const { PrismaClient } = await import("@prisma/client");
    client = new PrismaClient({ datasourceUrl: databaseUrl });
    role = `NOTIFY_TEST_${suffix}`;
    await client.role.create({
      data: { code: role, name: "Notification test", permissions: [] },
    });
    const [a, b] = await Promise.all([
      client.organization.create({
        data: { name: "Notify A", slug: `notify-a-${suffix}` },
      }),
      client.organization.create({
        data: { name: "Notify B", slug: `notify-b-${suffix}` },
      }),
    ]);
    organizationA = a.id;
    organizationB = b.id;
    const [first, second] = await Promise.all([
      client.user.create({
        data: {
          organizationId: organizationA,
          role,
          name: "Parent A",
          email: `notify-a-${suffix}@example.test`,
          passwordHash: "unused",
        },
      }),
      client.user.create({
        data: {
          organizationId: organizationB,
          role,
          name: "Parent B",
          email: `notify-b-${suffix}@example.test`,
          passwordHash: "unused",
        },
      }),
    ]);
    userA = first.id;
    userB = second.id;
    const event = await client.outboxEvent.create({
      data: {
        organizationId: organizationA,
        eventKey: `integration-notification:${suffix}`,
        type: "homework.published",
        aggregateType: "Homework",
        aggregateId: `homework-${suffix}`,
        payload: {
          recipients: [userA, userB],
          notificationType: "HOMEWORK_PUBLISHED",
          title: "Test homework",
          message: "Test message",
          entityType: "Homework",
          entityId: `homework-${suffix}`,
        },
      },
    });
    outboxEventId = event.id;
  });

  afterAll(async () => {
    if (!client) return;
    await client.organization.deleteMany({
      where: { id: { in: [organizationA, organizationB] } },
    });
    await client.role.deleteMany({ where: { code: role } });
    await client.$disconnect();
  });

  it("materializes one tenant-safe, idempotent notification", async () => {
    const { processOutboxEvent } = await import("@/lib/notifications/processor");
    const first = await processOutboxEvent(outboxEventId);
    const second = await processOutboxEvent(outboxEventId);
    expect(first).toMatchObject({ claimed: true, notifications: 1 });
    expect(second).toMatchObject({ claimed: false, notifications: 0 });
    expect(
      await client!.notification.count({
        where: { organizationId: organizationA, userId: userA },
      }),
    ).toBe(1);
    expect(
      await client!.notification.count({
        where: { organizationId: organizationA, userId: userB },
      }),
    ).toBe(0);
    expect(
      await client!.notificationDelivery.count({
        where: { organizationId: organizationA, channel: "IN_APP" },
      }),
    ).toBe(1);
  });
});
