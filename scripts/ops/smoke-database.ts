import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
try {
  await prisma.$queryRaw`SELECT 1`;
  const [organizations, users, roles, migrations, tenantViolations] =
    await Promise.all([
      prisma.organization.count(),
      prisma.user.count(),
      prisma.role.count(),
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM "_prisma_migrations"
        WHERE "finished_at" IS NOT NULL
      `,
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
        FROM "ParentChild" link
        JOIN "Parent" parent ON parent.id = link."parentId"
        JOIN "Child" child ON child.id = link."childId"
        WHERE link."organizationId" <> parent."organizationId"
           OR link."organizationId" <> child."organizationId"
      `,
    ]);
  if (!organizations || !users || roles < 6) {
    throw new Error("Restored database is missing required core records");
  }
  if (!migrations[0] || migrations[0].count === 0n) {
    throw new Error("Restored database has no completed migrations");
  }
  if (tenantViolations[0]?.count !== 0n) {
    throw new Error("Restored database contains cross-tenant relationships");
  }
  console.log(
    JSON.stringify({
      event: "database.smoke.passed",
      organizations,
      users,
      roles,
      migrations: Number(migrations[0].count),
      tenantViolations: Number(tenantViolations[0]?.count ?? 0n),
    }),
  );
} finally {
  await prisma.$disconnect();
}
