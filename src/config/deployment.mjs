import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// SITE_URL is the complete public URL, including any hosting subpath.
// Actions provides GITHUB_REPOSITORY; local builds use the verified Git remote.
export function getDeploymentConfig({
  siteUrl = process.env.SITE_URL,
  repository = process.env.GITHUB_REPOSITORY,
} = {}) {
  if (!siteUrl) {
    if (!repository) {
      const remote = execFileSync("git", ["remote", "get-url", "origin"], {
        cwd: fileURLToPath(new URL("../../", import.meta.url)),
        encoding: "utf8",
      }).trim();
      repository = remote.match(/^(?:https:\/\/github\.com\/|git@github\.com:)([^/]+\/[^/]+?)(?:\.git)?$/)?.[1];
    }
    if (!repository || !/^[\w.-]+\/[\w.-]+$/.test(repository)) {
      throw new Error("Cannot resolve GitHub repository. Set SITE_URL to the full public URL.");
    }
    const [owner, name] = repository.split("/");
    const host = `${owner.toLowerCase()}.github.io`;
    siteUrl = `https://${host}/${name.toLowerCase() === host ? "" : `${name}/`}`;
  }

  const url = new URL(siteUrl);
  if (url.protocol !== "https:" || url.search || url.hash || url.username || url.password) {
    throw new Error("SITE_URL must be an HTTPS URL without credentials, query, or fragment.");
  }
  return { site: url.origin, base: url.pathname.replace(/\/$/, "") || "/" };
}
