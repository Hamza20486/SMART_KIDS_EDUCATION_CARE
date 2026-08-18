import { afterAll, beforeAll, describe, expect, it } from "vitest";

const enabled = Boolean(process.env.TEST_DATABASE_URL);
const suffix = Math.random().toString(36).slice(2);
type PrismaTestClient = InstanceType<
  (typeof import("@prisma/client"))["PrismaClient"]
>;
let prisma: PrismaTestClient | null = null;
let orgA = "";
let orgB = "";
let parentA = "";
let childB = "";
let classA = "";
let teacherB = "";
let role = "";

describe.skipIf(!enabled)("PostgreSQL tenant constraints", () => {
  beforeAll(async () => {
    const { PrismaClient } = await import("@prisma/client");
    prisma = new PrismaClient({ datasourceUrl: process.env.TEST_DATABASE_URL });
    role = `TEST_${suffix}`;
    await prisma.role.create({
      data: { code: role, name: "Test", permissions: [] },
    });
    const [a, b] = await Promise.all([
      prisma.organization.create({
        data: { name: "Tenant A", slug: `a-${suffix}` },
      }),
      prisma.organization.create({
        data: { name: "Tenant B", slug: `b-${suffix}` },
      }),
    ]);
    orgA = a.id;
    orgB = b.id;
    const [parent, child, classRoom, teacher] = await Promise.all([
      prisma.parent.create({
        data: {
          organizationId: orgA,
          firstName: "A",
          lastName: "Parent",
          phone: `a-${suffix}`,
        },
      }),
      prisma.child.create({
        data: {
          organizationId: orgB,
          firstName: "B",
          lastName: "Child",
          birthDate: new Date("2022-01-01"),
        },
      }),
      prisma.classRoom.create({
        data: { organizationId: orgA, name: `Class-${suffix}` },
      }),
      prisma.user.create({
        data: {
          organizationId: orgB,
          name: "Teacher B",
          email: `teacher-${suffix}@example.test`,
          passwordHash: "not-used",
          role,
        },
      }),
    ]);
    parentA = parent.id;
    childB = child.id;
    classA = classRoom.id;
    teacherB = teacher.id;
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
    await prisma.role.deleteMany({ where: { code: role } });
    await prisma.$disconnect();
  });

  it("rejects a cross-organization parent-child link", async () => {
    await expect(
      prisma!.parentChild.create({
        data: { organizationId: orgA, parentId: parentA, childId: childB },
      }),
    ).rejects.toThrow();
  });

  it("rejects a cross-organization teacher-class assignment", async () => {
    await expect(
      prisma!.classTeacher.create({
        data: { organizationId: orgA, classId: classA, teacherId: teacherB },
      }),
    ).rejects.toThrow();
  });
});
