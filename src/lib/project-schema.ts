import { z } from "astro/zod";

const text = z.string().trim().min(1);
export const projectId = text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const projectUrl = z.url().refine((value) => /^https?:\/\//.test(value), "Use an HTTP(S) URL");

// Share the content contract between frontmatter images and imported MDX images.
export function projectMediaSchema<TImage extends z.ZodType>(image: TImage) {
  const common = {
    id: projectId,
    title: text,
    caption: text,
    alt: text,
    aspectRatio: z.enum(["16:9", "native"]).default("16:9"),
    sourceUrl: projectUrl.optional(),
  };
  const video = {
    poster: image,
    highlights: z.array(text).default([]),
    description: text.optional(),
    timestamps: z.array(z.object({ seconds: z.number().nonnegative(), label: text })).default([]),
  };
  return z.discriminatedUnion("type", [
    z.object({ ...common, type: z.literal("image"), src: image }).strict(),
    z.object({
      ...common,
      ...video,
      type: z.literal("video"),
      src: text.refine((value) => (/^\/(?!\/)[\w/.-]+\.(mp4|webm)$/.test(value) && !value.split("/").includes("..")) || /^https:\/\/.+\.(mp4|webm)(\?.*)?$/.test(value), "Use a public video path or HTTPS MP4/WebM URL"),
      captions: z.object({
        src: text.regex(/^\/(?!\/)[\w/.-]+\.vtt$/).refine((value) => !value.split("/").includes("..")),
        language: text.default("en-NZ"),
        label: text.default("English"),
      }).optional(),
    }).strict(),
    z.object({
      ...common,
      ...video,
      type: z.literal("embed"),
      src: projectUrl.refine((value) => /^https:\/\/(?:(?:www\.)?youtube\.com\/watch\?v=[\w-]{11}|youtu\.be\/[\w-]{11}\/?|(?:www\.)?vimeo\.com\/\d+\/?)$/.test(value), "Use a canonical YouTube or Vimeo video URL"),
    }).strict(),
  ]);
}

export const projectTestSchema = z.object({
  scenario: text,
  expected: text,
  result: text,
  evidence: projectId.optional(),
}).strict();
