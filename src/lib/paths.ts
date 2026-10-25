// Content paths stay relative to public/; only rendered URLs receive the base.
export function withBase(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  return `${import.meta.env.BASE_URL.replace(/\/$/, "")}${path}`;
}
