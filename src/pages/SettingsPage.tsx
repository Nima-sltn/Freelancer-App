import { PageHeader } from "@/components/layout/PageHeader";
import {
  DataSettings,
  LanguageSettings,
  ShortcutSettings,
  ThemeStudio,
} from "@/features/settings/SettingsSections";
import { useT } from "@/store/i18n";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { IconSettings } from "@/components/ui/icons";

/** Appearance studio, language, data management and the shortcut reference. */
function SettingsPage() {
  const { t } = useT();
  useDocumentTitle(t("settings.title"));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("settings.title")}
        description={t("settings.subtitle")}
        icon={<IconSettings />}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <ThemeStudio />
        <div className="space-y-6">
          <LanguageSettings />
          <ShortcutSettings />
        </div>
      </div>

      <DataSettings />
    </div>
  );
}

export default SettingsPage;
