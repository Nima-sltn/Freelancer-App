/** @type {import('tailwindcss').Config} */
import { fontFamily } from "tailwindcss/defaultTheme";
import tailwindFormPlugin from "@tailwindcss/forms";

/**
 * Every colour is expressed as `rgb(var(--token) / <alpha-value>)` so that
 * themes (light/dark, accent presets, high contrast) and Tailwind opacity modifiers
 * (e.g. `bg-primary-500/10`) work seamlessly without invalid mixed syntax.
 */
function token(variableName) {
  return `rgb(var(${variableName}) / <alpha-value>)`;
}

const scale = (name) =>
  Object.fromEntries(
    [0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((step) => [
      step,
      token(`--color-${name}-${step}`),
    ])
  );

export default {
  darkMode: ["class", ".dark-mode"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Semantic surface / text tokens
        canvas: token("--color-canvas"),
        surface: {
          DEFAULT: token("--color-surface"),
          raised: token("--color-surface-raised"),
          sunken: token("--color-surface-sunken"),
        },
        line: {
          DEFAULT: token("--color-line"),
          strong: token("--color-line-strong"),
        },
        ink: {
          DEFAULT: token("--color-ink"),
          soft: token("--color-ink-soft"),
          muted: token("--color-ink-muted"),
          inverted: token("--color-ink-inverted"),
        },
        // Brand + feedback palettes
        primary: scale("primary"),
        accent: scale("accent"),
        success: token("--color-success"),
        warning: token("--color-warning"),
        danger: token("--color-danger"),
        info: token("--color-info"),
      },
      borderColor: {
        DEFAULT: token("--color-line"),
      },
      fontFamily: {
        sans: ["Vazir", ...fontFamily.sans],
      },
      container: {
        center: true,
        padding: "1rem",
      },
      // Radius tokens are driven by the theme studio.
      borderRadius: {
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-lg)",
        "2xl": "var(--radius-xl)",
        "3xl": "var(--radius-2xl)",
        card: "var(--radius-xl)",
      },
      boxShadow: {
        card: "0 1px 2px rgb(var(--color-shadow) / 0.06), 0 8px 24px -12px rgb(var(--color-shadow) / 0.18)",
        pop: "0 18px 48px -18px rgb(var(--color-shadow) / 0.35)",
        focus: "0 0 0 3px rgb(var(--color-primary-500) / 0.35)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(-100%)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-in-left": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.85)", opacity: "0.7" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        "draw-line": {
          from: { strokeDashoffset: "1000" },
          to: { strokeDashoffset: "0" },
        },
      },
      animation: {
        "fade-in": "fade-in 240ms ease-out both",
        "fade-in-up": "fade-in-up 320ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-in": "scale-in 180ms cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 1.6s infinite",
        "slide-in-right": "slide-in-right 300ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "slide-in-left": "slide-in-left 300ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "slide-up": "slide-up 220ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "pulse-ring": "pulse-ring 1.2s ease-out infinite",
        "draw-line": "draw-line 1.2s ease-out forwards",
      },
    },
  },
  plugins: [
    tailwindFormPlugin({
      strategy: "class",
    }),
  ],
};
