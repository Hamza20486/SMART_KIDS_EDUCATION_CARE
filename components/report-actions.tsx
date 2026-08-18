"use client";

import { T } from "./i18n-provider";

export function PrintReportButton() {
  return (
    <button className="button secondary no-print" onClick={() => window.print()}>
      <T k="reports.print" />
    </button>
  );
}
