import { Link } from "react-router-dom";
import { ProjectStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ScoreMeter } from "@/components/ui/Progress";
import { IconClock } from "@/components/ui/icons";
import Avatar from "@/components/ui/Avatar";
import { formatCurrency } from "@/lib/format/numbers";
import { getDeadlineInfo } from "@/lib/format/dates";
import { truncate } from "@/lib/format/text";
import { useT } from "@/store/i18n";
import { cx } from "@/lib/cx";
import type { MatchScore, Project } from "@/types";

interface ProjectCardProps {
  project: Project;
  score?: MatchScore;
  href?: string;
  footer?: React.ReactNode;
  className?: string;
}

/** Project summary card. High-finish editorial card with clear visual hierarchy. */
export function ProjectCard({ project, score, href, footer, className }: ProjectCardProps) {
  const { t, locale } = useT();
  const deadline = getDeadlineInfo(project.deadline);
  const owner = project.owner as { name?: string } | undefined;
  const isEn = locale === "en";
  const displayTitle = isEn && project.titleEn ? project.titleEn : project.title;
  const displayDesc = isEn && project.descriptionEn ? project.descriptionEn : project.description;
  const displayCategory = isEn ? (project.category?.englishTitle || project.category?.title) : project.category?.title;

  return (
    <article
      className={cx(
        "group flex h-full flex-col justify-between rounded-2xl border border-line/70 bg-surface p-5 shadow-xs transition-all duration-200 hover:border-line hover:shadow-md",
        className
      )}>
      <div>
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-ink">
              {href ? (
                <Link to={href} className="transition-colors hover:text-primary-600">
                  {displayTitle}
                </Link>
              ) : (
                displayTitle
              )}
            </h3>
            <p className="mt-0.5 text-xs text-ink-muted">{displayCategory}</p>
          </div>
          <ProjectStatusBadge status={project.status} />
        </header>

        <p className="mt-3.5 text-xs leading-6 text-ink-soft">
          {truncate(displayDesc, 110)}
        </p>

        {project.tags?.length ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {project.tags.slice(0, 3).map((tag) => (
              <li key={tag}>
                <span className="rounded-md border border-line/60 bg-surface-sunken/60 px-2 py-0.5 text-[0.65rem] font-medium text-ink-muted">
                  {tag}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="mt-5 border-t border-line/60 pt-4">
        {/* Budget & Deadline Row */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[0.7rem] text-ink-muted">{t("field.budget")}:</span>
            <span className="font-black text-ink tabular-nums">
              {formatCurrency(project.budget)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[0.7rem] text-ink-muted">
            <IconClock className="h-3.5 w-3.5" />
            <span>
              {deadline.isOverdue
                ? t("projects.overdue", { days: Math.abs(deadline.days) })
                : t("projects.deadlineSoon", { days: deadline.days })}
            </span>
          </div>
        </div>

        {score ? (
          <div className="mt-3 rounded-xl border border-line/60 bg-surface-sunken/50 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[0.7rem] font-bold text-ink-soft">{t("matching.title")}</span>
              <span className="text-[0.7rem] font-bold text-primary-600">
                {t(`matching.tier.${score.tier}`)}
              </span>
            </div>
            <div className="mt-1.5">
              <ScoreMeter score={score.score} size="sm" />
            </div>
          </div>
        ) : null}

        {owner?.name ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
            <Avatar name={owner.name} size="xs" />
            <span className="truncate">{owner.name}</span>
          </div>
        ) : null}

        {footer ? <div className="mt-4">{footer}</div> : null}
      </div>
    </article>
  );
}

/** Card footer action for freelancers browsing open work. */
export function ProjectCardActions({ project, onPropose }: { project: Project; onPropose?: () => void }) {
  const { t } = useT();
  const isOpen = project.status === "OPEN";

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" to={`/freelancer/projects/${project._id}`} fullWidth className="rounded-xl">
        {t("common.details")}
      </Button>
      {isOpen && onPropose ? (
        <Button size="sm" onClick={onPropose} fullWidth className="rounded-xl">
          {t("proposals.create")}
        </Button>
      ) : null}
    </div>
  );
}

export default ProjectCard;
