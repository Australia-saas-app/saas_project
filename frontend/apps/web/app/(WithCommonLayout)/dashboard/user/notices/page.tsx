import type { Metadata } from "next";
import DashboardNotificationsLayout from "@/src/modules/dashboard/shared/components/DashboardNotificationsLayout";

export const metadata: Metadata = {
  title: "Notifications",
  description: "View and manage all your account notifications",
};

export default function UserNoticesPage() {
  return <DashboardNotificationsLayout title="Notifications" subtitle="Stay updated with your latest account activity, approvals, and alerts." />;
}
