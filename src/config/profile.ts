export interface Study {
  title: string;
  meta: string;
}

export interface Capability {
  title: string;
  description: string;
  tools: string[];
}

export const studies: Study[] = [
  {
    title: "Bachelor of Science, Computer Science",
    meta: "University of Auckland / Jan 2023 - Nov 2025",
  },
  {
    title: "Microsoft Certified: Azure Fundamentals",
    meta: "Cloud concepts, core Azure services, security, privacy, and pricing / May 2024",
  },
  {
    title: "Certificate of Merit: Department of Physics",
    meta: "Recognition for logical reasoning, systematic analysis, and attention to detail / Jul 2025",
  },
];

export const capabilities: Capability[] = [
  {
    title: "Automation & control systems",
    description:
      "Personal simulation projects cover feeder supervision in Ignition Perspective and conveyor sequence control in CODESYS, including interlocks, alarms, and operating-cycle verification.",
    tools: ["Ignition", "Perspective", "CODESYS", "Structured Text", "Factory I/O"],
  },
  {
    title: "Software development & integration",
    description:
      "Experience delivering React and Node.js applications, REST APIs, authentication, and end-to-end testing complements SCADA tag, binding, and scripting work in personal projects.",
    tools: ["React", "Node.js", "REST APIs", "Python / Jython", "Cypress"],
  },
  {
    title: "Field practice & engineering delivery",
    description:
      "Hands-on hardware diagnostics and equipment replacement complement experience leading small software teams, documenting systems, and handing over delivered work.",
    tools: ["Hardware diagnostics", "Technical documentation", "Team delivery"],
  },
];
