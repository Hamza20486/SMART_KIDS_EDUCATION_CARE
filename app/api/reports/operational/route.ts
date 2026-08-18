import { NextResponse } from "next/server";
import { requirePermission, authorizedClassIds } from "@/lib/permissions";
import { assertClassAccess } from "@/lib/policies";
import { apiError } from "@/lib/api";
import { reportRange } from "@/lib/reports/range";
import { operationalReport } from "@/lib/reports/operational";

export async function GET(request: Request) {
  try {
    const context = await requirePermission("reports.operational");
    const url = new URL(request.url);
    const range = reportRange(url);
    const classId = url.searchParams.get("classId");
    if (classId) await assertClassAccess(context, classId);
    const classIds = await authorizedClassIds(context);
    return NextResponse.json(
      await operationalReport({
        organizationId: context.organizationId,
        from: range.from,
        to: range.to,
        classId,
        authorizedClassIds: classIds,
      }),
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
