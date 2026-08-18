import { prisma } from "../prisma";
import { BadRequestError } from "../errors";
import { hoursBetween, percentage, type ReportFilters } from "./types";

function increment(record: Record<string, number>, key: string, amount = 1) {
  record[key] = (record[key] ?? 0) + amount;
}

export async function operationalReport(filters: ReportFilters) {
  const classScope = filters.classId
    ? [filters.classId]
    : filters.authorizedClassIds ?? null;
  const childWhere = {
    organizationId: filters.organizationId,
    ...(classScope ? { classId: { in: classScope } } : {}),
  };
  const [
    classes,
    children,
    attendances,
    absences,
    activities,
    homework,
    complaints,
  ] = await Promise.all([
    prisma.classRoom.findMany({
      where: {
        organizationId: filters.organizationId,
        ...(classScope ? { id: { in: classScope } } : {}),
      },
      select: { id: true, name: true, capacity: true, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.child.findMany({
      where: { ...childWhere, active: true },
      select: { id: true, firstName: true, lastName: true, classId: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.attendance.findMany({
      where: {
        organizationId: filters.organizationId,
        date: { gte: filters.from, lte: filters.to },
        child: classScope ? { classId: { in: classScope } } : {},
      },
      include: {
        child: { select: { id: true, firstName: true, lastName: true, classId: true } },
        pickupAuthorization: { select: { name: true } },
      },
      orderBy: [{ date: "asc" }, { child: { lastName: "asc" } }],
      take: 20_001,
    }),
    prisma.absenceRequest.findMany({
      where: {
        organizationId: filters.organizationId,
        startDate: { lte: filters.to },
        endDate: { gte: filters.from },
        child: classScope ? { classId: { in: classScope } } : {},
      },
      include: { child: { select: { id: true, firstName: true, lastName: true, classId: true } } },
      orderBy: { startDate: "asc" },
      take: 10_001,
    }),
    prisma.activity.findMany({
      where: {
        organizationId: filters.organizationId,
        activityDate: { gte: filters.from, lte: filters.to },
        ...(classScope
          ? { OR: [{ classId: { in: classScope } }, { child: { classId: { in: classScope } } }] }
          : {}),
      },
      include: {
        class: { select: { name: true } },
        createdBy: { select: { id: true, name: true, role: true } },
      },
      orderBy: { activityDate: "asc" },
      take: 10_001,
    }),
    prisma.homework.findMany({
      where: {
        organizationId: filters.organizationId,
        dueDate: { gte: filters.from, lte: filters.to },
        ...(classScope ? { classId: { in: classScope } } : {}),
      },
      include: {
        class: { select: { name: true } },
        createdBy: { select: { id: true, name: true, role: true } },
        assignments: { where: { required: true }, select: { childId: true } },
        submissions: { select: { childId: true, status: true, submittedAt: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 10_001,
    }),
    prisma.complaint.findMany({
      where: {
        organizationId: filters.organizationId,
        createdAt: { gte: filters.from, lte: filters.to },
        ...(classScope ? { child: { classId: { in: classScope } } } : {}),
      },
      select: {
        id: true,
        reference: true,
        status: true,
        priority: true,
        createdAt: true,
        resolvedAt: true,
        closedAt: true,
      },
      orderBy: { createdAt: "asc" },
      take: 10_001,
    }),
  ]);
  if (attendances.length > 20_000) {
    throw new BadRequestError("Report is too large; select a class or shorter range");
  }
  if ([absences, activities, homework, complaints].some((rows) => rows.length > 10_000)) {
    throw new BadRequestError("Report is too large; select a class or shorter range");
  }

  const classById = new Map(classes.map((item) => [item.id, item]));
  const childrenByClass: Record<string, number> = {};
  for (const child of children) {
    if (child.classId) increment(childrenByClass, child.classId);
  }

  const statusCounts: Record<string, number> = {};
  const classAttendance = new Map<
    string,
    { classId: string; className: string; total: number; present: number; absent: number; late: number; excused: number }
  >();
  const dateAttendance = new Map<
    string,
    { date: string; total: number; present: number; absent: number; late: number; excused: number }
  >();
  const childAttendance = new Map<
    string,
    { childId: string; childName: string; total: number; present: number; absent: number; late: number; excused: number }
  >();
  const pickupCounts: Record<string, number> = {};

  for (const item of classes) {
    classAttendance.set(item.id, {
      classId: item.id,
      className: item.name,
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
    });
  }
  for (const child of children) {
    childAttendance.set(child.id, {
      childId: child.id,
      childName: `${child.firstName} ${child.lastName}`,
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
    });
  }

  for (const attendance of attendances) {
    increment(statusCounts, attendance.status);
    const classId = attendance.child.classId ?? "unassigned";
    const classRow = classAttendance.get(classId) ?? {
      classId,
      className: classById.get(classId)?.name ?? "—",
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
    };
    classRow.total += 1;
    if (attendance.status === "PRESENT") classRow.present += 1;
    if (attendance.status === "ABSENT") classRow.absent += 1;
    if (attendance.status === "LATE") classRow.late += 1;
    if (attendance.status === "EXCUSED") classRow.excused += 1;
    classAttendance.set(classId, classRow);

    const date = attendance.date.toISOString().slice(0, 10);
    const dateRow = dateAttendance.get(date) ?? {
      date,
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
    };
    dateRow.total += 1;
    if (attendance.status === "PRESENT") dateRow.present += 1;
    if (attendance.status === "ABSENT") dateRow.absent += 1;
    if (attendance.status === "LATE") dateRow.late += 1;
    if (attendance.status === "EXCUSED") dateRow.excused += 1;
    dateAttendance.set(date, dateRow);

    const childRow = childAttendance.get(attendance.childId) ?? {
      childId: attendance.childId,
      childName: `${attendance.child.firstName} ${attendance.child.lastName}`,
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
    };
    childRow.total += 1;
    if (attendance.status === "PRESENT") childRow.present += 1;
    if (attendance.status === "ABSENT") childRow.absent += 1;
    if (attendance.status === "LATE") childRow.late += 1;
    if (attendance.status === "EXCUSED") childRow.excused += 1;
    childAttendance.set(attendance.childId, childRow);

    if (attendance.departureAt) {
      increment(
        pickupCounts,
        attendance.pickupAuthorization?.name ?? attendance.pickupPerson ?? "—",
      );
    }
  }

  const teacherMetrics = new Map<
    string,
    { userId: string; name: string; activities: number; homework: number }
  >();
  for (const activity of activities) {
    const row = teacherMetrics.get(activity.createdById) ?? {
      userId: activity.createdById,
      name: activity.createdBy.name,
      activities: 0,
      homework: 0,
    };
    row.activities += 1;
    teacherMetrics.set(activity.createdById, row);
  }
  for (const item of homework) {
    const row = teacherMetrics.get(item.createdById) ?? {
      userId: item.createdById,
      name: item.createdBy.name,
      activities: 0,
      homework: 0,
    };
    row.homework += 1;
    teacherMetrics.set(item.createdById, row);
  }

  const homeworkRows = homework.map((item) => {
    const eligible = item.assignments.length
      ? item.assignments.length
      : childrenByClass[item.classId] ?? 0;
    const submitted = new Set(item.submissions.map((submission) => submission.childId)).size;
    const late = item.submissions.filter((submission) => submission.status === "LATE").length;
    return {
      id: item.id,
      title: item.title,
      className: item.class.name,
      dueDate: item.dueDate,
      eligible,
      submitted,
      late,
      completionRate: percentage(submitted, eligible),
    };
  });

  const complaintResolutionHours = complaints
    .filter((item) => item.resolvedAt || item.closedAt)
    .map((item) => hoursBetween(item.createdAt, item.closedAt ?? item.resolvedAt!));

  const classRows = [...classAttendance.values()].map((row) => ({
    ...row,
    absenceRate: percentage(row.absent, row.total),
    lateRate: percentage(row.late, row.total),
  }));
  const childRows = [...childAttendance.values()].map((row) => ({
    ...row,
    attendanceRate: percentage(row.present + row.late, row.total),
    absenceRate: percentage(row.absent, row.total),
  }));

  return {
    summary: {
      activeChildren: children.length,
      attendanceRecords: attendances.length,
      present: statusCounts.PRESENT ?? 0,
      absent: statusCounts.ABSENT ?? 0,
      late: statusCounts.LATE ?? 0,
      excused: statusCounts.EXCUSED ?? 0,
      absenceRate: percentage(statusCounts.ABSENT ?? 0, attendances.length),
      lateRate: percentage(statusCounts.LATE ?? 0, attendances.length),
      absenceRequests: absences.length,
      activities: activities.length,
      homework: homework.length,
      homeworkCompletionRate: percentage(
        homeworkRows.reduce((total, row) => total + row.submitted, 0),
        homeworkRows.reduce((total, row) => total + row.eligible, 0),
      ),
      complaints: complaints.length,
      complaintsResolved: complaintResolutionHours.length,
      averageComplaintResolutionHours: complaintResolutionHours.length
        ? Math.round(
            (complaintResolutionHours.reduce((total, value) => total + value, 0) /
              complaintResolutionHours.length) *
              10,
          ) / 10
        : 0,
    },
    attendanceByDate: [...dateAttendance.values()]
      .map((row) => ({
        ...row,
        absenceRate: percentage(row.absent, row.total),
        lateRate: percentage(row.late, row.total),
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    attendanceByClass: classRows,
    attendanceByChild: childRows,
    absenceRequests: absences.map((item) => ({
      id: item.id,
      childName: `${item.child.firstName} ${item.child.lastName}`,
      startDate: item.startDate,
      endDate: item.endDate,
      status: item.status,
    })),
    teacherActivity: [...teacherMetrics.values()],
    homeworkCompletion: homeworkRows,
    complaintResolution: {
      total: complaints.length,
      resolved: complaintResolutionHours.length,
      averageHours: complaintResolutionHours.length
        ? Math.round(
            (complaintResolutionHours.reduce((total, value) => total + value, 0) /
              complaintResolutionHours.length) *
              10,
          ) / 10
        : 0,
    },
    pickupActivity: Object.entries(pickupCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    classUtilization: classes.map((item) => ({
      classId: item.id,
      className: item.name,
      capacity: item.capacity,
      children: childrenByClass[item.id] ?? 0,
      utilizationRate: percentage(childrenByClass[item.id] ?? 0, item.capacity),
    })),
    exportRows: attendances.map((item) => ({
      date: item.date,
      child: `${item.child.firstName} ${item.child.lastName}`,
      className: classById.get(item.child.classId ?? "")?.name ?? "—",
      status: item.status,
      arrivalAt: item.arrivalAt,
      departureAt: item.departureAt,
      pickup: item.pickupAuthorization?.name ?? item.pickupPerson ?? "",
      note: item.note ?? "",
    })),
  };
}
