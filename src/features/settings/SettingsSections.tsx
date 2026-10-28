import { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge, Kbd } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/form";
import { ConfirmDialog } from "@/components/ui/Modal";
import { SegmentedControl } from "@/components/ui/Tabs";
import { Callout } from "@/components/ui/Callout";
import { IconDownload, IconPalette, IconRefresh, IconTrash } from "@/components/ui/icons";
import { useTheme, THEME_PRESETS, type AccentColor, type Density, type RadiusPreset, type ThemeMode } from "@/store/theme";
import { useI18n, useT, LOCALES } from "@/store/i18n";
import { env, APP_META } from "@/config/env";
import { storage } from "@/lib/storage";
import { downloadJson, exportFilename } from "@/lib/export";
import { resetDemoData } from "@/mocks";
import { cx } from "@/lib/cx";
import type { Locale } from "@/types";

/** Appearance studio: every axis the CSS tokens support, with live preview. */
export function ThemeStudio() {
  const { t } = useI18n();
  const theme = useTheme();

  return (
    <Card>
      <CardHeader
        title={t("settings.appearance")}
        description={t("settings.subtitle")}
        icon={<IconPalette />}
      />
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="field-label">{t("settings.themeMode")}</p>
            <SegmentedControl<ThemeMode>
              value={theme.mode}
              onChange={theme.setMode}
              ariaLabel={t("settings.themeMode")}
              options={[
                { value: "light", label: t("settings.themeMode.light") },
                { value: "dark", label: t("settings.themeMode.dark") },
                { value: "system", label: t("settings.themeMode.system") },
              ]}
            />
          </div>

          <div className="space-y-2">
            <p className="field-label">{t("settings.density")}</p>
            <SegmentedControl<Density>
              value={theme.density}
              onChange={theme.setDensity}
              ariaLabel={t("settings.density")}
              options={THEME_PRESETS.densities.map((density) => ({
                value: density,
                label: t(`settings.density.${density}`),
              }))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="field-label">{t("settings.accent")}</p>
          <ul className="flex flex-wrap gap-2">
            {THEME_PRESETS.accents.map((accent) => (
              <li key={accent.value}>
                <button
                  type="button"
                  onClick={() => theme.setAccent(accent.value as AccentColor)}
                  aria-pressed={theme.accent === accent.value}
                  aria-label={t(`theme.color.${accent.value}` as any)}
                  className={cx(
                    "h-8 w-8 rounded-full border-2 transition-transform",
                    theme.accent === accent.value
                      ? "scale-110 border-ink"
                      : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: accent.color }}
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="field-label">{t("settings.radius")}</p>
            <SegmentedControl<RadiusPreset>
              value={theme.radius}
              onChange={theme.setRadius}
              ariaLabel={t("settings.radius")}
              options={THEME_PRESETS.radii.map((radius) => ({
                value: radius,
                label: t(`settings.radius.${radius}`),
              }))}
            />
          </div>

          <div className="space-y-3 pt-6">
            <Toggle
              label={t("settings.contrast")}
              description={t("settings.contrastHint")}
              enabled={theme.highContrast}
              onChange={() => theme.setHighContrast(!theme.highContrast)}
            />
            <Toggle
              label={t("settings.reduceMotion")}
              enabled={theme.reduceMotion}
              onChange={() => theme.setReduceMotion(!theme.reduceMotion)}
            />
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={theme.resetTheme} leadingIcon={<IconRefresh />}>
          {t("common.clearFilters")}
        </Button>
      </CardContent>
    </Card>
  );
}

/** Language & direction. */
export function LanguageSettings() {
  const { t, locale, setLocale, dir } = useI18n();

  return (
    <Card>
      <CardHeader title={t("settings.language")} description={`dir: ${dir}`} />
      <CardContent>
        <SegmentedControl<Locale>
          value={locale}
          onChange={setLocale}
          ariaLabel={t("settings.language")}
          options={LOCALES.map((item) => ({ value: item.value, label: item.nativeLabel }))}
        />
      </CardContent>
    </Card>
  );
}

/** Data & storage controls, including the demo reset. */
export function DataSettings() {
  const { t } = useT();
  const [confirmReset, setConfirmReset] = useState(false);
  const keys = storage.keys();

  return (
    <>
      <Card>
        <CardHeader
          title={t("settings.data")}
          description={t("settings.dataHint")}
          actions={
            <Badge tone={env.useMocks ? "warning" : "success"}>
              {t(env.useMocks ? "settings.dataSource.mock" : "settings.dataSource.live")}
            </Badge>
          }
        />
        <CardContent className="space-y-4">
          <dl className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg bg-surface-sunken px-3 py-2">
              <dt className="text-xs font-bold text-ink-soft">{t("settings.storageUsed")}</dt>
              <dd className="text-xs font-black text-ink tabular-nums">{keys.length}</dd>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface-sunken px-3 py-2">
              <dt className="text-xs font-bold text-ink-soft">{t("settings.dataSource")}</dt>
              <dd className="text-xs font-black text-ink">
                {env.apiMode} • v{APP_META.version}
              </dd>
            </div>
          </dl>

          <ul className="flex flex-wrap gap-1.5">
            {keys.map((key) => (
              <li key={key}>
                <Badge tone="neutral">{key}</Badge>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              leadingIcon={<IconDownload />}
              onClick={() =>
                downloadJson(exportFilename("freelancehub-backup", "json"), {
                  exportedAt: new Date().toISOString(),
                  locale: document.documentElement.lang,
                  settings: Object.fromEntries(keys.map((key) => [key, storage.get(key, null)])),
                })
              }>
              {t("settings.exportData")}
            </Button>
            {env.useMocks ? (
              <Button
                variant="danger"
                size="sm"
                leadingIcon={<IconTrash />}
                onClick={() => setConfirmReset(true)}>
                {t("settings.resetDemo")}
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                storage.clearAll();
                window.location.reload();
              }}>
              {t("settings.clearLocal")}
            </Button>
          </div>

          <Callout tone="neutral">
            {t("settings.localStorageNotice")}
          </Callout>
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={confirmReset}
        onClose={() => setConfirmReset(false)}
        title={t("settings.resetDemo")}
        message={t("settings.resetDemoConfirm")}
        confirmLabel={t("common.confirm")}
        cancelLabel={t("common.cancel")}
        onConfirm={() => {
          resetDemoData();
          storage.remove("notifications");
          storage.remove("conversations");
          window.location.href = "/";
        }}
      />
    </>
  );
}

/** Keyboard shortcut reference. */
export function ShortcutSettings() {
  const { t } = useT();
  const shortcuts: Array<[string, string]> = [
    ["⌘K / Ctrl+K", "settings.shortcut.command"],
    ["/", "settings.shortcut.search"],
    ["Shift+D", "settings.shortcut.theme"],
    ["Shift+L", "settings.shortcut.language"],
    ["⌘Z / Ctrl+Z", "settings.shortcut.undo"],
    ["?", "settings.shortcut.help"],
  ];

  return (
    <Card>
      <CardHeader title={`${t("settings.shortcuts")} (${t("a11y.shortcuts")})`} />
      <CardContent>
        <dl className="divide-y divide-line">
          {shortcuts.map(([combination, labelKey]) => (
            <div key={combination} className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-sm text-ink-soft">{t(labelKey)}</dt>
              <dd>
                <Kbd>{combination}</Kbd>
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
