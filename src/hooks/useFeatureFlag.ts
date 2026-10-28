import { useState, useEffect, useCallback } from "react";
import {
  type FeatureFlags,
  getFeatureFlag,
  setFeatureFlag,
  getAllFeatureFlags,
} from "@/config/featureFlags";

/**
 * Hook to inspect and toggle a single feature flag with reactive state.
 */
export function useFeatureFlag<K extends keyof FeatureFlags>(
  key: K
): [boolean, (value: boolean) => void] {
  const [enabled, setEnabled] = useState(() => getFeatureFlag(key));

  useEffect(() => {
    setEnabled(getFeatureFlag(key));
  }, [key]);

  const toggle = useCallback(
    (value: boolean) => {
      setFeatureFlag(key, value);
      setEnabled(value);
    },
    [key]
  );

  return [enabled, toggle];
}

/**
 * Hook to inspect all active feature flags.
 */
export function useFeatureFlags(): FeatureFlags {
  const [flags, setFlags] = useState(getAllFeatureFlags);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "fh.feature_flags") {
        setFlags(getAllFeatureFlags());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return flags;
}

export default useFeatureFlag;
