import type { Prisma } from "@prisma/client";

type RecipientReader = Pick<Prisma.TransactionClient, "parent" | "user">;

export async function parentUserIdsForChildren(
  tx: RecipientReader,
  organizationId: string,
  childIds: string[],
): Promise<string[]> {
  if (!childIds.length) return [];
  const parents = await tx.parent.findMany({
    where: {
      organizationId,
      active: true,
      userId: { not: null },
      children: {
        some: {
          childId: { in: childIds },
          canReceiveNotifications: true,
        },
      },
    },
    select: { userId: true },
  });
  return [...new Set(parents.flatMap((parent) => (parent.userId ? [parent.userId] : [])))];
}

export async function parentUserIdsByChild(
  tx: RecipientReader,
  organizationId: string,
  childIds: string[],
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (!childIds.length) return result;
  const parents = await tx.parent.findMany({
    where: {
      organizationId,
      active: true,
      userId: { not: null },
      children: {
        some: {
          childId: { in: childIds },
          canReceiveNotifications: true,
        },
      },
    },
    select: {
      userId: true,
      children: {
        where: {
          childId: { in: childIds },
          canReceiveNotifications: true,
        },
        select: { childId: true },
      },
    },
  });
  for (const parent of parents) {
    if (!parent.userId) continue;
    for (const link of parent.children) {
      const current = result.get(link.childId) ?? [];
      current.push(parent.userId);
      result.set(link.childId, [...new Set(current)]);
    }
  }
  return result;
}

export async function operationalStaffUserIds(
  tx: RecipientReader,
  organizationId: string,
): Promise<string[]> {
  const users = await tx.user.findMany({
    where: {
      organizationId,
      active: true,
      role: { in: ["ADMIN", "MANAGER"] },
    },
    select: { id: true },
  });
  return users.map((user) => user.id);
}
