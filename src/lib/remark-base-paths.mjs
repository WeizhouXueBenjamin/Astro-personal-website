// Keep authored Markdown URLs independent of the deployment location.
export default function remarkBasePaths({ base }) {
  const prefix = base === "/" ? "" : base;
  return function transform(tree) {
    function visit(node) {
      if (["link", "image", "definition"].includes(node.type) && node.url?.startsWith("/") && !node.url.startsWith("//")) {
        node.url = `${prefix}${node.url}`;
      }
      for (const child of node.children ?? []) visit(child);
    }
    visit(tree);
  };
}
