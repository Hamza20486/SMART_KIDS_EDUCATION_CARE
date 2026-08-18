import { prisma } from "./prisma";
import { requireUser, ForbiddenError } from "./auth";
import { hasPermission, type Permission } from "./permission-map";
import {
  featureForPermission,
  getActiveSubscription,
  requireFeature,
} from "./subscriptions/service";

export type AuthContext = {
  userId: string;
  id: string;
  organizationId: string;
  role: string;
  name: string;
  email: string;
  parentId: string | null;
  authorizedClassIds: string[] | null;
  subscriptionStatus: string | null;
  planCode: string | null;
};

export async function getAuthContext(): Promise<AuthContext> {
  const user = await requireUser();
  const [parent, classes, subscription] = await Promise.all([
    user.role === "PARENT"
      ? prisma.parent.findFirst({
          where: { organizationId: user.organizationId, userId: user.id },
          select: { id: true },
        })
      : null,
    user.role === "TEACHER"
      ? prisma.classTeacher.findMany({
          where: { organizationId: user.organizationId, teacherId: user.id },
          select: { classId: true },
        })
      : [],
    user.role === "SUPER_ADMIN"
      ? null
      : getActiveSubscription(user.organizationId),
  ]);
  if (user.role !== "SUPER_ADMIN" && !subscription) {
    throw new ForbiddenError("Organization subscription inactive or expired");
  }
  return {
    ...user,
    userId: user.id,
    parentId: parent?.id ?? null,
    authorizedClassIds:
      user.role === "TEACHER" ? classes.map((item) => item.classId) : null,
    subscriptionStatus: subscription?.status ?? null,
    planCode: subscription?.plan.code ?? null,
  };
}

export async function requireContextPermission(permission: Permission) {
  const context = await getAuthContext();
  if (!hasPermission(context.role, permission)) {
    throw new ForbiddenError("Insufficient permission");
  }
  const feature = featureForPermission[permission];
  if (feature) await requireFeature(context, feature);
  return context;
}
