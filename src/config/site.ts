export const site = {
  title: "Automation & Software Integration",
  description:
    "Benjamin Xue's portfolio in automation, control systems, and software integration, featuring PLC/SCADA simulations, software delivery, and hands-on technical experience.",

  username: "Benjamin Xue",
  userTitle: "Automation / Control Systems & Software Integration",
  userDescription:
    "I build PLC/SCADA and industrial automation simulations with Ignition and CODESYS, drawing on software delivery and hands-on technical experience.",

  location: "Auckland, New Zealand",
  focusAreas: [
    "PLC / SCADA",
    "Industrial automation",
    "System integration",
    "Software development",
  ],

  email: "benjamin_xue@outlook.com",
  resumeUrl: "/documents/Benjamin-Xue-Automation-SCADA-CV.pdf",
  social: {
    twitter: undefined as string | undefined,
    instagram: undefined as string | undefined,
    facebook: undefined as string | undefined,
    linkedin: "weizhou-xue-18679a269",
    github: "weizhouxuebenjamin",
  },
} as const;

// Shared URLs for the contact section, social icons and footer.
export const contactLinks = [
  { label: "Email", href: `mailto:${site.email}`, icon: "email" as const, external: false },
  ...([
    ["twitter", "Twitter", "https://twitter.com/"],
    ["instagram", "Instagram", "https://instagram.com/"],
    ["facebook", "Facebook", "https://facebook.com/"],
    ["linkedin", "LinkedIn", "https://linkedin.com/in/"],
    ["github", "GitHub", "https://github.com/"],
  ] as const).flatMap(([icon, label, baseUrl]) => {
    const handle = site.social[icon];
    return handle ? [{ label, href: `${baseUrl}${handle}`, icon, external: true }] : [];
  }),
];
