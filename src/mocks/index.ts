export { createMockAdapter } from "./adapter";
export { demoDb } from "./db";
export { createDemoState, DEMO_ACCOUNTS, DEMO_OTP_CODE } from "./data";
export type { DemoProject, DemoState } from "./data";

import { demoDb } from "./db";

/**
 * Restores the deterministic seed and clears the demo session.
 * Wired to the "reset demo" action in the settings page and the offline banner.
 */
export function resetDemoData(): void {
  demoDb.reset();
}

/** Signs the demo session in as the given seeded phone number. */
export function setDemoSession(phoneNumber: string): boolean {
  const user = demoDb.current.users.find((item) => item.phoneNumber === phoneNumber);
  if (!user) return false;
  demoDb.setSession(user._id);
  return true;
}
