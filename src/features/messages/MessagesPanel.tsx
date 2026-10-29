import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Callout } from "@/components/ui/Callout";
import { IconChat } from "@/components/ui/icons";
import { useT } from "@/store/i18n";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { storage } from "@/lib/storage";
import { formatRelative } from "@/lib/format/dates";
import { cx } from "@/lib/cx";
import type { ChatMessage, Conversation, User } from "@/types";

/**
 * Messaging.
 *
 * The Express API exposes no conversation endpoint, so messages live in a
 * local-first store: threads are seeded, new messages are optimistically appended
 * and persisted, and a message written while offline is visibly marked as
 * pending until connectivity returns. That is the same "optimistic write with
 * durable intent" model the transaction journal applies to the API-backed
 * entities, and it is honest about the backend gap in `docs/api-contract.md`.
 */
const STORAGE_KEY = "conversations";

export function updatePendingMessage(
  conversations: Conversation[],
  conversationId: string,
  messageId: string
): Conversation[] {
  return conversations.map((conversation) => {
    if (conversation.id !== conversationId) return conversation;
    return {
      ...conversation,
      messages: conversation.messages.map((message) =>
        message.id === messageId ? { ...message, pending: false } : message
      ),
    };
  });
}

function appendMessageToConversation(
  conversations: Conversation[],
  conversationId: string,
  message: ChatMessage
): Conversation[] {
  return conversations.map((conversation) =>
    conversation.id === conversationId
      ? { ...conversation, messages: [...conversation.messages, message] }
      : conversation
  );
}

function useLocalConversations(seed: Conversation[], userId: string | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    storage.get<Conversation[]>(STORAGE_KEY, [])
  );

  useEffect(() => {
    setConversations((current) => {
      if (current.length > 0 || seed.length === 0) return current;
      storage.set(STORAGE_KEY, seed);
      return seed;
    });
  }, [seed]);

  const send = (conversationId: string, body: string, author: { id: string; name: string }) => {
    const message: ChatMessage = {
      id: `msg_${Date.now()}`,
      authorId: author.id,
      authorName: author.name,
      body,
      createdAt: new Date().toISOString(),
      pending: true,
    };

    setConversations((current) => {
      const next = appendMessageToConversation(current, conversationId, message);
      storage.set(STORAGE_KEY, next);
      return next;
    });

    return message.id;
  };

  const markSent = (conversationId: string, messageId: string) => {
    setConversations((current) => {
      const next = updatePendingMessage(current, conversationId, messageId);
      storage.set(STORAGE_KEY, next);
      return next;
    });
  };

  const mine = useMemo(
    () =>
      userId
        ? conversations.filter((conversation) => conversation.participantIds.includes(userId))
        : conversations,
    [conversations, userId]
  );

  return { conversations: mine.length > 0 ? mine : conversations, send, markSent };
}

export interface MessagesPanelProps {
  readonly seed: Conversation[];
  readonly user: User | undefined;
}

export function MessagesPanel({
  seed,
  user,
}: Readonly<MessagesPanelProps>) {
  const { t } = useT();
  const { online } = useOnlineStatus();
  const { conversations, send, markSent } = useLocalConversations(seed, user?._id);
  const [activeId, setActiveId] = useState<string | undefined>(conversations[0]?.id);
  const [draft, setDraft] = useState("");

  const active = conversations.find((conversation) => conversation.id === activeId) ?? conversations[0];

  if (conversations.length === 0) {
    return <EmptyState icon={<IconChat />} title={t("messages.empty")} />;
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.trim() || !active || !user) return;

    const id = send(active.id, draft.trim(), { id: user._id, name: user.name });
    setDraft("");

    if (online) {
      window.setTimeout(() => markSent(active.id, id), 500);
    } else {
      toast(t("messages.sentOffline"), { icon: "📶" });
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
      <Card padding="none" className="overflow-hidden">
        <CardHeader
          className="border-b border-line p-4"
          title={t("messages.title")}
          description={t("messages.subtitle")}
        />
        <ul className="max-h-[32rem] overflow-y-auto">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <button
                type="button"
                onClick={() => setActiveId(conversation.id)}
                className={cx(
                  "flex w-full items-center gap-3 border-b border-line p-3 text-start transition-colors",
                  conversation.id === active?.id ? "bg-primary-500/5" : "hover:bg-surface-sunken"
                )}>
                <Avatar name={conversation.title} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-ink">
                    {conversation.title}
                  </span>
                  <span className="block truncate text-xs text-ink-muted">
                    {conversation.messages.at(-1)?.body ?? t("messages.emptyThread")}
                  </span>
                </span>
                {conversation.unread > 0 ? (
                  <Badge tone="primary">{conversation.unread}</Badge>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card padding="none" className="flex min-h-[28rem] flex-col overflow-hidden">
        {active ? (
          <>
            <CardHeader className="border-b border-line p-4" title={active.title} />
            <CardContent className="flex-1 space-y-4 overflow-y-auto p-4">
              {active.messages.map((message) => {
                const isMine = message.authorId === user?._id;
                return (
                  <div
                    key={message.id}
                    className={cx("flex flex-col gap-1", isMine ? "items-end" : "items-start")}>
                    <div
                      className={cx(
                        "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-7",
                        isMine
                          ? "bg-primary-600 text-white"
                          : "bg-surface-sunken text-ink-soft"
                      )}>
                      {message.body}
                    </div>
                    <span className="flex items-center gap-2 text-[0.65rem] text-ink-muted">
                      <span>{message.authorName}</span>
                      <time dateTime={message.createdAt}>{formatRelative(message.createdAt)}</time>
                      {message.pending ? <Badge tone="warning">{t("tx.state.queued")}</Badge> : null}
                    </span>
                  </div>
                );
              })}
            </CardContent>

            {!online ? (
              <div className="px-4 pb-2">
                <Callout tone="warning">{t("messages.offlineHint")}</Callout>
              </div>
            ) : null}

            <form className="flex gap-2 border-t border-line p-3" onSubmit={submit}>
              <label className="sr-only" htmlFor="message-input">
                {t("messages.placeholder")}
              </label>
              <input
                id="message-input"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={t("messages.placeholder")}
                className="field-input"
                autoComplete="off"
              />
              <Button type="submit" disabled={!draft.trim()}>
                {t("messages.send")}
              </Button>
            </form>
          </>
        ) : (
          <EmptyState title={t("messages.selectThread")} />
        )}
      </Card>
    </div>
  );
}
