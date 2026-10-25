// @ts-check
import { defineConfig } from "astro/config";

import mdx from "@astrojs/mdx";
import { unified } from "@astrojs/markdown-remark";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { getDeploymentConfig } from "./src/config/deployment.mjs";
import remarkBasePaths from "./src/lib/remark-base-paths.mjs";

const { site, base } = getDeploymentConfig();

export default defineConfig({
  site,
  base,
  output: "static",
  trailingSlash: "always",
  markdown: {
    processor: unified({ remarkPlugins: [[remarkBasePaths, { base }]] }),
  },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) =>
        !["/experience", "/gallery", "/404", "/404.html"].includes(
          new URL(page).pathname.slice(base === "/" ? 0 : base.length).replace(/\/$/, ""),
        ),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
