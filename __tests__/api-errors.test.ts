import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const TestForbiddenError = vi.hoisted(
  () => class TestForbiddenError extends Error {},
);
vi.mock("@/lib/auth", () => ({ ForbiddenError: TestForbiddenError }));

import { apiError } from "@/lib/api";
import { BadRequestError } from "@/lib/errors";

describe("API error mapping", () => {
  afterEach(() => vi.restoreAllMocks());

  it("maps authorization failures to 403", async () => {
    const response = apiError(new TestForbiddenError("Denied"));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Denied" });
  });

  it("maps schema failures to a non-sensitive 400 response", async () => {
    let error: unknown;
    try {
      z.object({ name: z.string().min(2) }).parse({ name: "x" });
    } catch (caught) {
      error = caught;
    }
    const response = apiError(error);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid input");
    expect(body.details).toHaveLength(1);
  });

  it("maps explicit bad requests and missing records", async () => {
    const badRequest = apiError(new BadRequestError("Invalid range"));
    expect(badRequest.status).toBe(400);
    await expect(badRequest.json()).resolves.toEqual({ error: "Invalid range" });

    const notFound = apiError(new Error("Not found"));
    expect(notFound.status).toBe(404);
    await expect(notFound.json()).resolves.toEqual({ error: "Not found" });
  });

  it("logs unexpected errors without returning their details", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = apiError(new Error("database password leaked"));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Internal server error" });
    expect(consoleError).toHaveBeenCalledOnce();
  });
});
