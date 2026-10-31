import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(new URL("../package.json", import.meta.url));
const missing = ["astro", "@astrojs/check", "typescript"].filter((name) => {
  try {
    require.resolve(name);
    return false;
  } catch {
    return true;
  }
});

// Astro 7.3.3 can return success without checking when these packages are absent.
if (missing.length) {
  console.error(`Type check cannot run: missing ${missing.join(", ")}. Run pnpm install --frozen-lockfile (including devDependencies).`);
  process.exitCode = 1;
} else {
  const cli = resolve(dirname(require.resolve("astro/package.json")), "bin/astro.mjs");
  const result = spawnSync(process.execPath, [cli, "check", ...process.argv.slice(2)], {
    cwd: root,
    env: { ...process.env, CI: "true" },
    stdio: "inherit",
  });
  if (result.error || result.signal) {
    console.error(`Type check failed to complete: ${result.error?.message ?? result.signal}`);
  }
  process.exitCode = result.status ?? 1;
}
