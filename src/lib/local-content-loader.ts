import { existsSync } from "node:fs";
import { isAbsolute, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
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

      // The same empty-directory return also skips glob's dev watcher setup.
      // Keep listening until the first matching entry installs the native watcher.
      const { watcher } = context;
      const directory = new URL(options.base ?? "./", context.config.root);
      if (!watcher || context.store.keys().length || !existsSync(directory)) return;

      const basePath = fileURLToPath(directory);
      let loading = false;
      let pending = false;
      const loadFirstEntry = async (path: string) => {
        const entry = relative(basePath, path);
        if (entry === ".." || entry.startsWith(`..${sep}`) || isAbsolute(entry)) return;
        pending = true;
        if (loading) return;
        loading = true;
        try {
          do {
            pending = false;
            await loader.load(context);
          } while (pending && !context.store.keys().length);

          if (context.store.keys().length) {
            watcher.off("add", loadFirstEntry);
            watcher.off("change", loadFirstEntry);
            // Catch files added during the first scan without registering listeners twice.
            await loader.load({ ...context, watcher: undefined });
          }
        } catch (error) {
          context.logger.error(`Failed to load ${context.collection}: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
          loading = false;
        }
      };
      watcher.add(basePath);
      watcher.on("add", loadFirstEntry);
      watcher.on("change", loadFirstEntry);
    },
  };
}
