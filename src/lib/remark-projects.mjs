import { dirname, resolve } from "node:path";

// Project authoring stays in MDX. Generated attributes never need hand numbering.
export default function remarkProjects() {
  return (tree, file) => {
    const path = file.path?.replaceAll("\\", "/") ?? "";
    if (!path.includes("/src/content/projects/") || !path.endsWith(".mdx")) return;

    const frontmatter = file.data.astro.frontmatter;
    const figures = new Map();
    const sources = new Set();
    const images = new Set();
    const imports = new Map();
    const tests = [];
    const sections = [];
    const sectionIds = new Set();
    const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    const fail = (message, node) => file.fail(message, node?.position);
    const attributes = (node) => Object.fromEntries((node.attributes ?? []).map((attribute) => {
      if (attribute.type !== "mdxJsxAttribute") fail("Project components use named attributes, not spreads", node);
      return [attribute.name, attribute.value];
    }));
    const literal = (name, value) => ({
      type: "mdxJsxAttribute",
      name,
      value: typeof value === "string" ? value : {
        type: "mdxJsxAttributeValueExpression",
        value: JSON.stringify(value),
        data: { estree: { type: "Program", sourceType: "module", body: [{ type: "ExpressionStatement", expression: { type: "Literal", value, raw: JSON.stringify(value) } }] } },
      },
    });
    const inject = (node, name, value) => {
      if (node.attributes.some((attribute) => attribute.name === name)) fail(`${name} is generated automatically`, node);
      node.attributes.push(literal(name, value));
    };
    const localSource = (source) => {
      if (source.startsWith("/") || /^https?:/.test(source)) return source;
      if (source.startsWith("#assets/")) return resolve(path.split("/src/content/projects/")[0], "src/assets", source.slice(8));
      return resolve(dirname(file.path), source);
    };
    const importedImage = (value, node) => {
      const expression = value?.data?.estree?.body?.[0]?.expression;
      const source = expression?.type === "Identifier" && imports.get(expression.name);
      if (!source) fail("Figure images and video posters must use a direct image import", node);
      return localSource(source);
    };
    const register = (id, title, source, image, node) => {
      if (typeof id !== "string" || !idPattern.test(id)) fail("Figure IDs must be lowercase words separated by hyphens", node);
      if (figures.has(id)) fail(`Duplicate figure ID: ${id}`, node);
      if (typeof title !== "string" || !title.trim()) fail("Figures need a literal title", node);
      if (sources.has(source)) fail("Do not repeat the same media source in a case study", node);
      if (images.has(image)) fail("Do not repeat an image or video poster in a case study", node);
      sources.add(source);
      images.add(image);
      const reference = { number: figures.size + 1, title };
      figures.set(id, reference);
      return reference;
    };

    for (const node of tree.children) {
      if (node.type !== "mdxjsEsm") continue;
      for (const statement of node.data?.estree?.body ?? []) {
        if (statement.type !== "ImportDeclaration") continue;
        for (const specifier of statement.specifiers) {
          if (specifier.type === "ImportDefaultSpecifier") imports.set(specifier.local.name, statement.source.value);
        }
      }
    }
    if (frontmatter.hero) {
      const hero = frontmatter.hero;
      register(hero.id, hero.title, localSource(hero.src), localSource(hero.type === "image" ? hero.src : hero.poster));
    }

    function visit(node) {
      if (node.type === "heading" && node.depth === 1) fail("Project titles come from frontmatter; start the body with ##", node);
      if (node.name === "h1") fail("Project titles come from frontmatter; start the body with ##", node);
      if (node.type === "image" || node.name === "img" || node.name === "video" || node.name === "iframe") {
        fail("Use Figure for project media so captions, sources and numbering stay validated", node);
      }
      if (node.name === "Figure") {
        const data = attributes(node);
        const type = data.type ?? "image";
        const source = type === "image" ? importedImage(data.src, node) : data.src;
        if (typeof source !== "string") fail("Video sources must be literal URLs", node);
        const image = type === "image" ? source : importedImage(data.poster, node);
        const figure = register(data.id, data.title, localSource(source), image, node);
        inject(node, "number", figure.number);
      }
      if (node.name === "Test") tests.push(node);
      if (node.name === "Gallery") {
        const { layout = "featured" } = attributes(node);
        const figures = (node.children ?? []).filter((child) => child.name === "Figure");
        if ((node.children ?? []).some((child) => child.name !== "Figure" && !(child.type === "text" && !child.value.trim()))) {
          fail("Gallery contains Figure components only", node);
        }
        if (!["featured", "comparison", "sequence"].includes(layout)) fail("Unknown gallery layout", node);
        if (layout === "comparison" && figures.length !== 2) fail("Comparison gallery needs two media items", node);
        if (layout === "sequence" && figures.length < 2) fail("Sequence gallery needs at least two media items", node);
        if (layout === "sequence") figures.forEach((figure, index) => inject(figure, "step", index + 1));
      }
      for (const child of node.children ?? []) visit(child);
    }
    visit(tree);
    for (const node of tests) {
      const { evidence } = attributes(node);
      if (evidence === undefined) continue;
      const reference = figures.get(evidence);
      if (!reference) fail(`Unknown test evidence: ${evidence}`, node);
      inject(node, "evidenceNumber", reference.number);
      inject(node, "evidenceTitle", reference.title);
    }

    const output = [];
    let section;
    for (const node of tree.children) {
      if (node.type === "heading" && node.depth === 2) {
        const last = node.children.at(-1);
        const explicit = last?.type === "text" && last.value.match(/\s+\[#([a-z0-9-]+)\]$/);
        if (explicit) last.value = last.value.slice(0, explicit.index);
        const textOf = (node) => node.value ?? (node.children ?? []).map(textOf).join("");
        const title = textOf(node);
        const id = explicit?.[1] ?? title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
        if (!idPattern.test(id) || id === "hero" || sectionIds.has(id) || [...figures.keys()].some((figure) => id === `figure-${figure}` || id === `caption-${figure}`)) fail(`Invalid or duplicate section ID: ${id}`, node);
        sectionIds.add(id);
        sections.push({ id, title });
        section = { type: "mdxJsxFlowElement", name: "ProjectSection", attributes: [literal("id", id), literal("title", title), literal("index", sections.length - 1)], children: [] };
        output.push(section);
      } else if (node.type === "mdxjsEsm") {
        output.push(node);
      } else if (section) {
        section.children.push(node);
      } else {
        fail("Start the project body with a ## section heading", node);
      }
    }
    if (!sections.length) fail("Projects need at least one ## section");
    const documentIds = [
      ...sections.flatMap(({ id }) => [id, `heading-${id}`]),
      ...[...figures.keys()].flatMap((id) => [`figure-${id}`, `caption-${id}`]),
    ];
    if (new Set(documentIds).size !== documentIds.length) fail("Project section and figure anchors must be unique");
    frontmatter.projectSections = sections;
    tree.children = output;
  };
}
