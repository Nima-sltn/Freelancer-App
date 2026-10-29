import { useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { MessagesPanel } from "@/features/messages/MessagesPanel";
import { useUser } from "@/features/auth";
import { useOwnerProjects } from "@/features/projects/useProjects";
import { useT } from "@/store/i18n";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { IconChat } from "@/components/ui/icons";
import type { Conversation } from "@/types";

/**
 * Conversations page.
 *
 * Threads are bootstrapped from the user's projects (one per project with a
 * counterpart), which means the messaging feature has meaningful content without
 * a conversations endpoint. The store is local-first — see `MessagesPanel`.
 */
function MessagesPage() {
  const { t } = useT();
  const { user } = useUser();
  const projects = useOwnerProjects({});
  useDocumentTitle(t("messages.title"));

  const seed = useMemo<Conversation[]>(() => {
    if (!user) return [];
    const relevant = projects.projects.filter((project) =>
      user.role === "OWNER" ? project.owner?._id === user._id || !project.owner : true
    );

    return relevant.slice(0, 5).map((project, index) => {
      const freelancer = project.freelancer as { _id?: string; name?: string } | null | undefined;
      const owner = project.owner as { _id?: string; name?: string } | undefined;
      const counterpart =
        user.role === "OWNER"
          ? freelancer?.name ?? t("role.FREELANCER")
          : owner?.name ?? t("role.OWNER");

      return {
        id: `thread-${project._id}`,
        projectId: project._id,
        title: project.title,
        participantIds: [user._id, freelancer?._id ?? owner?._id ?? `counterpart-${index}`],
        unread: index === 0 ? 1 : 0,
        messages: [
          {
            id: `msg-seed-${project._id}`,
            authorId: freelancer?._id ?? owner?._id ?? "system",
            authorName: counterpart,
            body: t("messages.defaultBody", { title: project.title }),
            createdAt: new Date(Date.now() - (index + 1) * 3_600_000).toISOString(),
          },
        ],
      } satisfies Conversation;
    });
  }, [projects.projects, user]);

  return (
    <div>
      <PageHeader
        title={t("messages.title")}
        description={t("messages.subtitle")}
        icon={<IconChat />}
      />
      <MessagesPanel seed={seed} user={user} />
    </div>
  );
}

export default MessagesPage;
