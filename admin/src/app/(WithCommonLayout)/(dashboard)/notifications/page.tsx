import type { Metadata } from "next";
import AdminNotificationsLayout from "@/src/business/dashboard/notifications/components/AdminNotificationsLayout";

export const metadata: Metadata = {
  title: "Notifications - Admin Dashboard",
  description: "View and manage all system and user notifications",
};

export default function AdminNotificationsPage() {
  return <AdminNotificationsLayout />;
}
