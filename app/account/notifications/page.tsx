import { requireUser } from "@/lib/auth";
import { NotificationCenter } from "@/components/notification-center";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  await requireUser();
  return (
    <main className="shell" style={{ paddingTop: 40, paddingBottom: 80 }}>
      <NotificationCenter />
    </main>
  );
}
