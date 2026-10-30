import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import test from "node:test";
import { AI_DOC_BUDGETS, verifyAiDocs } from "./verify-ai-docs.mjs";

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
  const snapshot = (directory) => readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name, "en"))
    .map((entry) => [entry.name, entry.isDirectory() ? snapshot(join(directory, entry.name)) : readFileSync(join(directory, entry.name))]);
  const before = snapshot(root);
  const first = await verifyAiDocs(root);
  const second = await verifyAiDocs(root);
  assert.deepEqual(first, second);
  assert.deepEqual(snapshot(root), before);
});
