"use client";

import { useLocale } from "@/src/shared/context/locale.provider";
import DashboardMessagesLayout from "@/src/modules/dashboard/shared/components/DashboardMessagesLayout";

export default function AffiliateMessagesLayout() {
  const { t } = useLocale();
  const p = t.affiliatePages.messages;

  return (
    <DashboardMessagesLayout
      role="affiliate"
      title={p.title}
      subtitle={p.subtitle}
      technicalHref="/dashboard/affiliate/technical"
      labels={{
        total: p.total,
        unread: p.unread,
        search: p.search,
        unreadOnly: p.unreadOnly,
        from: p.from,
        project: "Category",
        reply: p.reply,
        archive: p.archive,
        selectMessage: p.selectMessage,
        send: "Send message",
        writeMessage: "Write your message…",
      }}
    />
  );
}
