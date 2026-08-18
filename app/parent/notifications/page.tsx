import { redirect } from "next/navigation";

export default function ParentNotificationsRedirect() {
  redirect("/account/notifications");
}
