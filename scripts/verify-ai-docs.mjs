import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

// Project budgets, in UTF-8 bytes. Changes require an explicit scope decision.
export const AI_DOC_BUDGETS = Object.freeze({
  entry: 4 * 1024,
  domain: 12 * 1024,
  index: 2 * 1024,
  total: 48 * 1024,
});

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const domainNames = ["business", "engineering", "coding-style", "design-system", "project-showcase", "workflows"];
const markdownFiles = (directory) => {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.isFile() && extname(path).toLowerCase() === ".md" ? [path] : [];
  });
};

const visit = (node, callback) => {
  callback(node);
  for (const child of node.children ?? []) visit(child, callback);
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
    errors.push(`package.json: ${error.message}`);
  }

  let tree;
  const processor = await createMarkdownProcessor({
    syntaxHighlight: false,
    remarkPlugins: [() => (currentTree) => { tree = currentTree; }],
  });

  const readDocument = async (path) => {
    if (cache.has(path)) return cache.get(path);
    try {
      const source = readFileSync(path, "utf8");
      const rendered = await processor.render(source);
      const document = { source, tree, headings: new Set(rendered.metadata.headings.map(({ slug }) => slug)) };
      cache.set(path, document);
      return document;
    } catch (error) {
      errors.push(`${label(path)}: cannot read Markdown: ${error.message}`);
      cache.set(path, null);
      return null;
    }
  };

  const paths = [...new Set([
    join(root, "AGENTS.md"),
    join(root, "README.md"),
    ...domainNames.map((name) => join(root, "docs/ai", `${name}.md`)),
    join(root, "docs/ai/project-audit.md"),
    ...markdownFiles(join(root, "docs/ai")),
  ])].sort();

  for (const path of paths) {
    const document = await readDocument(path);
    if (!document) continue;
    const name = label(path);
    const archive = name.startsWith("docs/ai/archive/");
    const kind = archive ? "archive" : name === "README.md" ? "readme"
      : name === "AGENTS.md" ? "entry" : name === "docs/ai/project-audit.md" ? "index" : "domain";
    const bytes = Buffer.byteLength(document.source, "utf8");
    metrics.files.push({ path: name, kind, bytes });
    if (kind === "archive") metrics.archiveBytes += bytes;
    else if (kind === "readme") metrics.readmeBytes += bytes;
    else {
      metrics.activeBytes += bytes;
      if (bytes > AI_DOC_BUDGETS[kind]) errors.push(`${name}: ${bytes} bytes exceeds ${kind} budget ${AI_DOC_BUDGETS[kind]}`);
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
      if (url !== undefined) links.push({ url, line: node.position.start.line });
      if (!archive && node.type === "paragraph") {
        const paragraph = document.source.slice(node.position.start.offset, node.position.end.offset).replace(/\s+/gu, " ").trim();
        if ([...paragraph].length >= 120) {
          if (!paragraphs.has(paragraph)) paragraphs.set(paragraph, []);
          paragraphs.get(paragraph).push(`${name}:${node.position.start.line}`);
        }
      }
    });

    for (const { url, line } of links) {
      if (!url || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(url)) continue;
      const location = `${name}:${line}`;
      try {
        const hash = url.indexOf("#");
        const pathname = decodeURIComponent((hash < 0 ? url : url.slice(0, hash)).split("?")[0]);
        const fragment = hash < 0 ? "" : decodeURIComponent(url.slice(hash + 1));
        const target = !pathname ? path : pathname.startsWith("/")
          ? resolve(root, `.${pathname}`) : resolve(dirname(path), pathname);
        const withinRoot = relative(root, target);
        if (withinRoot === ".." || withinRoot.startsWith(`..${sep}`)) {
          errors.push(`${location}: local link leaves repository: ${url}`);
        } else if (!existsSync(target)) {
          errors.push(`${location}: missing local target: ${url}`);
        } else if (fragment && /\.md$/i.test(target) && statSync(target).isFile()) {
          const targetDocument = await readDocument(target);
          if (targetDocument && !targetDocument.headings.has(fragment)) errors.push(`${location}: missing Markdown heading: ${url}`);
        }
      } catch (error) {
        errors.push(`${location}: invalid local link ${url}: ${error.message}`);
      }
    }

    if (!archive) {
      const command = /\bpnpm(?:\.cmd)?[ \t]+run[ \t]+(?:"([^"\r\n]+)"|'([^'\r\n]+)'|([\w][\w:./@-]*))/g;
      for (const match of document.source.matchAll(command)) {
        const script = match[1] ?? match[2] ?? match[3];
        if (!Object.hasOwn(scripts, script)) {
          const line = document.source.slice(0, match.index).split("\n").length;
          errors.push(`${name}:${line}: unknown package script: ${script}`);
        }
      }
    }
  }

  if (metrics.activeBytes > AI_DOC_BUDGETS.total) {
    errors.push(`Active guidance: ${metrics.activeBytes} bytes exceeds total budget ${AI_DOC_BUDGETS.total}`);
  }
  for (const [paragraph, locations] of paragraphs) {
    if (locations.length > 1) warnings.push(`Repeated paragraph at ${locations.join(", ")}: ${[...paragraph].slice(0, 60).join("")}…`);
  }
  return { errors, warnings, metrics };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { errors, warnings, metrics } = await verifyAiDocs();
  for (const warning of warnings) console.warn(`WARN ${warning}`);
  for (const error of errors) console.error(`ERROR ${error}`);
  console.log(`AI docs: active ${metrics.activeBytes}/${AI_DOC_BUDGETS.total} bytes; archive ${metrics.archiveBytes} bytes; README ${metrics.readmeBytes} bytes (${metrics.files.length} files).`);
  process.exitCode = errors.length ? 1 : 0;
}
