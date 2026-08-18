export type ReportFilters = {
  organizationId: string;
  from: Date;
  to: Date;
  classId?: string | null;
  authorizedClassIds?: string[] | null;
};

export function percentage(numerator: number, denominator: number) {
  return denominator ? Math.round((numerator / denominator) * 10_000) / 100 : 0;
}

export function hoursBetween(start: Date, end: Date) {
  return Math.round(((end.getTime() - start.getTime()) / 3_600_000) * 10) / 10;
}
