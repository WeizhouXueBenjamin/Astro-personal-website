import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { site } from "./config/site.ts";
import { glob } from "astro/loaders";

// Blogs collection
const blogs = defineCollection({
  loader: glob({
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
  loader: glob({
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
      techStack: z.array(z.string()).default([]).optional(),

      // Metadata
      order: z.number().default(999).optional(),
      featured: z.boolean().default(false),

      // Optional
      logo: image().optional(),

      companyWebsite: z.url().optional(),

      // Achievements (for resume highlights)
      highLights: z.array(z.string()).default([]).optional(),

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
  loader: glob({
    pattern: "**/*.{yaml,yml,json}",
    base: "./src/content/projects",
  }),
  schema: ({ image }) =>
    z.object({
      // Basic info
      title: z.string(),
      subtitle: z.string().optional(),
      description: z.string(),
      githubUrl: z.url().optional(),
      liveUrl: z.url().optional(),
      demoUrl: z.url().optional(),
      year: z.number().optional(),
      status: z.enum(["In Progress", "Completed"]).default("In Progress").optional(),

      // Content
      bullets: z.array(z.string()).min(1, "At least one bullet point required"),

      // Classification
      tags: z.array(z.string()).default([]),
      techStack: z.array(z.string()).default([]).optional(),

      // Metadata (featured: pin on top, order: custom sorting)
      order: z.number().default(999).optional(),
      featured: z.boolean().default(false),

      // Optional
      logo: image().optional(),
    }),
});

export const collections = {
  blogs: blogs,
  experience: experience,
  projects: projects,
};
