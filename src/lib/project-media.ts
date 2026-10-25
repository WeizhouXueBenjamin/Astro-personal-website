import type { CollectionEntry } from "astro:content";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export type ProjectData = CollectionEntry<"projects">["data"];
export type ProjectMediaData = NonNullable<ProjectData["hero"]>;
export type NumberedMedia = { media: ProjectMediaData; number: number };

export function validateProjectMediaFiles(media: ProjectMediaData) {
  if (media.type !== "video") return;
  for (const path of [media.src, media.captions?.src]) {
    if (path?.startsWith("/") && !existsSync(resolve("public", `.${path}`))) {
      throw new Error(`Missing project media file: ${path}`);
    }
  }
}

export function getProjectCover(project: ProjectData) {
  if (project.cover) return project.cover;
  const media = project.hero;
  if (!media) return undefined;
  return { src: media.type === "image" ? media.src : media.poster, alt: media.alt };
}

export function getEmbedUrl(source: string) {
  const url = new URL(source);
  if (url.hostname === "vimeo.com" || url.hostname === "www.vimeo.com") {
    return `https://player.vimeo.com/video/${url.pathname.replace(/^\/|\/$/g, "")}?autoplay=0&dnt=1`;
  }
  const id = url.hostname === "youtu.be" ? url.pathname.replace(/^\/|\/$/g, "") : url.searchParams.get("v");
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=0&rel=0`;
}
