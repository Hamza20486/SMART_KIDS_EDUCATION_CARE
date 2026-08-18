"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body>
        <main className="login">
          <section className="card">
            <div className="brand">Smart Kids</div>
            <h1>Une erreur est survenue</h1>
            <p className="muted">L’incident a été enregistré. Veuillez réessayer.</p>
            <button className="button" onClick={reset}>Réessayer</button>
          </section>
        </main>
      </body>
    </html>
  );
}
