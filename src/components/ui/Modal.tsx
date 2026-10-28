import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import type { ReactNode } from "react";
import { HiOutlineX } from "react-icons/hi";
import { Button } from "./Button";
import { cx } from "@/lib/cx";
import { useT } from "@/store/i18n";

const WIDTHS = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
  full: "sm:max-w-6xl",
} as const;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof WIDTHS;
  /** Prevent closing by backdrop click / Escape (used for destructive flows). */
  dismissable?: boolean;
}

/**
 * Accessible dialog built on Headless UI.
 *
 * Focus trapping, `aria-modal`, scroll locking and Escape handling are all
 * provided by the primitive, and focus is restored to the trigger on close —
 * the hand-rolled version previously shipped none of that.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  dismissable = true,
}: ModalProps) {
  const { t } = useT();
  return (
    <Dialog
      open={isOpen}
      onClose={dismissable ? onClose : () => undefined}
      className="relative z-50"
      aria-label={title}>
      <div className="fixed inset-0 animate-fade-in bg-ink/45 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4">
        <DialogPanel
          className={cx(
            "scroll-area max-h-[92vh] w-full animate-slide-up rounded-t-3xl border border-line bg-surface p-5 shadow-pop sm:rounded-card sm:p-6",
            WIDTHS[size]
          )}>
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-line pb-4">
            <div>
              <DialogTitle className="text-base font-black text-ink">{title}</DialogTitle>
              {description ? (
                <p className="mt-1 text-xs leading-6 text-ink-muted">{description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.close")}
              className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink">
              <HiOutlineX className="h-5 w-5" />
            </button>
          </div>

          {children}

          {footer ? <div className="mt-6 flex justify-end gap-3">{footer}</div> : null}
        </DialogPanel>
      </div>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  side = "end",
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: "start" | "end";
}) {
  const { dir, t } = useT();
  const slidesFromLeft = (side === "end") === (dir === "rtl");

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50" aria-label={title}>
      <div className="fixed inset-0 animate-fade-in bg-ink/45 backdrop-blur-sm" />
      <div
        className={cx(
          "fixed inset-y-0 flex w-full max-w-md",
          side === "end" ? "end-0" : "start-0"
        )}>
        <DialogPanel
          className={cx(
            "scroll-area flex w-full flex-col border-line bg-surface shadow-pop",
            side === "end" ? "border-s" : "border-e",
            slidesFromLeft ? "animate-slide-in-left" : "animate-slide-in-right"
          )}>
          <div className="flex items-center justify-between gap-4 border-b border-line p-5">
            <DialogTitle className="text-base font-black text-ink">{title}</DialogTitle>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.close")}
              className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-surface-sunken hover:text-ink">
              <HiOutlineX className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 p-5">{children}</div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = "danger",
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  isLoading?: boolean;
}) {
  const { t } = useT();
  const resolvedConfirm = confirmLabel ?? t("common.confirm");
  const resolvedCancel = cancelLabel ?? t("common.cancel");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {resolvedCancel}
          </Button>
          <Button variant={tone} onClick={onConfirm} isLoading={isLoading}>
            {resolvedConfirm}
          </Button>
        </>
      }>
      <div className="text-sm leading-7 text-ink-soft">{message}</div>
    </Modal>
  );
}

export default Modal;
