"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { clientTranslate } from "@/lib/i18n/client";
import { T } from "./i18n-provider";
import { CreditCard, Receipt, Ban, PlusCircle } from "lucide-react";

export function ReceiptReissueButton({ id }: { id: string }) {
  const router = useRouter();

  async function run() {
    if (!confirm(clientTranslate("common.confirm"))) return;
    const r = await fetch(`/api/payment-receipts/${id}`, { method: "POST" });
    if (!r.ok) {
      toast.error(clientTranslate("common.retry"));
      return;
    }
    toast.success(clientTranslate("common.save"));
    router.refresh();
  }

  return (
    <button
      type="button"
      className="button"
      onClick={run}
      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
    >
      <Receipt size={15} /> <T k="payments.reissue" />
    </button>
  );
}

export function ReceiptVoidButton({ id }: { id: string }) {
  const router = useRouter();

  async function run() {
    const reason = prompt(clientTranslate("common.reason"));
    if (!reason) return;
    const r = await fetch(`/api/payment-receipts/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (!r.ok) {
      toast.error(clientTranslate("common.retry"));
      return;
    }
    toast.success(clientTranslate("common.save"));
    router.refresh();
  }

  return (
    <button
      type="button"
      className="button secondary"
      onClick={run}
      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
    >
      <Ban size={15} color="var(--red)" /> <T k="payments.voidReceipt" />
    </button>
  );
}

export function PaymentRecorder({
  paymentId,
  maxDh,
}: {
  paymentId: string;
  maxDh: number;
}) {
  const router = useRouter();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = await fetch("/api/payments/transactions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        paymentId,
        amountDh: f.get("amountDh"),
        method: f.get("method"),
        reference: f.get("reference"),
        notes: f.get("notes"),
      }),
    });
    if (!r.ok) {
      toast.error(clientTranslate("common.retry"));
      return;
    }
    toast.success(clientTranslate("common.save"));
    e.currentTarget.reset();
    router.refresh();
  }

  return (
    <form className="card form" onSubmit={submit} style={{ padding: 24, borderRadius: 20 }}>
      <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "var(--brand2-light)",
            color: "var(--brand2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CreditCard size={20} />
        </div>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
          <T k="payments.recordManual" />
        </h2>
      </div>

      <label>
        <span><T k="payments.amountMad" /></span>
        <input name="amountDh" type="number" min="0.01" max={maxDh} step="0.01" required placeholder="0.00" />
      </label>

      <label>
        <span><T k="payments.method" /></span>
        <select name="method">
          <option value="CASH">💵 Espèces</option>
          <option value="BANK_TRANSFER">🏦 Virement bancaire</option>
          <option value="CHEQUE">📑 Chèque</option>
          <option value="CARD_MANUAL">💳 Carte bancaire</option>
          <option value="OTHER">Autre</option>
        </select>
      </label>

      <label>
        <span><T k="common.reference" /></span>
        <input name="reference" placeholder="N° chèque ou virement..." />
      </label>

      <label>
        <span><T k="common.note" /></span>
        <input name="notes" placeholder="Remarque comptable..." />
      </label>

      <button className="button" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <PlusCircle size={16} /> <T k="payments.recordReceipt" />
      </button>
    </form>
  );
}
