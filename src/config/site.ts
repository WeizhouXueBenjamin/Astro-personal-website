export const site = {
  title: "Automation & Software Integration",
  description:
    "Benjamin Xue's portfolio in automation, control systems, and software integration, featuring PLC/SCADA simulations, software delivery, and hands-on technical experience.",
  siteUrl: "https://weizhouxuebenjamin.github.io",

  username: "Benjamin Xue",
  userTitle: "Automation / Control Systems & Software Integration",
  userDescription:
    "My focus is PLC/SCADA, industrial automation, and software integration. I build personal simulations with Ignition and CODESYS, supported by experience delivering software for charities and university teams and practical work with technical equipment.",

  location: "Auckland, New Zealand",
  focusAreas: ["PLC / SCADA", "Industrial automation", "System integration", "Software development"],

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
