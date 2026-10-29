import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { env } from "@/config/env";
import { translateDirect } from "@/store/i18n";

export interface FeatureErrorBoundaryProps {
  readonly children: ReactNode;
  /** Feature identifier used for error reporting and header display */
  readonly feature?: string;
  /** Custom fallback component if desired */
  readonly fallback?: ReactNode;
  /** Optional callback fired when an error is caught */
  readonly onError?: (error: Error, info: ErrorInfo) => void;
}

interface FeatureErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Feature-level error boundary.
 *
 * Catches errors in individual widgets/sections without bringing down the
 * entire page or the top-level application shell. Users can retry the
 * failed feature independently.
 */
export class FeatureErrorBoundary extends Component<
  FeatureErrorBoundaryProps,
  FeatureErrorBoundaryState
> {
  override state: FeatureErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): FeatureErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (env.isDev) {
      // eslint-disable-next-line no-console
      const featureTag = this.props.feature ? `:${this.props.feature}` : "";
      console.error(
        `[FeatureErrorBoundary${featureTag}]`,
        error,
        errorInfo
      );
    }
    this.props.onError?.(error, errorInfo);
  }

  private readonly handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  override render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    const featureName = this.props.feature ?? translateDirect("error.featureCrash");

    return (
      <div
        role="alert"
        className="rounded-xl border border-danger-500/20 bg-danger-500/5 p-6 text-center text-ink"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-500/10 text-xl text-danger">
          ⚠️
        </div>
        <h3 className="mt-3 text-base font-bold text-ink">
          {featureName}
        </h3>
        <p className="mt-1 text-sm text-ink-muted">
          {translateDirect("error.description")}
        </p>

        {env.isDev && this.state.error?.message ? (
          <pre className="mt-3 max-h-28 overflow-auto rounded bg-surface-sunken p-2 text-start text-xs text-danger">
            {this.state.error.message}
          </pre>
        ) : null}

        <div className="mt-4 flex justify-center gap-2">
          <Button size="sm" variant="outline" onClick={this.handleRetry}>
            {translateDirect("common.retry")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.location.reload()}
          >
            {translateDirect("error.reload")}
          </Button>
        </div>
      </div>
    );
  }
}

export default FeatureErrorBoundary;
