"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { clientTranslate } from "@/lib/i18n/client";
import { StatusText } from "./i18n-provider";
import { T } from "./i18n-provider";
import {
  CalendarX,
  Download,
  XCircle,
  Send,
  Loader2,
} from "lucide-react";

type Row = {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  child: { firstName: string; lastName: string };
  attachments: { id: string; originalName: string }[];
};

export function ParentAbsenceManager({
  childrenList,
}: {
  childrenList: { id: string; name: string }[];
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      fetch("/api/parent/absences")
        .then((r) => r.json())
        .then(setRows),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = e.currentTarget;
    const r = await fetch("/api/parent/absences", {
      method: "POST",
      body: new FormData(form),
    });
    setBusy(false);
    if (!r.ok) {
      toast.error(clientTranslate("common.retry"));
      return;
    }
    toast.success(clientTranslate("common.save"));
    form.reset();
    await load();
  }

  async function cancel(id: string) {
    if (!confirm(clientTranslate("common.confirm"))) return;
    const r = await fetch("/api/parent/absences", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!r.ok) {
      toast.error(clientTranslate("common.retry"));
      return;
    }
    toast.success(clientTranslate("common.save"));
    await load();
  }

  return (
    <>
      <form className="card form" onSubmit={submit} style={{ padding: 24, borderRadius: 20, marginBottom: 28 }}>
        <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "var(--brand-light)",
              color: "var(--brand)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CalendarX size={20} />
          </div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
            <T k="workflow.newRequest" />
          </h2>
        </div>

        <label>
          <span><T k="common.child" /></span>
          <select name="childId">
            {childrenList.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span><T k="workflow.from" /></span>
          <input name="startDate" type="date" required />
        </label>

        <label>
          <span><T k="workflow.to" /></span>
          <input name="endDate" type="date" required />
        </label>

        <label>
          <span><T k="common.reason" /></span>
          <input name="reason" minLength={3} required placeholder="Ex : Maladie, déplacement..." />
        </label>

        <label style={{ gridColumn: "1/-1" }}>
          <span><T k="workflow.supportingDocument" /> (Certificat médical, justificatif)</span>
          <input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" />
        </label>

        <button className="button" disabled={busy} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {busy ? (
            <>
              <Loader2 size={16} className="animate-spin" /> {clientTranslate("common.loading")}
            </>
          ) : (
            <>
              <Send size={15} /> <T k="common.send" />
            </>
          )}
        </button>
      </form>

      <h2 style={{ fontSize: 18, marginBottom: 14 }}>Historique de mes demandes</h2>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th><T k="common.child" /></th>
              <th><T k="common.period" /></th>
              <th><T k="common.reason" /></th>
              <th><T k="common.status" /></th>
              <th><T k="workflow.file" /></th>
              <th><T k="common.action" /></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>
                  Aucune demande d’absence enregistrée.
                </td>
              </tr>
            ) : (
              rows.map((x) => (
                <tr key={x.id}>
                  <td>
                    <strong>{x.child.firstName}</strong>
                  </td>
                  <td>
                    {new Date(x.startDate).toLocaleDateString("fr-MA")} —{" "}
                    {new Date(x.endDate).toLocaleDateString("fr-MA")}
                  </td>
                  <td>{x.reason}</td>
                  <td>
                    <span className="badge" style={{ fontSize: 12 }}>
                      <StatusText status={x.status} />
                    </span>
                  </td>
                  <td>
                    {x.attachments.map((a) => (
                      <a
                        key={a.id}
                        href={`/api/absence-attachments/${a.id}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13 }}
                      >
                        <Download size={13} /> {a.originalName}
                      </a>
                    ))}
                  </td>
                  <td>
                    {x.status === "PENDING" && (
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => cancel(x.id)}
                        style={{ padding: "4px 10px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
                      >
                        <XCircle size={13} color="var(--red)" /> <T k="common.cancel" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
