import { Fragment, useMemo } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Kbd } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useT } from "@/store/i18n";

export interface ShortcutGroup {
  readonly title: string;
  readonly items: readonly { readonly keys: readonly string[]; readonly description: string }[];
}

export interface KeyboardShortcutsOverlayProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export function KeyboardShortcutsOverlay({ open, onClose }: Readonly<KeyboardShortcutsOverlayProps>) {
  const { t } = useT();

  const shortcutGroups: ShortcutGroup[] = useMemo(
    () => [
      {
        title: t("shortcuts.nav"),
        items: [
          { keys: ["Ctrl", "K"], description: t("shortcuts.nav.command") },
          { keys: ["/"], description: t("shortcuts.nav.search") },
          { keys: ["?"], description: t("shortcuts.nav.help") },
          { keys: ["Esc"], description: t("shortcuts.nav.esc") },
        ],
      },
      {
        title: t("shortcuts.actions"),
        items: [
          { keys: ["Ctrl", "Z"], description: t("shortcuts.actions.undo") },
          { keys: ["Shift", "D"], description: t("shortcuts.actions.theme") },
          { keys: ["Shift", "L"], description: t("shortcuts.actions.lang") },
        ],
      },
      {
        title: t("shortcuts.forms"),
        items: [
          { keys: ["Enter"], description: t("shortcuts.forms.enter") },
          { keys: ["Tab"], description: t("shortcuts.forms.next") },
          { keys: ["Shift", "Tab"], description: t("shortcuts.forms.prev") },
        ],
      },
    ],
    [t]
  );

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6 md:p-20">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="mx-auto max-w-2xl transform overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-2xl transition-all">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div>
                  <Dialog.Title className="text-lg font-black text-ink">
                    {t("shortcuts.title")}
                  </Dialog.Title>
                  <p className="mt-1 text-xs text-ink-muted">
                    {t("shortcuts.subtitle")}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={onClose}>
                  ✕
                </Button>
              </div>

              <div className="mt-6 space-y-6">
                {shortcutGroups.map((group) => (
                  <div key={group.title}>
                    <h4 className="mb-2.5 text-xs font-bold text-primary-600">
                      {group.title}
                    </h4>
                    <div className="space-y-2">
                      {group.items.map((item) => (
                        <div
                          key={item.description}
                          className="flex items-center justify-between rounded-lg bg-surface-sunken px-3 py-2 text-xs"
                        >
                          <span className="text-ink">{item.description}</span>
                          <div className="flex items-center gap-1">
                            {item.keys.map((k) => (
                              <Kbd key={k}>{k}</Kbd>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t border-line pt-4 text-center">
                <span className="text-[0.75rem] text-ink-muted">
                  {t("shortcuts.nav.esc")} (<Kbd>Esc</Kbd>)
                </span>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}

export default KeyboardShortcutsOverlay;
