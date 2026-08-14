"use client";

import { useLocale } from "@/src/shared/context/locale.provider";
import DashboardMessagesLayout from "@/src/modules/dashboard/shared/components/DashboardMessagesLayout";

export default function BusinessMessagesLayout() {
  const { t } = useLocale();
  const p = t.businessPages.messages;

  return (
    <DashboardMessagesLayout
      role="business"
      title={p.title}
      subtitle={p.subtitle}
      technicalHref="/dashboard/business/technical"
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
