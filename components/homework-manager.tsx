"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { clientTranslate } from "@/lib/i18n/client";
import { StatusText } from "./i18n-provider";
import { T } from "./i18n-provider";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Send,
} from "lucide-react";

type Attachment = {
  id: string;
  originalName: string;
  sizeBytes: number;
};

type Submission = {
  id: string;
  status: string;
  version: number;
  parentComment: string | null;
  attachmentKey: string | null;
  teacherFeedback: string | null;
  child: { firstName: string; lastName: string };
};

export function HomeworkAttachments({
  homeworkId,
  attachments,
}: {
  homeworkId: string;
  attachments: Attachment[];
}) {
  const router = useRouter();

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const r = await fetch(`/api/homework/${homeworkId}/attachments`, {
      method: "POST",
      body: form,
    });
    if (!r.ok) {
      toast.error(clientTranslate("common.retry"));
      return;
    }
    toast.success(clientTranslate("common.save"));
    e.currentTarget.reset();
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm(clientTranslate("common.confirm"))) return;
    await fetch(`/api/homework-attachments/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <section className="card" style={{ padding: 24, borderRadius: 20, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <FileText size={20} color="var(--brand)" />
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
          <T k="homework.attachments" />
        </h2>
      </div>

      <form onSubmit={upload} style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
        <input
          name="file"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          required
          style={{ flexGrow: 1, padding: 8 }}
        />
        <button className="button" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Upload size={15} /> <T k="workflow.upload" />
        </button>
      </form>

      {attachments.length === 0 ? (
        <p className="muted" style={{ fontSize: 13.5 }}>Aucun document joint pour ce devoir.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {attachments.map((x) => (
            <div
              key={x.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: "var(--paper)",
                borderRadius: 12,
                border: "1px solid var(--line)",
              }}
            >
              <a
                href={`/api/homework-attachments/${x.id}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                <Download size={16} /> {x.originalName}
                <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                  ({(x.sizeBytes / 1024).toFixed(0)} Ko)
                </span>
              </a>
              <button
                type="button"
                className="button secondary"
                onClick={() => remove(x.id)}
                style={{ padding: "4px 8px", fontSize: 12 }}
                title="Supprimer"
              >
                <Trash2 size={14} color="var(--red)" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function SubmissionReview({
  submissions,
}: {
  submissions: Submission[];
}) {
  const router = useRouter();

  async function review(id: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = await fetch(`/api/homework-submissions/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status: f.get("status"),
        teacherFeedback: f.get("teacherFeedback"),
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
    <section>
      <h2 style={{ fontSize: 18, marginBottom: 16 }}>
        <T k="homework.submissions" /> ({submissions.length})
      </h2>

      {submissions.length === 0 ? (
        <div className="card" style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>
          Aucune remise pour le moment.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {submissions.map((x) => (
            <form className="card form" key={x.id} onSubmit={(e) => review(x.id, e)} style={{ padding: 20, borderRadius: 16 }}>
              <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <strong>
                  👦 {x.child.firstName} {x.child.lastName}
                </strong>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="badge badge-purple" style={{ fontSize: 11 }}>v{x.version}</span>
                  <span className="badge" style={{ fontSize: 12 }}>
                    <StatusText status={x.status} />
                  </span>
                </div>
              </div>

              {x.parentComment && (
                <div style={{ gridColumn: "1/-1", padding: "10px 14px", background: "var(--paper)", borderRadius: 10, fontSize: 13.5 }}>
                  <span className="muted" style={{ fontWeight: 600, display: "block", marginBottom: 2 }}>Commentaire du parent :</span>
                  {x.parentComment}
                </div>
              )}

              {x.attachmentKey && (
                <div style={{ gridColumn: "1/-1" }}>
                  <a
                    href={`/api/homework-submissions/${x.id}/attachment`}
                    className="button secondary"
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 13, padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <Download size={14} /> <T k="workflow.downloadSubmission" />
                  </a>
                </div>
              )}

              <label>
                <span><T k="workflow.decision" /></span>
                <select name="status" defaultValue={x.status}>
                  <option value="REVIEWED">✅ Validé</option>
                  <option value="RETURNED">🔄 À retravailler</option>
                </select>
              </label>

              <label>
                <span>Retour pédagogique à la famille</span>
                <input
                  name="teacherFeedback"
                  defaultValue={x.teacherFeedback || ""}
                  required
                  placeholder="Ex : Très bon travail de reconnaissance des formes !"
                />
              </label>

              <button className="button" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Send size={15} /> <T k="workflow.sendFeedback" />
              </button>
            </form>
          ))}
        </div>
      )}
    </section>
  );
}
