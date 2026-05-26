import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { site } from "../config/site";

export const GET: APIRoute = async (context) => {
  const posts = await getCollection("blog");

  const siteUrl = context.site ?? new URL(site.siteUrl);
  const base = siteUrl.toString().replace(/\/$/, "");
  const basePath = import.meta.env.BASE_URL ?? "";
  const items = posts
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime())
    .map((post) => ({
      title: post.data.title,
      description: post.data.description ?? post.data.title,
      pubDate: post.data.pubDate,
      link: `${base}${basePath}blog/${post.id}/`,
    }));

  return rss({
    title: site.title,
    description: site.description,
    site: siteUrl,
    items,
  });
};

