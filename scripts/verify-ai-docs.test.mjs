import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import test from "node:test";
import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import { AI_DOC_BUDGETS, formatAiDocReport, verifyAiDocs } from "./verify-ai-docs.mjs";

const domainNames = ["business", "engineering", "coding-style", "design-system", "project-showcase", "workflows"];
const activePaths = ["AGENTS.md", ...domainNames.map((name) => `docs/ai/${name}.md`), "docs/ai/project-audit.md"];

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "astro-ai-docs-"));
  t.after(() => {
    assert.equal(dirname(root), resolve(tmpdir()));
    assert.ok(basename(root).startsWith("astro-ai-docs-"));
    rmSync(root, { recursive: true, force: true });
  });
  const write = (path, text) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  };
  const read = (path) => readFileSync(join(root, path), "utf8");
  write("package.json", JSON.stringify({ scripts: { build: "astro build", "verify:ai-docs": "node scripts/verify-ai-docs.mjs" } }));
  for (const path of [...activePaths, "README.md"]) write(path, `# ${path}\n`);
  return { root, write, read };
}

test("resolves Markdown syntax, Chinese/encoded/duplicate headings and ignores example links", async (t) => {
  const { root, write } = fixture(t);
  write("docs/ai/business.md", "# 规则维护\n\n## Repeat\n\n## Repeat\n");
  write("reference notes.md", "# External reference\n");
  write("image.png", "local fixture");
  write("README.md", [
    "# Readme",
    "[Chinese](docs/ai/business.md#规则维护)",
    "[Encoded](/docs/ai/business.md#%E8%A7%84%E5%88%99%E7%BB%B4%E6%8A%A4)",
    "[Duplicate heading](docs/ai/business.md?view=source#repeat-1)",
    "[Reference][policy] and ![Image][picture]",
    "[Outside scan](reference%20notes.md#external-reference)",
    "[Self](#readme) [Web](https://example.invalid/page) [Mail](mailto:test@example.invalid)",
    "[policy]: docs/ai/business.md#repeat",
    "[picture]: image.png",
    "",
    "`[Inline example](missing-inline.md)`",
    "```md",
    "[Code example](missing-example.md#unknown)",
    "![Code image](missing.png)",
    "```",
  ].join("\n"));
  assert.deepEqual((await verifyAiDocs(root)).errors, []);
});

test("rejects missing targets and headings in both active docs and historical archives", async (t) => {
  const { root, write } = fixture(t);
  write("AGENTS.md", "# Entry\n\n[Lost](missing.md)\n\n[Bad anchor](docs/ai/business.md#missing)\n");
  write("docs/ai/archive/history.md", "# History\n\n[Old link](../missing.md)\n\n[Old anchor](../business.md#lost)\n");
  const { errors } = await verifyAiDocs(root);
  assert.equal(errors.length, 4);
  assert.ok(errors.some((error) => error.includes("AGENTS.md:3: missing local target")));
  assert.ok(errors.some((error) => error.includes("AGENTS.md:5: missing Markdown heading")));
  assert.ok(errors.some((error) => error.includes("archive/history.md:3: missing local target")));
  assert.ok(errors.some((error) => error.includes("archive/history.md:5: missing Markdown heading")));
});

test("invalid URL encoding and links outside the repository report failures without crashing", async (t) => {
  const { root, write } = fixture(t);
  write("AGENTS.md", "[Malformed](bad%FF.md)\n\n[Outside](../outside.md)\n");
  const { errors } = await verifyAiDocs(root);
  assert.equal(errors.length, 2);
  assert.ok(errors.some((error) => error.includes("invalid local link")));
  assert.ok(errors.some((error) => error.includes("local link leaves repository")));
});

test("checks active package commands including README and preserves obsolete archive commands", async (t) => {
  const { root, write } = fixture(t);
  write("AGENTS.md", "Run `pnpm run build` and `pnpm.cmd run 'verify:ai-docs'`.\n");
  write("README.md", '```sh\npnpm run "build"\npnpm run missing --flag\npnpm run constructor\n```\n');
  write("docs/ai/archive/history.md", "Historical check: `pnpm run removed-script`.\n");
  const { errors } = await verifyAiDocs(root);
  assert.equal(errors.length, 2);
  assert.ok(errors.some((error) => error.includes("README.md:3: unknown package script: missing")));
  assert.ok(errors.some((error) => error.includes("unknown package script: constructor")));
});

for (const [kind, path] of [["entry", "AGENTS.md"], ["domain", "docs/ai/business.md"], ["index", "docs/ai/project-audit.md"]]) {
  test(`${kind} budget accepts its UTF-8 byte boundary and rejects one extra byte`, async (t) => {
    const { root, write } = fixture(t);
    const prefix = "# 边界\n\n";
    const content = prefix + "x".repeat(AI_DOC_BUDGETS[kind] - Buffer.byteLength(prefix));
    write(path, content);
    assert.deepEqual((await verifyAiDocs(root)).errors, []);
    write(path, content + "x");
    const { errors } = await verifyAiDocs(root);
    assert.equal(errors.length, 1);
    assert.ok(errors[0].includes(`exceeds ${kind} budget`));
  });
}

test("enforces the aggregate budget independently and excludes README and archives", async (t) => {
  const { root, write, read } = fixture(t);
  let remaining = AI_DOC_BUDGETS.total - activePaths.reduce((total, path) => total + Buffer.byteLength(read(path)), 0);
  for (const name of domainNames) {
    const path = `docs/ai/${name}.md`;
    const original = read(path);
    const padding = Math.min(remaining, AI_DOC_BUDGETS.domain - Buffer.byteLength(original));
    write(path, original + "x".repeat(padding));
    remaining -= padding;
  }
  assert.equal(remaining, 0);
  write("README.md", "r".repeat(AI_DOC_BUDGETS.total + 1));
  write("docs/ai/archive/history.md", "h".repeat(AI_DOC_BUDGETS.total + 1));
  const report = await verifyAiDocs(root);
  assert.deepEqual(report.errors, []);
  assert.equal(report.metrics.activeBytes, AI_DOC_BUDGETS.total);
  assert.equal(report.metrics.readmeBytes, AI_DOC_BUDGETS.total + 1);
  assert.equal(report.metrics.archiveBytes, AI_DOC_BUDGETS.total + 1);
  write("AGENTS.md", read("AGENTS.md") + "x");
  const exceeded = await verifyAiDocs(root);
  assert.equal(exceeded.errors.length, 1);
  assert.ok(exceeded.errors[0].includes("exceeds total budget"));
});

test("additional domain documents count toward guidance budgets", async (t) => {
  const { root, write } = fixture(t);
  write("docs/ai/nested/extra.md", "x".repeat(AI_DOC_BUDGETS.domain + 1));
  const { errors, metrics } = await verifyAiDocs(root);
  assert.equal(errors.length, 1);
  assert.ok(errors[0].startsWith("docs/ai/nested/extra.md:"));
  assert.ok(metrics.files.some((file) => file.path === "docs/ai/nested/extra.md" && file.kind === "domain"));
});

test("missing required guidance cannot silently shrink the measured set", async (t) => {
  const { root } = fixture(t);
  rmSync(join(root, "docs/ai/business.md"));
  const { errors } = await verifyAiDocs(root);
  assert.equal(errors.length, 1);
  assert.ok(errors[0].startsWith("docs/ai/business.md: cannot read Markdown:"));
});

test("duplicate long paragraphs warn without failing; archive and code examples do not participate", async (t) => {
  const { root, write } = fixture(t);
  const paragraph = "A durable rule has an explicit source, scope and one authoritative maintenance location. ".repeat(3).trim();
  write("docs/ai/business.md", paragraph + "\n");
  write("docs/ai/engineering.md", paragraph.replace("explicit source", "explicit\nsource") + "\n");
  write("docs/ai/archive/history.md", paragraph + "\n");
  write("README.md", "```md\n" + paragraph + "\n```\n");
  const { errors, warnings } = await verifyAiDocs(root);
  assert.deepEqual(errors, []);
  assert.equal(warnings.length, 1);
  assert.ok(warnings[0].includes("docs/ai/business.md:1"));
  assert.ok(warnings[0].includes("docs/ai/engineering.md:1"));
  assert.ok(!warnings[0].includes("archive/") && !warnings[0].includes("README.md"));
});

test("repeated checks are deterministic and leave all fixture files unchanged", async (t) => {
  const { root, write } = fixture(t);
  write("docs/ai/archive/history.md", "# History\n\n[Broken](missing.md)\n");
  write(".agents/skills/readonly/SKILL.md", "# Read-only skill\n\n[Reference](references/details.mdx#details)\n");
  write(".agents/skills/readonly/references/details.mdx", '# Details\n\nexport const neverExecute = (() => { throw new Error("Do not execute MDX"); })()\n');
  const snapshot = (directory) => readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name, "en"))
    .map((entry) => [entry.name, entry.isDirectory() ? snapshot(join(directory, entry.name)) : readFileSync(join(directory, entry.name))]);
  const before = snapshot(root);
  const first = await verifyAiDocs(root);
  const second = await verifyAiDocs(root);
  assert.deepEqual(first, second);
  assert.deepEqual(snapshot(root), before);
});

const inline = (value) => String.fromCharCode(96) + value + String.fromCharCode(96);

test("pnpm options before and after run do not hide missing scripts", async (t) => {
  const { root, write } = fixture(t);
  const commands = [
    "pnpm run --silent absent",
    "pnpm --silent run absent",
    "pnpm.cmd --loglevel info run absent",
    "pnpm run --loglevel=info absent",
    'pnpm --reporter append-only run "absent"',
  ];
  write("README.md", commands.map(inline).join("\n\n"));
  const { errors } = await verifyAiDocs(root);
  assert.equal(errors.length, commands.length);
  assert.ok(errors.every((error) => error.includes("unknown package script: absent")));
});

test("prose punctuation is separate from scripts while quoted names remain exact", async (t) => {
  const { root, write } = fixture(t);
  const scripts = { build: "unused", "release package": "unused", "verify:site": "unused" };
  write("package.json", JSON.stringify({ scripts }));
  write("README.md", [
    "Run pnpm run build.",
    "Use pnpm --silent run build。",
    "Then pnpm.cmd run --loglevel info build!",
    inline("pnpm run 'release package'"),
    inline("pnpm run verify:site --some-script-argument"),
    inline("pnpm run"),
  ].join("\n\n"));
  assert.deepEqual((await verifyAiDocs(root)).errors, []);
  write("README.md", inline('pnpm run "build."') + "\n");
  const { errors } = await verifyAiDocs(root);
  assert.equal(errors.length, 1);
  assert.ok(errors[0].endsWith("unknown package script: build."));
  write("package.json", JSON.stringify({ scripts: { ...scripts, "build.": "unused" } }));
  assert.deepEqual((await verifyAiDocs(root)).errors, []);
  write("package.json", JSON.stringify({ scripts: { "build.": "unused" } }));
  write("README.md", "Run pnpm run build.\n");
  const proseOnly = await verifyAiDocs(root);
  assert.equal(proseOnly.errors.length, 1);
  assert.ok(proseOnly.errors[0].endsWith("unknown package script: build"));
});

test("unverifiable pnpm commands produce diagnostics rather than passing silently", async (t) => {
  const { root, write } = fixture(t);
  write("README.md", [
    "pnpm --unsupported run build",
    "pnpm run --loglevel",
    'pnpm run "$SCRIPT"',
    "pnpm run 'unclosed",
    "pnpm --dir other-package run build",
  ].map(inline).join("\n\n"));
  const { errors } = await verifyAiDocs(root);
  assert.equal(errors.length, 5);
  assert.ok(errors.every((error) => error.includes("cannot statically validate pnpm command")));
});

test("only visible text, inline commands and shell blocks contribute package commands", async (t) => {
  const { root, write } = fixture(t);
  write("README.md", [
    "<!-- pnpm run obsolete -->",
    "~~~js",
    'console.log("pnpm run example");',
    "~~~",
    "~~~md",
    "pnpm run illustrative",
    "~~~",
    "~~~sh",
    "pnpm run build",
    "~~~",
    "",
    inline("pnpm install --frozen-lockfile"),
  ].join("\n"));
  assert.deepEqual((await verifyAiDocs(root)).errors, []);
});

test("fenced and indented shell diagnostics point to their original source lines", async (t) => {
  const { root, write } = fixture(t);
  write("README.md", "# Commands\n\n~~~sh\npnpm run missing\n~~~\n\n    pnpm run missing\n");
  const { errors } = await verifyAiDocs(root);
  assert.equal(errors.length, 2);
  assert.ok(errors.some((error) => error.startsWith("README.md:4: unknown package script")));
  assert.ok(errors.some((error) => error.startsWith("README.md:7: unknown package script")));
});

async function iframePolicy(engineering, workflows) {
  let tree;
  const processor = await createMarkdownProcessor({
    syntaxHighlight: false,
    remarkPlugins: [() => (value) => { tree = value; }],
  });
  await processor.render(workflows);
  const links = [];
  const collect = (node) => {
    if (node.type === "link") links.push(node.url);
    for (const child of node.children ?? []) collect(child);
  };
  collect(tree);
  const fragment = "iframe-可访问标题";
  assert.ok(links.includes("engineering.md#" + fragment), "Required iframe policy must be linked from the validation workflow");
  const rendered = await processor.render(engineering);
  const headings = tree.children.filter((node) => node.type === "heading");
  const position = rendered.metadata.headings.findIndex(({ slug }) => slug === fragment);
  assert.ok(position >= 0, "Required iframe policy section is missing");
  const heading = headings[position];
  const start = tree.children.indexOf(heading);
  let end = start + 1;
  while (end < tree.children.length && !(tree.children[end].type === "heading" && tree.children[end].depth <= heading.depth)) end++;
  assert.ok(tree.children.slice(start + 1, end).some((node) => ["paragraph", "list"].includes(node.type)), "Required iframe policy section is empty");
  return { start: heading.position.start.offset, headingEnd: heading.position.end.offset, end: tree.children[end]?.position.start.offset ?? engineering.length };
}

test("the real iframe policy is reachable and substantive, with deletion and empty-section controls", async () => {
  const engineering = readFileSync(new URL("../docs/ai/engineering.md", import.meta.url), "utf8");
  const workflows = readFileSync(new URL("../docs/ai/workflows.md", import.meta.url), "utf8");
  const section = await iframePolicy(engineering, workflows);
  await assert.rejects(iframePolicy(engineering.slice(0, section.start) + engineering.slice(section.end), workflows), /section is missing/);
  await assert.rejects(iframePolicy(engineering.slice(0, section.headingEnd) + "\n\n" + engineering.slice(section.end), workflows), /section is empty/);
  await assert.rejects(iframePolicy(engineering, "# Workflow\n"), /must be linked/);
  await iframePolicy(engineering.slice(0, section.headingEnd) + "\n\nA reworded accessibility requirement.\n\n" + engineering.slice(section.end), workflows);
});

test("MDX anchors follow frontmatter, JSX, Chinese and duplicate headings without executing code", async (t) => {
  const { root, write } = fixture(t);
  const sentinel = "__aiDocsRegressionExecuted";
  const original = globalThis[sentinel];
  write("sample.mdx", [
    "---",
    "title: From frontmatter",
    "---",
    'import unresolvedImport from "./does-not-exist.js"',
    "",
    "export const sideEffect = (globalThis." + sentinel + " = true)",
    "",
    "# 中文标题",
    "",
    "## <span>JSX heading</span>",
    "",
    "## Repeat",
    "",
    "## Repeat",
    "",
    "## {frontmatter.title}",
    "",
    '<h2 id="explicit-jsx">An explicit JSX heading</h2>',
    "",
    '{(() => { throw new Error("MDX must not execute"); })()}',
  ].join("\n"));
  const fragments = ["中文标题", "jsx-heading", "repeat", "repeat-1", "from-frontmatter", "explicit-jsx"];
  write("README.md", fragments.map((fragment) => "[Valid](sample.mdx#" + encodeURIComponent(fragment) + ")").join("\n\n"));
  assert.deepEqual((await verifyAiDocs(root)).errors, []);
  assert.equal(globalThis[sentinel], original);
  write("README.md", "[Bad](sample.mdx#not-a-heading)\n\n[Metadata is not a heading](sample.mdx#title-from-frontmatter)\n");
  const { errors } = await verifyAiDocs(root);
  assert.equal(errors.length, 2);
  assert.ok(errors.every((error) => error.includes("missing Markdown heading")));
});

test("project MDX anchors reuse the real section plugin and generated heading IDs", async (t) => {
  const { root, write } = fixture(t);
  write("src/content/projects/case.mdx", [
    "---",
    "title: Case",
    "---",
    "",
    "## Overview [#stable-overview]",
    "",
    "Details.",
    "",
    "### Nested heading",
    "",
    "More details.",
    "",
    "## Testing [#validation]",
    "",
    "Results.",
  ].join("\n"));
  write("README.md", ["stable-overview", "heading-stable-overview", "nested-heading", "validation", "heading-validation"]
    .map((fragment) => "[Section](src/content/projects/case.mdx#" + fragment + ")").join("\n\n"));
  assert.deepEqual((await verifyAiDocs(root)).errors, []);
  write("README.md", "[Bad](src/content/projects/case.mdx#overview-stable-overview)\n");
  const { errors } = await verifyAiDocs(root);
  assert.equal(errors.length, 1);
  assert.ok(errors[0].includes("missing Markdown heading"));
});

test("MDX link and command diagnostics retain original lines after frontmatter", async (t) => {
  const { root, write } = fixture(t);
  write("docs/ai/extra.mdx", "---\ntitle: Example\n---\n\n# Visible\n\n[Broken](missing.md)\n\n" + inline("pnpm run absent") + "\n");
  const { errors } = await verifyAiDocs(root);
  assert.equal(errors.length, 2);
  assert.ok(errors.some((error) => error.startsWith("docs/ai/extra.mdx:7: missing local target")));
  assert.ok(errors.some((error) => error.startsWith("docs/ai/extra.mdx:9: unknown package script")));
});

test("unresolvable MDX heading expressions and IDs fail with source lines", async (t) => {
  const { root, write } = fixture(t);
  write("README.md", "[Heading](sample.mdx#anything)\n");
  write("sample.mdx", "---\ntitle: Example\n---\n\n## {getTitle()}\n");
  let report = await verifyAiDocs(root);
  assert.equal(report.errors.length, 1);
  assert.ok(report.errors[0].startsWith("sample.mdx:5:"));
  assert.ok(report.errors[0].includes("Unverified dynamic MDX heading"));
  write("sample.mdx", '<h2 id={getId()}>Visible</h2>\n');
  report = await verifyAiDocs(root);
  assert.equal(report.errors.length, 1);
  assert.ok(report.errors[0].includes("Unverified dynamic MDX heading ID"));
});

for (const directory of [".agents/skills/example", ".codex/legacy"]) {
  test("Skill and references are checked in " + directory + " without scanning output or scripts", async (t) => {
    const { root, write } = fixture(t);
    write("README.md", "# Readme\n");
    write(directory + "/SKILL.md", "---\nname: example\ndescription: A fixture\n---\n\n# Example\n\n[Guide](references/details.md#details)\n\n" + inline("pnpm run build") + "\n");
    write(directory + "/references/details.md", "# Details\n\n[Home](/README.md#readme)\n");
    write(directory + "/references/advanced.mdx", "# Advanced\n\n[Home](/README.md#readme)\n");
    write(directory + "/scripts/ignored.md", "[Broken](missing.md)\n" + inline("pnpm run absent") + "\n" + "x".repeat(20000));
    write(directory + "/assets/ignored.md", "[Broken](missing.md)\n" + "x".repeat(20000));
    const valid = await verifyAiDocs(root);
    assert.deepEqual(valid.errors, []);
    assert.ok(valid.metrics.files.some(({ path, kind }) => path === directory + "/SKILL.md" && kind === "entry"));
    assert.ok(valid.metrics.files.some(({ path, kind }) => path === directory + "/references/advanced.mdx" && kind === "domain"));
    assert.ok(!valid.metrics.files.some(({ path }) => path.includes("/assets/") || path.includes("/scripts/")));
    write(directory + "/references/details.md", "# Details\n\n[Broken](missing.md)\n\n" + inline("pnpm run absent") + "\n");
    const invalid = await verifyAiDocs(root);
    assert.equal(invalid.errors.length, 2);
    assert.ok(invalid.errors.every((error) => error.startsWith(directory + "/references/details.md:")));
    assert.ok(invalid.errors.some((error) => error.includes("missing local target")));
    assert.ok(invalid.errors.some((error) => error.includes("unknown package script")));
    write(directory + "/references/details.md", "# Details\n");
    write(directory + "/SKILL.md", "---\nname: example\ndescription: A fixture\n---\n\n[Broken](missing.md)\n\n" + inline("pnpm run absent") + "\n");
    const invalidEntry = await verifyAiDocs(root);
    assert.equal(invalidEntry.errors.length, 2);
    assert.ok(invalidEntry.errors.some((error) => error.startsWith(directory + "/SKILL.md:6: missing local target")));
    assert.ok(invalidEntry.errors.some((error) => error.startsWith(directory + "/SKILL.md:8: unknown package script")));
  });
}

test("Skill entry and reference budgets reuse existing byte limits and count toward the total", async (t) => {
  const { root, write } = fixture(t);
  const directory = ".agents/skills/example";
  write(directory + "/SKILL.md", "x".repeat(AI_DOC_BUDGETS.entry));
  write(directory + "/references/details.md", "r".repeat(AI_DOC_BUDGETS.domain));
  let report = await verifyAiDocs(root);
  assert.deepEqual(report.errors, []);
  const baselineBytes = report.metrics.activeBytes - AI_DOC_BUDGETS.entry - AI_DOC_BUDGETS.domain;
  assert.equal(report.metrics.activeBytes, baselineBytes + AI_DOC_BUDGETS.entry + AI_DOC_BUDGETS.domain);
  write(directory + "/SKILL.md", "x".repeat(AI_DOC_BUDGETS.entry + 1));
  write(directory + "/references/details.md", "r".repeat(AI_DOC_BUDGETS.domain + 1));
  report = await verifyAiDocs(root);
  assert.equal(report.errors.length, 2);
  assert.ok(report.errors.some((error) => error.includes("SKILL.md:") && error.includes("exceeds entry budget")));
  assert.ok(report.errors.some((error) => error.includes("details.md:") && error.includes("exceeds domain budget")));
  write(directory + "/SKILL.md", "# Skill\n");
  write(directory + "/references/details.md", "# Details\n");
  for (const name of domainNames) write("docs/ai/" + name + ".md", "a".repeat(8100));
  report = await verifyAiDocs(root);
  assert.ok(report.metrics.activeBytes < AI_DOC_BUDGETS.total);
  write(directory + "/references/details.md", "r".repeat(1000));
  report = await verifyAiDocs(root);
  assert.equal(report.errors.length, 1);
  assert.ok(report.errors[0].includes("exceeds total budget"));
});

test("budget failure output lists all active usage in stable descending order without mutating the report", async (t) => {
  const { root, write } = fixture(t);
  for (const name of domainNames) write("docs/ai/" + name + ".md", name[0].repeat(8500));
  write("README.md", "r".repeat(60000));
  write("docs/ai/archive/history.md", "h".repeat(60000));
  const report = await verifyAiDocs(root);
  assert.equal(report.errors.length, 1);
  assert.ok(report.errors[0].includes("exceeds total budget"));
  const before = structuredClone(report);
  const output = formatAiDocReport(report);
  const usage = output.slice(output.indexOf("Active guidance usage"));
  for (const file of report.metrics.files.filter(({ kind }) => !["archive", "readme"].includes(kind))) {
    assert.ok(usage.includes(file.path + ": " + file.bytes + "/" + AI_DOC_BUDGETS[file.kind] + " bytes"));
  }
  assert.ok(usage.includes("TOTAL: " + report.metrics.activeBytes + "/" + AI_DOC_BUDGETS.total));
  assert.ok(usage.indexOf("docs/ai/business.md:") < usage.indexOf("docs/ai/coding-style.md:"));
  assert.ok(usage.indexOf("docs/ai/workflows.md:") < usage.indexOf("AGENTS.md:"));
  assert.ok(!usage.includes("README.md:") && !usage.includes("archive/history.md:"));
  assert.equal(formatAiDocReport(report), output);
  assert.deepEqual(report, before);
});

test("success output stays concise while individual budget failures also show usage", async (t) => {
  const { root, write } = fixture(t);
  const success = formatAiDocReport(await verifyAiDocs(root));
  assert.equal(success.split("\n").length, 1);
  assert.ok(success.startsWith("AI docs: active "));
  write("AGENTS.md", "x".repeat(AI_DOC_BUDGETS.entry + 1));
  const failed = formatAiDocReport(await verifyAiDocs(root));
  assert.ok(failed.includes("exceeds entry budget") && failed.includes("Active guidance usage"));
});
