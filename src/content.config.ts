import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { site } from "./config/site.ts";
import { localGlob } from "./lib/local-content-loader";

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
  loader: localGlob({
    pattern: "**/*.{yaml,yml,json}",
    base: "./src/content/projects",
    // Keep file identity separate from public slugs so duplicate URLs cannot overwrite entries.
    generateId: ({ entry }) => entry,
  }),
  schema: ({ image }) => {
    const text = z.string().trim().min(1);
    const id = text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    const url = z.url().refine((value) => /^https?:\/\//.test(value), "Use an HTTP(S) URL");
    const link = z.object({ label: text, url }).strict();
    const mediaBase = {
      id,
      title: text,
      caption: text,
      alt: text,
      section: id,
      order: z.number().int().default(0),
      aspectRatio: z.enum(["16:9", "native"]).default("16:9"),
      sourceUrl: url.optional(),
    };
    const videoBase = {
      poster: image(),
      highlights: z.array(text).default([]),
      description: text.optional(),
      timestamps: z.array(z.object({ seconds: z.number().nonnegative(), label: text })).default([]),
    };
    const media = z.discriminatedUnion("type", [
      z.object({ ...mediaBase, type: z.literal("image"), src: image() }).strict(),
      z.object({
        ...mediaBase,
        ...videoBase,
        type: z.literal("video"),
        src: text.refine((value) => (/^\/(?!\/)[\w/.-]+\.(mp4|webm)$/.test(value) && !value.split("/").includes("..")) || /^https:\/\/.+\.(mp4|webm)(\?.*)?$/.test(value), "Use a public video path or HTTPS MP4/WebM URL"),
        captions: z.object({ src: text.regex(/^\/(?!\/)[\w/.-]+\.vtt$/).refine((value) => !value.split("/").includes("..")), language: text.default("en-NZ"), label: text.default("English") }).optional(),
      }).strict(),
      z.object({
        ...mediaBase,
        ...videoBase,
        type: z.literal("embed"),
        src: url.refine((value) => /^https:\/(?:(?:\/)(?:www\.)?youtube\.com\/watch\?v=[\w-]{11}|\/youtu\.be\/[\w-]{11}\/?|\/(?:www\.)?vimeo\.com\/\d+\/?)$/.test(value), "Use a canonical YouTube or Vimeo video URL"),
      }).strict(),
    ]);

    return z.object({
      title: text,
      slug: id,
      summary: text,
      category: z.enum(["Controls & Automation", "SCADA", "Systems Integration", "Software Engineering"]),
      projectType: text,
      role: text,
      period: text.optional(),
      year: z.number().int().optional(),
      status: z.enum(["In Progress", "Completed"]).optional(),
      techStack: z.array(text).min(3).max(5),
      links: z.array(link).default([]),
      featuredMedia: id.optional(),
      coverMedia: id.optional(),
      media: z.array(media).default([]),
      sections: z.array(z.object({
        id: id.refine((value) => value !== "hero", "hero is reserved for featured media"),
        title: text,
        paragraphs: z.array(text).min(1),
        bullets: z.array(text).default([]),
        mediaLayout: z.enum(["featured", "comparison", "sequence"]).default("featured"),
        code: z.object({ title: text, language: text, content: text }).optional(),
        tests: z.array(z.object({
          scenario: text,
          expected: text,
          result: text,
          evidence: id.optional(),
        }).strict()).default([]),
        significance: text.optional(),
        sources: z.array(link).default([]),
      }).strict()).min(1),
      order: z.number().default(999),
      featured: z.boolean().default(false),
    }).strict().superRefine((project, context) => {
      const issue = (message: string) => context.addIssue({ code: "custom", message });
      const sectionIds = project.sections.map((section) => section.id);
      const mediaIds = project.media.map((item) => item.id);
      if (new Set(sectionIds).size !== sectionIds.length) issue("Section IDs must be unique");
      if (new Set(mediaIds).size !== mediaIds.length) issue("Media IDs must be unique");
      for (const reference of [project.featuredMedia, project.coverMedia]) {
        if (reference && !mediaIds.includes(reference)) issue(`Unknown media reference: ${reference}`);
      }
      const sources = new Set<string>();
      const displayedImages = new Set<string>();
      for (const item of project.media) {
        if (item.section !== "hero" && !sectionIds.includes(item.section)) issue(`Unknown media section: ${item.section}`);
        if ((item.section === "hero") !== (item.id === project.featuredMedia)) issue("Only featuredMedia belongs to hero");
        const source = JSON.stringify(item.src);
        if (sources.has(source)) issue("Do not repeat the same media source in a case study");
        sources.add(source);
        const imageSource = JSON.stringify(item.type === "image" ? item.src : item.poster);
        if (displayedImages.has(imageSource)) issue("Do not repeat an image or video poster in a case study");
        displayedImages.add(imageSource);
      }
      for (const section of project.sections) {
        const count = project.media.filter((item) => item.section === section.id).length;
        if (section.mediaLayout === "comparison" && count !== 2) issue(`Comparison section ${section.id} needs two media items`);
        if (section.mediaLayout === "sequence" && count < 2) issue(`Sequence section ${section.id} needs at least two media items`);
        for (const test of section.tests) {
          if (test.evidence && !mediaIds.includes(test.evidence)) issue(`Unknown test evidence: ${test.evidence}`);
        }
      }
    });
  },
});

export const collections = {
  blogs: blogs,
  experience: experience,
  projects: projects,
};
