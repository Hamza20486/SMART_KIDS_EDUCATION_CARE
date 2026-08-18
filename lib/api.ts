import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { ForbiddenError } from "./auth";
import { ZodError } from "zod";
import { BadRequestError } from "./errors";
import { logger } from "./observability/logger";

export function apiError(error: unknown) {
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid input", details: error.issues },
      { status: 400 },
    );
  }
  if (error instanceof BadRequestError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof Error && error.message === "Not found") {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  Sentry.captureException(error);
  logger.error("api.unhandled_error", {
    errorName: error instanceof Error ? error.name : "UnknownError",
  });
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
