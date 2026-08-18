import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  homeworkFindFirst: vi.fn(),
  childFindMany: vi.fn(),
  transaction: vi.fn(),
  parentUserIdsForChildren: vi.fn(),
  enqueueNotificationEvent: vi.fn(),
  wakeNotificationWorker: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    homework: { findFirst: mocks.homeworkFindFirst },
    child: { findMany: mocks.childFindMany },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/notifications/recipients", () => ({
  parentUserIdsForChildren: mocks.parentUserIdsForChildren,
}));
vi.mock("@/lib/notifications/outbox", () => ({
  enqueueNotificationEvent: mocks.enqueueNotificationEvent,
}));
vi.mock("@/lib/inngest/client", () => ({
  wakeNotificationWorker: mocks.wakeNotificationWorker,
}));

import { notifyHomeworkPublished } from "@/lib/homework-notifications";

const homework = {
  id: "homework-a",
  title: "Coloriage",
  classId: "class-a",
  dueDate: new Date("2026-08-20T00:00:00.000Z"),
  publishedAt: new Date("2026-08-17T10:00:00.000Z"),
  updatedAt: new Date("2026-08-17T09:00:00.000Z"),
  assignments: [
    { childId: "child-a", required: true },
    { childId: "child-b", required: false },
  ],
};

describe("homework publication notification helper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback) => callback({ tx: true }));
    mocks.enqueueNotificationEvent.mockResolvedValue({ id: "event-a" });
    mocks.wakeNotificationWorker.mockResolvedValue(undefined);
  });

  it("returns zero when homework is unavailable in the tenant", async () => {
    mocks.homeworkFindFirst.mockResolvedValue(null);
    await expect(notifyHomeworkPublished("homework-a", "org-a")).resolves.toBe(0);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("notifies only required explicit assignments and wakes the worker", async () => {
    mocks.homeworkFindFirst.mockResolvedValue(homework);
    mocks.parentUserIdsForChildren.mockResolvedValue(["parent-user-a"]);
    await expect(notifyHomeworkPublished("homework-a", "org-a")).resolves.toBe(1);
    expect(mocks.parentUserIdsForChildren).toHaveBeenCalledWith(
      { tx: true },
      "org-a",
      ["child-a"],
    );
    expect(mocks.enqueueNotificationEvent).toHaveBeenCalledWith(
      { tx: true },
      expect.objectContaining({
        organizationId: "org-a",
        eventKey: "homework-published:homework-a:2026-08-17T10:00:00.000Z",
        aggregateId: "homework-a",
        payload: expect.objectContaining({
          recipients: ["parent-user-a"],
          notificationType: "HOMEWORK_PUBLISHED",
          entityId: "homework-a",
        }),
      }),
    );
    expect(mocks.wakeNotificationWorker).toHaveBeenCalledWith("event-a");
  });

  it("falls back to active class children when no assignment exists", async () => {
    mocks.homeworkFindFirst.mockResolvedValue({ ...homework, assignments: [] });
    mocks.childFindMany.mockResolvedValue([{ id: "child-a" }, { id: "child-b" }]);
    mocks.parentUserIdsForChildren.mockResolvedValue([]);
    await expect(notifyHomeworkPublished("homework-a", "org-a")).resolves.toBe(0);
    expect(mocks.childFindMany).toHaveBeenCalledWith({
      where: { organizationId: "org-a", classId: "class-a", active: true },
      select: { id: true },
    });
    expect(mocks.parentUserIdsForChildren).toHaveBeenCalledWith(
      { tx: true },
      "org-a",
      ["child-a", "child-b"],
    );
    expect(mocks.enqueueNotificationEvent).not.toHaveBeenCalled();
    expect(mocks.wakeNotificationWorker).not.toHaveBeenCalled();
  });
});
