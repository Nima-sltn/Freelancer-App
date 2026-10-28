import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { storage } from "@/lib/storage";

export type ThemeMode = "light" | "dark" | "system";
export type AccentColor = "indigo" | "emerald" | "rose" | "amber" | "violet" | "cyan";
export type RadiusPreset = "sharp" | "rounded" | "soft";
export type Density = "compact" | "cozy" | "spacious";

export interface ThemeSettings {
  mode: ThemeMode;
  accent: AccentColor;
  radius: RadiusPreset;
  density: Density;
  highContrast: boolean;
  reduceMotion: boolean;
}

export interface ThemeContextValue extends ThemeSettings {
  /** Fully resolved appearance after applying the OS preference. */
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentColor) => void;
  setRadius: (radius: RadiusPreset) => void;
  setDensity: (density: Density) => void;
  setHighContrast: (value: boolean) => void;
  setReduceMotion: (value: boolean) => void;
  toggleDarkMode: () => void;
  resetTheme: () => void;
}

const STORAGE_KEY = "theme";

const DEFAULT_THEME: ThemeSettings = {
  mode: "system",
  accent: "indigo",
  radius: "rounded",
  density: "cozy",
  highContrast: false,
  reduceMotion: false,
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Appearance provider ("theme studio").
 *
 * Instead of swapping two hard-coded stylesheets, the theme writes data
 * attributes and CSS custom properties onto `<html>`. Because every colour,
 * radius and spacing value in `index.css` reads from a token, the entire app —
 * including third-party widgets — re-themes instantly with no re-render and no
 * flash of the wrong theme (`index.html` applies the persisted theme inline).
 */
export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: ReactNode;
  initialTheme?: Partial<ThemeSettings>;
}) {
  const [settings, setSettings] = useState<ThemeSettings>(() => ({
    ...DEFAULT_THEME,
    ...storage.get<Partial<ThemeSettings>>(STORAGE_KEY, {}),
    ...initialTheme,
  }));
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  // Follow the OS preference while `mode === "system"`.
  useEffect(() => {
    if (!window.matchMedia) return;
    const list = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    list.addEventListener("change", handler);
    return () => list.removeEventListener("change", handler);
  }, []);

  const isDark = settings.mode === "dark" || (settings.mode === "system" && systemDark);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark-mode", isDark);
    root.classList.toggle("light-mode", !isDark);
    root.dataset.themeMode = settings.mode;
    root.dataset.accent = settings.accent;
    root.dataset.radius = settings.radius;
    root.dataset.density = settings.density;
    root.dataset.contrast = settings.highContrast ? "high" : "normal";
    root.dataset.motion = settings.reduceMotion ? "reduced" : "full";
    root.style.colorScheme = isDark ? "dark" : "light";
    storage.set(STORAGE_KEY, settings);
  }, [settings, isDark]);

  const patch = useCallback((changes: Partial<ThemeSettings>) => {
    setSettings((current) => ({ ...current, ...changes }));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      ...settings,
      isDark,
      setMode: (mode) => patch({ mode }),
      setAccent: (accent) => patch({ accent }),
      setRadius: (radius) => patch({ radius }),
      setDensity: (density) => patch({ density }),
      setHighContrast: (highContrast) => patch({ highContrast }),
      setReduceMotion: (reduceMotion) => patch({ reduceMotion }),
      toggleDarkMode: () => patch({ mode: isDark ? "light" : "dark" }),
      resetTheme: () => setSettings(DEFAULT_THEME),
    }),
    [settings, isDark, patch]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside <ThemeProvider>");
  return context;
}

export const THEME_PRESETS = {
  accents: [
    { value: "indigo", label: "نیلی", color: "#4a6dff" },
    { value: "emerald", label: "زمرد", color: "#10b981" },
    { value: "rose", label: "سرخابی", color: "#f43f5e" },
    { value: "amber", label: "کهربا", color: "#f59e0b" },
    { value: "violet", label: "بنفش", color: "#8b5cf6" },
    { value: "cyan", label: "فیروزه", color: "#06b6d4" },
  ] as const,
  radii: ["sharp", "rounded", "soft"] as const,
  densities: ["compact", "cozy", "spacious"] as const,
} as const;

export default ThemeProvider;
