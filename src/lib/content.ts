import { getCollection } from "astro:content";
import { validateProjectMediaFiles } from "./project-media";

export const getBlogPath = (id: string) =>
  `/blog/${id.split("/").map(encodeURIComponent).join("/")}/`;

export const getProjectPath = (slug: string) => `/projects/${slug}/`;

export async function getPublishedPosts() {
  return (await getCollection("blogs", ({ data }) => !data.draft)).sort(
    (a, b) =>
      b.data.pubDate.getTime() - a.data.pubDate.getTime() ||
      a.id.localeCompare(b.id, "en"),
  );
}

export async function getProjects() {
  const projects = await getCollection("projects");
  const slugs = new Set<string>();
  for (const { data } of projects) {
    if (slugs.has(data.slug)) throw new Error(`Duplicate project slug: ${data.slug}`);
    slugs.add(data.slug);
    if (data.hero) validateProjectMediaFiles(data.hero);
  }
  const priority = (category: string) => ["Controls & Automation", "SCADA"].includes(category) ? 0 : 1;
  return projects.sort(
    (a, b) =>
      priority(a.data.category) - priority(b.data.category) ||
      Number(b.data.featured) - Number(a.data.featured) ||
      a.data.order - b.data.order ||
      (b.data.year ?? 0) - (a.data.year ?? 0) ||
      a.id.localeCompare(b.id, "en"),
  );
}

export async function getExperiences() {
  const dateValue = (value: string) => {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  return (await getCollection("experience")).sort(
    (a, b) =>
      dateValue(b.data.startDate) - dateValue(a.data.startDate) ||
      a.id.localeCompare(b.id, "en"),
  );
}
