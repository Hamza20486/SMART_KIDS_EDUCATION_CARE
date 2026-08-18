"use client";

import { clientTranslate } from "@/lib/i18n/client";
import { T } from "./i18n-provider";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Upload, Trash2, Loader2, Image as ImageIcon } from "lucide-react";

type Media = {
  id: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  sizeBytes: number;
};

export function MediaManager({
  activityId,
  media,
}: {
  activityId: string;
  media: Media[];
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    form.set("activityId", activityId);
    const r = await fetch("/api/activity-media", { method: "POST", body: form });
    setBusy(false);
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
    const r = await fetch(`/api/activity-media/${id}`, { method: "DELETE" });
    if (!r.ok) {
      toast.error(clientTranslate("common.retry"));
      return;
    }
    toast.success(clientTranslate("common.save"));
    router.refresh();
  }

  return (
    <section className="card" style={{ padding: 24, borderRadius: 20, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <Camera size={20} color="var(--brand)" />
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
          <T k="workflow.privateMedia" />
        </h2>
      </div>

      <form className="form" onSubmit={upload} style={{ marginBottom: 24 }}>
        <label>
          <span><T k="workflow.imageTypes" /> (JPEG, PNG, WebP)</span>
          <input name="file" type="file" accept="image/jpeg,image/png,image/webp" required />
        </label>
        <label>
          <span><T k="workflow.caption" /></span>
          <input name="caption" maxLength={300} placeholder="Description ou légende de la photo..." />
        </label>
        <button className="button" disabled={busy} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {busy ? (
            <>
              <Loader2 size={16} className="animate-spin" /> {clientTranslate("common.loading")}
            </>
          ) : (
            <>
              <Upload size={15} /> {clientTranslate("workflow.upload")}
            </>
          )}
        </button>
      </form>

      {media.length === 0 ? (
        <div style={{ textAlign: "center", padding: 24, color: "var(--muted)", background: "var(--paper)", borderRadius: 12 }}>
          <ImageIcon size={32} strokeWidth={1.5} style={{ margin: "0 auto 8px" }} />
          <p style={{ margin: 0, fontSize: 13.5 }}>Aucune photo pour le moment.</p>
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {media.map((x) => (
            <article
              key={x.id}
              style={{
                borderRadius: 16,
                overflow: "hidden",
                border: "1px solid var(--line)",
                background: "white",
                display: "flex",
                flexDirection: "column",
                boxShadow: "var(--shadow-xs)",
              }}
            >
              <img
                src={`/api/activity-media/${x.id}`}
                alt={x.caption || "Média d’activité"}
                style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover" }}
              />
              <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6, flexGrow: 1, justifyContent: "space-between" }}>
                <p style={{ margin: 0, fontSize: 13, color: "var(--ink)" }}>{x.caption || "Sans légende"}</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                  <span className="muted" style={{ fontSize: 11 }}>{(x.sizeBytes / 1024).toFixed(0)} Ko</span>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => remove(x.id)}
                    style={{ padding: "4px 8px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}
                  >
                    <Trash2 size={12} color="var(--red)" /> <T k="common.delete" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
