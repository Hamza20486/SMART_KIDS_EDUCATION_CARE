import { afterAll, beforeAll, describe, expect, it } from "vitest";

const enabled = Boolean(process.env.TEST_DATABASE_URL);
const databaseUrl = process.env.TEST_DATABASE_URL;
const suffix = Math.random().toString(36).slice(2);
type PrismaTestClient = InstanceType<
  (typeof import("@prisma/client"))["PrismaClient"]
>;
let client: PrismaTestClient | null = null;
let organizationId = "";
let planId = "";

describe.skipIf(!enabled)("subscription limits integration", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl;
    const { PrismaClient } = await import("@prisma/client");
    client = new PrismaClient({ datasourceUrl: databaseUrl });
    const plan = await client.subscriptionPlan.create({
      data: {
        code: `LIMIT_${suffix}`,
        name: "Limit test",
        priceCentimes: 100,
        features: {
          maxChildren: 1,
          maxStaff: 1,
          storageMb: 1,
          activityMedia: false,
          homework: false,
          advancedCommunication: false,
          basicReports: true,
          advancedReports: false,
        },
      },
    });
    planId = plan.id;
    const organization = await client.organization.create({
      data: { name: "Limit tenant", slug: `limit-${suffix}` },
    });
    organizationId = organization.id;
    await client.subscription.create({
      data: {
        organizationId,
        planId,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 86_400_000),
      },
    });
    await client.child.create({
      data: {
        organizationId,
        firstName: "One",
        lastName: "Child",
        birthDate: new Date("2022-01-01"),
      },
    });
  });

  afterAll(async () => {
    if (!client) return;
    await client.organization.deleteMany({ where: { id: organizationId } });
    await client.subscriptionPlan.deleteMany({ where: { id: planId } });
    await client.$disconnect();
  });

  it("denies a projected child above the configured plan limit", async () => {
    const { assertCanAddChildren } = await import("@/lib/subscriptions/service");
    await expect(assertCanAddChildren(organizationId, 1)).rejects.toThrow(
      "subscription child limit",
    );
  });
});
