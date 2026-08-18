import Link from "next/link";
import { getTranslations } from "@/lib/i18n/server";
import {
  Phone,
  MapPin,
  Sparkles,
  Shield,
  Heart,
  Clock,
  ArrowRight,
  Baby,
  GraduationCap,
  CheckCircle2,
  Star,
  Camera,
  BookOpen,
  Smile,
  Palette,
  Globe2,
  Utensils,
  CalendarCheck,
  Award,
} from "lucide-react";

export default async function Home() {
  const t = await getTranslations();

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #fffdfa 0%, #f8fafc 100%)" }}>
      {/* Top Banner Notice */}
      <div
        style={{
          background: "linear-gradient(90deg, #ff5e3a, #f59e0b)",
          color: "white",
          padding: "8px 16px",
          textAlign: "center",
          fontSize: "13px",
          fontWeight: 600,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Sparkles size={15} /> Inscriptions ouvertes pour l’année scolaire 2026-2027 • Places limitées !
        </span>
      </div>

      {/* Header */}
      <header className="shell topbar" style={{ paddingTop: 16, paddingBottom: 16 }}>
        <Link href="/" className="brand" style={{ fontSize: 23 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "14px",
              background: "linear-gradient(135deg, #ff5e3a, #f59e0b)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              boxShadow: "0 8px 20px -4px rgba(255, 94, 58, 0.4)",
            }}
          >
            <GraduationCap size={24} />
          </div>
          <div>
            Smart Kids <span style={{ color: "var(--brand)" }}>Education Care</span>
          </div>
        </Link>
        <nav className="nav">
          <a href="#about" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Sparkles size={15} color="var(--brand)" /> {t("public.about")}
          </a>
          <a href="#programme">{t("public.awakening")} & Pédagogie</a>
          <a href="#contact">Contact</a>
          <a
            href="tel:+212661282288"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "white",
              border: "1px solid var(--line)",
              boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
            }}
          >
            <Phone size={14} color="var(--brand)" /> 06 61 28 22 88
          </a>
          <Link
            className="button"
            href="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              borderRadius: "99px",
            }}
          >
            {t("public.portal")} <ArrowRight size={16} />
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="shell hero" style={{ paddingTop: 24, paddingBottom: 64 }}>
        <section>
          <div className="eyebrow">
            <Sparkles size={14} /> {t("public.eyebrow")}
          </div>
          <h1 style={{ letterSpacing: "-0.03em" }}>{t("public.hero")}</h1>
          <p className="muted" style={{ fontSize: "18px", lineHeight: "1.65", marginBottom: 32 }}>
            {t("public.heroText")}
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 36 }}>
            <a
              className="button"
              href="tel:+212661282288"
              style={{
                fontSize: 15,
                padding: "14px 26px",
                borderRadius: "14px",
              }}
            >
              <Phone size={18} /> {t("public.call")}
            </a>
            <Link
              className="button secondary"
              href="/login"
              style={{
                fontSize: 15,
                padding: "14px 24px",
                borderRadius: "14px",
              }}
            >
              <Baby size={18} color="var(--brand)" /> {t("public.portal")} Parents
            </Link>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              padding: "14px 18px",
              borderRadius: "16px",
              background: "white",
              border: "1px solid var(--line)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
              width: "fit-content",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              {["👦", "👧", "👶", "🧒"].map((emoji, i) => (
                <div
                  key={i}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: ["#ffe4e6", "#fef3c7", "#e0f2fe", "#d1fae5"][i],
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    marginLeft: i > 0 ? -8 : 0,
                    border: "2px solid white",
                  }}
                >
                  {emoji}
                </div>
              ))}
            </div>
            <div style={{ fontSize: "13px" }}>
              <div style={{ fontWeight: 700, color: "var(--ink)" }}>+500 Enfants Accompagnés</div>
              <div style={{ color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
                <Star size={13} fill="#f59e0b" color="#f59e0b" />
                <Star size={13} fill="#f59e0b" color="#f59e0b" />
                <Star size={13} fill="#f59e0b" color="#f59e0b" />
                <Star size={13} fill="#f59e0b" color="#f59e0b" />
                <Star size={13} fill="#f59e0b" color="#f59e0b" />
                <span style={{ fontWeight: 600, color: "#1e293b" }}>4.9/5</span> satisfaction familles
              </div>
            </div>
          </div>
        </section>

        {/* Hero Interactive Preview Card */}
        <aside
          className="hero-card"
          style={{
            padding: 28,
            borderRadius: 24,
            background: "white",
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
              paddingBottom: 14,
              borderBottom: "1px solid var(--line)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #fbcfe8, #f472b6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  boxShadow: "0 4px 10px rgba(236,72,153,0.2)",
                }}
              >
                👧
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Yasmine Bennani</h3>
                <span className="badge badge-purple" style={{ fontSize: 11 }}>
                  ⭐ Section Les Étoiles (3–4 ans)
                </span>
              </div>
            </div>
            <span className="badge badge-present" style={{ fontSize: 12 }}>
              <CheckCircle2 size={13} /> Présente • 08:30
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 14,
                background: "var(--paper)",
                border: "1px solid var(--line)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  <Palette size={15} color="var(--brand)" /> Atelier du jour
                </span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>10:00</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                Peinture végétale & découverte des textures
              </p>
            </div>

            <div
              style={{
                padding: "12px 14px",
                borderRadius: 14,
                background: "var(--paper)",
                border: "1px solid var(--line)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  <Utensils size={15} color="#f59e0b" /> Déjeuner & Repas
                </span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>12:15</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
                Purée de potiron bio, filet de colin & compote de pommes
              </p>
            </div>
          </div>

          <div
            style={{
              padding: "14px 16px",
              borderRadius: 16,
              background: "linear-gradient(135deg, #fff7ed, #ffedd5)",
              border: "1px solid #fed7aa",
              fontSize: 13,
              color: "#9a3412",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <Camera size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>{t("public.welcome")}</strong>
              <div style={{ marginTop: 4, color: "#7c2d12" }}>
                📍 Villa 114, Lotissement Fadell-allah, Tit Melil
              </div>
              <div style={{ marginTop: 2, color: "#7c2d12" }}>📞 06 61 28 22 88</div>
              <p style={{ margin: "6px 0 0", color: "#9a3412" }}>{t("public.welcomeText")}</p>
            </div>
          </div>
        </aside>
      </main>

      {/* Key Highlights Strip */}
      <section
        style={{
          background: "white",
          borderTop: "1px solid var(--line)",
          borderBottom: "1px solid var(--line)",
          padding: "36px 0",
        }}
      >
        <div className="shell grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "var(--brand-light)",
                color: "var(--brand)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Baby size={24} />
            </div>
            <div>
              <strong style={{ display: "block", fontSize: 20 }}>0 à 6 ans</strong>
              <span className="muted">Crèche & Maternelle</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "var(--teal-light)",
                color: "var(--teal)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Award size={24} />
            </div>
            <div>
              <strong style={{ display: "block", fontSize: 20 }}>100% Diplômés</strong>
              <span className="muted">Éducatrices certifiées</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "var(--brand2-light)",
                color: "var(--brand2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Shield size={24} />
            </div>
            <div>
              <strong style={{ display: "block", fontSize: 20 }}>Sécurité Maximale</strong>
              <span className="muted">Locaux aux normes</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "var(--purple-light)",
                color: "var(--purple)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <CalendarCheck size={24} />
            </div>
            <div>
              <strong style={{ display: "block", fontSize: 20 }}>Suivi en Direct</strong>
              <span className="muted">Portail famille 24/7</span>
            </div>
          </div>
        </div>
      </section>

      {/* About & Educational Pillars */}
      <section id="about" className="shell" style={{ padding: "72px 24px" }}>
        <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 48px" }}>
          <div className="eyebrow" style={{ display: "inline-flex" }}>
            <Heart size={14} /> Notre Projet Pédagogique
          </div>
          <h2 style={{ fontSize: 32, letterSpacing: "-0.02em", marginTop: 8 }}>
            Un univers pensé pour le bien-être et l’épanouissement
          </h2>
          <p className="muted" style={{ fontSize: 16 }}>
            Nous combinons bienveillance affective et éveil intellectuel pour préparer votre enfant à entrer dans la vie avec confiance et curiosité.
          </p>
        </div>

        <div className="grid">
          {/* Card 1 */}
          <div className="card" style={{ padding: 28 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: "linear-gradient(135deg, #ff5e3a, #ff8a73)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
                boxShadow: "0 6px 16px -2px rgba(255,94,58,0.3)",
              }}
            >
              <Palette size={26} />
            </div>
            <h3 style={{ fontSize: 20, marginBottom: 8 }}>{t("public.awakening")}</h3>
            <p className="muted" style={{ lineHeight: 1.6 }}>{t("public.awakeningText")}</p>
            <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 0", display: "flex", flexDirection: "column", gap: 8, fontSize: 13.5, color: "var(--ink-light)" }}>
              <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={15} color="var(--brand)" /> Motricité globale et fine
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={15} color="var(--brand)" /> Ateliers musique & expression corporelle
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={15} color="var(--brand)" /> Éveil sensoriel et manipulation
              </li>
            </ul>
          </div>

          {/* Card 2 */}
          <div className="card" style={{ padding: 28 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: "linear-gradient(135deg, #0d9488, #2dd4bf)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
                boxShadow: "0 6px 16px -2px rgba(13,148,136,0.3)",
              }}
            >
              <Shield size={26} />
            </div>
            <h3 style={{ fontSize: 20, marginBottom: 8 }}>{t("public.trust")}</h3>
            <p className="muted" style={{ lineHeight: 1.6 }}>{t("public.trustText")}</p>
            <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 0", display: "flex", flexDirection: "column", gap: 8, fontSize: 13.5, color: "var(--ink-light)" }}>
              <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={15} color="var(--teal)" /> Ratio éducatrices/enfants optimal
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={15} color="var(--teal)" /> Contrôle strict des entrées/sorties
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={15} color="var(--teal)" /> Écoute attentive & soutien parental
              </li>
            </ul>
          </div>

          {/* Card 3 */}
          <div className="card" style={{ padding: 28 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: "linear-gradient(135deg, #4f46e5, #818cf8)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
                boxShadow: "0 6px 16px -2px rgba(79,70,229,0.3)",
              }}
            >
              <Clock size={26} />
            </div>
            <h3 style={{ fontSize: 20, marginBottom: 8 }}>{t("public.followup")}</h3>
            <p className="muted" style={{ lineHeight: 1.6 }}>{t("public.followupText")}</p>
            <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 0", display: "flex", flexDirection: "column", gap: 8, fontSize: 13.5, color: "var(--ink-light)" }}>
              <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={15} color="var(--indigo)" /> Pointage des arrivées et départs
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={15} color="var(--indigo)" /> Photos & comptes-rendus d’activités
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={15} color="var(--indigo)" /> Gestion des devoirs & absences en ligne
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Additional Program Pillars */}
      <section id="programme" style={{ background: "#f8fafc", padding: "64px 0", borderTop: "1px solid var(--line)" }}>
        <div className="shell">
          <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 40px" }}>
            <h2 style={{ fontSize: 28 }}>Une prise en charge complète pour chaque enfant</h2>
            <p className="muted">De la motricité aux repas sains, tout est pensé pour son équilibre quotidien.</p>
          </div>

          <div className="grid">
            <div className="card" style={{ display: "flex", gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--brand2-light)", color: "var(--brand2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Globe2 size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: 17, marginBottom: 4 }}>Bilinguisme Précoce</h3>
                <p className="muted" style={{ fontSize: 13.5 }}>Immersion naturelle en Français et Arabe avec initiation aux sonorités de l’Anglais.</p>
              </div>
            </div>

            <div className="card" style={{ display: "flex", gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--pink-light)", color: "var(--pink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Utensils size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: 17, marginBottom: 4 }}>Nutrition Saine & Bio</h3>
                <p className="muted" style={{ fontSize: 13.5 }}>Repas équilibrés préparés avec soin, collations vitaminées et respect des régimes spécifiques.</p>
              </div>
            </div>

            <div className="card" style={{ display: "flex", gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--teal-light)", color: "var(--teal)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <BookOpen size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: 17, marginBottom: 4 }}>Pédagogie Positive</h3>
                <p className="muted" style={{ fontSize: 13.5 }}>Encouragement constant, développement de l’autonomie et valorisation de chaque progrès.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Parents Testimonials */}
      <section className="shell" style={{ padding: "72px 24px" }}>
        <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 48px" }}>
          <div className="eyebrow" style={{ display: "inline-flex" }}>
            <Smile size={14} /> Témoignages
          </div>
          <h2 style={{ fontSize: 30 }}>La confiance de nos familles</h2>
          <p className="muted">Découvrez les retours des parents qui nous confient leurs enfants chaque jour.</p>
        </div>

        <div className="grid">
          <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", gap: 2, color: "#f59e0b", marginBottom: 12 }}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill="#f59e0b" />
                ))}
              </div>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--ink-light)", fontStyle: "italic" }}>
                « Une équipe formidable ! Ma fille Yasmine a fait des progrès immenses en expression et en autonomie. Le portail en ligne avec les photos quotidiennes nous rassure tellement. »
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#fbcfe8", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#9d174d", fontSize: 13 }}>
                SB
              </div>
              <div>
                <strong style={{ fontSize: 14, display: "block" }}>Sara Bennani</strong>
                <span className="muted" style={{ fontSize: 12 }}>Maman de Yasmine (3 ans)</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", gap: 2, color: "#f59e0b", marginBottom: 12 }}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill="#f59e0b" />
                ))}
              </div>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--ink-light)", fontStyle: "italic" }}>
                « Locaux neufs, hygiène irréprochable et un personnel très à l’écoute. Les activités manuelles et le bilinguisme précoce sont un vrai plus à Tit Melil. »
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#bae6fd", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#0369a1", fontSize: 13 }}>
                ME
              </div>
              <div>
                <strong style={{ fontSize: 14, display: "block" }}>Mehdi El Fassi</strong>
                <span className="muted" style={{ fontSize: 12 }}>Papa de Rayan (4 ans)</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", gap: 2, color: "#f59e0b", marginBottom: 12 }}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill="#f59e0b" />
                ))}
              </div>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--ink-light)", fontStyle: "italic" }}>
                « Mon fils était très timide avant de rejoindre la crèche Smart Kids. Aujourd’hui il a hâte d’y aller chaque matin retrouver ses copains et ses maîtresses ! »
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#065f46", fontSize: 13 }}>
                LT
              </div>
              <div>
                <strong style={{ fontSize: 14, display: "block" }}>Leila Tazi</strong>
                <span className="muted" style={{ fontSize: 12 }}>Maman d’Adam (2 ans)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA & Contact Box */}
      <section id="contact" className="shell" style={{ paddingBottom: 72 }}>
        <div
          style={{
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            borderRadius: 24,
            color: "white",
            padding: "48px 40px",
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr",
            gap: 36,
            alignItems: "center",
            boxShadow: "0 20px 40px rgba(15, 23, 42, 0.15)",
          }}
        >
          <div>
            <span
              style={{
                display: "inline-block",
                padding: "6px 14px",
                borderRadius: "99px",
                background: "rgba(255, 94, 58, 0.2)",
                color: "#ff8a73",
                fontWeight: 700,
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 16,
              }}
            >
              Venez nous rendre visite
            </span>
            <h2 style={{ color: "white", fontSize: 32, marginBottom: 12 }}>
              Prêts à offrir le meilleur à votre enfant ?
            </h2>
            <p style={{ color: "#94a3b8", fontSize: 16, marginBottom: 24 }}>
              Prenez rendez-vous dès aujourd’hui pour visiter notre établissement, rencontrer l’équipe pédagogique et inscrire votre enfant.
            </p>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <a
                className="button"
                href="tel:+212661282288"
                style={{
                  fontSize: 15,
                  padding: "14px 24px",
                  borderRadius: 12,
                }}
              >
                <Phone size={18} /> Appeler le 06 61 28 22 88
              </a>
              <Link
                className="button secondary"
                href="/login"
                style={{
                  fontSize: 15,
                  padding: "14px 24px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.1)",
                  color: "white !important",
                  borderColor: "rgba(255,255,255,0.2)",
                }}
              >
                Accéder au Portail <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <div
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 20,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <MapPin size={20} color="#ff5e3a" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ display: "block", color: "white", fontSize: 14 }}>Adresse</strong>
                <span style={{ color: "#94a3b8", fontSize: 13.5 }}>Villa 114, Lotissement Fadell-allah, Tit Melil, Casablanca</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <Phone size={20} color="#ff5e3a" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ display: "block", color: "white", fontSize: 14 }}>Téléphone direct</strong>
                <span style={{ color: "#94a3b8", fontSize: 13.5 }}>06 61 28 22 88 / contact@smartkids.ma</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <Clock size={20} color="#ff5e3a" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ display: "block", color: "white", fontSize: 14 }}>Horaires d’accueil</strong>
                <span style={{ color: "#94a3b8", fontSize: 13.5 }}>Lundi – Vendredi : 07:30 – 18:30</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          background: "white",
          borderTop: "1px solid var(--line)",
          padding: "32px 0",
          fontSize: 13.5,
          color: "var(--muted)",
        }}
      >
        <div className="shell" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 800, color: "var(--ink)", fontSize: 15 }}>Smart Kids</span>
            <span>• Crèche & Maternelle d’Excellence</span>
          </div>
          <div>© {new Date().getFullYear()} Smart Kids Education Care. Tous droits réservés.</div>
          <div style={{ display: "flex", gap: 16 }}>
            <Link href="/login" style={{ color: "var(--brand)", fontWeight: 600 }}>Portail Famille</Link>
            <a href="#about" style={{ color: "var(--muted)" }}>À propos</a>
            <a href="tel:+212661282288" style={{ color: "var(--muted)" }}>06 61 28 22 88</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
