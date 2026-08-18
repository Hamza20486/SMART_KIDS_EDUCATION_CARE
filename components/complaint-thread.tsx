"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { clientTranslate } from "@/lib/i18n/client";
import { T } from "./i18n-provider";
import {
  MessageSquare,
  Paperclip,
  Send,
  UserCheck,
  Lock,
} from "lucide-react";

type Message = {
  id: string;
  message: string;
  internal: boolean;
  createdAt: string;
  sender: { name: string; role: string };
  attachments: { id: string; originalName: string }[];
};

export function ComplaintThread({
  id,
  messages,
  staff = false,
  canInternal = false,
  canAssign = false,
  staffOptions = [],
}: {
  id: string;
  messages: Message[];
  staff?: boolean;
  canInternal?:boolean;
  canAssign?: boolean;
  staffOptions?: { id: string; name: string }[];
}) {
  const router = useRouter();

  async function reply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const r = await fetch(`/api/complaints/${id}/messages`, {
      method: "POST",
      body: new FormData(e.currentTarget),
    });
    if (!r.ok) {
      toast.error(clientTranslate("common.retry"));
      return;
    }
    toast.success(clientTranslate("common.save"));
    e.currentTarget.reset();
    router.refresh();
  }

  async function update(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      id,
      status: f.get("status") || undefined,
      priority: f.get("priority") || undefined,
      assignedToId: f.get("assignedToId") || null,
    };
    const r = await fetch("/api/complaints", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      toast.error(clientTranslate("common.retry"));
      return;
    }
    toast.success(clientTranslate("common.save"));
    router.refresh();
  }

  return (
    <>
      {staff && (
        <form className="card form" onSubmit={update} style={{ padding: 20, borderRadius: 16, marginBottom: 24 }}>
          <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", gap: 8 }}>
            <UserCheck size={18} color="var(--brand)" />
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              <T k="staff.processing" />
            </h2>
          </div>

          <label>
            <span><T k="common.status" /></span>
            <select name="status">
              <option value="IN_PROGRESS"><T k="workflow.inProgress" /></option>
              <option value="RESOLVED"><T k="workflow.resolved" /></option>
              <option value="CLOSED"><T k="workflow.closed" /></option>
            </select>
          </label>

          <label>
            <span><T k="complaints.priority" /></span>
            <select name="priority">
              <option value="LOW"><T k="workflow.low" /></option>
              <option value="NORMAL"><T k="workflow.normal" /></option>
              <option value="HIGH"><T k="workflow.high" /></option>
              <option value="URGENT"><T k="workflow.urgent" /></option>
            </select>
          </label>

          {canAssign && (
            <label>
              <span><T k="workflow.assignedTo" /></span>
              <select name="assignedToId">
                <option value=""><T k="workflow.unassigned" /></option>
                {staffOptions.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button className="button" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <T k="workflow.update" />
          </button>
        </form>
      )}

      {/* Messages List */}
      <section style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
        {messages.map((m) => (
          <article
            className="card"
            key={m.id}
            style={{
              padding: 18,
              borderRadius: 16,
              background: m.internal ? "#fffbeb" : "white",
              border: m.internal ? "1.5px dashed #fcd34d" : "1px solid var(--line)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <strong>{m.sender.name}</strong>
                <span className="badge" style={{ fontSize: 11 }}>{m.sender.role}</span>
                {m.internal && (
                  <span className="badge badge-warning" style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Lock size={11} /> NOTE INTERNE
                  </span>
                )}
              </div>
              <time className="muted" style={{ fontSize: 12 }}>
                {new Date(m.createdAt).toLocaleString("fr-MA", { dateStyle: "short", timeStyle: "short" })}
              </time>
            </div>

            <p style={{ color: "var(--ink)", lineHeight: 1.55, margin: "6px 0 0" }}>{m.message}</p>

            {m.attachments.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                {m.attachments.map((a) => (
                  <a
                    key={a.id}
                    href={`/api/complaint-attachments/${a.id}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "white",
                      border: "1px solid var(--line)",
                      padding: "6px 12px",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <Paperclip size={14} /> {a.originalName}
                  </a>
                ))}
              </div>
            )}
          </article>
        ))}
      </section>

      {/* Reply Form */}
      <form className="card form" onSubmit={reply} style={{ padding: 20, borderRadius: 16 }}>
        <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", gap: 8 }}>
          <MessageSquare size={18} color="var(--brand)" />
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            <T k="workflow.newMessage" />
          </h2>
        </div>

        <label style={{ gridColumn: "1/-1" }}>
          <span><T k="common.message" /></span>
          <textarea
            name="message"
            required
            maxLength={3000}
            rows={3}
            placeholder="Rédigez votre réponse ici..."
            style={{ width: "100%", resize: "vertical" }}
          />
        </label>

        <label>
          <span><T k="workflow.attachment" /></span>
          <input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" />
        </label>

        {canInternal && (
          <label>
            <span><T k="staff.visibility" /></span>
            <select name="internal">
              <option value="false">👨‍👩‍👧 <T k="workflow.visibleToParent" /></option>
              <option value="true">🔒 <T k="complaints.internalNote" /></option>
            </select>
          </label>
        )}

        <button className="button" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Send size={15} /> <T k="common.send" />
        </button>
      </form>
    </>
  );
}
