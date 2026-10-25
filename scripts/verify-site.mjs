import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getDeploymentConfig } from "../src/config/deployment.mjs";
import { verifyOutput } from "./verify-output.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = mkdtempSync(join(tmpdir(), "astro-portfolio-"));
const astroPackage = JSON.parse(readFileSync(join(projectRoot, "node_modules/astro/package.json"), "utf8"));
const astroCli = resolve(projectRoot, "node_modules/astro", astroPackage.bin.astro);
const fixtureContent = join(fixtureRoot, "src/content");
const dist = join(fixtureRoot, "dist");
const read = (path) => readFileSync(join(dist, path), "utf8");

function build(expectedError, siteUrl = "https://portfolio.example/") {
  const result = spawnSync(process.execPath, [astroCli, "build", "--root", fixtureRoot], {
    cwd: fixtureRoot,
    encoding: "utf8",
    timeout: 120_000,
    env: { ...process.env, SITE_URL: siteUrl },
  });
  const output = result.error?.message ?? result.stdout + result.stderr;
  if (expectedError) {
    assert.notEqual(result.status, 0, "Invalid content must fail the build");
    assert.match(output, expectedError);
  } else {
    assert.equal(result.status, 0, output);
  }
}

function writeJson(path, data) {
  writeFileSync(join(fixtureContent, path), JSON.stringify(data, null, 2));
}

try {
  assert.deepEqual(getDeploymentConfig({ repository: "Example/Example.github.io", siteUrl: "" }), { site: "https://example.github.io", base: "/" });
  assert.deepEqual(getDeploymentConfig({ repository: "Example/Portfolio", siteUrl: "" }), { site: "https://example.github.io", base: "/Portfolio" });
  assert.deepEqual(getDeploymentConfig({ siteUrl: "https://portfolio.example/" }), { site: "https://portfolio.example", base: "/" });
  assert.deepEqual(getDeploymentConfig({ siteUrl: "https://portfolio.example/work/" }), { site: "https://portfolio.example", base: "/work" });
  assert.throws(() => getDeploymentConfig({ siteUrl: "https://portfolio.example/?invalid=1" }));
  cpSync(join(projectRoot, "src"), join(fixtureRoot, "src"), {
    recursive: true,
    filter: (source) => source !== join(projectRoot, "src/content"),
  });
  cpSync(join(projectRoot, "public"), join(fixtureRoot, "public"), { recursive: true });
  for (const file of ["package.json", "tsconfig.json", "tailwind.config.mjs"]) {
    cpSync(join(projectRoot, file), join(fixtureRoot, file));
  }
  cpSync(join(projectRoot, "astro.config.mjs"), join(fixtureRoot, "astro.base.config.mjs"));
  // node_modules is a junction: Astro's default cache would otherwise leak fixture data
  // into the real build. Keep both content and Vite caches inside this temporary root.
  writeFileSync(join(fixtureRoot, "astro.config.mjs"), `
import { fileURLToPath } from "node:url";
import base from "./astro.base.config.mjs";
export default {
  ...base,
  cacheDir: "./.astro-cache/",
  vite: { ...base.vite, cacheDir: fileURLToPath(new URL("./.vite-cache/", import.meta.url)) },
};
`);
  symlinkSync(join(projectRoot, "node_modules"), join(fixtureRoot, "node_modules"), process.platform === "win32" ? "junction" : "dir");
  for (const directory of ["blogs/verification", "experience", "projects"]) {
    mkdirSync(join(fixtureContent, directory), { recursive: true });
  }

  for (const [id, title, date, draft] of [
    ["public", "Fixture Public Article", "2026-08-01", false],
    ["newer", "Fixture Newer Article", "2026-08-02", undefined],
    ["draft", "Fixture Draft Article", "2026-08-03", true],
  ]) {
    writeFileSync(join(fixtureContent, "blogs/verification", id + (id === "newer" ? ".mdx" : ".md")),
      "---\ntitle: " + title + "\ndescription: Verification article\npubDate: " + date +
      (draft === undefined ? "" : "\ndraft: " + draft) + "\n---\n\n## Article body\n\nVerification content. [Projects](/projects/) and [icon][icon].\n\n[icon]: /favicon.svg\n");
  }
  writeJson("experience/fixture.json", {
    jobTitle: "Fixture Engineer", company: "Fixture Systems", startDate: "Jan 2026",
    bullets: ["Verified contribution."],
  });
  // Synthetic illustrations live only in this temporary test workspace.
  const imageDirectory = join(fixtureRoot, "src/assets/verification");
  mkdirSync(imageDirectory, { recursive: true });
  for (const name of ["hero", "before", "after", "step-one", "step-two", "embed"]) {
    writeFileSync(join(imageDirectory, `${name}.svg`),
      `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="1600" height="900" fill="#171e27"/><text x="100" y="200" fill="white" font-size="80">TEST FIXTURE: ${name}</text></svg>`);
  }
  const image = (id, section, order = 0) => ({
    id, section, order, type: "image", src: `../../assets/verification/${id}.svg`,
    title: `Fixture ${id}`, alt: `Synthetic test image ${id}`, caption: `Test-only evidence for ${id}.`,
  });
  const control = {
    title: "Fixture Control Case", slug: "control-case", summary: "A control simulation.",
    category: "SCADA", projectType: "Simulation", role: "Test fixture",
    techStack: ["PLC", "SCADA", "Simulation"], status: "In Progress", featured: true, order: 2,
    links: [{ label: "GitHub", url: "https://example.com/control" }],
    featuredMedia: "hero",
    media: [
      image("hero", "hero"), image("after", "comparison", 2), image("before", "comparison", 1),
      image("step-two", "sequence", 2), { ...image("step-one", "sequence", 1), aspectRatio: "native" },
      { ...image("embed", "video"), type: "embed", src: "https://www.youtube.com/watch?v=abcdefghijk", poster: "../../assets/verification/embed.svg", highlights: ["Test-only highlight"], timestamps: [{ seconds: 30, label: "Test chapter" }] },
    ],
    sections: [
      { id: "overview", title: "Overview", paragraphs: ["Fixture introduction."] },
      { id: "comparison", title: "Comparison", paragraphs: ["Before and after fixtures."], mediaLayout: "comparison" },
      { id: "sequence", title: "Sequence", paragraphs: ["Ordered fixture steps."], mediaLayout: "sequence" },
      { id: "video", title: "Video", paragraphs: ["An embed is loaded only on request."] },
      { id: "validation", title: "Testing", paragraphs: ["Test results."], tests: [{ scenario: "Fixture", expected: "Expected state", result: "Observed state", evidence: "after" }] },
    ],
  };
  const plain = {
    title: "Fixture Plain Case", slug: "plain-case", summary: "A case without optional links or status.",
    category: "Software Engineering", projectType: "Application", role: "Software development",
    techStack: ["Astro", "TypeScript", "CSS"], order: 1,
    sections: [{ id: "overview", title: "Application overview", paragraphs: ["Software integration."] }],
  };
  writeJson("projects/control.json", control);
  writeJson("projects/plain.json", plain);

  build();
  if (process.env.VERIFY_SITE_REVIEW === "1") {
    // Optional browser-review artefact, outside the public site and content collection.
    cpSync(dist, join(projectRoot, ".astro/project-fixture-review"), { recursive: true });
  }
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
  assert.ok(rss.includes("/blog/verification/public/</link>"));
  assert.ok(sitemap.includes("/blog/verification/public"));
  assert.ok(!sitemap.includes("/blog/verification/draft"));
  assert.ok(!existsSync(join(dist, "blog/verification/draft/index.html")));
  assert.equal((article.match(/<h1\b/g) ?? []).length, 1);
  assert.ok(article.includes("Article body"));

  const projects = read("projects/index.html");
  assert.ok(projects.indexOf("Fixture Control Case") < projects.indexOf("Fixture Plain Case"));
  assert.ok(projects.includes('href="/projects/control-case/"'));
  assert.ok(!projects.includes('href="https://example.com/control"'));
  const plainCard = [...projects.matchAll(/<article\b[\s\S]*?<\/article>/g)]
    .map(([card]) => card).find((card) => card.includes("Fixture Plain Case"));
  assert.ok(plainCard);
  assert.equal((plainCard.match(/<a\b/g) ?? []).length, 1);
  assert.ok(plainCard.includes('href="/projects/plain-case/"'));
  assert.ok(!plainCard.includes("In Progress") && !plainCard.includes("<img"));
  assert.ok(!projects.includes("<iframe") && !projects.includes("window.open"));
  const detail = read("projects/control-case/index.html");
  const plainDetail = read("projects/plain-case/index.html");
  assert.equal((detail.match(/<h1\b/g) ?? []).length, 1);
  assert.ok(detail.includes('href="https://example.com/control"'));
  assert.ok(detail.includes('href="https://portfolio.example/projects/control-case/"'));
  assert.ok(sitemap.includes("/projects/control-case") && sitemap.includes("/projects/plain-case"));
  const figures = [...detail.matchAll(/<figure\b[^>]*id="figure-([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(figures, ["hero", "before", "after", "step-one", "step-two", "embed"]);
  for (let number = 1; number <= figures.length; number += 1) {
    assert.ok(detail.includes(`Figure ${String(number).padStart(2, "0")}`));
  }
  assert.ok(detail.includes('href="#figure-after"'));
  assert.ok(detail.includes("project-gallery--comparison") && detail.includes("project-gallery--sequence"));
  assert.ok(detail.includes("project-media__image--native"));
  assert.ok(detail.includes('target="_blank"') && detail.includes("Open full-size image"));
  assert.ok(detail.includes("data-embed-src=") && detail.includes("youtube-nocookie.com"));
  assert.ok(detail.includes("00:30") && !detail.includes("<iframe"));
  assert.ok(!plainDetail.includes("<figure") && !plainDetail.includes("In Progress"));
  assert.ok(plainDetail.includes("Application overview"));
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
  assert.match(read("experience/index.html"), /http-equiv="refresh"[^>]*\/about\/#work-experience/);
  assert.match(read("gallery/index.html"), /http-equiv="refresh"[^>]*url=\//);
  assert.ok(!sitemap.includes("/experience") && !sitemap.includes("/gallery"));
  verifyOutput({ root: dist, site: "https://portfolio.example", base: "/" });

  // A video hero uses a poster and native controls, without eager video downloads.
  const localVideo = {
    ...control,
    featured: false,
    media: control.media.map((item) => item.id === "hero" ? {
      ...item, type: "video", src: "/media/projects/feeder-demo.mp4", poster: item.src,
      description: "Test-only video description.",
    } : item),
  };
  writeJson("projects/control.json", localVideo);
  writeJson("projects/plain.json", { ...plain, featured: true });
  build();
  const priorityProjects = read("projects/index.html");
  assert.ok(priorityProjects.indexOf("Fixture Control Case") < priorityProjects.indexOf("Fixture Plain Case"));
  assert.ok(read("index.html").includes("Fixture Plain Case") && !read("index.html").includes("Fixture Control Case"));
  const videoDetail = read("projects/control-case/index.html");
  const videoTag = videoDetail.match(/<video\b[^>]*>/)?.[0];
  assert.ok(videoTag?.includes("controls") && videoTag.includes("poster=") && videoTag.includes('preload="none"'));
  assert.ok(!videoTag.includes("autoplay") && !videoTag.includes("loop"));
  assert.equal((videoDetail.match(/<video\b/g) ?? []).length, 1);
  assert.ok(videoDetail.includes("Read video description"));

  // Check the same media and routes on Project Pages, then on a custom-domain subpath.
  for (const siteUrl of ["https://example.github.io/Portfolio/", "https://portfolio.example/work/"]) {
    build(undefined, siteUrl);
    const config = getDeploymentConfig({ siteUrl });
    verifyOutput({ root: dist, ...config });
    const base = config.base;
    assert.ok(read("projects/control-case/index.html").includes(`src="${base}/media/projects/feeder-demo.mp4"`));
    assert.ok(read("projects/control-case/index.html").includes(`href="${siteUrl}projects/control-case/"`));
    assert.ok(read("rss.xml").includes(`${siteUrl}blog/verification/public/</link>`));
    assert.ok(read("blog/verification/public/index.html").includes(`href="${base}/projects/"`));
    assert.ok(read("blog/verification/public/index.html").includes(`href="${base}/favicon.svg"`));
    assert.ok(read("blog/verification/newer/index.html").includes(`href="${base}/projects/"`));
    assert.ok(read("experience/index.html").includes(`${base}/about/#work-experience`));
    const projectNav = read("projects/control-case/index.html").match(/<nav\b[^>]*aria-label="top-level navigation"[\s\S]*?<\/nav>/)?.[0];
    assert.ok(projectNav?.includes(`href="${base}/projects/" class="toolbar-item toolbar-item--active"`));
    const homeNav = read("index.html").match(/<nav\b[^>]*aria-label="top-level navigation"[\s\S]*?<\/nav>/)?.[0];
    assert.equal((homeNav?.match(/aria-current="page"/g) ?? []).length, 1);

    const validHome = read("index.html");
    for (const [brokenUrl, expectedError] of [["/projects/", /URL escapes base/], [`${base}/PROJECTS/`, /Missing output or incorrect filename case/]]) {
      writeFileSync(join(dist, "index.html"), validHome.replace(`href="${base}/projects/"`, `href="${brokenUrl}"`));
      assert.throws(() => verifyOutput({ root: dist, ...config }), expectedError);
    }
    writeFileSync(join(dist, "index.html"), validHome);
  }
  writeJson("projects/plain.json", plain);

  writeJson("projects/control.json", { ...control, media: [...control.media, { ...image("hero", "overview"), id: "duplicate" }] });
  build(/Do not repeat the same media source/);
  writeJson("projects/control.json", { ...control, media: control.media.map((item) => item.id === "before" ? { ...item, section: "missing" } : item) });
  build(/Unknown media section/);
  writeJson("projects/control.json", { ...localVideo, media: localVideo.media.map((item) => item.id === "hero" ? { ...item, src: "/media/missing.mp4" } : item) });
  build(/Missing project media file/);
  writeJson("projects/control.json", { ...control, slug: "../bad" });
  build(/Invalid string|Invalid input|pattern/);
  writeJson("projects/control.json", control);
  writeJson("projects/plain.json", { ...plain, slug: "control-case" });
  build(/Duplicate project slug/);
  writeJson("projects/plain.json", plain);

  unlinkSync(join(fixtureContent, "projects/control.json"));
  unlinkSync(join(fixtureContent, "projects/plain.json"));
  build();
  assert.ok(read("projects/index.html").includes("Project write-ups will appear here"));
  assert.ok(!read("projects/index.html").includes("data-filter-value"));
  assert.ok(!read("index.html").includes("selected-projects-heading"));
  assert.ok(!existsSync(join(dist, "projects/control-case/index.html")));
  assert.ok(!read("sitemap-0.xml").includes("/projects/control-case"));

  for (const id of ["public", "newer", "draft"]) {
    unlinkSync(join(fixtureContent, "blogs/verification", id + (id === "newer" ? ".mdx" : ".md")));
  }
  unlinkSync(join(fixtureContent, "experience/fixture.json"));
  build();
  assert.ok(read("blog/index.html").includes("No articles published yet"));
  assert.ok(!read("rss.xml").includes("<item>"));
  assert.ok(!read("sitemap-0.xml").includes("/blog/verification/"));
  assert.ok(!existsSync(join(dist, "blog/verification/public/index.html")));
  assert.ok(read("about/index.html").includes("Experience details will be added here"));
  console.log("Site verification passed: publishing/RSS, project routes and category priority, cards, optional media/links/status, figure numbering/order, comparison/sequence, native video and deferred embed, invalid media/references/slugs, empty collections and removed routes, navigation and redirects, root/project/custom-domain paths, Markdown/MDX links, and output validation failure cases.");
} finally {
  // Remove only the newly created temporary workspace; unlink its dependency junction first.
  const dependencyLink = join(fixtureRoot, "node_modules");
  if (existsSync(dependencyLink) && lstatSync(dependencyLink).isSymbolicLink()) unlinkSync(dependencyLink);
  assert.equal(dirname(resolve(fixtureRoot)), resolve(tmpdir()));
  assert.ok(basename(fixtureRoot).startsWith("astro-portfolio-"));
  rmSync(fixtureRoot, { recursive: true, force: true });
}
