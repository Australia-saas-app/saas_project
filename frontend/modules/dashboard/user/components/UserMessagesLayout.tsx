"use client";

import { useLocale } from "@/src/shared/context/locale.provider";
import DashboardMessagesLayout from "@/src/modules/dashboard/shared/components/DashboardMessagesLayout";

export default function UserMessagesLayout() {
  const { t } = useLocale();
  const p = t.userPages.messages;

  return (
    <DashboardMessagesLayout
      role="user"
      title={p.title}
      subtitle={p.subtitle}
      technicalHref="/dashboard/user/technical"
      labels={{
        total: p.total,
        unread: p.unread,
        search: p.search,
        unreadOnly: p.unreadOnly,
        from: p.from,
        project: p.project,
        reply: p.reply,
        archive: p.archive,
        selectMessage: p.selectMessage,
        send: "Send message",
        writeMessage: "Write your message…",
      }}
    />
  );
}
