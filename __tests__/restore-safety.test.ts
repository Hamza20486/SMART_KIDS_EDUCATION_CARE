import { describe, expect, it } from "vitest";
import { assertSafeRestoreTarget } from "@/lib/ops/restore-safety";

describe("restore target safety", () => {
  it("accepts isolated restore and staging database names", () => {
    expect(
      assertSafeRestoreTarget({
        target: "postgresql://user:pass@db.example/smart_kids_restore_drill",
        currentDatabase: "postgresql://user:pass@db.example/smart_kids",
      }).pathname,
    ).toBe("/smart_kids_restore_drill");
  });

  it("refuses the active application database", () => {
    expect(() =>
      assertSafeRestoreTarget({
        target: "postgresql://user:pass@db.example/smart_kids",
        currentDatabase: "postgresql://user:pass@db.example/smart_kids",
      }),
    ).toThrow("must not equal");
  });

  it("refuses production-like target names without an explicit break glass", () => {
    expect(() =>
      assertSafeRestoreTarget({
        target: "postgresql://user:pass@db.example/smart_kids_production",
      }),
    ).toThrow("must include restore");
    expect(
      assertSafeRestoreTarget({
        target: "postgresql://user:pass@db.example/smart_kids_production",
        allowProductionRestore: true,
      }).pathname,
    ).toBe("/smart_kids_production");
  });
});
