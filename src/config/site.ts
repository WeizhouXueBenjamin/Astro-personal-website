export const site = {
  title: "Portfolio",
  description: "Astro Theme Benjamin's Personal Website",
  siteUrl: "https://weizhouxuebenjamin.github.io",

  username: "Benjamin Xue",
  userTitle: "Full Stack Web Developer",
  userDescription:
    "I'm a Full-stack engineer with 1+ year of production experience delivering React/Node.js applications for live charities and university teams. Built AI-powered OCR tools (95% precision), led 7‑dev teams through full SDLC, and shipped hybrid SSR/static sites improving SEO. Looking to scale impact in mission-driven or high‑autonomy engineering roles.",

  email: "benjamin_xue@outlook.com",
  social: {
    twitter: undefined as string | undefined,
    instagram: undefined as string | undefined,
    facebook: undefined as string | undefined,
    linkedin: "weizhou-xue-18679a269",
    github: "weizhouxuebenjamin",
  },
} as const;

export type SiteConfig = typeof site;