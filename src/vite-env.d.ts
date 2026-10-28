/// <reference types="vite/client" />

type ApiModeEnv = "live" | "mock";

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_API_MODE?: ApiModeEnv;
  readonly VITE_MOCK_LATENCY?: string;
  readonly VITE_ENABLE_DEVTOOLS?: string;
  readonly VITE_ENABLE_SERVICE_WORKER?: string;
  readonly VITE_ENABLE_REALTIME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
