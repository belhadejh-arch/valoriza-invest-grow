import { AlertTriangle, CheckCircle2, FolderOpen, Loader2, RefreshCw } from "lucide-react";
import { Logo } from "./Logo";
import { useI18n } from "@/lib/i18n";

export function LoadingState({ message }: { message?: string }) {
  const { t } = useI18n();
  return (
    <div
      id="status-loading"
      className="flex min-h-[260px] w-full flex-col items-center justify-center p-6 text-center"
    >
      <div className="relative mb-3 flex items-center justify-center">
        <div className="absolute h-14 w-14 rounded-full border-2 border-primary/20 animate-ping" />
        <Loader2 className="h-10 w-10 animate-spin text-cyan-glow" />
      </div>
      <Logo size="sm" />
      <p className="mt-3 text-sm font-semibold text-foreground/90 animate-pulse">
        {message ?? t("public.status.loading")}
      </p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      id="status-empty"
      className="surface-card flex min-h-[220px] w-full flex-col items-center justify-center p-6 text-center"
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface border border-border text-muted-foreground">
        <FolderOpen className="h-6 w-6 text-cyan-glow" />
      </div>
      <h3 className="text-base font-bold text-foreground">{title ?? t("public.status.emptyTitle")}</h3>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground leading-relaxed">
        {description ?? t("public.status.emptyDescription")}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 rounded-xl brand-gradient px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      id="status-error"
      className="surface-card border-danger/40 flex min-h-[240px] w-full flex-col items-center justify-center p-6 text-center"
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/15 border border-danger/30 text-danger">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="text-base font-bold text-foreground">
        {title ?? t("public.status.errorTitle")}
      </h3>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground leading-relaxed">
        {description ?? t("public.status.errorDescription")}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-primary/50 bg-navy-deep px-4 py-2 text-xs font-bold text-cyan-glow transition-colors hover:bg-surface"
        >
          <RefreshCw className="h-3.5 w-3.5" /> {t("public.status.retry")}
        </button>
      )}
    </div>
  );
}

export function SuccessState({
  title,
  description,
  onClose,
}: {
  title?: string;
  description?: string;
  onClose?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      id="status-success"
      className="surface-card border-success/40 flex w-full flex-col items-center justify-center p-6 text-center"
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-success/15 border border-success/30 text-success">
        <CheckCircle2 className="h-7 w-7" />
      </div>
      <h3 className="text-base font-bold text-foreground">
        {title ?? t("public.status.successTitle")}
      </h3>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="mt-4 rounded-xl gold-gradient px-5 py-2 text-xs font-extrabold text-navy-deep"
        >
          {t("public.status.ok")}
        </button>
      )}
    </div>
  );
}
