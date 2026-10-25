import type { Metadata } from "next";
import DashboardNotificationsLayout from "@/src/modules/dashboard/shared/components/DashboardNotificationsLayout";

export const metadata: Metadata = {
  title: "Notifications",
  description: "View and manage all your business notifications",
};

export default function BusinessNotificationsPage() {
  return <DashboardNotificationsLayout title="Business Notifications" subtitle="Stay updated with your latest business operations, clients, and alerts." />;
}
