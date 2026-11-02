export const DEFAULT_SITE_URL = "https://benjaminxue.nastu.net/";

// Local builds and CI share one public origin; SITE_URL can override the domain.
export function getDeploymentConfig({ siteUrl = process.env.SITE_URL } = {}) {
  const url = new URL(siteUrl || DEFAULT_SITE_URL);
  if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
    throw new Error("SITE_URL must be an HTTPS origin without credentials, path, query, or fragment.");
  }
  return { site: url.origin };
}
