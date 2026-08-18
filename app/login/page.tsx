"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";

const DEMO_ROLES = [
  {
    role: "Admin",
    email: "admin@smartkids.ma",
    label: "👑 Admin",
    desc: "Directeur d'établissement",
  },
  {
    role: "Manager",
    email: "manager@smartkids.ma",
    label: "🏫 Manager",
    desc: "Coordinateur pédagogique",
  },
  {
    role: "Enseignant",
    email: "teacher@smartkids.ma",
    label: "👩‍🏫 Enseignant",
    desc: "Section Les Étoiles",
  },
  {
    role: "Parent",
    email: "parent@smartkids.ma",
    label: "👨‍👩‍👧 Parent",
    desc: "Espace Famille (Yasmine)",
  },
  {
    role: "Comptable",
    email: "accountant@smartkids.ma",
    label: "💼 Comptable",
    desc: "Gestion financière",
  },
];

export default function Login() {
  const { t } = useI18n();
  const [email, setEmail] = useState("admin@smartkids.ma");
  const [password, setPassword] = useState("SmartKids2026!");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const targetEmail = String(form.get("email") || email);
    const targetPassword = String(form.get("password") || password);

    const result = await signIn("credentials", {
      email: targetEmail,
      password: targetPassword,
      redirect: false,
    });

    if (result?.error) {
      setError(t("auth.invalidCredentials"));
      setBusy(false);
      return;
    }

    if (targetEmail.includes("parent")) {
      router.push("/parent");
    } else {
      router.push("/admin");
    }
    router.refresh();
  }

  function pickDemoRole(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("SmartKids2026!");
    setError("");
  }

  return (
    <main className="login">
      <div className="login-wrapper">
        {/* Left Visual Hero Banner */}
        <div className="login-banner">
          <div>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: "white",
                textDecoration: "none",
                fontSize: 13.5,
                fontWeight: 600,
                background: "rgba(255, 255, 255, 0.15)",
                padding: "6px 14px",
                borderRadius: "99px",
                marginBottom: 32,
              }}
            >
              <ArrowLeft size={15} /> Retour au site
            </Link>

            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                background: "white",
                color: "var(--brand)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
              }}
            >
              <GraduationCap size={32} />
            </div>

            <h2 style={{ color: "white", fontSize: 28, fontWeight: 800, lineHeight: 1.2, marginBottom: 12 }}>
              Smart Kids <br />
              <span style={{ opacity: 0.9 }}>Education Care</span>
            </h2>
            <p style={{ opacity: 0.9, fontSize: 15, lineHeight: 1.5, marginBottom: 32 }}>
              Plateforme tout-en-un pour la gestion de crèche, le suivi pédagogique et la communication avec les familles.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CheckCircle2 size={18} color="white" />
                <span>Pointage & présences en temps réel</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CheckCircle2 size={18} color="white" />
                <span>Photos d’activités & cahier de liaison</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CheckCircle2 size={18} color="white" />
                <span>Paiements, reçus & facturation</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CheckCircle2 size={18} color="white" />
                <span>Demandes d’absences & messagerie</span>
              </div>
            </div>
          </div>

          <div
            style={{
              padding: "14px 18px",
              borderRadius: 14,
              background: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(10px)",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 32,
            }}
          >
            <ShieldCheck size={20} />
            <span>Environnement sécurisé et conforme RGPD</span>
          </div>
        </div>

        {/* Right Form Container */}
        <div className="login-form-side">
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: "var(--brand)",
                background: "var(--brand-light)",
                padding: "4px 12px",
                borderRadius: "99px",
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              <Sparkles size={13} /> {t("auth.secureAccess")}
            </div>
            <h1 style={{ fontSize: 26, margin: 0 }}>{t("auth.login")}</h1>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
              Entrez vos identifiants pour vous connecter à votre portail.
            </p>
          </div>

          {/* Quick Demo Switcher */}
          <div
            style={{
              background: "var(--paper)",
              border: "1px solid var(--line)",
              borderRadius: 14,
              padding: "12px",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Sparkles size={13} color="var(--brand2)" /> {t("auth.demo")}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {DEMO_ROLES.map((d) => (
                <button
                  key={d.role}
                  type="button"
                  onClick={() => pickDemoRole(d.email)}
                  style={{
                    border: email === d.email ? "1.5px solid var(--brand)" : "1px solid var(--line)",
                    background: email === d.email ? "var(--brand-light)" : "white",
                    color: email === d.email ? "var(--brand)" : "var(--ink)",
                    padding: "5px 10px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  title={d.desc}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="error">{error}</div>}

          <form onSubmit={submit}>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "var(--ink)",
                  marginBottom: 6,
                }}
              >
                {t("common.email")}
              </label>
              <div style={{ position: "relative" }}>
                <Mail
                  size={18}
                  color="var(--muted)"
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 14px 11px 42px",
                    border: "1.5px solid var(--line)",
                    borderRadius: "12px",
                    fontSize: 14,
                    fontFamily: "inherit",
                  }}
                  placeholder="votre@email.com"
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label
                  style={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: "var(--ink)",
                  }}
                >
                  {t("auth.password")}
                </label>
                <Link
                  href="/forgot-password"
                  style={{
                    fontSize: 12.5,
                    color: "var(--brand)",
                    fontWeight: 600,
                  }}
                >
                  {t("auth.forgotPassword")}
                </Link>
              </div>
              <div style={{ position: "relative" }}>
                <Lock
                  size={18}
                  color="var(--muted)"
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 42px 11px 42px",
                    border: "1.5px solid var(--line)",
                    borderRadius: "12px",
                    fontSize: 14,
                    fontFamily: "inherit",
                  }}
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--muted)",
                    padding: 4,
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              className="button"
              disabled={busy}
              style={{
                width: "100%",
                padding: "12px 20px",
                borderRadius: "12px",
                fontSize: "15px",
                fontWeight: 700,
              }}
            >
              {busy ? (
                t("auth.signingIn")
              ) : (
                <>
                  {t("auth.login")} <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div
            style={{
              marginTop: 24,
              paddingTop: 16,
              borderTop: "1px solid var(--line)",
              textAlign: "center",
              fontSize: 13,
              color: "var(--muted)",
            }}
          >
            Besoin d’aide ou inscription ?{" "}
            <a href="tel:+212661282288" style={{ fontWeight: 600, color: "var(--brand)" }}>
              Contactez l’école au 06 61 28 22 88
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
