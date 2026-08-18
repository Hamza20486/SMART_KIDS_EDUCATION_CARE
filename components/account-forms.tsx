"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "./i18n-provider";

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
  if (done) return <p className="notice">{t("auth.genericReset")}</p>;
  return (
    <form className="card" onSubmit={submit}>
      <h1>{t("auth.forgotTitle")}</h1>
      <label>{t("common.email")}<input name="email" type="email" required /></label>
      <button className="button">{t("auth.sendReset")}</button>
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
    <form className="card" onSubmit={submit}>
      <h1>{invitation ? t("auth.profile") : t("auth.newPassword")}</h1>
      <p className="muted">{t("auth.passwordRule")}</p>
      {error && <p className="error">{error}</p>}
      <label>{t("auth.newPassword")}<input name="password" type="password" minLength={12} required /></label>
      <label>{t("auth.confirmPassword")}<input name="confirm" type="password" minLength={12} required /></label>
      <button className="button">{t("common.save")}</button>
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
    <form className="card" onSubmit={save}>
      <h2>{t("auth.profile")}</h2>
      <label>{t("common.name")}<input name="name" defaultValue={name} required /></label>
      <label>{t("common.phone")}<input name="phone" defaultValue={phone || ""} /></label>
      <button className="button">{t("common.save")}</button>
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
      <form className="card" onSubmit={change}>
        <h2>{t("auth.changePassword")}</h2>
        {error && <p className="error">{error}</p>}
        <label>{t("auth.currentPassword")}<input name="currentPassword" type="password" required /></label>
        <label>{t("auth.newPassword")}<input name="newPassword" type="password" minLength={12} required /></label>
        <button className="button">{t("common.edit")}</button>
      </form>
      <section className="card">
        <h2>{t("auth.sessions")}</h2>
        <p>{t("auth.revokeHelp")}</p>
        <button className="button secondary" onClick={revoke}>{t("auth.revokeSessions")}</button>
      </section>
    </div>
  );
}
