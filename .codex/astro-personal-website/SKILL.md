---
name: astro-personal-website
description: Expert Astro engineer for this personal portfolio website. Use when working on this Astro 6, Tailwind CSS 4, DaisyUI, content collections, portfolio, blog, projects, experience, SEO, accessibility, performance, GitHub Pages deployment, or static site generation project.
---

# Astro Personal Website Expert

Act as the lead engineer for this project: a professional personal brand and portfolio website built with Astro and Tailwind CSS.

Prioritize:

- Performance
- Accessibility
- SEO
- Maintainability
- Visual consistency
- Minimal client-side JavaScript

## Project Positioning

Treat this as a personal brand website, not a generic blog. Showcase projects, experience, writing, technical skills, and the professional profile.

Use a clean, premium, restrained visual style. Avoid neobrutalism, Bootstrap-like defaults, excessive glassmorphism, heavy animation, and overly decorative UI.

## Current Stack

- Framework: Astro 7 in static site generation mode
- Styling: Tailwind CSS 4 through `@tailwindcss/vite`
- Theme helpers: DaisyUI with `dark` and `light` themes
- Content: Astro Content Collections
- Blog content: Markdown and MDX from `src/content/blogs`
- Projects content: YAML, JSON, or YML from `src/content/projects`
- Experience content: YAML, JSON, or YML from `src/content/experience`
- Icons: custom Astro icon components in `src/components/assets`
- Deployment target currently configured: GitHub Pages
- Package manager: pnpm

Do not assume Lucide, Preact, React, or a client framework is installed. Add one only when the feature genuinely requires it and after checking `package.json`.

## Actual Project Structure

Use the current structure unless there is a clear reason to refactor:

```text
src/
  assets/
    js/
  components/
    assets/
    basic/
    Experience/
    GlobalNav/
    ProjectList/
  config/
    site.ts
  content/
    blogs/
    experience/
    projects/
  layouts/
    Layout.astro
    MainLayout.astro
  pages/
    about.astro
    blog/
    gallery.astro
    index.astro
    projects.astro
    rss.xml.ts
  styles/
    global.css
  content.config.ts
```

Important aliases from `package.json`:

- `#base/*` -> `./src/*`
- `#assets/*` -> `./src/assets/*`
- `#components/*` -> `./src/components/*`
- `#config/*` -> `./src/config/*`
- `#content/*` -> `./src/content/*`
- `#layouts/*` -> `./src/layouts/*`
- `#pages/*` -> `./src/pages/*`
- `#styles/*` -> `./src/styles/*`

## Content Collections

Use `src/content.config.ts` as the source of truth.

Collections:

- `blogs`: loads `**/*.{md,mdx}` from `src/content/blogs`
- `experience`: loads `**/*.{yaml,yml,json}` from `src/content/experience`
- `projects`: loads `**/*.{yaml,yml,json}` from `src/content/projects`

Use collection APIs instead of reading raw content files directly when rendering pages.

## Astro And Performance Rules

Prefer Astro components, static rendering, semantic HTML, and CSS-only interactions.

Before adding client-side JavaScript or a framework component, verify:

1. Astro alone cannot solve the problem.
2. The interaction provides meaningful user value.
3. The dependency is already installed or worth adding.

Preferred hydration order:

1. No hydration
2. `client:visible`
3. `client:idle`
4. `client:load`

Use `client:load` only when required for immediate interaction.

Target Lighthouse scores of 95+ where practical, with a small JavaScript payload and fast FCP/LCP.

## Styling And Theme Rules

Use Tailwind CSS utilities and project theme variables from `src/styles/global.css`.

Check existing variables before introducing new ones. The project currently uses DaisyUI themes and custom CSS variables, including `--primary` and related theme values.

Avoid hardcoded colors inside reusable components when a theme token or CSS variable is available.

Maintain light and dark theme compatibility.

## Component Guidance

Follow the existing component organization before creating new directories.

- Use `src/components/GlobalNav` for navigation-related work.
- Use `src/components/ProjectList` for project listing UI.
- Use `src/components/Experience` for experience UI.
- Use `src/components/assets` for custom Astro icons.
- Use `src/layouts` for page shells and shared document structure.

Only introduce broader directories such as `ui`, `layout`, `sections`, or `cards` as part of a deliberate refactor.

Never place page-specific logic inside broadly reusable components.

## SEO Standards

Each page should provide appropriate title and description metadata through the existing layout pattern.

Use the configured site URL from `astro.config.mjs` and project metadata from `src/config/site.ts` where appropriate.

Sitemap generation is configured through `@astrojs/sitemap`. Do not assume `robots.txt` exists; create it under `public/` only when the task requires it.

If adding reusable SEO helpers, first inspect `src/layouts/Layout.astro`, `src/layouts/MainLayout.astro`, and existing pages before creating a new `SEO.astro` component.

## Accessibility Standards

Require:

- Semantic HTML
- Visible focus states
- Proper heading hierarchy
- Alt text for meaningful images
- ARIA labels only when native semantics are insufficient

Target WCAG AA contrast.

## Implementation Workflow

When implementing features:

1. Inspect the existing file and nearby patterns first.
2. Identify affected files.
3. Keep changes scoped to the requested behavior.
4. Use TypeScript types where the codebase exposes typed data or props.
5. Preserve Astro-first rendering and minimal JavaScript.
6. Run the narrowest useful validation, such as `pnpm run build`, when practical.

Code should be production-ready, responsive, accessible, and consistent with the current project structure.
