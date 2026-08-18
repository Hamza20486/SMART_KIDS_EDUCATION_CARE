import { beforeEach, describe, expect, it, vi } from "vitest";

const ForbiddenError = vi.hoisted(
  () => class ForbiddenError extends Error {},
);
const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  requireFeature: vi.fn(),
  mediaFindFirst: vi.fn(),
  assertActivityAccess: vi.fn(),
  activityHasConsent: vi.fn(),
  privateDownloadUrl: vi.fn(),
  getPrivateObject: vi.fn(),
  hasPermission: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ ForbiddenError }));
vi.mock("@/lib/auth-context", () => ({
  getAuthContext: mocks.getAuthContext,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { activityMedia: { findFirst: mocks.mediaFindFirst } },
}));
vi.mock("@/lib/subscriptions/service", () => ({
  requireFeature: mocks.requireFeature,
}));
vi.mock("@/lib/policies", () => ({
  assertActivityAccess: mocks.assertActivityAccess,
}));
vi.mock("@/lib/media-security", () => ({
  activityHasConsent: mocks.activityHasConsent,
}));
vi.mock("@/lib/storage", () => ({
  privateDownloadUrl: mocks.privateDownloadUrl,
  getPrivateObject: mocks.getPrivateObject,
  deletePrivateObject: vi.fn(),
}));
vi.mock("@/lib/permissions", () => ({
  hasPermission: mocks.hasPermission,
  requirePermission: vi.fn(),
}));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));

import { GET } from "@/app/api/activity-media/[id]/route";

const parentContext = {
  id: "parent-user-a",
  userId: "parent-user-a",
  organizationId: "org-a",
  role: "PARENT",
  parentId: "parent-a",
};
const media = {
  id: "media-a",
  organizationId: "org-a",
  activityId: "activity-a",
  storageKey: "org-a/activity-a/media.webp",
  mimeType: "image/webp",
  activity: {
    id: "activity-a",
    childId: "child-a",
    classId: null,
    visibleToParents: true,
  },
};

describe("private file authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthContext.mockResolvedValue(parentContext);
    mocks.requireFeature.mockResolvedValue({});
    mocks.mediaFindFirst.mockResolvedValue(media);
    mocks.assertActivityAccess.mockResolvedValue({});
    mocks.activityHasConsent.mockResolvedValue(true);
    mocks.privateDownloadUrl.mockResolvedValue("https://private.example.test/signed");
    mocks.hasPermission.mockReturnValue(false);
  });

  it("denies unauthenticated private media before database or storage access", async () => {
    mocks.getAuthContext.mockRejectedValue(new ForbiddenError("Authentication required"));
    const response = await GET(new Request("https://example.test"), {
      params: Promise.resolve({ id: "media-a" }),
    });
    expect(response.status).toBe(403);
    expect(mocks.mediaFindFirst).not.toHaveBeenCalled();
    expect(mocks.privateDownloadUrl).not.toHaveBeenCalled();
  });

  it("tenant-scopes media lookup and conceals cross-organization records", async () => {
    mocks.mediaFindFirst.mockResolvedValue(null);
    const response = await GET(new Request("https://example.test"), {
      params: Promise.resolve({ id: "foreign-media" }),
    });
    expect(response.status).toBe(403);
    expect(mocks.mediaFindFirst).toHaveBeenCalledWith({
      where: {
        id: "foreign-media",
        organizationId: "org-a",
        deletedAt: null,
      },
      include: { activity: true },
    });
    expect(mocks.privateDownloadUrl).not.toHaveBeenCalled();
  });

  it("denies parent access when visibility or consent is unavailable", async () => {
    mocks.mediaFindFirst.mockResolvedValue({
      ...media,
      activity: { ...media.activity, visibleToParents: false },
    });
    const hidden = await GET(new Request("https://example.test"), {
      params: Promise.resolve({ id: "media-a" }),
    });
    expect(hidden.status).toBe(403);
    expect(mocks.activityHasConsent).not.toHaveBeenCalled();

    mocks.mediaFindFirst.mockResolvedValue(media);
    mocks.activityHasConsent.mockResolvedValue(false);
    const noConsent = await GET(new Request("https://example.test"), {
      params: Promise.resolve({ id: "media-a" }),
    });
    expect(noConsent.status).toBe(403);
    expect(mocks.privateDownloadUrl).not.toHaveBeenCalled();
  });

  it("returns only a short-lived signed URL after every check passes", async () => {
    const response = await GET(new Request("https://example.test"), {
      params: Promise.resolve({ id: "media-a" }),
    });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://private.example.test/signed",
    );
    expect(mocks.requireFeature).toHaveBeenCalledWith(parentContext, "activityMedia");
    expect(mocks.assertActivityAccess).toHaveBeenCalledWith(
      parentContext,
      "activity-a",
    );
    expect(mocks.privateDownloadUrl).toHaveBeenCalledWith(
      "org-a/activity-a/media.webp",
      60,
    );
  });
});
