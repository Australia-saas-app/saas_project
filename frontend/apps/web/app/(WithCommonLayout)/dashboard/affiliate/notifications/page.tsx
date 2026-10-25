import type { Metadata } from "next";
import DashboardNotificationsLayout from "@/src/modules/dashboard/shared/components/DashboardNotificationsLayout";

export const metadata: Metadata = {
  title: "Notifications",
  description: "View and manage all your affiliate notifications",
};

export default function AffiliateNotificationsPage() {
  return <DashboardNotificationsLayout title="Affiliate Notifications" subtitle="Stay updated with your latest affiliate commissions, approvals, and alerts." />;
}
