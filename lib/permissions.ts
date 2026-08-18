import { ForbiddenError } from "./auth";
import { getAuthContext } from "./auth-context";
import { hasPermission, type Permission } from "./permission-map";
import {
  featureForPermission,
  requireFeature,
} from "./subscriptions/service";

export { hasPermission, STAFF_ROLES } from "./permission-map";

async function requirePermissionFeature(
  context: Awaited<ReturnType<typeof getAuthContext>>,
  permission: Permission,
) {
  const feature = featureForPermission[permission];
  if (feature) await requireFeature(context, feature);
}

export async function requirePermission(permission: Permission) {
  const context = await getAuthContext();
  if (!hasPermission(context.role, permission)) {
    throw new ForbiddenError("Insufficient permission");
  }
  await requirePermissionFeature(context, permission);
  return context;
}

export async function requireAnyPermission(permissions: Permission[]) {
  const context = await getAuthContext();
  const granted = permissions.find((permission) =>
    hasPermission(context.role, permission),
  );
  if (!granted) throw new ForbiddenError("Insufficient permission");
  await requirePermissionFeature(context, granted);
  return context;
}

export async function authorizedClassIds(user: {
  id: string;
  organizationId: string;
  role: string;
  authorizedClassIds?: string[] | null;
}) {
  if (user.role !== "TEACHER") return null;
  if (user.authorizedClassIds) return user.authorizedClassIds;
  const { prisma } = await import("./prisma");
  return (
    await prisma.classTeacher.findMany({
      where: {
        organizationId: user.organizationId,
        teacherId: user.id,
      },
      select: { classId: true },
    })
  ).map((item) => item.classId);
}

export async function requireTeacherChildAccess(
  user: {
    id: string;
    organizationId: string;
    role: string;
    authorizedClassIds?: string[] | null;
  },
  childId: string,
) {
  const { prisma } = await import("./prisma");
  const child = await prisma.child.findFirst({
    where: { id: childId, organizationId: user.organizationId },
    select: { id: true, classId: true },
  });
  if (!child) throw new Error("Not found");
  if (user.role === "TEACHER") {
    const ids = await authorizedClassIds(user);
    if (!child.classId || !ids?.includes(child.classId)) {
      throw new ForbiddenError("Child is outside assigned classes");
    }
  }
  return child;
}
