import { describe, expect, it } from "vitest";
import {
  csvExport,
  pdfTableExport,
  safeSpreadsheetText,
  xlsxExport,
} from "@/lib/reports/export";
import { reportRange } from "@/lib/reports/range";
import { hoursBetween, percentage } from "@/lib/reports/types";

describe("reports and secure exports", () => {
  it("prevents spreadsheet formula injection", () => {
    expect(safeSpreadsheetText("=1+1")).toBe("'=1+1");
    expect(safeSpreadsheetText("@command")).toBe("'@command");
    expect(safeSpreadsheetText("\t=command")).toBe("'\t=command");
    expect(safeSpreadsheetText("  +1")).toBe("'  +1");
    expect(safeSpreadsheetText("Yasmine")).toBe("Yasmine");
    const csv = csvExport({
      title: "Test",
      headers: ["Name"],
      rows: [["=danger"], [-10]],
    });
    expect(csv).toContain("'=danger");
    expect(csv).toContain('"-10"');
  });

  it("creates XLSX and PDF exports", async () => {
    const table = {
      title: "Smart Kids report",
      headers: ["Child", "Total"],
      rows: [["Yasmine", 12]],
    };
    const xlsx = await xlsxExport(table);
    const pdf = await pdfTableExport(table);
    expect(Buffer.from(xlsx).subarray(0, 2).toString()).toBe("PK");
    expect(Buffer.from(pdf).subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("validates bounded report ranges", () => {
    const url = new URL("https://example.test?from=2026-08-01&to=2026-08-17");
    const range = reportRange(url);
    expect(range.fromKey).toBe("2026-08-01");
    expect(range.toKey).toBe("2026-08-17");
    expect(() =>
      reportRange(
        new URL("https://example.test?from=2024-01-01&to=2026-08-17"),
      ),
    ).toThrow("366 days");
  });

  it("rejects malformed and reversed report dates", () => {
    expect(() =>
      reportRange(new URL("https://example.test?from=2026-02-30&to=2026-03-01")),
    ).toThrow("Invalid report date");
    expect(() =>
      reportRange(new URL("https://example.test?from=2026-08-18&to=2026-08-17")),
    ).toThrow("Invalid report range");
  });

  it("calculates stable percentages and durations", () => {
    expect(percentage(1, 3)).toBe(33.33);
    expect(percentage(0, 0)).toBe(0);
    expect(
      hoursBetween(
        new Date("2026-08-17T00:00:00.000Z"),
        new Date("2026-08-18T12:00:00.000Z"),
      ),
    ).toBe(36);
  });
});
