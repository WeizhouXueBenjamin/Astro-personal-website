// @ts-check
import { defineConfig } from "astro/config";

import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// GitHub Pages deployment configuration
const base = "/";
const site = "https://weizhouxuebenjamin.github.io";

export default defineConfig({
  site,
  base,
  trailingSlash: "never",
  integrations: [mdx(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
