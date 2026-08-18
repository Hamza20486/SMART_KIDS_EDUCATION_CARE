import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { subscriptionLifecycleSweep } from "@/lib/inngest/subscription-functions";
import {
  absenceStartFollowup,
  complaintSlaEscalation,
  homeworkDueReminder,
  notificationOutboxDispatch,
  notificationWorkerSweep,
  paymentDueSweep,
  paymentOverdueSweep,
} from "@/lib/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    notificationOutboxDispatch,
    notificationWorkerSweep,
    homeworkDueReminder,
    absenceStartFollowup,
    complaintSlaEscalation,
    paymentDueSweep,
    paymentOverdueSweep,
    subscriptionLifecycleSweep,
  ],
});
