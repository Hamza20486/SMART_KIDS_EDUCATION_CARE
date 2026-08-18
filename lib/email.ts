import { Resend } from "resend";

function client() {
  return process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character]!,
  );
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<string | null> {
  const resend = client();
  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is required");
    }
    console.info(`[DEV EMAIL] ${subject} -> ${to}\n${html.replace(/<[^>]+>/g, " ")}`);
    return "development-preview";
  }
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || "Smart Kids <no-reply@example.com>",
    to,
    subject,
    html,
  });
  if (error) throw new Error(`Email delivery failed: ${error.message}`);
  return data?.id ?? null;
}

export function sendInvitationEmail(
  to: string,
  name: string,
  url: string,
  organization: string,
) {
  return sendEmail(
    to,
    `Invitation — ${organization}`,
    `<p>Bonjour ${escapeHtml(name)},</p><p>Vous êtes invité(e) à rejoindre ${escapeHtml(organization)}.</p><p><a href="${escapeHtml(url)}">Créer mon compte</a></p><p>Ce lien expire dans 48 heures et ne peut être utilisé qu’une fois.</p>`,
  );
}

export function sendPasswordResetEmail(to: string, url: string) {
  return sendEmail(
    to,
    "Réinitialisation du mot de passe",
    `<p>Une demande de réinitialisation a été reçue.</p><p><a href="${escapeHtml(url)}">Choisir un nouveau mot de passe</a></p><p>Ce lien expire dans 30 minutes. Ignorez ce message si vous n’êtes pas à l’origine de la demande.</p>`,
  );
}

export function sendNotificationEmail(input: {
  to: string;
  recipientName: string;
  organizationName: string;
  title: string;
  message: string;
}) {
  return sendEmail(
    input.to,
    `${input.title} — ${input.organizationName}`,
    `<p>Bonjour ${escapeHtml(input.recipientName)},</p><h2>${escapeHtml(input.title)}</h2><p>${escapeHtml(input.message)}</p><p>Connectez-vous à votre espace Smart Kids pour consulter les détails.</p>`,
  );
}
