import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { parseFrontmatter } from "@astrojs/markdown-remark";
import { ESLint } from "eslint";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const eslint = new ESLint({ cwd: root });

function fixture(t, packages) {
  const directory = mkdtempSync(join(tmpdir(), "astro-quality-"));
  t.after(() => {
    assert.equal(dirname(directory), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith("astro-quality-"));
    rmSync(directory, { recursive: true, force: true });
  });
  mkdirSync(join(directory, "scripts"));
  writeFileSync(join(directory, "package.json"), '{"type":"module"}');
  copyFileSync(join(root, "scripts/typecheck.mjs"), join(directory, "scripts/typecheck.mjs"));
  for (const name of packages) {
    const path = join(directory, "node_modules", name);
    mkdirSync(path, { recursive: true });
    writeFileSync(join(path, "package.json"), JSON.stringify({ name, type: "module", main: "index.js" }));
    writeFileSync(join(path, "index.js"), "export {};\n");
    if (name === "astro") {
      mkdirSync(join(path, "bin"));
      writeFileSync(join(path, "bin/astro.mjs"), [
        'if (process.env.CI !== "true") process.exit(99);',
        'console.log("CHECK-RAN " + JSON.stringify(process.argv.slice(2)));',
        'process.exit(Number(process.env.QUALITY_FIXTURE_EXIT ?? 0));',
      ].join("\n"));
    }
  }
  return (args = [], status = 0) => spawnSync(process.execPath, [join(directory, "scripts/typecheck.mjs"), ...args], {
    cwd: tmpdir(),
    env: { ...process.env, QUALITY_FIXTURE_EXIT: String(status) },
    encoding: "utf8",
  });
}

for (const missing of ["astro", "@astrojs/check", "typescript"]) {
  test(`typecheck fails before invoking Astro when ${missing} is missing`, (t) => {
    const run = fixture(t, ["astro", "@astrojs/check", "typescript"].filter((name) => name !== missing));
    const result = run();
    assert.equal(result.status, 1, result.stderr);
    assert.ok(result.stderr.includes(`missing ${missing}.`));
    assert.ok(result.stderr.includes("pnpm install --frozen-lockfile"));
    assert.ok(!result.stdout.includes("CHECK-RAN"));
  });
}

test("typecheck invokes the local CLI from another cwd and forwards arguments and exit codes", (t) => {
  const run = fixture(t, ["astro", "@astrojs/check", "typescript"]);
  const success = run(["--minimumSeverity", "warning"]);
  assert.equal(success.status, 0, success.stderr);
  assert.ok(success.stdout.includes('CHECK-RAN ["check","--minimumSeverity","warning"]'));
  const failure = run([], 7);
  assert.equal(failure.status, 7, failure.stderr);
});

async function lint(source, filePath) {
  const [result] = await eslint.lintText(source, { filePath });
  assert.equal(result.fatalErrorCount, 0, JSON.stringify(result.messages));
  return result;
}

test("lint catches JS/TS bugs and warnings without enforcing formatting", async () => {
  const clean = await lint('import { readFileSync } from "node:fs";\nconsole.log(readFileSync);\n', "scripts/quality-fixture.mjs");
  assert.deepEqual(clean.messages, []);
  const js = await lint('console.log(document.title); eval("bad()");\n', "scripts/quality-fixture.mjs");
  assert.ok(js.messages.some(({ ruleId, severity }) => ruleId === "no-undef" && severity === 2));
  assert.ok(js.messages.some(({ ruleId, severity }) => ruleId === "no-eval" && severity === 2));
  const ts = await lint('export const value: any = 1;\nconst unused: number = 2;\n', "src/quality-fixture.ts");
  assert.equal(ts.errorCount, 0);
  assert.ok(ts.messages.some(({ ruleId, severity }) => ruleId === "@typescript-eslint/no-explicit-any" && severity === 1));
  assert.ok(ts.messages.some(({ ruleId, severity }) => ruleId === "@typescript-eslint/no-unused-vars" && severity === 1));
});

test("Astro parses typed Props, accepts bundled scripts and locates embedded-script errors", async () => {
  const clean = await lint([
    "---",
    "interface Props { title: string; }",
    "const { title } = Astro.props;",
    "---",
    "<h1>{title}</h1>",
    '<script>document.querySelector<HTMLHeadingElement>("h1")?.focus();</script>',
  ].join("\n"), "src/components/QualityFixture.astro");
  assert.deepEqual(clean.messages, []);
  const bug = await lint('<h1>Fixture</h1>\n<script>eval("bad()"); process.exit(1);</script>', "src/components/QualityFixture.astro");
  assert.ok(bug.messages.some(({ ruleId, line }) => ruleId === "no-eval" && line === 2));
  assert.ok(bug.messages.some(({ ruleId, line }) => ruleId === "no-restricted-globals" && line === 2));
});

test("Astro blocks missing alt/title, invalid directives and HTML injection", async () => {
  const bad = await lint('<img src="/fixture.png" />\n<iframe src="https://example.invalid" />\n<div set:html={"unsafe"} set:text={"conflict"} />', "src/components/QualityFixture.astro");
  for (const [ruleId, line] of [
    ["astro/jsx-a11y/alt-text", 1],
    ["astro/jsx-a11y/iframe-has-title", 2],
    ["astro/no-conflict-set-directives", 3],
    ["astro/no-set-html-directive", 3],
  ]) {
    assert.ok(bad.messages.some((message) => message.ruleId === ruleId && message.line === line && message.severity === 2), ruleId);
  }
  const good = await lint('<img src="/fixture.png" alt="Fixture" />\n<iframe src="https://example.invalid" title="Fixture video" />', "src/components/QualityFixture.astro");
  assert.deepEqual(good.messages, []);
});

test("browser globals are scoped and unexpected names and stale disables fail", async () => {
  const browser = await lint('document.querySelector("main")?.focus();\n', "src/assets/js/quality-fixture.js");
  assert.deepEqual(browser.messages, []);
  const bad = await lint('process.exit(1); unknownGlobal();\n', "src/assets/js/quality-fixture.js");
  assert.ok(bad.messages.some(({ ruleId }) => ruleId === "no-restricted-globals"));
  assert.ok(bad.messages.some(({ ruleId }) => ruleId === "no-undef"));
  const stale = await lint('/* eslint-disable no-eval */\nconsole.log("fixture");\n', "scripts/quality-fixture.mjs");
  assert.ok(stale.messages.some(({ message, severity }) => message.includes("Unused eslint-disable") && severity === 2));
});

test("lint skips generated output and two vendor scripts, but keeps owned source", async () => {
  for (const path of ["dist/fixture.js", ".astro/fixture.ts", "node_modules/fixture/index.js", "src/assets/js/particles.min.js", "src/assets/js/sweet-scroll.min.js", "src/content/projects/fixture.mdx"]) {
    assert.equal(await eslint.isPathIgnored(path), true, path);
  }
  for (const path of ["scripts/typecheck.mjs", "src/assets/js/main.js", "src/lib/content.ts", "src/components/Home.astro"]) {
    assert.equal(await eslint.isPathIgnored(path), false, path);
  }
});

function clickVideo(dataset, modifiers = {}) {
  const source = readFileSync(join(root, "src/components/ProjectList/ProjectVideo.astro"), "utf8");
  const script = source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);
  const { outputText } = ts.transpileModule(script, { compilerOptions: { target: ts.ScriptTarget.ESNext } });
  let click;
  let prevented = false;
  let replacement;
  let focused = false;
  const frame = { focus() { focused = true; } };
  const link = {
    dataset,
    addEventListener(name, handler) {
      assert.equal(name, "click");
      click = handler;
    },
    replaceWith(element) { replacement = element; },
  };
  runInNewContext(outputText, {
    document: {
      querySelectorAll() { return [link]; },
      createElement(name) {
        assert.equal(name, "iframe");
        return frame;
      },
    },
  }, { timeout: 1000 });
  assert.equal(typeof click, "function");
  click({ ...modifiers, preventDefault() { prevented = true; } });
  return { prevented, replacement, frame, focused };
}

test("deferred video keeps its accessible title and native modified-click navigation", () => {
  const dataset = { embedSrc: "https://www.youtube-nocookie.com/embed/abcdefghijk", videoTitle: "Fixture video" };
  const result = clickVideo(dataset);
  assert.equal(result.prevented, true);
  assert.equal(result.replacement, result.frame);
  assert.equal(result.frame.src, dataset.embedSrc);
  assert.equal(result.frame.title, dataset.videoTitle);
  assert.equal(result.focused, true);
  for (const modifier of ["ctrlKey", "metaKey", "shiftKey", "altKey"]) {
    const native = clickVideo(dataset, { [modifier]: true });
    assert.equal(native.prevented, false, modifier);
    assert.equal(native.replacement, undefined, modifier);
  }
});

test("incomplete video data preserves the original link instead of creating an untitled frame", () => {
  for (const dataset of [{}, { videoTitle: "Fixture" }, { embedSrc: "https://example.invalid" }, { embedSrc: "https://example.invalid", videoTitle: "   " }]) {
    const result = clickVideo(dataset);
    assert.equal(result.prevented, false);
    assert.equal(result.replacement, undefined);
    assert.equal(result.focused, false);
  }
});

function assertQualityGate(workflow) {
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const { quality, build, deploy } = workflow.jobs;
  assert.deepEqual(workflow.on.push.branches, ["main"]);
  assert.deepEqual(workflow.on.pull_request.branches, ["main"]);
  assert.ok(!("pull_request_target" in workflow.on));
  assert.deepEqual(workflow.permissions, { contents: "read" });
  assert.equal(build.needs, "quality");
  assert.equal(deploy.needs, "build");
  assert.equal(deploy.if, "github.ref == 'refs/heads/main' && (github.event_name == 'push' || github.event_name == 'workflow_dispatch')");
  assert.deepEqual(deploy.permissions, { pages: "write", "id-token": "write" });
  for (const job of [quality, build]) {
    assert.equal(job.env.CI, true);
    assert.ok(!job.if && !job["continue-on-error"]);
    const names = job.steps.map((step) => step.name);
    assert.equal(new Set(names).size, names.length);
    for (const step of job.steps) {
      assert.ok(!step["continue-on-error"]);
      assert.ok(!step.if);
      assert.ok(!String(step.run ?? step.with?.["build-cmd"] ?? "").includes("|| true"));
    }
    assert.equal(job.steps.find((step) => step.uses?.includes(job === quality ? "setup-node" : "withastro/action")).with["node-version"], manifest.volta.node);
  }
  assert.equal(quality.steps.find((step) => step.uses?.startsWith("pnpm/action-setup")).with.run_install, false);
  assert.equal(quality.steps.filter((step) => step.run === "pnpm install --frozen-lockfile").length, 1);
  assert.deepEqual(quality.steps.filter((step) => step.run?.startsWith("pnpm run ")).map((step) => step.run), [
    "pnpm run verify:ai-docs", "pnpm run typecheck", "pnpm run lint",
    "pnpm run test:quality", "pnpm run test:ai-docs", "pnpm run verify:design",
  ]);
  assert.equal(build.steps.find((step) => step.uses?.startsWith("withastro/action")).with["build-cmd"], "pnpm run verify:site && pnpm run build && pnpm run verify:output");
}

test("CI gates build on quality, retains existing checks and prevents PR deployment", () => {
  const source = readFileSync(join(root, ".github/workflows/deploy.yml"), "utf8");
  const { frontmatter: workflow } = parseFrontmatter(`---\n${source}\n---\n`);
  assertQualityGate(workflow);
  for (const mutate of [
    (fixture) => { delete fixture.jobs.build.needs; },
    (fixture) => { fixture.jobs.deploy.if = "always()"; },
    (fixture) => { fixture.jobs.quality.steps.find((step) => step.run === "pnpm run typecheck")["continue-on-error"] = true; },
    (fixture) => { fixture.jobs.quality.steps = fixture.jobs.quality.steps.filter((step) => step.run !== "pnpm run verify:ai-docs"); },
  ]) {
    const fixture = structuredClone(workflow);
    mutate(fixture);
    assert.throws(() => assertQualityGate(fixture));
  }
});
