import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/app/App";
import { mockTransportReady } from "@/mocks/install";
import { registerServiceWorker } from "@/lib/serviceWorker";
import "./index.css";

/**
 * Entry point.
 *
 * The app is mounted by `bootstrap()` rather than at module top level, because
 * demo mode installs its axios adapter asynchronously (the wiring lives in
 * `mocks/install.ts`, so `lib/http` never depends on the demo layer). Awaiting
 * `mockTransportReady` first removes a whole class of race conditions (the
 * first dashboard query, or the silent token refresh, landing before the seeded
 * adapter existed). In live mode the promise is already resolved, so this costs
 * one microtask.
 *
 * StrictMode stays on: the providers are written to be resilient to double
 * invocation (lazy query client, idempotent command registration, guarded
 * effects), and it surfaces real bugs early.
 */
async function bootstrap(): Promise<void> {
  const container = document.getElementById("root");
  if (!container) throw new Error("Root container #root was not found");

  try {
    await mockTransportReady;
  } catch (error) {
    // A failed demo dataset must not blank the screen: log and continue so the
    // error boundary / network banner can explain what happened.
    console.error("[bootstrap] demo transport failed to initialise", error);
  }

  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  registerServiceWorker();
}

void bootstrap();
