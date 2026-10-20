import { existsSync } from "node:fs";
import { glob, type Loader } from "astro/loaders";

export function localGlob(options: Parameters<typeof glob>[0]): Loader {
  const loader = glob(options);
  return {
    ...loader,
    name: "local-glob",
    async load(context) {
      // Astro 7.0.7 returns early for empty directories before pruning deleted entries.
      // Remove stale file-backed entries first so deleting the last file also unpublishes it.
      for (const [id, entry] of context.store.entries()) {
        if (entry.filePath && !existsSync(new URL(entry.filePath, context.config.root))) {
          context.store.delete(id);
        }
      }
      await loader.load(context);
    },
  };
}
