import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { fixturePath, type E2EFixture } from "./fixture";

export default async function globalSetup() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for Playwright tests");
  }
  if (process.env.E2E_SKIP_SEED !== "true") {
    execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "db:seed"], {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });
  }

  const prisma = new PrismaClient();
  try {
    const organization = await prisma.organization.findUniqueOrThrow({
      where: { slug: "smart-kids-tit-melil" },
    });
    const [admin, assignedClass, child] = await Promise.all([
      prisma.user.findFirstOrThrow({
        where: { organizationId: organization.id, role: "ADMIN" },
      }),
      prisma.classRoom.findFirstOrThrow({
        where: { organizationId: organization.id, name: "Les Étoiles" },
      }),
      prisma.child.findFirstOrThrow({
        where: {
          organizationId: organization.id,
          firstName: "Yasmine",
          lastName: "Bennani",
        },
      }),
    ]);
    await prisma.child.update({
      where: { id: child.id },
      data: { allergies: "E2E confidential allergy" },
    });

    const unassignedClass = await prisma.classRoom.upsert({
      where: {
        organizationId_name: {
          organizationId: organization.id,
          name: "E2E Classe non affectée",
        },
      },
      update: { active: true },
      create: {
        organizationId: organization.id,
        name: "E2E Classe non affectée",
        capacity: 12,
      },
    });
    await prisma.classTeacher.deleteMany({
      where: { organizationId: organization.id, classId: unassignedClass.id },
    });
    const unassignedChild =
      (await prisma.child.findFirst({
        where: {
          organizationId: organization.id,
          firstName: "E2E",
          lastName: "Unassigned",
        },
      })) ??
      (await prisma.child.create({
        data: {
          organizationId: organization.id,
          classId: unassignedClass.id,
          firstName: "E2E",
          lastName: "Unassigned",
          birthDate: new Date("2022-02-02"),
        },
      }));
    if (unassignedChild.classId !== unassignedClass.id) {
      await prisma.child.update({
        where: { id: unassignedChild.id },
        data: { classId: unassignedClass.id, active: true },
      });
    }

    const foreignOrganization = await prisma.organization.upsert({
      where: { slug: "e2e-foreign-organization" },
      update: { active: true },
      create: {
        name: "E2E Foreign Organization",
        slug: "e2e-foreign-organization",
      },
    });
    const foreignChild =
      (await prisma.child.findFirst({
        where: {
          organizationId: foreignOrganization.id,
          firstName: "Foreign",
          lastName: "Child",
        },
      })) ??
      (await prisma.child.create({
        data: {
          organizationId: foreignOrganization.id,
          firstName: "Foreign",
          lastName: "Child",
          birthDate: new Date("2022-03-03"),
        },
      }));

    const passwordHash = await hash("SmartKids2026!", 12);
    await prisma.user.upsert({
      where: {
        organizationId_email: {
          organizationId: organization.id,
          email: "suspended-user@smartkids.ma",
        },
      },
      update: { active: false, passwordHash },
      create: {
        organizationId: organization.id,
        email: "suspended-user@smartkids.ma",
        name: "Suspended User",
        role: "PARENT",
        passwordHash,
        active: false,
      },
    });
    const inactiveOrganization = await prisma.organization.upsert({
      where: { slug: "e2e-inactive-organization" },
      update: { active: false },
      create: {
        name: "E2E Inactive Organization",
        slug: "e2e-inactive-organization",
        active: false,
      },
    });
    await prisma.user.upsert({
      where: {
        organizationId_email: {
          organizationId: inactiveOrganization.id,
          email: "inactive-org-user@smartkids.ma",
        },
      },
      update: { active: true, passwordHash },
      create: {
        organizationId: inactiveOrganization.id,
        email: "inactive-org-user@smartkids.ma",
        name: "Inactive Organization User",
        role: "PARENT",
        passwordHash,
      },
    });

    const activity =
      (await prisma.activity.findFirst({
        where: {
          organizationId: organization.id,
          title: "E2E private activity",
        },
      })) ??
      (await prisma.activity.create({
        data: {
          organizationId: organization.id,
          classId: assignedClass.id,
          title: "E2E private activity",
          description: "Private test media",
          activityDate: new Date(),
          visibleToParents: false,
          createdById: admin.id,
        },
      }));
    const media =
      (await prisma.activityMedia.findFirst({
        where: {
          organizationId: organization.id,
          activityId: activity.id,
          storageKey: "e2e/private-media.webp",
        },
      })) ??
      (await prisma.activityMedia.create({
        data: {
          organizationId: organization.id,
          activityId: activity.id,
          storageKey: "e2e/private-media.webp",
          mimeType: "image/webp",
          sizeBytes: 10,
          checksumSha256: "a".repeat(64),
          uploadedById: admin.id,
        },
      }));

    const fixture: E2EFixture = {
      organizationId: organization.id,
      childId: child.id,
      foreignChildId: foreignChild.id,
      unassignedClassId: unassignedClass.id,
      privateMediaId: media.id,
    };
    await writeFile(fixturePath, JSON.stringify(fixture, null, 2), "utf8");
  } finally {
    await prisma.$disconnect();
  }
}
