"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { clientTranslate } from "@/lib/i18n/client";
import { T } from "./i18n-provider";
import {
  CheckCircle2,
  Save,
  Clock,
  UserCheck,
  Loader2,
  Users,
} from "lucide-react";

type Row = {
  id: string;
  firstName: string;
  lastName: string;
  attendance: null | {
    id: string;
    status: string;
    arrivalAt: string | null;
    departureAt: string | null;
    note: string | null;
  };
  pickups: { id: string; name: string; relationship: string }[];
};

export function DailyAttendanceGrid({
  classId,
  date,
  initial,
}: {
  classId: string;
  date: string;
  initial: Row[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(() =>
    initial.map((x) => ({
      ...x,
      status: x.attendance?.status || "PRESENT",
      note: x.attendance?.note || "",
    })),
  );
  const [busy, setBusy] = useState(false);

  function change(id: string, key: "status" | "note", value: string) {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, [key]: value } : x)));
  }

  async function save() {
    setBusy(true);
    const r = await fetch("/api/attendance/daily", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        classId,
        date,
        entries: rows.map((x) => ({
          childId: x.id,
          status: x.status,
          note: x.note,
        })),
      }),
    });
    setBusy(false);
    if (!r.ok) {
      toast.error(clientTranslate("common.retry"));
      return;
    }
    toast.success(clientTranslate("common.save"));
    router.refresh();
  }

  async function time(
    childId: string,
    action: "ARRIVAL"|"DEPARTURE",
    pickupAuthorizationId?: string,
  ) {
    const r = await fetch("/api/attendance/times", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ childId, date, action, pickupAuthorizationId }),
    });
    if (!r.ok) {
      toast.error(action === "DEPARTURE" ? "Personne autorisée requise" : "Action impossible");
      return;
    }
    toast.success(action === "ARRIVAL" ? "Arrivée enregistrée" : "Départ enregistré");
    router.refresh();
  }

  const presentCount = rows.filter((r) => r.status === "PRESENT").length;

  return (
    <>
      <div className="pagehead" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="badge badge-success" style={{ fontSize: 13, padding: "6px 14px" }}>
            <Users size={14} /> {presentCount} / {rows.length} Présents
          </div>
        </div>
        <div className="nav">
          <button
            type="button"
            className="button secondary"
            onClick={() => setRows((r) => r.map((x) => ({ ...x, status: "PRESENT" })))}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <CheckCircle2 size={16} color="var(--brand)" /> <T k="workflow.allPresent" />
          </button>
          <button
            type="button"
            className="button"
            onClick={save}
            disabled={busy}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin" /> {clientTranslate("common.saving")}
              </>
            ) : (
              <>
                <Save size={16} /> {clientTranslate("common.save")}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th><T k="common.child" /></th>
              <th><T k="common.status" /></th>
              <th><T k="common.note" /></th>
              <th><T k="attendance.arrival" /></th>
              <th><T k="workflow.pickupPerson" /></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "var(--brand-light)",
                        color: "var(--brand)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      {x.firstName[0]}
                    </div>
                    <strong>{x.firstName} {x.lastName}</strong>
                  </div>
                </td>
                <td>
                  <select
                    value={x.status}
                    onChange={(e) => change(x.id, "status", e.target.value)}
                    style={{
                      fontWeight: 600,
                      color:
                        x.status === "PRESENT"
                          ? "#065f46"
                          : x.status === "ABSENT"
                          ? "#991b1b"
                          : x.status === "LATE"
                          ? "#92400e"
                          : "#075985",
                    }}
                  >
                    <option value="PRESENT">✅ Présent</option>
                    <option value="ABSENT">❌ Absent</option>
                    <option value="LATE">⏱️ En retard</option>
                    <option value="EXCUSED">📄 Excusé</option>
                  </select>
                </td>
                <td>
                  <input
                    value={x.note}
                    onChange={(e) => change(x.id, "note", e.target.value)}
                    maxLength={500}
                    placeholder="Remarque facultative..."
                    style={{ width: "100%" }}
                  />
                </td>
                <td>
                  {x.attendance?.arrivalAt ? (
                    <span className="badge badge-success" style={{ fontSize: 12 }}>
                      <Clock size={12} /> {new Date(x.attendance.arrivalAt).toLocaleTimeString("fr-MA", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => time(x.id, "ARRIVAL")}
                      style={{ padding: "6px 12px", fontSize: 12 }}
                    >
                      <Clock size={13} /> Pointer arrivée
                    </button>
                  )}
                </td>
                <td>
                  {x.attendance?.departureAt ? (
                    <span className="badge badge-info" style={{ fontSize: 12 }}>
                      <UserCheck size={12} /> {new Date(x.attendance.departureAt).toLocaleTimeString("fr-MA", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  ) : (
                    <Departure
                      childId={x.id}
                      pickups={x.pickups}
                      onSubmit={(id) => time(x.id, "DEPARTURE", id)}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Departure({
  childId,
  pickups,
  onSubmit,
}: {
  childId: string;
  pickups: Row["pickups"];
  onSubmit: (id: string) => void;
}) {
  const [id, setId] = useState("");
  return (
    <div className="nav" style={{ gap: 6 }}>
      <select
        aria-label={`Personne autorisée ${childId}`}
        value={id}
        onChange={(e) => setId(e.target.value)}
        style={{ fontSize: 12, padding: "6px 8px" }}
      >
        <option value=""><T k="workflow.choose" /></option>
        {pickups.map((x) => (
          <option key={x.id} value={x.id}>
            {x.name} ({x.relationship})
          </option>
        ))}
      </select>
      <button
        type="button"
        className="button secondary"
        disabled={!id}
        onClick={() => onSubmit(id)}
        style={{ padding: "6px 10px", fontSize: 12 }}
      >
        <T k="attendance.departure" />
      </button>
    </div>
  );
}
