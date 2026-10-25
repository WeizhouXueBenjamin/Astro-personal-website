import assert from "node:assert/strict";
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getDeploymentConfig } from "../src/config/deployment.mjs";

// Check the actual artifact, without a development server masking path errors.
export function verifyOutput({ root = "dist", site, base }) {
  const files = new Set();
  let totalBytes = 0;
  let largest = { path: "", bytes: 0 };
  function walk(directory = "") {
    for (const name of readdirSync(resolve(root, directory))) {
      const path = posix.join(directory, name);
      const stat = lstatSync(resolve(root, path));
      assert.ok(!stat.isSymbolicLink(), `Pages artifact cannot contain symlinks: ${path}`);
      if (stat.isDirectory()) walk(path);
      else {
        files.add(path);
        totalBytes += stat.size;
        if (stat.size > largest.bytes) largest = { path, bytes: stat.size };
      }
    }
  }
  walk();
  assert.ok(totalBytes < 1_000_000_000, "Pages published site must stay below 1 GB");
  for (const required of ["index.html", "about/index.html", "projects/index.html", "blog/index.html", "404.html", "rss.xml", "sitemap-index.xml"]) {
    assert.ok(files.has(required), `Missing static output: ${required}`);
  }

  const prefix = base === "/" ? "/" : `${base}/`;
  const publicUrl = new URL(prefix, site);
  let checked = 0;
  const decode = (value) => value.replace(/&amp;/g, "&").replace(/&#(?:x([\da-f]+)|(\d+));/gi, (_, hex, decimal) => String.fromCodePoint(parseInt(hex ?? decimal, hex ? 16 : 10)));
  function check(reference, from) {
    if (!reference || /^(?:data:|mailto:|tel:|javascript:)/i.test(reference)) return;
    const url = new URL(decode(reference), from);
    if (url.origin !== publicUrl.origin) return;
    assert.ok(url.pathname.startsWith(prefix), `URL escapes base ${prefix}: ${url.href}`);
    const path = decodeURIComponent(url.pathname.slice(prefix.length));
    const target = files.has(path) ? path : posix.join(path, "index.html");
    assert.ok(files.has(target), `Missing output or incorrect filename case: ${url.href} (from ${from})`);
    checked += 1;
  }

  for (const path of files) {
    if (!/\.(?:html|xml|css|js)$/.test(path)) continue;
    const text = readFileSync(resolve(root, path), "utf8");
    const route = path === "index.html" ? "" : path.replace(/index\.html$/, "");
    const from = new URL(route, publicUrl);
    if (path.endsWith(".html")) {
      for (const [, value] of text.matchAll(/\b(?:href|src|poster)="([^"]*)"/g)) check(value, from);
      for (const [, value] of text.matchAll(/\bsrcset="([^"]*)"/g)) {
        for (const candidate of value.split(",")) check(candidate.trim().split(/\s+/)[0], from);
      }
      for (const [, value] of text.matchAll(/\bcontent="[^"]*?url=([^";]+)[^"]*"/gi)) check(value, from);
      // Redirect stubs do not use Layout; all content pages must share canonical/OG URLs.
      if (!/http-equiv="refresh"/i.test(text)) {
        const canonical = text.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1];
        assert.equal(canonical, from.href, `Incorrect canonical: ${path}`);
        assert.ok(text.includes(`property="og:url" content="${from.href}"`), `Incorrect Open Graph URL: ${path}`);
      }
    }
    if (path.endsWith(".xml")) {
      for (const [, value] of text.matchAll(/<(?:loc|link)>([^<]+)<\//g)) check(value, from);
      if (path.startsWith("sitemap")) {
        assert.ok(!/\/(?:experience|gallery)\/?<\/loc>|\/404(?:\.html|\/)<\/loc>/.test(text), "Redirects and 404 must not appear in the sitemap");
      }
    }
    if (path.endsWith(".css") || path.endsWith(".html")) {
      for (const [, value] of text.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)) check(value, from);
    }
    if (path.endsWith(".js") || path.endsWith(".html")) {
      // Includes the particle vendor script loaded on demand by Home.
      for (const [, value] of text.matchAll(/["']([^"'\s<>]*\/_astro\/[^"'\s<>]+)["']/g)) check(value, from);
    }
  }
  return { files: files.size, checked, totalBytes, largest };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = verifyOutput(getDeploymentConfig());
  console.log(`Static output verified: ${result.files} files, ${result.checked} local URLs, ${result.totalBytes} bytes. Largest: ${result.largest.path} (${result.largest.bytes} bytes).`);
}
