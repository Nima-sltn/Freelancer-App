import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "react-hot-toast";
import { env } from "@/config/env";
import { ApiError } from "@/lib/http/errors";
import { I18nProvider } from "@/store/i18n";
import { ThemeProvider } from "@/store/theme";
import { PluginProvider } from "@/store/plugins";
import { ServiceProvider } from "./ServiceContainer";
import { CommandProvider } from "@/store/command";
import { NotificationProvider } from "@/store/notifications";
import { TransactionProvider } from "@/store/transaction";
import { RealtimeProvider } from "@/store/realtime";
import { CommandPalette } from "@/features/command/CommandPalette";
import ErrorBoundary from "../ErrorBoundary";

/**
 * Provider composition.
 *
 * Order is significant and documented here so nobody has to guess:
 *   Theme   → writes CSS tokens before anything paints
 *   I18n    → sets `lang`/`dir` and the module-level locale for formatters
 *   Query   → the server-state cache every feature reads
 *   Command → palette registry features publish into
 *   Notify  → notification centre (fed by derived events)
 *   Tx      → ACID write pipeline (needs the query cache and i18n)
 *   Real    → background revalidation (needs the query cache)
 *
 * The `QueryClient` is created lazily inside state so hot reload and strict-mode
 * double mounts never share a cache instance accidentally.
 */
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Never retry auth/permission failures — that only delays the redirect.
          if (error instanceof ApiError && (error.isAuth || error.isForbidden)) return false;
          return failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <ThemeProvider>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <ServiceProvider>
            <PluginProvider>
              <CommandProvider>
                <NotificationProvider>
                  <TransactionProvider>
                    <RealtimeProvider>
                      <ErrorBoundary>
                        {children}
                        <CommandPalette />
                      </ErrorBoundary>
                    </RealtimeProvider>
                  </TransactionProvider>
                </NotificationProvider>
              </CommandProvider>
            </PluginProvider>
          </ServiceProvider>

          <Toaster
            position="bottom-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: "rgb(var(--color-surface))",
                color: "rgb(var(--color-ink))",
                border: "1px solid rgb(var(--color-line))",
                fontSize: "0.85rem",
                fontWeight: 700,
              },
            }}
          />

          {env.flags.devtools ? <ReactQueryDevtools initialIsOpen={false} /> : null}
        </QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

export default AppProviders;
