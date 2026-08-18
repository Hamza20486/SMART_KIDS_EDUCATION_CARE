"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "./i18n-provider";
import {
  KeyRound,
  Lock,
  User,
  Shield,
  LogOut,
  Save,
  CheckCircle2,
} from "lucide-react";

async function post(url: string, body: unknown) {
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function ForgotPasswordForm() {
  const { t } = useI18n();
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email"));
    await post("/api/auth/forgot-password", { email });
    setDone(true);
  }

  if (done) {
    return (
      <div
        className="card"
        style={{
          maxWidth: 480,
          margin: "40px auto",
          padding: 32,
          textAlign: "center",
          borderRadius: 24,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "var(--green-light)",
            color: "#059669",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <CheckCircle2 size={26} />
        </div>
        <h2>Email envoyé !</h2>
        <p className="notice" style={{ marginTop: 12 }}>
          {t("auth.genericReset")}
        </p>
      </div>
    );
  }

  return (
    <form
      className="card"
      onSubmit={submit}
      style={{
        maxWidth: 440,
        margin: "40px auto",
        padding: 32,
        borderRadius: 24,
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "var(--brand-light)",
            color: "var(--brand)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <KeyRound size={20} />
        </div>
        <h1 style={{ fontSize: 20, margin: 0 }}>{t("auth.forgotTitle")}</h1>
      </div>
      <p className="muted" style={{ fontSize: 13.5, marginBottom: 20 }}>
        Entrez votre adresse email enregistrée pour recevoir un lien de réinitialisation.
      </p>

      <label style={{ display: "block", marginBottom: 20 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, display: "block", marginBottom: 6 }}>
          {t("common.email")}
        </span>
        <input name="email" type="email" required placeholder="votre@email.com" />
      </label>

      <button className="button" style={{ width: "100%", padding: "12px", borderRadius: 12 }}>
        {t("auth.sendReset")}
      </button>
    </form>
  );
}

export function TokenPasswordForm({
  token,
  invitation = false,
}: {
  token: string;
  invitation?: boolean;
}) {
  const { t } = useI18n();
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password !== String(form.get("confirm"))) {
      setError(t("auth.invalidCredentials"));
      return;
    }
    const response = await post(
      invitation ? "/api/auth/accept-invitation" : "/api/auth/reset-password",
      { token, password },
    );
    if (!response.ok) {
      setError(t("auth.passwordRule"));
      return;
    }
    toast.success(t("common.save"));
    router.push("/login");
  }

  return (
    <form
      className="card"
      onSubmit={submit}
      style={{
        maxWidth: 460,
        margin: "40px auto",
        padding: 32,
        borderRadius: 24,
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "var(--brand-light)",
            color: "var(--brand)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Lock size={20} />
        </div>
        <h1 style={{ fontSize: 20, margin: 0 }}>
          {invitation ? t("auth.profile") : t("auth.newPassword")}
        </h1>
      </div>
      <p className="muted" style={{ fontSize: 13.5, marginBottom: 20 }}>
        {t("auth.passwordRule")}
      </p>

      {error && <div className="error">{error}</div>}

      <label style={{ display: "block", marginBottom: 16 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, display: "block", marginBottom: 6 }}>
          {t("auth.newPassword")}
        </span>
        <input name="password" type="password" minLength={12} required placeholder="••••••••••••" />
      </label>

      <label style={{ display: "block", marginBottom: 24 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, display: "block", marginBottom: 6 }}>
          {t("auth.confirmPassword")}
        </span>
        <input name="confirm" type="password" minLength={12} required placeholder="••••••••••••" />
      </label>

      <button className="button" style={{ width: "100%", padding: "12px", borderRadius: 12 }}>
        {t("common.save")}
      </button>
    </form>
  );
}

export function ProfileForm({ name, phone }: { name: string; phone: string | null }) {
  const { t } = useI18n();

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: form.get("name"), phone: form.get("phone") || null }),
    });
    toast[response.ok ? "success" : "error"](response.ok ? t("common.save") : t("common.retry"));
  }

  return (
    <form className="card form" onSubmit={save} style={{ padding: 24, borderRadius: 20, marginBottom: 24 }}>
      <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <User size={18} color="var(--brand)" />
        <h2 style={{ margin: 0, fontSize: 17 }}>{t("auth.profile")}</h2>
      </div>

      <label>
        <span>{t("common.name")}</span>
        <input name="name" defaultValue={name} required />
      </label>

      <label>
        <span>{t("common.phone")}</span>
        <input name="phone" defaultValue={phone || ""} placeholder="0600000000" />
      </label>

      <button className="button" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <Save size={16} /> {t("common.save")}
      </button>
    </form>
  );
}

export function SecurityForm() {
  const { t } = useI18n();
  const [error, setError] = useState("");
  const router = useRouter();

  async function change(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await post("/api/auth/change-password", {
      currentPassword: form.get("currentPassword"),
      newPassword: form.get("newPassword"),
    });
    if (!response.ok) {
      setError(t("common.retry"));
      return;
    }
    toast.success(t("common.save"));
    router.push("/login");
  }

  async function revoke() {
    await post("/api/auth/revoke-sessions", {});
    toast.success(t("auth.revokeSessions"));
    router.push("/login");
  }

  return (
    <div className="grid">
      <form className="card form" onSubmit={change} style={{ padding: 24, borderRadius: 20 }}>
        <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Lock size={18} color="var(--brand)" />
          <h2 style={{ margin: 0, fontSize: 17 }}>{t("auth.changePassword")}</h2>
        </div>

        {error && <div className="error" style={{ gridColumn: "1/-1" }}>{error}</div>}

        <label style={{ gridColumn: "1/-1" }}>
          <span>{t("auth.currentPassword")}</span>
          <input name="currentPassword" type="password" required placeholder="••••••••••••" />
        </label>

        <label style={{ gridColumn: "1/-1" }}>
          <span>{t("auth.newPassword")} (min. 12 caractères)</span>
          <input name="newPassword" type="password" minLength={12} required placeholder="••••••••••••" />
        </label>

        <button className="button" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Save size={16} /> {t("common.edit")}
        </button>
      </form>

      <section className="card" style={{ padding: 24, borderRadius: 20, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <Shield size={18} color="var(--brand2)" />
            <h2 style={{ margin: 0, fontSize: 17 }}>{t("auth.sessions")}</h2>
          </div>
          <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
            {t("auth.revokeHelp")}
          </p>
        </div>

        <button
          type="button"
          className="button secondary"
          onClick={revoke}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 20 }}
        >
          <LogOut size={15} /> {t("auth.revokeSessions")}
        </button>
      </section>
    </div>
  );
}
