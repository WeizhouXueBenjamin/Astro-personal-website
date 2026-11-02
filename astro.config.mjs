// @ts-check
import { defineConfig } from "astro/config";

import mdx from "@astrojs/mdx";
import { unified } from "@astrojs/markdown-remark";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { getDeploymentConfig } from "./src/config/deployment.mjs";
import remarkProjects from "./src/lib/remark-projects.mjs";

const { site } = getDeploymentConfig();

export default defineConfig({
  site,
  output: "static",
  trailingSlash: "always",
  markdown: {
    processor: unified({ remarkPlugins: [remarkProjects] }),
  },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) =>
        !["/experience", "/gallery", "/404", "/404.html"].includes(
          new URL(page).pathname.replace(/\/$/, ""),
        ),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
