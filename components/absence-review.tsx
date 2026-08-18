"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { clientTranslate } from "@/lib/i18n/client";
import { T } from "./i18n-provider";
import { CheckCircle2, UserCheck } from "lucide-react";

export function AbsenceReview({ id }: { id: string }) {
  const router = useRouter();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = await fetch("/api/absences", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id,
        status: f.get("status"),
        reviewNote: f.get("reviewNote"),
      }),
    });
    if (!r.ok) {
      toast.error(clientTranslate("common.retry"));
      return;
    }
    toast.success(clientTranslate("common.save"));
    router.refresh();
  }

  return (
    <form className="card form" onSubmit={submit} style={{ padding: 20, borderRadius: 16 }}>
      <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", gap: 8 }}>
        <UserCheck size={18} color="var(--brand)" />
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
          <T k="workflow.decision" />
        </h2>
      </div>

      <label>
        <span><T k="workflow.decision" /></span>
        <select name="status">
          <option value="APPROVED">✅ <T k="workflow.approve" /></option>
          <option value="REJECTED">❌ <T k="workflow.reject" /></option>
        </select>
      </label>

      <label>
        <span><T k="common.note" /></span>
        <input name="reviewNote" maxLength={1000} placeholder="Remarque pour la famille..." />
      </label>

      <button className="button" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <CheckCircle2 size={16} /> <T k="common.save" />
      </button>
    </form>
  );
}
