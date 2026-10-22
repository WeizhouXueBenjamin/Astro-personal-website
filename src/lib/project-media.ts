import type { CollectionEntry } from "astro:content";

export type ProjectData = CollectionEntry<"projects">["data"];
export type ProjectMediaData = ProjectData["media"][number];
export type ProjectSectionData = ProjectData["sections"][number];
export type NumberedMedia = { media: ProjectMediaData; number: number };

export function getProjectEvidence(project: ProjectData): NumberedMedia[] {
  const sections = ["hero", ...project.sections.map((section) => section.id)];
  return sections.flatMap((id) => project.media
    .filter((media) => media.section === id)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id, "en")))
    .map((media, index) => ({ media, number: index + 1 }));
}

export function getProjectCover(project: ProjectData) {
  const media = project.media.find((item) => item.id === (project.coverMedia ?? project.featuredMedia));
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
