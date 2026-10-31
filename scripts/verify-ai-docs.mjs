import { createMarkdownProcessor, parseFrontmatter, unified } from "@astrojs/markdown-remark";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import remarkProjects from "../src/lib/remark-projects.mjs";

// Project budgets, in UTF-8 bytes. Changes require an explicit scope decision.
export const AI_DOC_BUDGETS = Object.freeze({
  entry: 4 * 1024,
  domain: 12 * 1024,
  index: 2 * 1024,
  total: 48 * 1024,
});

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const domainNames = ["business", "engineering", "coding-style", "design-system", "project-showcase", "workflows"];
const isMarkdown = (path) => /\.(?:md|mdx)$/i.test(path);
const markdownFiles = (directory) => {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.isFile() && isMarkdown(path) ? [path] : [];
  });
};

const skillEntries = (directory) => {
  if (!existsSync(directory)) return [];
  const entry = join(directory, "SKILL.md");
  if (existsSync(entry)) return [entry];
  return readdirSync(directory, { withFileTypes: true }).flatMap((child) =>
    child.isDirectory() && !["assets", "scripts", "references", "node_modules", ".git"].includes(child.name)
      ? skillEntries(join(directory, child.name)) : [],
  );
};

const visit = (node, callback) => {
  callback(node);
  for (const child of node.children ?? []) visit(child, callback);
};

// Only literal expressions and frontmatter members can be resolved without execution.
const unresolved = Symbol("unresolved");
const staticValue = (expression, frontmatter) => {
  if (expression?.type === "Literal") return expression.value;
  const keys = [];
  while (expression?.type === "MemberExpression" && !expression.optional) {
    const key = expression.computed ? expression.property.value : expression.property.name;
    if (typeof key !== "string" || ["__proto__", "constructor", "prototype"].includes(key)) return unresolved;
    keys.unshift(key);
    expression = expression.object;
  }
  if (expression?.type !== "Identifier" || expression.name !== "frontmatter") return unresolved;
  let value = frontmatter;
  for (const key of keys) {
    if (!value || !Object.hasOwn(value, key)) return unresolved;
    value = value[key];
  }
  return value;
};

const expressionOf = (node) => node.data?.estree?.body?.[0]?.expression;
const inspectMdxHeadings = (tree, file) => {
  const ids = new Set();
  visit(tree, (heading) => {
    if (heading.type !== "heading" && !/^h[1-6]$/.test(heading.name ?? "")) return;
    visit(heading, (node) => {
      if (node.type === "mdxTextExpression") {
        const value = staticValue(expressionOf(node), file.data.astro.frontmatter);
        if (!["string", "number", "boolean"].includes(typeof value) && value !== null) {
          file.fail("Unverified dynamic MDX heading; use static text or a literal frontmatter value", node);
        }
      }
    });
    for (const attribute of heading.attributes ?? []) {
      if (attribute.name !== "id") continue;
      const value = typeof attribute.value === "string" ? attribute.value
        : staticValue(expressionOf(attribute.value ?? {}), file.data.astro.frontmatter);
      if (typeof value !== "string") file.fail("Unverified dynamic MDX heading ID", heading);
      ids.add(value);
    }
  });
  return ids;
};

// Parse only the documented pnpm run prefix. Script arguments are never interpreted.
const booleanOptions = new Set([
  "--silent", "-s", "--recursive", "-r", "--workspace-root", "-w", "--stream",
  "--parallel", "--aggregate-output", "--if-present", "--no-bail", "--sequential",
  "--color", "--no-color", "--reporter-hide-prefix", "--use-stderr",
]);
const valueOptions = new Set(["--loglevel", "--reporter", "--workspace-concurrency", "--resume-from"]);
const packageOptions = new Set(["--dir", "-C", "--filter", "-F"]);
const readToken = (input, start) => {
  let index = start;
  while (/[ \t]/.test(input[index] ?? "") && index < input.length) index++;
  if (index >= input.length || /[\r\n;&|]/.test(input[index])) return null;
  let value = "";
  const quote = ["'", '"'].includes(input[index]) ? input[index++] : "";
  const quoted = Boolean(quote);
  while (index < input.length) {
    const character = input[index];
    if (quote && character === quote) return { value, quoted, end: index + 1 };
    if (!quote && /[\s;&|]/.test(character)) break;
    if (character === "\\" && ["\\", quote, " ", "\t"].includes(input[index + 1])) index++;
    value += input[index++];
  }
  if (quote) throw new Error("unclosed quote");
  return { value, quoted, end: index };
};

const inspectCommands = (node, source, scripts, report) => {
  if (!["text", "inlineCode", "code"].includes(node.type) || !node.position) return;
  if (node.type === "code" && node.lang && !/^(?:sh|bash|shell|zsh|fish|cmd|bat|powershell|pwsh)$/i.test(node.lang)) return;
  const prose = node.type === "text";
  const text = prose ? source.slice(node.position.start.offset, node.position.end.offset) : node.value;
  const fenced = node.type === "code" && /^ {0,3}(?:`{3,}|~{3,})/.test(source.slice(node.position.start.offset));
  const baseLine = node.position.start.line + (fenced ? 1 : 0);
  for (const match of text.matchAll(/\bpnpm(?:\.cmd)?\b/g)) {
    const line = baseLine + text.slice(0, match.index).split("\n").length - 1;
    const input = text.slice(match.index).split(/\r?\n/)[0];
    if (!/\brun\b/.test(input)) continue;
    try {
      let token = readToken(input, 0);
      if (!/^pnpm(?:\.cmd)?$/.test(token.value)) continue;
      let index = token.end;
      let run = false;
      let script;
      while ((token = readToken(input, index))) {
        index = token.end;
        if (!run && token.value === "run") {
          run = true;
          continue;
        }
        if (token.value.startsWith("-") && !token.quoted) {
          const [option, ...assigned] = token.value.split("=");
          if (packageOptions.has(option)) throw new Error("package selection cannot be validated against this package.json");
          if (booleanOptions.has(option) && !assigned.length) continue;
          if (!valueOptions.has(option)) throw new Error("unsupported pnpm option: " + option);
          if (!assigned.length) {
            const argument = readToken(input, index);
            if (!argument || argument.value.startsWith("-") || argument.value === "run") throw new Error("missing value for " + option);
            index = argument.end;
          } else if (!assigned.join("=")) throw new Error("missing value for " + option);
          continue;
        }
        if (!run) break; // install/add/exec and other pnpm commands are outside this check.
        script = token.value;
        if (prose && !token.quoted) script = script.replace(/[.,;:!?，。；：！？…）)\]}]+$/u, "");
        if (/[$]/.test(script) || script.includes(String.fromCharCode(96)) || !script) {
          throw new Error("dynamic or empty script name");
        }
        break;
      }
      if (script && !Object.hasOwn(scripts, script)) report(line, "unknown package script: " + script);
    } catch (error) {
      report(line, "cannot statically validate pnpm command: " + error.message);
    }
  }
};

export async function verifyAiDocs(root = projectRoot) {
  root = resolve(root);
  const errors = [];
  const warnings = [];
  const metrics = { activeBytes: 0, archiveBytes: 0, readmeBytes: 0, files: [] };
  const label = (path) => relative(root, path).split(sep).join("/");
  const cache = new Map();
  const paragraphs = new Map();
  let scripts = {};
  try {
    scripts = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts ?? {};
  } catch (error) {
    errors.push("package.json: " + error.message);
  }

  let captured;
  const capture = () => (tree, file) => {
    captured = { tree, file, ids: extname(file.path ?? "").toLowerCase() === ".mdx" ? inspectMdxHeadings(tree, file) : new Set() };
  };
  const processor = await createMarkdownProcessor({
    syntaxHighlight: false,
    remarkPlugins: [capture],
  });
  let mdxRenderer;
  const readDocument = async (path) => {
    if (cache.has(path)) return cache.get(path);
    try {
      const source = readFileSync(path, "utf8");
      const { content, frontmatter } = parseFrontmatter(source);
      // Blank the YAML prefix, keeping original offsets/lines for links and diagnostics.
      const markdown = source.slice(0, source.length - content.length).replace(/[^\r\n]/g, " ") + content;
      let headings;
      if (extname(path).toLowerCase() === ".mdx") {
        mdxRenderer ??= await unified({ remarkPlugins: [capture, remarkProjects] }).createMdxRenderer(
          { syntaxHighlight: false, shikiConfig: {} },
          { optimize: false, sourcemap: false, srcDir: pathToFileURL(join(root, "src") + sep) },
        );
        await mdxRenderer.process(markdown, path, frontmatter);
        headings = new Set((captured.file.data.astro.headings ?? []).map(({ slug }) => slug));
        for (const id of captured.ids) headings.add(id);
        for (const { id } of frontmatter.projectSections ?? []) {
          headings.add(id);
          headings.add("heading-" + id);
        }
      } else {
        const rendered = await processor.render(markdown);
        headings = new Set(rendered.metadata.headings.map(({ slug }) => slug));
      }
      const document = { source, tree: captured.tree, headings };
      cache.set(path, document);
      return document;
    } catch (error) {
      const line = error.line ? ":" + error.line : "";
      errors.push(label(path) + line + ": cannot read Markdown: " + error.message);
      cache.set(path, null);
      return null;
    }
  };

  const entries = [...skillEntries(join(root, ".agents/skills")), ...skillEntries(join(root, ".codex"))];
  const entryPaths = new Set([join(root, "AGENTS.md"), ...entries]);
  const paths = [...new Set([
    ...entryPaths,
    join(root, "README.md"),
    ...domainNames.map((name) => join(root, "docs/ai", name + ".md")),
    join(root, "docs/ai/project-audit.md"),
    ...markdownFiles(join(root, "docs/ai")),
    ...entries.flatMap((entry) => markdownFiles(join(dirname(entry), "references"))),
  ])].sort();

  for (const path of paths) {
    const document = await readDocument(path);
    if (!document) continue;
    const name = label(path);
    const archive = name.startsWith("docs/ai/archive/");
    const kind = archive ? "archive" : name === "README.md" ? "readme"
      : entryPaths.has(path) ? "entry" : name === "docs/ai/project-audit.md" ? "index" : "domain";
    const bytes = Buffer.byteLength(document.source, "utf8");
    metrics.files.push({ path: name, kind, bytes });
    if (kind === "archive") metrics.archiveBytes += bytes;
    else if (kind === "readme") metrics.readmeBytes += bytes;
    else {
      metrics.activeBytes += bytes;
      if (bytes > AI_DOC_BUDGETS[kind]) errors.push(name + ": " + bytes + " bytes exceeds " + kind + " budget " + AI_DOC_BUDGETS[kind]);
    }

    const definitions = new Map();
    const links = [];
    visit(document.tree, (node) => {
      if (node.type === "definition" && !definitions.has(node.identifier)) definitions.set(node.identifier, node.url);
    });
    visit(document.tree, (node) => {
      let url;
      if (node.type === "link" || node.type === "image") url = node.url;
      if (node.type === "linkReference" || node.type === "imageReference") url = definitions.get(node.identifier);
      if (url !== undefined && node.position) links.push({ url, line: node.position.start.line });
      if (!archive) {
        inspectCommands(node, document.source, scripts, (line, message) => errors.push(name + ":" + line + ": " + message));
        if (node.type === "paragraph" && node.position) {
          const paragraph = document.source.slice(node.position.start.offset, node.position.end.offset).replace(/\s+/gu, " ").trim();
          if ([...paragraph].length >= 120) {
            if (!paragraphs.has(paragraph)) paragraphs.set(paragraph, []);
            paragraphs.get(paragraph).push(name + ":" + node.position.start.line);
          }
        }
      }
    });

    for (const { url, line } of links) {
      if (!url || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(url)) continue;
      const location = name + ":" + line;
      try {
        const hash = url.indexOf("#");
        const pathname = decodeURIComponent((hash < 0 ? url : url.slice(0, hash)).split("?")[0]);
        const fragment = hash < 0 ? "" : decodeURIComponent(url.slice(hash + 1));
        const target = !pathname ? path : pathname.startsWith("/")
          ? resolve(root, "." + pathname) : resolve(dirname(path), pathname);
        const withinRoot = relative(root, target);
        if (withinRoot === ".." || withinRoot.startsWith(".." + sep)) {
          errors.push(location + ": local link leaves repository: " + url);
        } else if (!existsSync(target)) {
          errors.push(location + ": missing local target: " + url);
        } else if (fragment && isMarkdown(target) && statSync(target).isFile()) {
          const targetDocument = await readDocument(target);
          if (targetDocument && !targetDocument.headings.has(fragment)) errors.push(location + ": missing Markdown heading: " + url);
        }
      } catch (error) {
        errors.push(location + ": invalid local link " + url + ": " + error.message);
      }
    }
  }

  if (metrics.activeBytes > AI_DOC_BUDGETS.total) {
    errors.push("Active guidance: " + metrics.activeBytes + " bytes exceeds total budget " + AI_DOC_BUDGETS.total);
  }
  for (const [paragraph, locations] of paragraphs) {
    if (locations.length > 1) warnings.push("Repeated paragraph at " + locations.join(", ") + ": " + [...paragraph].slice(0, 60).join("") + "…");
  }
  return { errors, warnings, metrics };
}

export function formatAiDocReport({ errors, warnings, metrics }) {
  const lines = [
    ...warnings.map((warning) => "WARN " + warning),
    ...errors.map((error) => "ERROR " + error),
  ];
  const active = metrics.files.filter(({ kind }) => kind !== "archive" && kind !== "readme");
  if (metrics.activeBytes > AI_DOC_BUDGETS.total || active.some(({ kind, bytes }) => bytes > AI_DOC_BUDGETS[kind])) {
    lines.push("Active guidance usage (UTF-8 bytes):");
    for (const { path, kind, bytes } of active.sort((a, b) => b.bytes - a.bytes || a.path.localeCompare(b.path, "en"))) {
      lines.push("  " + path + ": " + bytes + "/" + AI_DOC_BUDGETS[kind] + " bytes (" + kind + ")");
    }
    lines.push("  TOTAL: " + metrics.activeBytes + "/" + AI_DOC_BUDGETS.total + " bytes");
  }
  lines.push("AI docs: active " + metrics.activeBytes + "/" + AI_DOC_BUDGETS.total + " bytes; archive " + metrics.archiveBytes + " bytes; README " + metrics.readmeBytes + " bytes (" + metrics.files.length + " files).");
  return lines.join("\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await verifyAiDocs();
  console.log(formatAiDocReport(report));
  process.exitCode = report.errors.length ? 1 : 0;
}
