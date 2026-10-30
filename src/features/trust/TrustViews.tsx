import { useMemo, useState, useCallback } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { ProgressRing } from "@/components/ui/Progress";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { IconShield } from "@/components/ui/icons";
import { useT } from "@/store/i18n";
import { useTransactions } from "@/store/transaction";
import { formatNumber } from "@/lib/format/numbers";
import { formatRelative } from "@/lib/format/dates";
import { truncate } from "@/lib/format/text";
import { soundEngine } from "@/lib/audio";
import { assessProposalRisk } from "@/entities/proposal/matching";
import { buildTrustProfile } from "@/entities/user/trust";
import { MerkleTree, verifyHashChain } from "@/entities/crypto";
import type { Proposal, Project, User } from "@/types";

function getTrustTone(score: number): "success" | "warning" | "danger" {
  if (score >= 65) return "success";
  if (score >= 40) return "warning";
  return "danger";
}

function getRiskLevelTone(level: string): "danger" | "warning" | "success" {
  if (level === "high") return "danger";
  if (level === "medium") return "warning";
  return "success";
}

/** Trust summary for a single user (profile pages, admin drawer). */
export function TrustPanel({ user, compact = false }: Readonly<{ readonly user: User; readonly compact?: boolean }>) {
  const { t } = useT();
  const trust = useMemo(() => buildTrustProfile(user), [user]);
  const trustTone = getTrustTone(trust.score);

  return (
    <Card>
      <CardHeader
        title={t("trust.title")}
        description={`${t("trust.score")}: ${formatNumber(trust.score)}`}
        icon={<IconShield />}
        actions={<Badge tone={trustTone}>{t(`trust.level.${trust.level}`)}</Badge>}
      />
      <CardContent>
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <ProgressRing
            value={trust.score}
            tone={trustTone}
            label={`${t("trust.score")}: ${trust.score}`}>
            <span className="text-lg font-black text-ink tabular-nums">{formatNumber(trust.score)}</span>
          </ProgressRing>

          <ul className="flex-1 space-y-2">
            {trust.signals.map((signal) => (
              <li key={signal.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 text-ink-soft">
                  <span aria-hidden="true">{signal.passed ? "✅" : "⭕"}</span>
                  {t(signal.labelKey)}
                </span>
                <span className="text-xs font-bold text-ink-muted tabular-nums">
                  +{formatNumber(signal.weight)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {!compact ? (
          <Callout tone="neutral" className="mt-4">
            {t("trust.signalsExplainer")}
          </Callout>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface RiskRow {
  proposal: Proposal;
  project?: Project;
  level: "low" | "medium" | "high";
  score: number;
  flags: Array<{ key: string; labelKey: string; severity: "low" | "medium" | "high" }>;
}

/**
 * Admin queue of proposals whose bids look anomalous.
 *
 * The queue *detects* risk; it does not own the decision. The verdict is passed
 * in as `onDecide` so this feature never reaches into `features/proposals` — the
 * page composes the two and wires them together (features stay independent, see
 * `docs/ARCHITECTURE.md` §1).
 */
export function RiskQueue({
  proposals,
  projects,
  isLoading,
  onDecide,
  isDeciding,
}: Readonly<{
  readonly proposals: readonly Proposal[];
  readonly projects: readonly Project[];
  readonly isLoading?: boolean;
  readonly onDecide?: (decision: {
    readonly proposalId: string;
    readonly projectId: string;
    readonly status: 0 | 1 | 2;
    readonly previousStatus: 0 | 1 | 2;
  }) => void;
  readonly isDeciding?: boolean;
}>) {
  const { t } = useT();

  const rows = useMemo<RiskRow[]>(() => {
    const projectIndex = new Map(projects.map((project) => [project._id, project]));
    return proposals
      .filter((proposal) => proposal.status !== 0)
      .map((proposal) => {
        const project = proposal.projectId ? projectIndex.get(proposal.projectId) : undefined;
        const risk = assessProposalRisk(proposal, {
          categoryAverageBudget: project?.budget,
        });
        return { proposal, project, ...risk };
      })
      .filter((row) => row.flags.length > 0)
      .sort((a, b) => b.score - a.score);
  }, [proposals, projects]);

  const columns: Array<Column<RiskRow>> = [
    {
      key: "project",
      header: t("field.title"),
      render: (row) => (
        <div className="min-w-40">
          <p className="font-bold text-ink">{truncate(row.project?.title ?? "—", 36)}</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {(row.proposal.user as { name?: string })?.name ?? "—"}
          </p>
        </div>
      ),
    },
    {
      key: "flags",
      header: t("nav.trust"),
      render: (row) => (
        <div className="flex max-w-72 flex-wrap gap-1.5">
          {row.flags.map((flag) => (
            <Badge key={flag.key} tone={flag.severity === "high" ? "danger" : "warning"}>
              {t(flag.labelKey)}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "score",
      header: t("trust.score"),
      sortable: true,
      render: (row) => (
        <Badge tone={getRiskLevelTone(row.level)}>
          {formatNumber(row.score)}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: t("common.created"),
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs text-ink-muted">{formatRelative(row.proposal.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: t("common.actions"),
      align: "center",
      render: (row) => (
        <div className="flex justify-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            disabled={isDeciding}
            onClick={() =>
              onDecide?.({
                proposalId: row.proposal._id,
                projectId: row.proposal.projectId ?? row.project?._id ?? "",
                status: 1,
                previousStatus: row.proposal.status,
              })
            }>
            {t("trust.review")}
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={isDeciding}
            onClick={() =>
              onDecide?.({
                proposalId: row.proposal._id,
                projectId: row.proposal.projectId ?? row.project?._id ?? "",
                status: 0,
                previousStatus: row.proposal.status,
              })
            }>
            {t("status.proposal.rejected")}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Callout tone="warning" title={t("trust.queue")}>
        {t("trust.queueExplainer")}
      </Callout>

      <DataTable<RiskRow>
        columns={columns}
        rows={rows}
        rowKey={(row) => row.proposal._id}
        caption={t("trust.queue")}
        isLoading={isLoading}
        emptyTitle={t("trust.queueEmpty")}
      />
    </div>
  );
}

/**
 * Cryptographic Merkle Tree verification component for ACID transaction journal.
 * High-craft editorial card with zero clutter and mathematically provable integrity.
 */
export function CryptographicLedgerProof() {
  const { t } = useT();
  const { entries } = useTransactions();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);

  const sampleEntries = useMemo(() => {
    if (entries.length > 0) return entries;
    return [
      { id: "tx_init", resource: "system", state: "committed", createdAt: new Date().toISOString() },
    ];
  }, [entries]);

  const merkleTree = useMemo(() => new MerkleTree(sampleEntries), [sampleEntries]);
  const chainResult = useMemo(() => verifyHashChain(sampleEntries), [sampleEntries]);

  const handleVerify = useCallback(() => {
    setIsVerifying(true);
    soundEngine.play("click");
    setTimeout(() => {
      let allValid = true;
      for (let i = 0; i < merkleTree.leafCount; i++) {
        const proof = merkleTree.generateProof(i);
        if (!proof || !MerkleTree.verifyProof(proof)) {
          allValid = false;
          break;
        }
      }
      setIsVerifying(false);
      if (allValid) {
        setVerifiedAt(new Date().toISOString());
        soundEngine.play("success");
      }
    }, 350);
  }, [merkleTree]);

  return (
    <Card>
      <CardHeader
        title={t("trust.crypto.title")}
        description={t("trust.crypto.subtitle")}
        icon={<IconShield />}
        actions={
          <Badge tone={chainResult.isValid ? "success" : "danger"}>
            {chainResult.isValid
              ? t("trust.crypto.valid")
              : t("trust.crypto.tampered")}
          </Badge>
        }
      />
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-line/70 bg-surface-sunken/40 p-3.5 text-xs">
          <div className="flex items-center justify-between text-ink-muted">
            <span>{t("trust.crypto.root")}</span>
            <span
              className="font-mono text-[0.7rem] text-primary-600 truncate max-w-[200px]"
              title={merkleTree.root}>
              0x{merkleTree.root.slice(0, 16)}...
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-ink-muted">
            <span>{t("trust.crypto.records")}</span>
            <span className="font-bold text-ink">{sampleEntries.length} entries</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-xs text-ink-muted">
            {verifiedAt
              ? `${t("trust.crypto.lastVerified")}: ${formatRelative(new Date(verifiedAt))}`
              : t("trust.crypto.unverifiedHint")}
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={isVerifying}
            onClick={handleVerify}
            className="rounded-xl font-bold">
            {isVerifying
              ? t("trust.crypto.verifying")
              : t("trust.crypto.verifyBtn")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
