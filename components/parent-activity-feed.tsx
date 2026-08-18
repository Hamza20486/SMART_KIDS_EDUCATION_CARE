"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { useI18n } from "./i18n-provider";
import { formatDate } from "@/lib/i18n/format";
import { Sparkles, Calendar, Loader2, Inbox } from "lucide-react";

type Activity = {
  id: string;
  title: string;
  description: string;
  activityDate: string;
  class: { name: string } | null;
  child: { firstName: string } | null;
  media: { id: string; caption: string | null }[];
};

export function ParentActivityFeed() {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/parent/activities")
      .then((r) => (r.ok ? r.json() : []))
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48, color: "var(--muted)" }}>
        <Loader2 size={24} className="animate-spin" style={{ marginRight: 10 }} />
        <span>{t("common.loading")}</span>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--muted)" }}>
        <Inbox size={36} strokeWidth={1.5} style={{ margin: "0 auto 12px" }} />
        <p>{t("common.noData")}</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {rows.map((x) => (
        <article
          className="card"
          key={x.id}
          style={{
            padding: 24,
            borderRadius: 20,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {/* Card Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
              paddingBottom: 12,
              borderBottom: "1px solid var(--line-subtle)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="badge badge-purple" style={{ fontSize: 12 }}>
                <Sparkles size={13} /> {x.class?.name || x.child?.firstName || "Activité"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)" }}>
              <Calendar size={14} />
              <time>{formatDate(locale, x.activityDate)}</time>
            </div>
          </div>

          <h2 style={{ fontSize: 19, margin: "0 0 8px" }}>{x.title}</h2>
          <p style={{ color: "var(--ink-light)", lineHeight: 1.6, fontSize: 14.5, marginBottom: x.media.length > 0 ? 18 : 0 }}>
            {x.description}
          </p>

          {/* Media Grid */}
          {x.media.length > 0 && (
            <div
              className="grid"
              style={{
                gridTemplateColumns: x.media.length === 1 ? "1fr" : "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 16,
                marginTop: 16,
              }}
            >
              {x.media.map((m) => (
                <figure
                  key={m.id}
                  style={{
                    margin: 0,
                    borderRadius: 16,
                    overflow: "hidden",
                    border: "1px solid var(--line)",
                    background: "var(--paper)",
                  }}
                >
                  <img
                    src={`/api/activity-media/${m.id}`}
                    alt={m.caption || x.title}
                    style={{
                      width: "100%",
                      aspectRatio: "4/3",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                  {m.caption && (
                    <figcaption
                      style={{
                        padding: "10px 14px",
                        fontSize: 13,
                        color: "var(--muted)",
                        background: "white",
                        borderTop: "1px solid var(--line-subtle)",
                      }}
                    >
                      {m.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
