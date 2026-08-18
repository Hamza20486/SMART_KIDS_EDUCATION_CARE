import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { productionReadiness } from "@/lib/ops/readiness";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(request: Request) {
  const expected = process.env.HEALTHCHECK_TOKEN;
  if (!expected) return process.env.NODE_ENV !== "production";
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return (
    expectedBytes.length === suppliedBytes.length &&
    timingSafeEqual(expectedBytes, suppliedBytes)
  );
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }
  const readiness = await productionReadiness();
  return NextResponse.json(readiness, {
    status: readiness.ok ? 200 : 503,
    headers: { "cache-control": "no-store" },
  });
}
