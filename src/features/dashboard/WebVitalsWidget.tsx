import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { initWebVitals, getWebVitals, onWebVital, type WebVitalsReport, type MetricRating } from "@/lib/vitals";
import { formatNumber } from "@/lib/format/numbers";
import { useT } from "@/store/i18n";

const RATING_TONES: Record<MetricRating, "success" | "warning" | "danger"> = {
  good: "success",
  "needs-improvement": "warning",
  poor: "danger",
};

export function WebVitalsWidget() {
  const { t } = useT();
  const [vitals, setVitals] = useState<WebVitalsReport>(getWebVitals);

  useEffect(() => {
    initWebVitals();
    setVitals(getWebVitals());
    const cleanup = onWebVital(() => {
      setVitals(getWebVitals());
    });
    return cleanup;
  }, []);

  const metricKeys = [
    { key: "LCP", labelKey: "webVitals.lcp", unit: "ms" },
    { key: "FID", labelKey: "webVitals.fid", unit: "ms" },
    { key: "CLS", labelKey: "webVitals.cls", unit: "" },
    { key: "FCP", labelKey: "webVitals.fcp", unit: "ms" },
    { key: "TTFB", labelKey: "webVitals.ttfb", unit: "ms" },
  ] as const;

  const ratingLabels: Record<MetricRating, string> = {
    good: t("webVitals.good"),
    "needs-improvement": t("webVitals.needsImprovement"),
    poor: t("webVitals.poor"),
  };

  return (
    <Card className="flex flex-col">
      <CardHeader
        title={t("webVitals.title")}
      />
      <CardContent className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metricKeys.map(({ key, labelKey, unit }) => {
          const metric = vitals[key];
          const hasValue = metric !== undefined;
          const rating = metric?.rating ?? "good";
          const tone = RATING_TONES[rating];
          const label = ratingLabels[rating];

          return (
            <div
              key={key}
              className="flex flex-col justify-between rounded-xl border border-line bg-surface-sunken p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink-muted">{t(labelKey)}</span>
                {hasValue ? (
                  <Badge tone={tone}>
                    {label}
                  </Badge>
                ) : (
                  <Badge tone="neutral">
                    {t("common.loading")}
                  </Badge>
                )}
              </div>

              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl font-black text-ink tabular-nums">
                  {hasValue ? formatNumber(metric.value) : "—"}
                </span>
                {hasValue && unit ? (
                  <span className="text-xs text-ink-muted">{unit}</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default WebVitalsWidget;
