import{NextResponse}from"next/server";import{prisma}from"@/lib/prisma";import{requirePermission}from"@/lib/permissions";import{apiError}from"@/lib/api";
export async function GET(){try{const u=await requirePermission("reports.operational");return NextResponse.json(await prisma.attendance.groupBy({by:["status"],where:{organizationId:u.organizationId},_count:true}))}catch(e){return apiError(e)}}
