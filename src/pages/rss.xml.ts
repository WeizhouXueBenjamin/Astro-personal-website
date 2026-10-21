import rss from "@astrojs/rss";
import { getBlogPath, getPublishedPosts } from "#base/lib/content";
import type { APIRoute } from "astro";
import { site } from "../config/site";

export const GET: APIRoute = async (context) => {
  const posts = await getPublishedPosts();

  const siteUrl = context.site ?? new URL(site.siteUrl);
  const items = posts.map((post) => ({
    title: post.data.title,
    description: post.data.description ?? post.data.title,
    pubDate: post.data.pubDate,
    link: new URL(getBlogPath(post.id), siteUrl).href,
  }));

  return rss({
    title: site.title,
    description: site.description,
    site: siteUrl,
    items,
  });
};
