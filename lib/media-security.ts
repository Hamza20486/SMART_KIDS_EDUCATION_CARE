import { prisma } from "./prisma";
import { ForbiddenError } from "./auth";
import {
  getEntitlements,
  storageUsageBytes,
} from "./subscriptions/service";

export async function scanForMalware(data: Buffer) {
  const url = process.env.MALWARE_SCAN_WEBHOOK_URL;
  if (!url) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Malware scanner is required");
    }
    return "CLEAN";
  }
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/octet-stream",
      ...(process.env.MALWARE_SCAN_API_KEY
        ? { authorization: `Bearer ${process.env.MALWARE_SCAN_API_KEY}` }
        : {}),
    },
    body: new Uint8Array(data),
  });
  if (!response.ok) throw new Error("Malware scanner unavailable");
  const result = (await response.json()) as { clean?: boolean };
  if (!result.clean) {
    throw new ForbiddenError("File rejected by malware scanner");
  }
  return "CLEAN";
}

export async function storageQuota(organizationId: string) {
  const [{ entitlements }, usedBytes] = await Promise.all([
    getEntitlements(organizationId),
    storageUsageBytes(organizationId),
  ]);
  return {
    limitBytes: entitlements.storageMb * 1_024 * 1_024,
    usedBytes,
    enabled: true,
  };
}

export async function activityHasConsent(
  organizationId: string,
  activity: { childId: string | null; classId: string | null },
) {
  let childIds: string[] = [];
  if (activity.childId) childIds = [activity.childId];
  else if (activity.classId) {
    childIds = (
      await prisma.child.findMany({
        where: { organizationId, classId: activity.classId, active: true },
        select: { id: true },
      })
    ).map((child) => child.id);
  }
  if (!childIds.length) return false;
  const consents = await prisma.mediaConsent.findMany({
    where: {
      organizationId,
      childId: { in: childIds },
      scope: "ACTIVITY_MEDIA",
      status: "GRANTED",
    },
    select: { childId: true },
  });
  const granted = new Set(consents.map((consent) => consent.childId));
  return childIds.every((id) => granted.has(id));
}
