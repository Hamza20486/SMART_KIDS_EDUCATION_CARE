import { getAuthContext } from "@/lib/auth-context";
import { paymentsRepository } from "@/lib/repositories/payments";
import { getLocale, getTranslations } from "@/lib/i18n/server";
import { formatDate, formatMoney } from "@/lib/i18n/format";
import { localizeStatus } from "@/lib/i18n";

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
      {rows.map((payment) => {
        const paid = payment.transactions.reduce(
          (total, transaction) => total + transaction.amountCentimes,
          0,
        );
        return (
          <article className="card" key={payment.id} style={{ marginBottom: 20 }}>
            <span className="badge">{localizeStatus(t, payment.status)}</span>
            <h2>
              {payment.child.firstName} —{" "}
              {payment.category?.name || payment.description || t("payments.fees")}
            </h2>
            <p>
              {t("payments.dueLabel", {
                date: formatDate(locale, payment.dueDate),
              })}
            </p>
            <p>
              {t("payments.summary", {
                amount: formatMoney(locale, payment.amountCentimes),
                paid: formatMoney(locale, paid),
                remaining: formatMoney(
                  locale,
                  Math.max(0, payment.amountCentimes - paid),
                ),
              })}
            </p>
            {payment.receipts
              .filter((receipt) => receipt.status === "ISSUED")
              .map((receipt) => (
                <p key={receipt.id}>
                  <a href={`/api/payment-receipts/${receipt.id}`}>
                    {t("payments.downloadReceipt", {
                      number: receipt.receiptNumber,
                    })}
                  </a>
                </p>
              ))}
          </article>
        );
      })}
    </>
  );
}
