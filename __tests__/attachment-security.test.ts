import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sanitizeActivityImage: vi.fn(),
  scanForMalware: vi.fn(),
}));

vi.mock("@/lib/media-image", () => ({
  sanitizeActivityImage: mocks.sanitizeActivityImage,
}));
vi.mock("@/lib/media-security", () => ({
  scanForMalware: mocks.scanForMalware,
}));

import { sanitizeAttachment } from "@/lib/attachment-security";

describe("attachment sanitization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.scanForMalware.mockResolvedValue("CLEAN");
  });

  it("rejects unsupported file types and oversized input", async () => {
    const text = new File(["hello"], "note.txt", { type: "text/plain" });
    await expect(sanitizeAttachment(text)).rejects.toThrow("up to 10 MB");

    const oversized = {
      size: 10 * 1024 * 1024 + 1,
      type: "application/pdf",
      name: "large.pdf",
      arrayBuffer: vi.fn(),
    } as unknown as File;
    await expect(sanitizeAttachment(oversized)).rejects.toThrow("up to 10 MB");
    expect(oversized.arrayBuffer).not.toHaveBeenCalled();
  });

  it("checks PDF magic bytes before malware scanning", async () => {
    const invalid = new File(["not a pdf"], "fake.pdf", {
      type: "application/pdf",
    });
    await expect(sanitizeAttachment(invalid)).rejects.toThrow("Invalid PDF content");
    expect(mocks.scanForMalware).not.toHaveBeenCalled();
  });

  it("scans valid PDFs, hashes them, and strips path-like names", async () => {
    const pdf = new File(["%PDF-1.7\ncontent"], "../dossier éleve.pdf", {
      type: "application/pdf",
    });
    const result = await sanitizeAttachment(pdf);
    expect(mocks.scanForMalware).toHaveBeenCalledOnce();
    expect(result.mimeType).toBe("application/pdf");
    expect(result.originalName).toBe("dossier _leve.pdf");
    expect(result.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(result.data.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("re-encodes images and scans only the sanitized bytes", async () => {
    const sanitized = Buffer.from("safe-webp");
    mocks.sanitizeActivityImage.mockResolvedValue({
      data: sanitized,
      mimeType: "image/webp",
      checksum: "a".repeat(64),
      width: 10,
      height: 10,
    });
    const image = new File(["untrusted"], "photo.png", { type: "image/png" });
    const result = await sanitizeAttachment(image);
    expect(mocks.sanitizeActivityImage).toHaveBeenCalledOnce();
    expect(mocks.scanForMalware).toHaveBeenCalledWith(sanitized);
    expect(result).toMatchObject({
      data: sanitized,
      mimeType: "image/webp",
      checksum: "a".repeat(64),
      originalName: "photo.webp",
    });
  });
});
