import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { apiError } from "@/lib/api";
import { platformReport } from "@/lib/reports/platform";

export async function GET() {
  try {
    await requirePermission("platform.manage");
    return NextResponse.json(await platformReport(), {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
