import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { site } from "./config/site.ts";
import { glob } from "astro/loaders";

// Blogs collection
const blogs = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "./src/content/blog",
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
      achievements: z.array(z.string()).default([]).optional(),
    }),
});

export const collections = {
  blogs: blogs,
  experience: experience,
};
