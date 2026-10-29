/**
 * Application feature flags and runtime toggles.
 *
 * Config layer is strictly pure TypeScript (Layer 1).
 * Supports localStorage overrides for live developer toggling and experimentation.
 */

export interface FeatureFlags {
  /** Drag & drop Kanban board for proposals */
  enableDragAndDrop: boolean;
  /** Explainable AI recommendations & bid pricing simulator */
  enableAIRecommendations: boolean;
  /** Fluid UI animations and transitions */
  enableAnimations: boolean;
  /** Core Web Vitals monitoring and telemetry */
  enableWebVitals: boolean;
  /** Runtime plugin and extension architecture */
  enablePlugins: boolean;
  /** Activity heatmap calendar visualization */
  enableActivityHeatmap: boolean;
  /** Global keyboard shortcuts cheatsheet (?) */
  enableKeyboardShortcuts: boolean;
  /** Advanced PWA capabilities (push, sync, cache) */
  enablePwaFeatures: boolean;
}

const STORAGE_KEY = "fh.feature_flags";

const DEFAULT_FLAGS: FeatureFlags = {
  enableDragAndDrop: true,
  enableAIRecommendations: true,
  enableAnimations: true,
  enableWebVitals: true,
  enablePlugins: true,
  enableActivityHeatmap: true,
  enableKeyboardShortcuts: true,
  enablePwaFeatures: true,
};

function loadStoredFlags(): Partial<FeatureFlags> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Gets the current value of a feature flag with localStorage override precedence.
 */
export function getFeatureFlag<K extends keyof FeatureFlags>(key: K): boolean {
  const overrides = loadStoredFlags();
  if (key in overrides && typeof overrides[key] === "boolean") {
    return overrides[key];
  }
  return DEFAULT_FLAGS[key];
}

/**
 * Sets a feature flag override in localStorage.
 */
export function setFeatureFlag<K extends keyof FeatureFlags>(
  key: K,
  value: boolean
): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadStoredFlags();
    current[key] = value;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // ignore storage quota or private browsing errors
  }
}

/**
 * Resets all feature flag overrides back to defaults.
 */
export function resetFeatureFlags(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Retrieves all current active feature flags.
 */
export function getAllFeatureFlags(): FeatureFlags {
  const overrides = loadStoredFlags();
  return {
    ...DEFAULT_FLAGS,
    ...overrides,
  };
}
