"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "./i18n-provider";

export function MediaConsentButton({ childId, granted }: { childId: string; granted: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  async function change() {
    const status = granted ? "REVOKED" : "GRANTED";
    if (!confirm(t(granted ? "parent.revokeMediaConfirm" : "parent.allowMediaConfirm"))) return;
    const response = await fetch("/api/parent/media-consent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ childId, status }),
    });
    if (!response.ok) {
      toast.error(t("common.retry"));
      return;
    }
    toast.success(t("common.save"));
    router.refresh();
  }
  return (
    <button className={granted ? "button secondary" : "button"} onClick={change}>
      {t(granted ? "parent.revokeMedia" : "parent.allowMedia")}
    </button>
  );
}
