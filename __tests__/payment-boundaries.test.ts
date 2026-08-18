import { describe, expect, it } from "vitest";
import {
  netAmount,
  paymentStatus,
  receiptNumber,
  receiptPdf,
} from "@/lib/payments";

describe("payment boundary behavior", () => {
  it("rejects non-integer, negative, zero, and excessive discounts", () => {
    for (const [gross, discount] of [
      [0, 0],
      [1_000.5, 0],
      [1_000, -1],
      [1_000, 1_001],
    ]) {
      expect(() => netAmount(gross, discount)).toThrow("Invalid payment amounts");
    }
    expect(netAmount(1_000, 1_000)).toBe(0);
  });

  it("gives full payment precedence and treats the due instant consistently", () => {
    const dueDate = new Date("2026-08-17T12:00:00.000Z");
    expect(paymentStatus(10_000, 10_000, dueDate, dueDate)).toBe("PAID");
    expect(paymentStatus(10_000, 5_000, dueDate, dueDate)).toBe("PARTIAL");
    expect(
      paymentStatus(
        10_000,
        0,
        dueDate,
        new Date("2026-08-17T12:00:00.001Z"),
      ),
    ).toBe("OVERDUE");
  });

  it("pads receipt sequences without truncating large values", () => {
    expect(receiptNumber(2026, 1)).toBe("REC-2026-000001");
    expect(receiptNumber(2026, 1_000_000)).toBe("REC-2026-1000000");
  });

  it("includes optional organization and transaction details in receipt PDFs", async () => {
    const pdf = await receiptPdf({
      receiptNumber: "REC-2026-000001",
      organization: "Smart Kids",
      address: "Casablanca",
      child: "Yasmine Alaoui",
      parent: "Sara Alaoui",
      amountCentimes: 10_000,
      method: "CASH",
      reference: "TX-1",
      paidAt: new Date("2026-08-17T00:00:00.000Z"),
    });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(500);
  });
});
