import { env } from "@/config/env";
import { installTransport } from "@/lib/http/client";

/**
 * Demo transport composition.
 *
 * `lib/http` knows how to accept a transport but must not know that a demo
 * transport exists — otherwise every consumer of the HTTP layer would pull the
 * seeded dataset into its dependency graph. The composition happens here, in
 * `mocks/`, which is the only layer allowed to know both sides.
 *
 * Two details matter and both were real bugs (see the note that used to live in
 * `lib/http/client.ts`):
 *
 *  1. the adapter is installed on **both** axios instances, otherwise the silent
 *     `/user/refresh-token` call escapes to the network and fails in demo mode;
 *  2. installation is asynchronous (the dataset is a dynamic import so it stays
 *     out of the live bundle), so `main.tsx` awaits this promise before the
 *     first render instead of racing the first query.
 */
export const mockTransportReady: Promise<void> = env.useMocks
  ? import("@/mocks/adapter").then(({ createMockAdapter }) => {
      installTransport(createMockAdapter());
    })
  : Promise.resolve();

export default mockTransportReady;
