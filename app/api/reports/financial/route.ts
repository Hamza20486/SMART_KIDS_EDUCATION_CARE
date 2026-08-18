import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { apiError } from "@/lib/api";
import { reportRange } from "@/lib/reports/range";
import { financialReport } from "@/lib/reports/financial";
import { assertClassAccess } from "@/lib/policies";

export async function GET(request: Request) {
  try {
    const context = await requirePermission("reports.financial");
    const url = new URL(request.url);
    const range = reportRange(url);
    const classId = url.searchParams.get("classId");
    if (classId) await assertClassAccess(context, classId);
    return NextResponse.json(
      await financialReport({
        organizationId: context.organizationId,
        from: range.from,
        to: range.to,
        classId,
      }),
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
