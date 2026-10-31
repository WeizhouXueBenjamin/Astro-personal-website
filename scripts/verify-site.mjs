import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_SITE_URL, getDeploymentConfig } from "../src/config/deployment.mjs";
import { verifyOutput } from "./verify-output.mjs";
import { verifyContentDev } from "./verify-content-dev.mjs";

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

function writeProject(name, { body, ...metadata }) {
  writeFileSync(join(fixtureContent, "projects", `${name}.mdx`),
    `---\n${JSON.stringify(metadata, null, 2)}\n---\n\n${body}\n`);
}

try {
  assert.deepEqual(getDeploymentConfig({ siteUrl: "" }), { site: new URL(DEFAULT_SITE_URL).origin });
  assert.deepEqual(getDeploymentConfig({ siteUrl: "https://portfolio.example/" }), { site: "https://portfolio.example" });
  for (const siteUrl of [
    "https://portfolio.example/work/", "http://portfolio.example/",
    "https://portfolio.example/?invalid=1", "https://portfolio.example/#fragment",
    "https://user:password@portfolio.example/",
  ]) {
    assert.throws(() => getDeploymentConfig({ siteUrl }), /SITE_URL must be an HTTPS origin/);
  }
  cpSync(join(projectRoot, "src"), join(fixtureRoot, "src"), {
    recursive: true,
    filter: (source) => source !== join(projectRoot, "src/content"),
  });
  cpSync(join(projectRoot, "public"), join(fixtureRoot, "public"), { recursive: true });
  for (const file of ["package.json", "tsconfig.json"]) {
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
    const body = id === "newer"
      ? "A short article without section headings. [Projects](/projects/) and [icon](/favicon.svg)."
      : "## Article body\n\nVerification content. [Projects](/projects/) and [icon][icon].\n\n### Mapping & symbols\n\nNested section.\n\n## Article body\n\nRepeated heading.\n\n#### A minor detail\n\nNot a contents entry.\n\n[icon]: /favicon.svg";
    writeFileSync(join(fixtureContent, "blogs/verification", id + (id === "newer" ? ".mdx" : ".md")),
      "---\ntitle: " + title + "\ndescription: Verification article\npubDate: " + date +
      (draft === undefined ? "" : "\ndraft: " + draft) + "\n---\n\n" + body + "\n");
  }
  const experienceFixtures = [
    ["fixture", "Fixture Engineer", "Jan 2026"],
    ["newest", "Newest Fixture Role", "Mar 2026"],
    ["oldest", "Oldest Fixture Role", "Aug 2025"],
    ["a-tied", "Tied Fixture Role", "Jan 2026"],
  ];
  for (const [id, jobTitle, startDate] of experienceFixtures) {
    writeJson(`experience/${id}.json`, {
      jobTitle, company: "Fixture Systems", startDate,
      bullets: ["Verified contribution."],
    });
  }
  // Synthetic illustrations live only in this temporary test workspace.
  const imageDirectory = join(fixtureRoot, "src/assets/verification");
  mkdirSync(imageDirectory, { recursive: true });
  for (const name of ["hero", "before", "after", "step-one", "step-two", "embed"]) {
    writeFileSync(join(imageDirectory, `${name}.svg`),
      `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="1600" height="900" fill="#171e27"/><text x="100" y="200" fill="white" font-size="80">TEST FIXTURE: ${name}</text></svg>`);
  }
  const image = (id) => ({
    id, type: "image", src: `../../assets/verification/${id}.svg`,
    title: `Fixture ${id}`, alt: `Synthetic test image ${id}`, caption: `Test-only evidence for ${id}.`,
  });
  const control = {
    title: "Fixture Control Case", slug: "control-case", summary: "A control simulation.",
    category: "SCADA", projectType: "Simulation", role: "Test fixture",
    techStack: ["PLC", "SCADA", "Simulation", "OPC UA", "Structured Text"], status: "In Progress", featured: true, order: 2,
    links: [{ label: "GitHub", url: "https://example.com/control" }],
    hero: image("hero"),
    body: [
      ...["hero", "before", "after", "step-one", "step-two", "embed"].map((id) => `import ${id.replaceAll("-", "")} from "../../assets/verification/${id}.svg";`),
      "## Overview\n\nFixture introduction. [Projects](/projects/).",
      "## Comparison\n\nBefore and after fixtures.",
      '<Gallery layout="comparison">\n<Figure id="before" src={before} title="Fixture before" alt="Synthetic test image before" caption="Test-only evidence for before." />\n<Figure id="after" type="image" src={after} title="Fixture after" alt="Synthetic test image after" caption="Test-only evidence for after." />\n</Gallery>',
      "## Sequence\n\nOrdered fixture steps.",
      '<Gallery layout="sequence">\n<Figure id="step-one" src={stepone} title="Fixture step-one" alt="Synthetic test image step-one" caption="Test-only evidence for step-one." aspectRatio="native" />\n<Figure id="step-two" src={steptwo} title="Fixture step-two" alt="Synthetic test image step-two" caption="Test-only evidence for step-two." />\n</Gallery>',
      "## Video\n\nAn embed is loaded only on request.",
      '<Figure id="embed" type="embed" src="https://www.youtube.com/watch?v=abcdefghijk" poster={embed} title="Fixture embed" alt="Synthetic test image embed" caption="Test-only evidence for embed." highlights={["Test-only highlight"]} timestamps={[{ seconds: 30, label: "Test chapter" }]} />',
      "## Testing [#validation]\n\nTest results.",
      '<Test scenario="Fixture" expected="Expected state" result="Observed state" evidence="after" />',
    ].join("\n\n"),
  };
  const plain = {
    title: "Fixture Plain Case", slug: "plain-case", summary: "A case without optional links or status.",
    category: "Software Engineering", projectType: "Application", role: "Software development",
    techStack: ["Astro", "TypeScript", "CSS"], order: 1,
    body: "## Application overview\n\nSoftware integration.",
  };
  writeProject("control", control);
  writeProject("plain", plain);

  build();
  if (process.env.VERIFY_SITE_REVIEW === "1") {
    // Optional browser-review artefact, outside the public site and content collection.
    cpSync(dist, join(projectRoot, ".astro/project-fixture-review"), { recursive: true });
  }
  const blog = read("blog/index.html");
  const rss = read("rss.xml");
  const sitemap = read("sitemap-0.xml");
  assert.equal(read("robots.txt"), "User-agent: *\nAllow: /\n\nSitemap: https://portfolio.example/sitemap-index.xml\n");
  assert.ok(!sitemap.includes("/robots.txt"), "Crawler instructions must not appear in the sitemap");
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
  const articleSections = [...article.matchAll(/<h[23]\b[^>]*id="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(articleSections.length, 3);
  assert.equal(new Set(articleSections).size, 3, "Repeated headings must have distinct anchors");
  const articleContents = [...article.matchAll(/<nav\b[^>]*aria-label="Article sections"[\s\S]*?<\/nav>/g)].map(([nav]) => nav);
  assert.equal(articleContents.length, 2, "Desktop and native mobile contents must be rendered statically");
  for (const contents of articleContents) {
    assert.deepEqual([...contents.matchAll(/href="#([^"]+)"/g)].map((match) => match[1]), articleSections);
    assert.ok(!contents.includes("A minor detail"));
  }
  const shortArticle = read("blog/verification/newer/index.html");
  assert.ok(!shortArticle.includes('aria-label="Article sections"'), "Short articles must not show empty contents");
  for (const [entry] of blog.matchAll(/<article\b[\s\S]*?<\/article>/g)) {
    assert.equal((entry.match(/<a\b/g) ?? []).length, 1, "Each article entry must have one keyboard navigation target");
  }

  const projects = read("projects/index.html");
  assert.ok(projects.indexOf("Fixture Control Case") < projects.indexOf("Fixture Plain Case"));
  assert.ok(projects.includes('href="/projects/control-case/"'));
  assert.ok(!projects.includes('href="https://example.com/control"'));
  assert.ok(!projects.includes("data-filter-value"), "The current project index must not expose category filters");
  assert.ok(!projects.includes("Structured Text"), "Index cards must keep supplementary technologies for the detail page");
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
  assert.ok(detail.includes("Structured Text"), "The detail page must retain the complete technology list");
  for (const page of [detail, plainDetail]) {
    const sectionIds = [...page.matchAll(/<section\b[^>]*id="([^"]+)"/g)].map((match) => match[1]);
    const contents = [...page.matchAll(/<nav\b[^>]*aria-label="Case study sections"[\s\S]*?<\/nav>/g)].map(([nav]) => nav);
    assert.equal(contents.length, 2, "Case-study contents must be available in both responsive layouts without JavaScript");
    for (const nav of contents) {
      assert.deepEqual([...nav.matchAll(/href="#([^"]+)"/g)].map((match) => match[1]), sectionIds);
    }
    assert.match(page, /<summary\b[^>]*>In this case study<\/summary>/);
  }
  assert.ok(detail.includes('href="https://example.com/control"'));
  assert.ok(detail.includes('href="https://portfolio.example/projects/control-case/"'));
  assert.ok(sitemap.includes("/projects/control-case") && sitemap.includes("/projects/plain-case"));
  const figures = [...detail.matchAll(/<figure\b[^>]*id="figure-([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(figures, ["hero", "before", "after", "step-one", "step-two", "embed"]);
  for (let number = 1; number <= figures.length; number += 1) {
    assert.ok(detail.includes(`Figure ${String(number).padStart(2, "0")}`));
  }
  assert.ok(detail.includes('href="#figure-after"'));
  assert.ok(detail.includes('id="validation"') && detail.includes('href="#validation"'));
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
  assert.ok(about.indexOf("Newest Fixture Role") < about.indexOf("Tied Fixture Role"), "Newer start dates must appear first within a year");
  assert.ok(about.indexOf("Tied Fixture Role") < about.indexOf("Fixture Engineer"), "Equal start dates must use stable ID order");
  assert.ok(about.indexOf("Fixture Engineer") < about.indexOf("Oldest Fixture Role"), "Experience years must remain newest first");
  assert.ok(!about.includes("NaN") && !about.includes("Infinity"));

  const nav = home.match(/<nav\b[^>]*aria-label="top-level navigation"[\s\S]*?<\/nav>/)?.[0];
  assert.ok(nav);
  assert.equal((nav.match(/<a\b/g) ?? []).length, 4);
  assert.ok(!nav.includes("/experience") && !nav.includes("/gallery"));
  assert.match(read("experience/index.html"), /http-equiv="refresh"[^>]*\/about\/#work-experience/);
  assert.match(read("gallery/index.html"), /http-equiv="refresh"[^>]*url=\//);
  assert.ok(!sitemap.includes("/experience") && !sitemap.includes("/gallery"));
  verifyOutput({ root: dist, site: "https://portfolio.example" });

  // Controls & Automation and SCADA share one priority group: featured, then order.
  const groupedPlain = { ...plain, category: "Controls & Automation", order: 999, featured: true };
  const comparison = control.body.match(/<Gallery layout="comparison">[\s\S]*?<\/Gallery>/)[0];
  const reordered = comparison.replace(/(<Figure id="before"[^\n]*\/>)[\s\S]*?(<Figure id="after"[^\n]*\/>)/, "$2\n$1");
  writeProject("control", { ...control, featured: false, body: control.body.replace(comparison, reordered) });
  writeProject("plain", groupedPlain);
  build();
  assert.ok(read("projects/index.html").indexOf("Fixture Plain Case") < read("projects/index.html").indexOf("Fixture Control Case"), "Featured must override manual order in the same category group");
  const reorderedDetail = read("projects/control-case/index.html");
  assert.ok(reorderedDetail.indexOf('id="figure-after"') < reorderedDetail.indexOf('id="figure-before"'));
  assert.match(reorderedDetail, /Evidence: Figure 02[^<]*Fixture after/, "Evidence numbers must follow MDX reading order");
  writeProject("plain", { ...groupedPlain, featured: false, order: 1 });
  build();
  assert.ok(read("projects/index.html").indexOf("Fixture Plain Case") < read("projects/index.html").indexOf("Fixture Control Case"), "Manual order must apply across the shared category group");
  assert.ok(!read("index.html").includes("selected-projects-heading"), "No featured projects must leave the home selection hidden");

  // A video hero uses a poster and native controls, without eager video downloads.
  const localVideo = {
    ...control,
    featured: false,
    hero: {
      ...control.hero, type: "video", src: "/media/projects/feeder-demo.mp4", poster: control.hero.src,
      description: "Test-only video description.",
    },
  };
  writeProject("control", localVideo);
  writeProject("plain", { ...plain, featured: true });
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

  // The temporary root has no Git metadata: default and overridden origins must both work.
  for (const siteUrl of [DEFAULT_SITE_URL, "https://preview.example/"]) {
    build(undefined, siteUrl === DEFAULT_SITE_URL ? "" : siteUrl);
    const config = getDeploymentConfig({ siteUrl });
    verifyOutput({ root: dist, ...config });
    assert.equal(read("robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}sitemap-index.xml\n`);
    assert.ok(read("projects/control-case/index.html").includes('src="/media/projects/feeder-demo.mp4"'));
    assert.ok(read("projects/control-case/index.html").includes(`href="${siteUrl}projects/control-case/"`));
    assert.ok(read("rss.xml").includes(`${siteUrl}blog/verification/public/</link>`));
    assert.ok(read("blog/verification/public/index.html").includes('href="/projects/"'));
    assert.ok(read("blog/verification/public/index.html").includes('href="/favicon.svg"'));
    assert.ok(read("blog/verification/newer/index.html").includes('href="/projects/"'));
    assert.ok(read("experience/index.html").includes("/about/#work-experience"));
    const projectNav = read("projects/control-case/index.html").match(/<nav\b[^>]*aria-label="top-level navigation"[\s\S]*?<\/nav>/)?.[0];
    assert.ok(projectNav?.includes('href="/projects/" class="toolbar-item toolbar-item--active"'));
    const homeNav = read("index.html").match(/<nav\b[^>]*aria-label="top-level navigation"[\s\S]*?<\/nav>/)?.[0];
    assert.equal((homeNav?.match(/aria-current="page"/g) ?? []).length, 1);

    const validHome = read("index.html");
    const particleScript = validHome.match(/["'`]([^"'`\s<>]*\/_astro\/particles\.min[^"'`\s<>]+)["'`]/)?.[1];
    assert.ok(particleScript, "The built Home must reference its on-demand particle script");
    writeFileSync(join(dist, "index.html"), validHome.replace(particleScript, "/_astro/missing-particles.js"));
    assert.throws(() => verifyOutput({ root: dist, ...config }), /Missing output or incorrect filename case/);
    writeFileSync(join(dist, "index.html"), validHome);
    for (const brokenUrl of ["/missing-projects/", "/PROJECTS/"]) {
      writeFileSync(join(dist, "index.html"), validHome.replace('href="/projects/"', `href="${brokenUrl}"`));
      assert.throws(() => verifyOutput({ root: dist, ...config }), /Missing output or incorrect filename case/);
    }
    writeFileSync(join(dist, "index.html"), validHome.replace(
      /(<link\b[^>]*rel="canonical"[^>]*href=")[^"]+/, "$1https://incorrect.example/",
    ));
    assert.throws(() => verifyOutput({ root: dist, ...config }), /Incorrect canonical/);
    writeFileSync(join(dist, "index.html"), validHome);
  }
  writeProject("plain", plain);

  const invalidBodies = [
    [control.body + '\n<Figure id="duplicate" src={hero} title="Duplicate" alt="Duplicate" caption="Duplicate" />', /Do not repeat the same media source/],
    [control.body.replace('id="after"', 'id="before"'), /Duplicate figure ID/],
    [control.body.replace('## Sequence', '## Sequence [#comparison]'), /Invalid or duplicate section ID/],
    [control.body.replace('evidence="after"', 'evidence="missing"'), /Unknown test evidence/],
    [control.body.replace('alt="Synthetic test image before"', ''), /alt|Invalid input/],
    [control.body.replace(/<Figure id="after"[^\n]*\/>/, ''), /Comparison gallery needs two media items/],
    [control.body.replace('## Overview', '# Overview'), /start the body with ##/],
    [control.body.replace('## Overview', '<h1>Overview</h1>'), /start the body with ##/],
    [control.body.replace('## Sequence', '## Sequence [#heading-overview]'), /anchors must be unique/],
  ];
  for (const [body, expected] of invalidBodies) {
    writeProject("control", { ...control, body });
    build(expected);
  }
  writeProject("control", { ...localVideo, hero: { ...localVideo.hero, src: "/media/missing.mp4" } });
  build(/Missing project media file/);
  writeProject("control", { ...control, slug: "../bad" });
  build(/Invalid string|Invalid input|pattern/);
  writeProject("control", control);
  writeProject("plain", { ...plain, slug: "control-case" });
  build(/Duplicate project slug/);
  writeProject("plain", plain);

  unlinkSync(join(fixtureContent, "projects/control.mdx"));
  unlinkSync(join(fixtureContent, "projects/plain.mdx"));
  build();
  assert.ok(read("projects/index.html").includes("Project write-ups will appear here"));
  assert.ok(!read("projects/index.html").includes("data-filter-value"));
  assert.ok(!read("index.html").includes("selected-projects-heading"));
  assert.ok(!existsSync(join(dist, "projects/control-case/index.html")));
  assert.ok(!read("sitemap-0.xml").includes("/projects/control-case"));

  for (const id of ["public", "newer", "draft"]) {
    unlinkSync(join(fixtureContent, "blogs/verification", id + (id === "newer" ? ".mdx" : ".md")));
  }
  for (const [id] of experienceFixtures) unlinkSync(join(fixtureContent, `experience/${id}.json`));
  build();
  assert.ok(read("blog/index.html").includes("No articles published yet"));
  assert.ok(!read("rss.xml").includes("<item>"));
  assert.ok(!read("sitemap-0.xml").includes("/blog/verification/"));
  assert.ok(!existsSync(join(dist, "blog/verification/public/index.html")));
  assert.ok(read("about/index.html").includes("Experience details will be added here"));
  await verifyContentDev({ root: fixtureRoot, project: plain, writeProject });
  console.log("Site verification passed: publishing/RSS, Blog contents anchors and short articles, experience chronology and stable ties, project routes/category priority/featured/order, cards, optional media/links/status, figure numbering/order, comparison/sequence, native video and deferred embed, invalid media/references/slugs, empty collections and removed routes, navigation and redirects, default custom domain without Git and overridden origins, robots sitemap discovery, Markdown/MDX links, and output validation failure cases including canonical URLs and on-demand scripts.");
} finally {
  // Remove only the newly created temporary workspace; unlink its dependency junction first.
  const dependencyLink = join(fixtureRoot, "node_modules");
  if (existsSync(dependencyLink) && lstatSync(dependencyLink).isSymbolicLink()) unlinkSync(dependencyLink);
  assert.equal(dirname(resolve(fixtureRoot)), resolve(tmpdir()));
  assert.ok(basename(fixtureRoot).startsWith("astro-portfolio-"));
  rmSync(fixtureRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
