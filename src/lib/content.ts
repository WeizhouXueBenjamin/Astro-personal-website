import { getCollection } from "astro:content";

export const getBlogPath = (id: string) =>
  `/blog/${id.split("/").map(encodeURIComponent).join("/")}`;

export async function getPublishedPosts() {
  return (await getCollection("blogs", ({ data }) => !data.draft)).sort(
    (a, b) =>
      b.data.pubDate.getTime() - a.data.pubDate.getTime() ||
      a.id.localeCompare(b.id, "en"),
  );
}

export async function getProjects() {
  return (await getCollection("projects")).sort(
    (a, b) =>
      Number(b.data.featured) - Number(a.data.featured) ||
      (a.data.order ?? 999) - (b.data.order ?? 999) ||
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
      Number(b.data.featured) - Number(a.data.featured) ||
      (a.data.order ?? 999) - (b.data.order ?? 999) ||
      dateValue(b.data.startDate) - dateValue(a.data.startDate) ||
      a.id.localeCompare(b.id, "en"),
  );
}
