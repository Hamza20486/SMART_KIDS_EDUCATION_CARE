import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deletePrivateObject,
  getPrivateObject,
  privateDownloadUrl,
  putPrivateObject,
} from "@/lib/storage";

const keys: string[] = [];

describe("private object storage fallback", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("R2_ACCOUNT_ID", "");
    vi.stubEnv("R2_ACCESS_KEY_ID", "");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "");
    vi.stubEnv("R2_BUCKET", "");
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await Promise.all(keys.splice(0).map((key) => deletePrivateObject(key)));
  });

  it("writes, reads, and deletes private development objects", async () => {
    const key = `phase15/${crypto.randomUUID()}.bin`;
    keys.push(key);
    const body = Buffer.from("private content");
    await putPrivateObject(key, body, "application/octet-stream");
    await expect(getPrivateObject(key)).resolves.toEqual(body);
    await deletePrivateObject(key);
    await expect(getPrivateObject(key)).rejects.toThrow();
  });

  it("does not silently overwrite an existing private object", async () => {
    const key = `phase15/${crypto.randomUUID()}.bin`;
    keys.push(key);
    await putPrivateObject(key, Buffer.from("first"), "text/plain");
    await expect(
      putPrivateObject(key, Buffer.from("second"), "text/plain"),
    ).rejects.toThrow();
    await expect(getPrivateObject(key)).resolves.toEqual(Buffer.from("first"));
  });

  it("rejects traversal and absolute private-storage keys", async () => {
    await expect(getPrivateObject("../secret.txt")).rejects.toThrow(
      "Invalid private storage key",
    );
    await expect(getPrivateObject("/etc/passwd")).rejects.toThrow(
      "Invalid private storage key",
    );
  });

  it("returns no public URL for local objects and fails closed in production", async () => {
    await expect(privateDownloadUrl("phase15/file.bin")).resolves.toBeNull();
    vi.stubEnv("NODE_ENV", "production");
    await expect(
      putPrivateObject("phase15/file.bin", Buffer.from("data"), "text/plain"),
    ).rejects.toThrow("Private object storage is required");
  });
});
