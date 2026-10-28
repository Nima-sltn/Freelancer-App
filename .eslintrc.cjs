module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
  ],
  ignorePatterns: ["dist", "node_modules", ".eslintrc.cjs", "public/sw.js"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  settings: { react: { version: "18.2" } },
  plugins: ["react-refresh", "@typescript-eslint", "jsx-a11y"],
  rules: {
    "react-refresh/only-export-components": [
      "warn",
      { allowConstantExport: true, allowExportNames: ["routes", "useTheme", "useT"] },
    ],
    "react/prop-types": 0,
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "@typescript-eslint/no-explicit-any": "warn",
    "jsx-a11y/no-autofocus": "off",
    "jsx-a11y/label-has-associated-control": [
      "error",
      { controlComponents: ["TextField", "RHFSelect", "Textarea"] },
    ],
  },
  overrides: [
    {
      files: ["**/*.{test,spec}.{ts,tsx}", "src/test/**/*"],
      env: { node: true },
      globals: { vi: "readonly", describe: "readonly", it: "readonly", expect: "readonly" },
    },
  ],
};
