"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";

export default function Login() {
  const { t } = useI18n();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });
    if (result?.error) {
      setError(t("auth.invalidCredentials"));
      setBusy(false);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="login">
      <form className="card" onSubmit={submit}>
        <div className="brand">Smart Kids <span>Portal</span></div>
        <h1>{t("auth.login")}</h1>
        <p className="muted">{t("auth.secureAccess")}</p>
        {error && <p className="error">{error}</p>}
        <label>{t("common.email")}<input name="email" type="email" required defaultValue="admin@smartkids.ma" /></label>
        <label>{t("auth.password")}<input name="password" type="password" required defaultValue="SmartKids2026!" /></label>
        <button className="button" disabled={busy}>{busy ? t("auth.signingIn") : t("auth.login")}</button>
        <p><a href="/forgot-password">{t("auth.forgotPassword")}</a></p>
        <p className="notice">{t("auth.demo")}</p>
      </form>
    </main>
  );
}
