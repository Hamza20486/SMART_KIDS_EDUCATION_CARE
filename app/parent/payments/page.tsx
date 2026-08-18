import { getAuthContext } from "@/lib/auth-context";
import { paymentsRepository } from "@/lib/repositories/payments";
import { getLocale, getTranslations } from "@/lib/i18n/server";
import { formatDate, formatMoney } from "@/lib/i18n/format";
import { localizeStatus } from "@/lib/i18n";
import { CreditCard, Download, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ParentPaymentsPage() {
  const [context, t, locale] = await Promise.all([
    getAuthContext(),
    getTranslations(),
    getLocale(),
  ]);
  const rows = await paymentsRepository.list(context);

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>{t("navigation.payments")}</h1>
          <p className="muted">{t("parent.paymentsSubtitle")}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--muted)" }}>
          <CreditCard size={36} strokeWidth={1.5} style={{ margin: "0 auto 10px" }} />
          <p>Aucun paiement ou obligation en cours.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {rows.map((payment) => {
            const paid = payment.transactions.reduce(
              (total, transaction) => total + transaction.amountCentimes,
              0,
            );
            const remaining = Math.max(0, payment.amountCentimes - paid);
            const isPaid = payment.status === "PAID" || remaining === 0;

            return (
              <article
                className="card"
                key={payment.id}
                style={{
                  padding: 24,
                  borderRadius: 20,
                  boxShadow: "var(--shadow-sm)",
                  borderLeft: isPaid ? "4px solid #10b981" : "4px solid #f59e0b",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <span
                      className={`badge ${
                        payment.status === "PAID"
                          ? "badge-success"
                          : payment.status === "PENDING"
                          ? "badge-warning"
                          : "badge-danger"
                      }`}
                      style={{ marginBottom: 6 }}
                    >
                      {localizeStatus(t, payment.status)}
                    </span>
                    <h2 style={{ fontSize: 18, margin: "4px 0 2px" }}>
                      {payment.child.firstName} —{" "}
                      {payment.category?.name || payment.description || t("payments.fees")}
                    </h2>
                    <p className="muted" style={{ margin: 0, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                      <Calendar size={13} />
                      {t("payments.dueLabel", {
                        date: formatDate(locale, payment.dueDate),
                      })}
                    </p>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)" }}>
                      {formatMoney(locale, payment.amountCentimes)}
                    </div>
                    <div style={{ fontSize: 12.5, color: isPaid ? "#059669" : "#d97706", fontWeight: 600 }}>
                      {isPaid ? "✅ Réglé en totalité" : `Reste : ${formatMoney(locale, remaining)}`}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: "var(--paper)",
                    padding: "12px 16px",
                    borderRadius: 12,
                    marginBottom: 16,
                    fontSize: 13.5,
                  }}
                >
                  {t("payments.summary", {
                    amount: formatMoney(locale, payment.amountCentimes),
                    paid: formatMoney(locale, paid),
                    remaining: formatMoney(locale, remaining),
                  })}
                </div>

                {payment.receipts.filter((receipt) => receipt.status === "ISSUED").length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 12, borderTop: "1px solid var(--line-subtle)" }}>
                    {payment.receipts
                      .filter((receipt) => receipt.status === "ISSUED")
                      .map((receipt) => (
                        <a
                          key={receipt.id}
                          href={`/api/payment-receipts/${receipt.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="button secondary"
                          style={{
                            fontSize: 13,
                            padding: "6px 14px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Download size={14} />
                          {t("payments.downloadReceipt", {
                            number: receipt.receiptNumber,
                          })}
                        </a>
                      ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
