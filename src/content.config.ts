import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { site } from "./config/site.ts";
import { localGlob } from "./lib/local-content-loader";
import { projectId, projectMediaSchema, projectUrl } from "./lib/project-schema";

// Blogs collection
const blogs = defineCollection({
  loader: localGlob({
    pattern: "**/*.{md,mdx}",
    base: "./src/content/blogs",
  }),
  schema: z.object({
    title: z.string(),
    pubDate: z.date(),
    description: z.string(),
    author: z.string().default(site.username),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const experience = defineCollection({
  loader: localGlob({
    pattern: "**/*.{yaml,yml,json}",
    base: "./src/content/experience",
  }),
  schema: ({ image }) =>
    z.object({
      // Basic info
      jobTitle: z.string(),
      company: z.string(),
      location: z.string().optional(),
      startDate: z.string(),
      endDate: z.string().optional(),

      // Content
      bullets: z.array(z.string()).min(1, "At least one bullet point required"),

      // Classification
      tags: z.array(z.string()).default([]),
      techStack: z.array(z.string()).default([]),

      // Optional
      logo: image().optional(),

      companyWebsite: z.url().optional(),

      // Achievements (for resume highlights)
      highLights: z.array(z.string()).default([]),

      // Reference letter fields
      referenceLetter: z
        .object({
          path: z.string().min(1, "File path is required"),
          refererName: z.string().min(1, "Referer name is required"),
          refererAvatar: z.string().min(1, "Referer avatar is required"),
          refererSentence: z
            .string()
            .min(10, "Referer sentence must be at least 10 characters"),
        })
        .optional()
        .refine(
          (ref) => {
            if (!ref) return true;
            const validExtensions = [".pdf", ".doc", ".docx", ".txt"];
            return validExtensions.some((ext) =>
              ref.path.toLowerCase().endsWith(ext),
            );
          },
          {
            message: "Reference letter must be a PDF, DOC, DOCX, or TXT file",
            path: ["path"],
          },
        ),
    }),
});

const projects = defineCollection({
  loader: localGlob({
    pattern: "**/*.mdx",
    base: "./src/content/projects",
    // Keep file identity separate from public slugs to detect duplicate URLs.
    generateId: ({ entry }) => entry,
  }),
  schema: ({ image }) => {
    const text = z.string().trim().min(1);
    return z.object({
      title: text,
      slug: projectId,
      summary: text,
      category: z.enum(["Controls & Automation", "SCADA", "Systems Integration", "Software Engineering"]),
      projectType: text,
      role: text,
      period: text.optional(),
      year: z.number().int().optional(),
      status: z.enum(["In Progress", "Completed"]).optional(),
      techStack: z.array(text).min(3).max(5),
      links: z.array(z.object({ label: text, url: projectUrl }).strict()).default([]),
      hero: projectMediaSchema(image()).optional(),
      cover: z.object({ src: image(), alt: text }).strict().optional(),
      order: z.number().default(999),
      featured: z.boolean().default(false),
    }).strict();
  },
});

export const collections = {
  blogs,
  experience,
  projects,
};
