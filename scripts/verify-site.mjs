import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = mkdtempSync(join(tmpdir(), "astro-portfolio-"));
const astroPackage = JSON.parse(readFileSync(join(projectRoot, "node_modules/astro/package.json"), "utf8"));
const astroCli = resolve(projectRoot, "node_modules/astro", astroPackage.bin.astro);
const fixtureContent = join(fixtureRoot, "src/content");
const dist = join(fixtureRoot, "dist");
const read = (path) => readFileSync(join(dist, path), "utf8");

function build() {
  const result = spawnSync(process.execPath, [astroCli, "build", "--root", fixtureRoot], {
    cwd: fixtureRoot,
    encoding: "utf8",
    timeout: 120_000,
  });
  assert.equal(result.status, 0, result.error?.message ?? result.stdout + result.stderr);
}

function writeJson(path, data) {
  writeFileSync(join(fixtureContent, path), JSON.stringify(data, null, 2));
}

try {
  cpSync(join(projectRoot, "src"), join(fixtureRoot, "src"), {
    recursive: true,
    filter: (source) => source !== join(projectRoot, "src/content"),
  });
  cpSync(join(projectRoot, "public"), join(fixtureRoot, "public"), { recursive: true });
  for (const file of ["package.json", "tsconfig.json", "astro.config.mjs", "tailwind.config.mjs"]) {
    cpSync(join(projectRoot, file), join(fixtureRoot, file));
  }
  symlinkSync(join(projectRoot, "node_modules"), join(fixtureRoot, "node_modules"), process.platform === "win32" ? "junction" : "dir");
  for (const directory of ["blogs/verification", "experience", "projects"]) {
    mkdirSync(join(fixtureContent, directory), { recursive: true });
  }

  for (const [id, title, date, draft] of [
    ["public", "Fixture Public Article", "2026-08-01", false],
    ["newer", "Fixture Newer Article", "2026-08-02", undefined],
    ["draft", "Fixture Draft Article", "2026-08-03", true],
  ]) {
    writeFileSync(join(fixtureContent, "blogs/verification", id + ".md"),
      "---\ntitle: " + title + "\ndescription: Verification article\npubDate: " + date +
      (draft === undefined ? "" : "\ndraft: " + draft) + "\n---\n\n## Article body\n\nVerification content.\n");
  }
  writeJson("experience/fixture.json", {
    jobTitle: "Fixture Engineer", company: "Fixture Systems", startDate: "Jan 2026",
    bullets: ["Verified contribution."],
  });
  writeJson("projects/control.json", {
    title: "Fixture Control Case", description: "A control simulation.",
    bullets: ["Verified control sequence."], tags: ["PLC"], featured: true, order: 2,
    githubUrl: "https://example.com/control",
  });
  writeJson("projects/plain.json", {
    title: "Fixture Plain Case", description: "A case without optional links or status.",
    bullets: ["Verified software integration."], tags: ["Software"], order: 1,
  });

  build();
  const blog = read("blog/index.html");
  const rss = read("rss.xml");
  const sitemap = read("sitemap-0.xml");
  const article = read("blog/verification/public/index.html");
  for (const output of [blog, rss]) {
    assert.ok(output.includes("Fixture Public Article") && output.includes("Fixture Newer Article"));
    assert.ok(!output.includes("Fixture Draft Article"));
    assert.ok(output.indexOf("Fixture Newer Article") < output.indexOf("Fixture Public Article"));
  }
  assert.equal((rss.match(/<item>/g) ?? []).length, 2);
  assert.ok(rss.includes("/blog/verification/public</link>"));
  assert.ok(sitemap.includes("/blog/verification/public"));
  assert.ok(!sitemap.includes("/blog/verification/draft"));
  assert.ok(!existsSync(join(dist, "blog/verification/draft/index.html")));
  assert.equal((article.match(/<h1\b/g) ?? []).length, 1);
  assert.ok(article.includes("Article body"));

  const projects = read("projects/index.html");
  assert.ok(projects.indexOf("Fixture Control Case") < projects.indexOf("Fixture Plain Case"));
  assert.ok(projects.includes('href="https://example.com/control"'));
  const plainCard = [...projects.matchAll(/<article\b[\s\S]*?<\/article>/g)]
    .map(([card]) => card).find((card) => card.includes("Fixture Plain Case"));
  assert.ok(plainCard);
  assert.ok(!plainCard.includes("<a ") && !plainCard.includes("In Progress"));
  assert.ok(!projects.includes("<iframe") && !projects.includes("window.open"));
  const home = read("index.html");
  assert.ok(home.includes("Fixture Control Case"));
  assert.ok(!home.includes("Fixture Plain Case"));
  const about = read("about/index.html");
  assert.ok(about.includes("Fixture Engineer"));
  assert.ok(!about.includes("NaN") && !about.includes("Infinity"));

  const nav = home.match(/<nav\b[^>]*aria-label="top-level navigation"[\s\S]*?<\/nav>/)?.[0];
  assert.ok(nav);
  assert.equal((nav.match(/<a\b/g) ?? []).length, 4);
  assert.ok(!nav.includes("/experience") && !nav.includes("/gallery"));
  assert.match(read("experience/index.html"), /http-equiv="refresh"[^>]*\/about#work-experience/);
  assert.match(read("gallery/index.html"), /http-equiv="refresh"[^>]*url=\//);
  assert.ok(!sitemap.includes("/experience") && !sitemap.includes("/gallery"));

  unlinkSync(join(fixtureContent, "projects/control.json"));
  unlinkSync(join(fixtureContent, "projects/plain.json"));
  build();
  assert.ok(read("projects/index.html").includes("Project write-ups will appear here"));
  assert.ok(!read("projects/index.html").includes("data-filter-value"));
  assert.ok(!read("index.html").includes("selected-projects-heading"));

  for (const id of ["public", "newer", "draft"]) {
    unlinkSync(join(fixtureContent, "blogs/verification", id + ".md"));
  }
  unlinkSync(join(fixtureContent, "experience/fixture.json"));
  build();
  assert.ok(read("blog/index.html").includes("No articles published yet"));
  assert.ok(!read("rss.xml").includes("<item>"));
  assert.ok(!read("sitemap-0.xml").includes("/blog/verification/"));
  assert.ok(!existsSync(join(dist, "blog/verification/public/index.html")));
  assert.ok(read("about/index.html").includes("Experience details will be added here"));
  console.log("Site verification passed: draft isolation, nested article URLs, RSS ordering, single article title, project collection/sorting, optional links/status, featured projects, empty states after deleting all content, navigation, and static redirects.");
} finally {
  // Remove only the newly created temporary workspace; unlink its dependency junction first.
  const dependencyLink = join(fixtureRoot, "node_modules");
  if (existsSync(dependencyLink) && lstatSync(dependencyLink).isSymbolicLink()) unlinkSync(dependencyLink);
  assert.equal(dirname(resolve(fixtureRoot)), resolve(tmpdir()));
  assert.ok(basename(fixtureRoot).startsWith("astro-portfolio-"));
  rmSync(fixtureRoot, { recursive: true, force: true });
}
