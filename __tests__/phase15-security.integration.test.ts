import { afterAll, beforeAll, describe, expect, it } from "vitest";

const enabled = Boolean(process.env.TEST_DATABASE_URL);
const databaseUrl = process.env.TEST_DATABASE_URL;
const suffix = Math.random().toString(36).slice(2);
type PrismaTestClient = InstanceType<
  (typeof import("@prisma/client"))["PrismaClient"]
>;
let client: PrismaTestClient | null = null;
let organizationA = "";
let organizationB = "";
let suspendedOrganization = "";
let parentA = "";
let childA = "";
let childB = "";
let childUnassigned = "";
let classA = "";
let classUnassigned = "";
let teacherA = "";
let teacherB = "";
let accountantA = "";
let paymentA = "";

function context(input: {
  id: string;
  organizationId: string;
  role: string;
  parentId?: string | null;
  authorizedClassIds?: string[] | null;
}) {
  return {
    id: input.id,
    userId: input.id,
    organizationId: input.organizationId,
    role: input.role,
    name: "Integration user",
    email: `${input.id}@example.test`,
    parentId: input.parentId ?? null,
    authorizedClassIds: input.authorizedClassIds ?? null,
    subscriptionStatus: "ACTIVE",
    planCode: "PRO",
  };
}

describe.skipIf(!enabled)("Phase 15 PostgreSQL security and transaction integration", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl;
    const { PrismaClient } = await import("@prisma/client");
    client = new PrismaClient({ datasourceUrl: databaseUrl });
    for (const code of ["ADMIN", "TEACHER", "ACCOUNTANT", "PARENT"]) {
      await client.role.upsert({
        where: { code },
        update: {},
        create: { code, name: code, permissions: [] },
      });
    }
    const [orgA, orgB, suspended] = await Promise.all([
      client.organization.create({
        data: { name: "Integration A", slug: `integration-a-${suffix}` },
      }),
      client.organization.create({
        data: { name: "Integration B", slug: `integration-b-${suffix}` },
      }),
      client.organization.create({
        data: { name: "Suspended integration", slug: `integration-s-${suffix}` },
      }),
    ]);
    organizationA = orgA.id;
    organizationB = orgB.id;
    suspendedOrganization = suspended.id;

    const [assigned, unassigned, otherClass] = await Promise.all([
      client.classRoom.create({
        data: { organizationId: organizationA, name: `Assigned ${suffix}` },
      }),
      client.classRoom.create({
        data: { organizationId: organizationA, name: `Unassigned ${suffix}` },
      }),
      client.classRoom.create({
        data: { organizationId: organizationB, name: `Other ${suffix}` },
      }),
    ]);
    classA = assigned.id;
    classUnassigned = unassigned.id;

    const [teacher, foreignTeacher, accountant, parentUserA, parentUserB] =
      await Promise.all([
        client.user.create({
          data: {
            organizationId: organizationA,
            role: "TEACHER",
            name: "Teacher A",
            email: `teacher-a-${suffix}@example.test`,
            passwordHash: "unused",
          },
        }),
        client.user.create({
          data: {
            organizationId: organizationB,
            role: "TEACHER",
            name: "Teacher B",
            email: `teacher-b-${suffix}@example.test`,
            passwordHash: "unused",
          },
        }),
        client.user.create({
          data: {
            organizationId: organizationA,
            role: "ACCOUNTANT",
            name: "Accountant A",
            email: `accountant-a-${suffix}@example.test`,
            passwordHash: "unused",
          },
        }),
        client.user.create({
          data: {
            organizationId: organizationA,
            role: "PARENT",
            name: "Parent A",
            email: `parent-a-${suffix}@example.test`,
            passwordHash: "unused",
          },
        }),
        client.user.create({
          data: {
            organizationId: organizationB,
            role: "PARENT",
            name: "Parent B",
            email: `parent-b-${suffix}@example.test`,
            passwordHash: "unused",
          },
        }),
      ]);
    teacherA = teacher.id;
    teacherB = foreignTeacher.id;
    accountantA = accountant.id;
    await client.classTeacher.create({
      data: {
        organizationId: organizationA,
        classId: classA,
        teacherId: teacherA,
      },
    });

    const [profileA, profileB] = await Promise.all([
      client.parent.create({
        data: {
          organizationId: organizationA,
          userId: parentUserA.id,
          firstName: "Parent",
          lastName: "A",
          phone: `a-${suffix}`,
        },
      }),
      client.parent.create({
        data: {
          organizationId: organizationB,
          userId: parentUserB.id,
          firstName: "Parent",
          lastName: "B",
          phone: `b-${suffix}`,
        },
      }),
    ]);
    parentA = profileA.id;

    const [firstChild, secondChild, unassignedChild] = await Promise.all([
      client.child.create({
        data: {
          organizationId: organizationA,
          classId: classA,
          firstName: "Child",
          lastName: "A",
          birthDate: new Date("2022-01-01"),
          allergies: "Private medical detail",
        },
      }),
      client.child.create({
        data: {
          organizationId: organizationB,
          classId: otherClass.id,
          firstName: "Child",
          lastName: "B",
          birthDate: new Date("2022-01-01"),
        },
      }),
      client.child.create({
        data: {
          organizationId: organizationA,
          classId: classUnassigned,
          firstName: "Unassigned",
          lastName: "Child",
          birthDate: new Date("2022-01-01"),
        },
      }),
    ]);
    childA = firstChild.id;
    childB = secondChild.id;
    childUnassigned = unassignedChild.id;
    await Promise.all([
      client.parentChild.create({
        data: {
          organizationId: organizationA,
          parentId: profileA.id,
          childId: childA,
          canViewPayments: true,
        },
      }),
      client.parentChild.create({
        data: {
          organizationId: organizationB,
          parentId: profileB.id,
          childId: childB,
          canViewPayments: true,
        },
      }),
    ]);

    const payment = await client.payment.create({
      data: {
        organizationId: organizationA,
        parentId: profileA.id,
        childId: childA,
        grossAmountCentimes: 10_000,
        discountCentimes: 0,
        amountCentimes: 10_000,
        dueDate: new Date("2026-09-01"),
        status: "PENDING",
      },
    });
    paymentA = payment.id;

    const plan = await client.subscriptionPlan.upsert({
      where: { code: `INTEGRATION_${suffix}` },
      update: {},
      create: {
        code: `INTEGRATION_${suffix}`,
        name: "Integration plan",
        priceCentimes: 100,
        features: {
          maxChildren: 10,
          maxStaff: 10,
          storageMb: 10,
          activityMedia: true,
          homework: true,
          advancedCommunication: true,
          basicReports: true,
          advancedReports: false,
        },
      },
    });
    await client.subscription.create({
      data: {
        organizationId: suspendedOrganization,
        planId: plan.id,
        status: "SUSPENDED",
        currentPeriodStart: new Date("2026-08-01"),
        currentPeriodEnd: new Date("2026-09-01"),
      },
    });
  });

  afterAll(async () => {
    if (!client) return;
    await client.organization.deleteMany({
      where: {
        id: {
          in: [organizationA, organizationB, suspendedOrganization],
        },
      },
    });
    await client.subscriptionPlan.deleteMany({
      where: { code: `INTEGRATION_${suffix}` },
    });
    await client.$disconnect();
  });

  it("tenant repositories never return Organization B data to Organization A", async () => {
    const { childrenRepository } = await import("@/lib/repositories/children");
    const rows = await childrenRepository.list(
      context({ id: accountantA, organizationId: organizationA, role: "ADMIN" }),
    );
    expect(rows.map((row) => row.id)).toContain(childA);
    expect(rows.map((row) => row.id)).not.toContain(childB);
    expect(rows.every((row) => row.organizationId === organizationA)).toBe(true);
  });

  it("Parent A cannot read Parent B's child", async () => {
    const { childrenRepository } = await import("@/lib/repositories/children");
    const parentContext = context({
      id: "parent-user-a",
      organizationId: organizationA,
      role: "PARENT",
      parentId: parentA,
    });
    await expect(
      childrenRepository.assertAccessible(parentContext, childB),
    ).rejects.toThrow("Child unavailable");
    await expect(
      childrenRepository.assertAccessible(parentContext, childA),
    ).resolves.toMatchObject({ id: childA });
  });

  it("teachers can read assigned children but not unassigned classes", async () => {
    const { childrenRepository } = await import("@/lib/repositories/children");
    const teacherContext = context({
      id: teacherA,
      organizationId: organizationA,
      role: "TEACHER",
      authorizedClassIds: [classA],
    });
    await expect(
      childrenRepository.assertAccessible(teacherContext, childA),
    ).resolves.toMatchObject({ id: childA });
    await expect(
      childrenRepository.assertAccessible(teacherContext, childUnassigned),
    ).rejects.toThrow("Child unavailable");
  });

  it("database constraints reject cross-tenant parent and teacher links", async () => {
    await expect(
      client!.parentChild.create({
        data: {
          organizationId: organizationA,
          parentId: parentA,
          childId: childB,
        },
      }),
    ).rejects.toThrow();
    await expect(
      client!.classTeacher.create({
        data: {
          organizationId: organizationA,
          classId: classA,
          teacherId: teacherB,
        },
      }),
    ).rejects.toThrow();
  });

  it("rolls back all writes when a transaction fails", async () => {
    await expect(
      client!.$transaction(async (tx) => {
        await tx.paymentTransaction.create({
          data: {
            organizationId: organizationA,
            paymentId: paymentA,
            amountCentimes: 1_000,
            method: "CASH",
            recordedById: accountantA,
          },
        });
        throw new Error("force rollback");
      }),
    ).rejects.toThrow("force rollback");
    await expect(
      client!.paymentTransaction.count({ where: { paymentId: paymentA } }),
    ).resolves.toBe(0);
  });

  it("reconciles partial and full financial transactions atomically", async () => {
    const { paymentStatus } = await import("@/lib/payments");
    await client!.$transaction(async (tx) => {
      await tx.paymentTransaction.createMany({
        data: [
          {
            organizationId: organizationA,
            paymentId: paymentA,
            amountCentimes: 4_000,
            method: "CASH",
            recordedById: accountantA,
          },
          {
            organizationId: organizationA,
            paymentId: paymentA,
            amountCentimes: 6_000,
            method: "BANK_TRANSFER",
            recordedById: accountantA,
          },
        ],
      });
      const total = await tx.paymentTransaction.aggregate({
        where: { paymentId: paymentA, organizationId: organizationA },
        _sum: { amountCentimes: true },
      });
      await tx.payment.update({
        where: { id: paymentA },
        data: {
          status: paymentStatus(
            10_000,
            total._sum.amountCentimes ?? 0,
            new Date("2026-09-01"),
            new Date("2026-08-17"),
          ),
          paidAt: new Date(),
        },
      });
    });
    const reconciled = await client!.payment.findUniqueOrThrow({
      where: { id: paymentA },
      include: { transactions: true },
    });
    expect(reconciled.status).toBe("PAID");
    expect(
      reconciled.transactions.reduce(
        (total, transaction) => total + transaction.amountCentimes,
        0,
      ),
    ).toBe(reconciled.amountCentimes);
  });

  it("treats suspended subscriptions as unusable", async () => {
    const { getActiveSubscription } = await import("@/lib/subscriptions/service");
    await expect(
      getActiveSubscription(suspendedOrganization, client as never),
    ).resolves.toBeNull();
  });
});
