import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import astro from "eslint-plugin-astro";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  globalIgnores([
    "dist/**",
    ".astro/**",
    "node_modules/**",
    ".idea/**",
    // Third-party distributions; our own main.js remains checked.
    "src/assets/js/particles.min.js",
    "src/assets/js/sweet-scroll.min.js",
  ]),
  {
    name: "project/correctness",
    files: ["**/*.{js,mjs,ts,astro}"],
    extends: [js.configs.recommended],
    linterOptions: { reportUnusedDisableDirectives: "error" },
    rules: {
      "no-unused-vars": "warn",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
    },
  },
  {
    name: "project/node",
    files: ["*.mjs", "scripts/**/*.{js,mjs,ts}", "src/**/*.{ts,mjs}"],
    ignores: ["**/*.astro/**"],
    languageOptions: { globals: globals.node },
  },
  {
    name: "project/typescript",
    files: ["**/*.ts", "**/*.astro"],
    extends: [tseslint.configs.recommended],
    rules: {
      // TypeScript checks undefined names; the TS rule understands type-only uses.
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
    },
  },
  ...astro.configs.recommended,
  {
    name: "project/astro-safety",
    files: ["**/*.astro"],
    rules: {
      // Compiler diagnostics come from typecheck; astro/valid-compile is deprecated.
      "astro/no-set-html-directive": "error",
      // no-unsafe-inline-scripts also flags Astro's bundled scripts; do not use it
      // as a CSP check. Dynamic code execution is checked by the core rules above.
      "astro/jsx-a11y/alt-text": "error",
      "astro/jsx-a11y/anchor-has-content": "error",
      "astro/jsx-a11y/aria-props": "error",
      "astro/jsx-a11y/aria-proptypes": "error",
      "astro/jsx-a11y/aria-unsupported-elements": "error",
      "astro/jsx-a11y/iframe-has-title": "error",
      "astro/jsx-a11y/role-has-required-aria-props": "error",
      "astro/jsx-a11y/tabindex-no-positive": "error",
      "astro/jsx-a11y/media-has-caption": "warn",
    },
  },
  {
    name: "project/browser",
    files: ["src/assets/js/*.js", "**/*.astro/*.{js,ts}"],
    languageOptions: { globals: globals.browser },
    rules: {
      "no-restricted-globals": ["error", "process", "Buffer", "require", "module", "exports", "__dirname", "__filename", "global"],
    },
  },
  {
    name: "project/legacy-browser-globals",
    files: ["src/assets/js/main.js"],
    // Provided by the existing vendor scripts, not Node or browser built-ins.
    languageOptions: { globals: { SweetScroll: "readonly", particlesJS: "readonly" } },
  },
);
