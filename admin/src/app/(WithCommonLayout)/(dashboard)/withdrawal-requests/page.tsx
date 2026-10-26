import React from "react";
import WithdrawalRequestsLayout from "@/src/business/dashboard/withdrawal/components/WithdrawalRequestsLayout";

export const metadata = {
  title: "Withdrawal and Payout Requests | Admin Dashboard",
  description: "Manage real-time user, business, and affiliate withdrawal and payout requests",
};

export default function Page() {
  return <WithdrawalRequestsLayout />;
}
