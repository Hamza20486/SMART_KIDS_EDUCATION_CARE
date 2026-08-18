import { dateKey, moroccoDateKey, parseDateKey } from "../date";
import { BadRequestError } from "../errors";

const MAX_REPORT_DAYS = 366;

export function reportRange(url: URL, defaultDays = 30) {
  const defaultTo = moroccoDateKey();
  const defaultFrom = dateKey(
    new Date(parseDateKey(defaultTo).getTime() - (defaultDays - 1) * 86_400_000),
  );
  const fromKey = url.searchParams.get("from") || defaultFrom;
  const toKey = url.searchParams.get("to") || defaultTo;
  let from: Date;
  let to: Date;
  try {
    from = parseDateKey(fromKey);
    to = parseDateKey(toKey);
  } catch {
    throw new BadRequestError("Invalid report date");
  }
  to.setUTCHours(23, 59, 59, 999);
  if (to < from) throw new BadRequestError("Invalid report range");
  if (to.getTime() - from.getTime() > MAX_REPORT_DAYS * 86_400_000) {
    throw new BadRequestError("Report range exceeds 366 days");
  }
  return { from, to, fromKey, toKey };
}
