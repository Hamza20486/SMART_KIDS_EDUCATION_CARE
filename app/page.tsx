import Link from "next/link";
import { getTranslations } from "@/lib/i18n/server";

export default async function Home() {
  const t = await getTranslations();
  return (
    <>
      <header className="shell topbar">
        <div className="brand">Smart Kids <span>Education Care</span></div>
        <nav className="nav">
          <a href="#about">{t("public.about")}</a>
          <a href="tel:+212661282288">06 61 28 22 88</a>
          <Link className="button" href="/login">{t("public.portal")}</Link>
        </nav>
      </header>
      <main className="shell hero">
        <section>
          <div className="eyebrow">{t("public.eyebrow")}</div>
          <h1>{t("public.hero")}</h1>
          <p className="muted">{t("public.heroText")}</p>
          <p><a className="button" href="tel:+212661282288">{t("public.call")}</a></p>
        </section>
        <aside className="hero-card">
          <h2>{t("public.welcome")}</h2>
          <p>📍 Villa 114, Lotissement Fadell-allah, Tit Melil</p>
          <p>📞 06 61 28 22 88</p>
          <p>{t("public.welcomeText")}</p>
        </aside>
      </main>
      <section id="about" className="shell grid">
        <div className="card"><h3>{t("public.awakening")}</h3><p className="muted">{t("public.awakeningText")}</p></div>
        <div className="card"><h3>{t("public.trust")}</h3><p className="muted">{t("public.trustText")}</p></div>
        <div className="card"><h3>{t("public.followup")}</h3><p className="muted">{t("public.followupText")}</p></div>
      </section>
    </>
  );
}
