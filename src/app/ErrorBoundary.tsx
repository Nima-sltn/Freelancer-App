import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { APP_META, env } from "@/config/env";
import { translateDirect } from "@/store/i18n";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback; defaults to the full-page recovery screen. */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Top-level error boundary.
 *
 * React Router only catches *route* errors; anything thrown during render of a
 * shared component (a bad date, a malformed API payload) previously produced a
 * blank white page with no way back. This boundary keeps the shell alive, shows a
 * recovery action and surfaces the stack in development only.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (env.isDev) {
      // eslint-disable-next-line no-console
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
  }

  private reset = () => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="grid min-h-screen place-items-center bg-canvas p-6" role="alert">
        <div className="card max-w-lg p-8 text-center">
          <span aria-hidden="true" className="text-4xl">
            🧯
          </span>
          <h1 className="mt-4 text-xl font-black text-ink">{translateDirect("error.title")}</h1>
          <p className="mt-2 text-sm leading-7 text-ink-muted">
            {translateDirect("error.description")}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button onClick={this.reset}>{translateDirect("common.retry")}</Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              {translateDirect("error.reload")}
            </Button>
          </div>

          {env.isDev ? (
            <pre className="mt-6 max-h-40 overflow-auto rounded-lg bg-surface-sunken p-3 text-start text-[0.7rem] leading-5 text-danger">
              {error.message}
            </pre>
          ) : null}

          <p className="mt-4 text-xs text-ink-muted">
            {APP_META.name} v{APP_META.version}
          </p>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
