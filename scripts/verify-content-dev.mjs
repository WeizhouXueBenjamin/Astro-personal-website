import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { unlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";

// A build rescan cannot catch a loader that never watches an initially empty folder.
export async function verifyContentDev({ root, project, writeProject }) {
  const reservation = createServer();
  await new Promise((resolve, reject) => {
    reservation.once("error", reject);
    reservation.listen(0, "127.0.0.1", resolve);
  });
  const { port } = reservation.address();
  await new Promise((resolve) => reservation.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  let logs = "";
  // Use Astro's dev API with IPC so Windows can close Vite/esbuild gracefully.
  const serverCode = `
import { dev } from ${JSON.stringify(import.meta.resolve("astro"))};
const ready = dev({ root: ${JSON.stringify(root)}, site: "https://portfolio.example/", base: "/", server: { host: "127.0.0.1", port: ${port} } });
process.on("message", async (message) => {
  if (message === "stop") { await (await ready).stop(); process.exit(0); }
});
await ready;
`;
  const child = spawn(process.execPath, ["--input-type=module", "--eval", serverCode], {
    cwd: root,
    env: { ...process.env, SITE_URL: "https://portfolio.example/" },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });
  child.stdout.on("data", (data) => { logs += data; });
  child.stderr.on("data", (data) => { logs += data; });

  async function waitFor(path, predicate, label) {
    const deadline = Date.now() + 15_000;
    let last = "not ready";
    while (Date.now() < deadline && child.exitCode === null) {
      try {
        const response = await fetch(`${origin}${path}`, { signal: AbortSignal.timeout(2000) });
        const html = await response.text();
        last = `HTTP ${response.status}`;
        if (predicate(html, response.status)) return html;
      } catch (error) {
        last = error.message;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.fail(`${label}: ${last}\n${logs.slice(-4000)}`);
  }

  const empty = (html, status) => status === 200 && html.includes("Project write-ups will appear here");
  const hasTitle = (title) => (html, status) => status === 200 && html.includes(title);
  const first = { ...project, title: "Fixture Added Project", slug: "dev-added-case", featured: true };
  const updated = { ...first, title: "Fixture Updated Project" };
  const file = join(root, "src/content/projects/dev-added.mdx");
  try {
    await waitFor("/projects/", empty, "Dev must start with a real empty collection");
    writeFileSync(join(root, "src/content/projects/ignored.txt"), "Not a project entry.");
    writeProject("dev-added", first);
    const added = await waitFor("/projects/", hasTitle(first.title), "Adding the first MDX must populate Projects without restarting");
    assert.equal((added.match(/class="project-card /g) ?? []).length, 1);
    await waitFor("/", hasTitle(first.title), "The first featured project must reach Home");
    await waitFor("/projects/dev-added-case/", hasTitle(first.title), "The first project detail must be available");
    writeProject("dev-added", updated);
    await waitFor("/projects/", hasTitle(updated.title), "Editing a new entry must keep native watching active");
    unlinkSync(file);
    await waitFor("/projects/", empty, "Deleting the last project must restore the empty state");
    writeProject("dev-added", updated);
    const restored = await waitFor("/projects/", hasTitle(updated.title), "Re-adding the last project must work without restarting");
    assert.equal((restored.match(/class="project-card /g) ?? []).length, 1);
    console.log("Content dev verification passed: empty startup, ignored file, first MDX add, featured Home, detail, edit, last-file deletion and re-add.");
  } catch (error) {
    console.error(error.message);
    throw error;
  } finally {
    if (child.exitCode === null) {
      const exited = once(child, "exit");
      child.send("stop");
      let timeout;
      await Promise.race([exited, new Promise((resolve) => { timeout = setTimeout(resolve, 5000); })]);
      clearTimeout(timeout);
      if (child.exitCode === null) child.kill();
    }
  }
}
