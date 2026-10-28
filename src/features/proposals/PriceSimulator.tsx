import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/Progress";
import { Callout } from "@/components/ui/Callout";
import { useT } from "@/store/i18n";
import { formatCurrency, formatPercent } from "@/lib/format/numbers";
import { simulateProposal, netPayout } from "@/entities/proposal/matching";

/**
 * "What-if" bid simulator.
 *
 * The freelancer drags price and duration and immediately sees an estimated
 * acceptance probability, the platform fee and the net payout. It turns an
 * opaque marketplace into an explainable one, and it is entirely local — no
 * model endpoint, no latency, works offline.
 */
export function PriceSimulator({
  budget,
  competitorCount = 0,
  onChange,
  defaultDuration,
}: {
  budget: number;
  competitorCount?: number;
  onChange?: (values: { price: number; duration: number }) => void;
  defaultDuration?: number;
}) {
  const { t } = useT();
  const [price, setPrice] = useState(Math.round(budget * 0.85));
  const [duration, setDuration] = useState(defaultDuration ?? 30);

  const result = useMemo(
    () => simulateProposal({ budget, price, duration, competitorCount }),
    [budget, price, duration, competitorCount]
  );
  const payout = useMemo(() => netPayout(price), [price]);

  const verdictTone =
    result.verdict === "strong" ? "success" : result.verdict === "ok" ? "warning" : "danger";

  const update = (next: { price?: number; duration?: number }) => {
    const price2 = next.price ?? price;
    const duration2 = next.duration ?? duration;
    setPrice(price2);
    setDuration(duration2);
    onChange?.({ price: price2, duration: duration2 });
  };

  return (
    <section className="rounded-card border border-line bg-surface-sunken p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-ink">{t("simulator.title")}</h3>
          <p className="mt-0.5 text-xs text-ink-muted">{t("simulator.subtitle")}</p>
        </div>
        <Badge tone={verdictTone}>{t(`simulator.verdict.${result.verdict}`)}</Badge>
      </header>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="flex items-center justify-between text-xs font-bold text-ink-soft">
            <span>{t("simulator.price")}</span>
            <span className="tabular-nums">{formatCurrency(price)}</span>
          </span>
          <input
            type="range"
            min={Math.round(budget * 0.3)}
            max={Math.round(budget * 1.6)}
            step={100_000}
            value={price}
            onChange={(event) => update({ price: Number(event.target.value) })}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line accent-primary-600"
            aria-label={t("simulator.price")}
          />
          <span className="text-[0.7rem] text-ink-muted">
            {t("simulator.suggestion", {
              min: formatCurrency(result.suggestedMin),
              max: formatCurrency(result.suggestedMax),
            })}
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="flex items-center justify-between text-xs font-bold text-ink-soft">
            <span>{t("simulator.duration")}</span>
            <span className="tabular-nums">{duration}</span>
          </span>
          <input
            type="range"
            min={3}
            max={120}
            step={1}
            value={duration}
            onChange={(event) => update({ duration: Number(event.target.value) })}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line accent-primary-600"
            aria-label={t("simulator.duration")}
          />
          <span className="text-[0.7rem] text-ink-muted">
            {t("simulator.competitors")}: {competitorCount}
          </span>
        </label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <p className="text-xs font-bold text-ink-muted">{t("simulator.probability")}</p>
          <p className="text-lg font-black text-ink tabular-nums">
            {formatPercent(result.probability)}
          </p>
          <ProgressBar
            value={result.probability * 100}
            tone={verdictTone === "success" ? "success" : verdictTone === "warning" ? "warning" : "danger"}
            className="mt-1.5"
          />
        </div>
        <div>
          <p className="text-xs font-bold text-ink-muted">{t("currency.fee")}</p>
          <p className="text-lg font-black text-danger tabular-nums">
            {formatCurrency(payout.fee)}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold text-ink-muted">{t("proposal.netTakehome")}</p>
          <p className="text-lg font-black text-success tabular-nums">
            {formatCurrency(payout.net)}
          </p>
        </div>
      </div>

      <Callout tone="neutral" className="mt-4">
        {t("simulator.hint")}
      </Callout>
    </section>
  );
}

export default PriceSimulator;
