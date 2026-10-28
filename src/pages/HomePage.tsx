import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProjectCard } from "@/features/projects/ProjectCard";
import { useProjects } from "@/features/projects/useProjects";
import { useT } from "@/store/i18n";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format/numbers";
import { buildAnalyticsSnapshot } from "@/entities/analytics/overview";
import {
  IconArrowEnd,
  IconCheck,
  IconShield,
  IconSparkles,
  IconTrendingUp,
  IconWifi,
} from "@/components/ui/icons";

/**
 * Editorial, high-clarity landing page.
 * Fully internationalized (100% bilingual Persian & English support).
 */
function HomePage() {
  const { t } = useT();
  useDocumentTitle(t("app.tagline"));

  const { projects, isLoading } = useProjects({ status: "OPEN", sort: "latest" });
  const snapshot = useMemo(() => buildAnalyticsSnapshot({ projects, proposals: [] }), [projects]);

  return (
    <div className="relative overflow-hidden pb-24">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 start-1/2 h-[34rem] w-[50rem] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary-500/10 via-primary-500/5 to-transparent blur-3xl rtl:translate-x-1/2"
      />

      {/* ------------------------------------------------------------ HERO */}
      <section className="relative mx-auto max-w-7xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Subtle announcement pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-line/80 bg-surface/80 px-4 py-1.5 text-xs font-semibold text-ink-soft shadow-xs backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            <span>{t("landing.pill")}</span>
          </div>

          <h1 className="mt-8 text-4xl font-black tracking-tight text-ink sm:text-5xl lg:text-6xl lg:leading-[1.25]">
            {t("landing.heroTitle")}
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-ink-soft sm:text-lg">
            {t("landing.heroSubtitle")}
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" to="/auth" className="gap-2 px-7 py-3 text-base shadow-sm hover:shadow-md">
              <span>{t("landing.ctaPrimary")}</span>
              <IconArrowEnd className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              href="#projects"
              className="px-6 py-3 text-base text-ink hover:bg-surface-sunken">
              {t("projects.listTitle")}
            </Button>
          </div>
        </div>

        {/* Hero Interactive App Showcase (Glass Window Mockup) */}
        <div className="mt-16 sm:mt-20">
          <div className="relative mx-auto max-w-5xl rounded-3xl border border-line/80 bg-surface/90 p-2 shadow-2xl shadow-primary-900/5 backdrop-blur-xl sm:p-4">
            {/* Window bar */}
            <div className="flex items-center justify-between border-b border-line/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-400/80" />
                <span className="h-3 w-3 rounded-full bg-amber-400/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
              </div>
              <div className="rounded-lg bg-surface-sunken/80 px-4 py-1 text-xs font-medium text-ink-muted">
                freelancehub.local / workspace / escrow-active
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <IconShield className="h-4 w-4" />
                <span>{t("landing.mockup.escrowSecured")}</span>
              </div>
            </div>

            {/* Window Interior Content */}
            <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_1fr]">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                      {t("landing.mockup.activeProject")}
                    </span>
                    <h3 className="text-lg font-black text-ink">{t("landing.mockup.title")}</h3>
                  </div>
                  <Badge tone="success">{t("landing.mockup.inProgress")}</Badge>
                </div>

                <p className="text-xs leading-6 text-ink-soft">
                  {t("landing.mockup.desc")}
                </p>

                {/* Milestone progression */}
                <div className="rounded-xl border border-line/60 bg-surface-sunken/40 p-4">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-ink">{t("landing.mockup.milestones")}</span>
                    <span className="text-ink-muted">{t("landing.mockup.milestonesCount")}</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <div className="h-2 flex-1 rounded-full bg-emerald-500" title={t("landing.mockup.milestone1")} />
                    <div className="h-2 flex-1 rounded-full bg-emerald-500" title={t("landing.mockup.milestone2")} />
                    <div className="h-2 flex-1 rounded-full bg-line" title={t("landing.mockup.milestone3")} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[0.7rem] text-ink-muted">
                    <span>{t("landing.mockup.milestoneCurrent")}</span>
                    <span className="font-bold text-ink">{t("landing.mockup.escrowAmount")}</span>
                  </div>
                </div>
              </div>

              {/* Sidebar card inside mockup */}
              <div className="flex flex-col justify-between rounded-2xl border border-line/60 bg-surface p-5">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-primary-600 font-bold text-white">
                      FH
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-ink">{t("landing.mockup.freelancerName")}</h4>
                      <p className="text-xs text-ink-muted">{t("landing.mockup.freelancerRole")}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 border-t border-line/50 pt-4 text-xs">
                    <div className="flex justify-between text-ink-soft">
                      <span>{t("landing.mockup.totalBudget")}</span>
                      <span className="font-bold text-ink">{t("landing.mockup.totalBudgetValue")}</span>
                    </div>
                    <div className="flex justify-between text-ink-soft">
                      <span>{t("landing.mockup.deadline")}</span>
                      <span className="font-bold text-ink">{t("landing.mockup.deadlineValue")}</span>
                    </div>
                    <div className="flex justify-between text-ink-soft">
                      <span>{t("landing.mockup.escrowStatus")}</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {t("landing.mockup.escrowFunded")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-2">
                  <Button size="sm" fullWidth to="/auth">
                    {t("landing.mockup.viewDetails")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Clean, High-Impact Metric Strip */}
        <div className="mt-16 border-y border-line/70 py-10">
          <dl className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="text-center">
              <dd className="text-3xl font-black tracking-tight text-ink tabular-nums sm:text-4xl">
                {isLoading ? "—" : formatNumber(snapshot.totals.openProjects)}
              </dd>
              <dt className="mt-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                {t("landing.statProjects")}
              </dt>
            </div>
            <div className="text-center">
              <dd className="text-3xl font-black tracking-tight text-ink tabular-nums sm:text-4xl">
                {isLoading ? "—" : formatCurrency(snapshot.money.averageBudget, { compact: true })}
              </dd>
              <dt className="mt-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                {t("stats.averageBudget")}
              </dt>
            </div>
            <div className="text-center">
              <dd className="text-3xl font-black tracking-tight text-ink tabular-nums sm:text-4xl">
                {formatNumber(1420)}+
              </dd>
              <dt className="mt-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                {t("landing.statVerified")}
              </dt>
            </div>
            <div className="text-center">
              <dd className="text-3xl font-black tracking-tight text-emerald-600 tabular-nums dark:text-emerald-400 sm:text-4xl">
                {formatPercent(0.994)}
              </dd>
              <dt className="mt-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                {t("landing.statSatisfaction")}
              </dt>
            </div>
          </dl>
        </div>
      </section>

      {/* ------------------------------------------------------------ BENTO GRID FEATURES */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-xs font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400">
            {t("landing.bento.tag")}
          </h2>
          <p className="mt-3 text-3xl font-black tracking-tight text-ink sm:text-4xl">
            {t("landing.featuresTitle")}
          </p>
          <p className="mt-4 text-base leading-7 text-ink-soft">
            {t("landing.featuresSubtitle")}
          </p>
        </div>

        {/* Bento Grid */}
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {/* Bento Item 1: Escrow (Large) */}
          <div className="flex flex-col justify-between rounded-3xl border border-line/70 bg-surface p-8 shadow-sm transition-all duration-300 hover:border-line hover:shadow-md md:col-span-2">
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-600 dark:text-primary-400">
                <IconShield className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-black text-ink">
                {t("landing.bento.escrow.title")}
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-7 text-ink-soft">
                {t("landing.bento.escrow.desc")}
              </p>
            </div>

            {/* Visual Escrow Flow */}
            <div className="mt-8 grid grid-cols-3 gap-3 rounded-2xl border border-line/50 bg-surface-sunken/40 p-4 text-center">
              <div>
                <span className="text-xs font-bold text-ink">{t("landing.bento.escrow.step1")}</span>
                <p className="mt-1 text-[0.7rem] text-ink-muted">{t("landing.bento.escrow.step1Desc")}</p>
              </div>
              <div className="border-x border-line/60">
                <span className="text-xs font-bold text-ink">{t("landing.bento.escrow.step2")}</span>
                <p className="mt-1 text-[0.7rem] text-ink-muted">{t("landing.bento.escrow.step2Desc")}</p>
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {t("landing.bento.escrow.step3")}
                </span>
                <p className="mt-1 text-[0.7rem] text-ink-muted">{t("landing.bento.escrow.step3Desc")}</p>
              </div>
            </div>
          </div>

          {/* Bento Item 2: Smart Matching */}
          <div className="flex flex-col justify-between rounded-3xl border border-line/70 bg-surface p-8 shadow-sm transition-all duration-300 hover:border-line hover:shadow-md">
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <IconSparkles className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-black text-ink">
                {t("landing.bento.matching.title")}
              </h3>
              <p className="mt-3 text-sm leading-7 text-ink-soft">
                {t("landing.bento.matching.desc")}
              </p>
            </div>
            <div className="mt-6 rounded-xl border border-line/50 bg-surface-sunken/50 p-3 text-xs text-ink-muted">
              {t("landing.bento.matching.pill")}
            </div>
          </div>

          {/* Bento Item 3: Realtime Transparency */}
          <div className="flex flex-col justify-between rounded-3xl border border-line/70 bg-surface p-8 shadow-sm transition-all duration-300 hover:border-line hover:shadow-md">
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <IconTrendingUp className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-black text-ink">
                {t("landing.bento.transparency.title")}
              </h3>
              <p className="mt-3 text-sm leading-7 text-ink-soft">
                {t("landing.bento.transparency.desc")}
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between text-xs font-bold text-ink">
              <span>{t("landing.bento.transparency.pill1")}</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                {t("landing.bento.transparency.pill2")}
              </span>
            </div>
          </div>

          {/* Bento Item 4: Offline & Speed */}
          <div className="flex flex-col justify-between rounded-3xl border border-line/70 bg-surface p-8 shadow-sm transition-all duration-300 hover:border-line hover:shadow-md md:col-span-2">
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <IconWifi className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-xl font-black text-ink">
                {t("landing.bento.pwa.title")}
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-7 text-ink-soft">
                {t("landing.bento.pwa.desc")}
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-ink-soft">
              <span className="rounded-lg bg-surface-sunken px-3 py-1.5">{t("landing.bento.pwa.feature1")}</span>
              <span className="rounded-lg bg-surface-sunken px-3 py-1.5">{t("landing.bento.pwa.feature2")}</span>
              <span className="rounded-lg bg-surface-sunken px-3 py-1.5">{t("landing.bento.pwa.feature3")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ HOW IT WORKS */}
      <section id="how" className="border-y border-line/60 bg-surface-sunken/40 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-xs font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400">
              {t("landing.howTag")}
            </h2>
            <p className="mt-3 text-3xl font-black tracking-tight text-ink sm:text-4xl">
              {t("landing.howTitle")}
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-4">
            {[
              {
                title: t("landing.step1.title"),
                desc: t("landing.step1.desc"),
              },
              {
                title: t("landing.step2.title"),
                desc: t("landing.step2.desc"),
              },
              {
                title: t("landing.step3.title"),
                desc: t("landing.step3.desc"),
              },
              {
                title: t("landing.step4.title"),
                desc: t("landing.step4.desc"),
              },
            ].map((step, idx) => (
              <div key={idx} className="relative flex flex-col">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface text-lg font-black text-ink shadow-xs border border-line/70">
                  {formatNumber(idx + 1)}
                </span>
                <h3 className="mt-5 text-base font-bold text-ink">{step.title}</h3>
                <p className="mt-2 text-xs leading-6 text-ink-soft">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ DUAL AUDIENCE */}
      <section id="roles" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* For Clients */}
          <div className="flex flex-col justify-between rounded-3xl border border-line/80 bg-surface p-8 shadow-sm transition-all duration-300 hover:shadow-md sm:p-10">
            <div>
              <div className="inline-flex rounded-full bg-primary-500/10 px-3.5 py-1 text-xs font-bold text-primary-600 dark:text-primary-400">
                {t("landing.roles.ownerPill")}
              </div>
              <h3 className="mt-5 text-2xl font-black tracking-tight text-ink">
                {t("landing.roles.ownerHeading")}
              </h3>
              <p className="mt-4 text-sm leading-7 text-ink-soft">
                {t("landing.roles.ownerDesc")}
              </p>

              <ul className="mt-6 space-y-3 text-xs font-medium text-ink">
                <li className="flex items-center gap-2">
                  <IconCheck className="h-4 w-4 text-emerald-500" />
                  <span>{t("landing.roles.ownerPoint1")}</span>
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck className="h-4 w-4 text-emerald-500" />
                  <span>{t("landing.roles.ownerPoint2")}</span>
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck className="h-4 w-4 text-emerald-500" />
                  <span>{t("landing.roles.ownerPoint3")}</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 border-t border-line/60 pt-6">
              <Button size="md" to="/auth" fullWidth>
                {t("landing.roles.ownerCta")}
              </Button>
            </div>
          </div>

          {/* For Freelancers */}
          <div className="flex flex-col justify-between rounded-3xl border border-line/80 bg-surface p-8 shadow-sm transition-all duration-300 hover:shadow-md sm:p-10">
            <div>
              <div className="inline-flex rounded-full bg-indigo-500/10 px-3.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {t("landing.roles.freelancerPill")}
              </div>
              <h3 className="mt-5 text-2xl font-black tracking-tight text-ink">
                {t("landing.roles.freelancerHeading")}
              </h3>
              <p className="mt-4 text-sm leading-7 text-ink-soft">
                {t("landing.roles.freelancerDesc")}
              </p>

              <ul className="mt-6 space-y-3 text-xs font-medium text-ink">
                <li className="flex items-center gap-2">
                  <IconCheck className="h-4 w-4 text-emerald-500" />
                  <span>{t("landing.roles.freelancerPoint1")}</span>
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck className="h-4 w-4 text-emerald-500" />
                  <span>{t("landing.roles.freelancerPoint2")}</span>
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck className="h-4 w-4 text-emerald-500" />
                  <span>{t("landing.roles.freelancerPoint3")}</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 border-t border-line/60 pt-6">
              <Button size="md" variant="outline" to="/auth" fullWidth>
                {t("landing.roles.freelancerCta")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ FEATURED PROJECTS */}
      <section id="projects" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400">
              {t("landing.projects.tag")}
            </h2>
            <p className="mt-2 text-2xl font-black tracking-tight text-ink sm:text-3xl">
              {t("projects.listTitle")}
            </p>
            <p className="mt-1 text-xs text-ink-muted">{t("projects.subtitle")}</p>
          </div>
          <Button variant="outline" size="sm" to="/auth">
            {t("common.viewAll")}
          </Button>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.slice(0, 6).map((project) => (
            <div key={project._id} className="transition-all duration-200 hover:-translate-y-1">
              <ProjectCard
                project={project}
                footer={
                  <Button size="sm" variant="outline" to="/auth" fullWidth>
                    {t("landing.projects.propose")}
                  </Button>
                }
              />
            </div>
          ))}
        </div>

        {!isLoading && projects.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-line p-12 text-center text-sm text-ink-muted">
            {t("projects.emptyFreelancer")}{" "}
            <Link to="/auth" className="font-bold text-primary-600 hover:underline">
              {t("landing.ctaPrimary")}
            </Link>
          </div>
        ) : null}
      </section>

      {/* ------------------------------------------------------------ FINAL CALL TO ACTION */}
      <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-line/80 bg-gradient-to-tr from-surface via-surface to-surface-sunken p-10 text-center shadow-lg sm:p-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 start-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-primary-500/10 blur-3xl rtl:translate-x-1/2"
          />
          <h2 className="relative text-3xl font-black tracking-tight text-ink sm:text-4xl">
            {t("landing.ctaBanner.title")}
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-sm leading-7 text-ink-soft">
            {t("landing.ctaBanner.desc")}
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-4">
            <Button size="lg" to="/auth" className="px-8 py-3 text-base font-bold shadow-md">
              {t("landing.ctaBanner.ctaJoin")}
            </Button>
            <Button size="lg" variant="outline" to="/auth" className="px-8 py-3 text-base">
              {t("landing.ctaBanner.ctaLogin")}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
