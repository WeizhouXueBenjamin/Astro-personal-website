export const site = {
  title: "Benjamin Xue",
  description: "Astro Theme Benjamin's Resume",
  siteUrl: "https://weizhouxuebenjamin.github.io/Astro-personal-website",

  username: "Benjamin Xue",
  userTitle: "Software Engineer",
  userDescription:
    "I'm a Software Engineer from Argentina, always searching for the next challenge; no task is too scary nor too difficult. Lately I have been immersed in world of Giving Circles working with Grapevine, a California based startup trying to improve the world through collaborative giving. I'm the first engineer they hired to work on the platform.",

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