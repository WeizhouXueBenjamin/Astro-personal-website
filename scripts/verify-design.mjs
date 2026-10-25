import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");
const colors = new Map(
  [...css.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6}|var\(--[\w-]+\));/g)].map((match) => [
    match[1],
    match[2],
  ]),
);

const resolveColor = (token, seen = new Set()) => {
  assert.ok(!seen.has(token), `Circular color token ${token}`);
  const value = colors.get(token);
  assert.ok(value, `Missing solid color token ${token}`);
  if (value.startsWith("#")) return value;

  seen.add(token);
  return resolveColor(value.slice(4, -1), seen);
};

const channel = (value) => {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex) => {
  const [red, green, blue] = [1, 3, 5].map((index) =>
    channel(Number.parseInt(hex.slice(index, index + 2), 16)),
  );
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
};

const contrast = (foreground, background) => {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
};

// WCAG AA: ordinary text >= 4.5:1, identifiable control boundaries >= 3:1.
// These are representative solid token pairs, not a rendered-page audit.
const pairs = [
  ["--text", "--bg", 4.5],
  ["--text-secondary", "--bg", 4.5],
  ["--text-muted", "--bg", 4.5],
  ["--text", "--card", 4.5],
  ["--text-secondary", "--card", 4.5],
  ["--text-muted", "--card", 4.5],
  ["--text-secondary", "--surface", 4.5],
  ["--text-muted", "--surface", 4.5],
  ["--accent", "--bg", 4.5],
  ["--accent", "--card", 4.5],
  ["--accent", "--accent-glow", 4.5],
  ["--primary-foreground", "--primary", 4.5],
  ["--primary-foreground", "--primary-hover", 4.5],
  ["--success", "--success-surface", 4.5],
  ["--warning", "--warning-surface", 4.5],
  ["--danger", "--danger-surface", 4.5],
  ["--border-control", "--surface", 3],
  ["--border-control", "--card", 3],
  ["--focus-ring", "--bg", 3],
];

for (const [foregroundToken, backgroundToken, minimum] of pairs) {
  const foreground = resolveColor(foregroundToken);
  const background = resolveColor(backgroundToken);

  const ratio = contrast(foreground, background);
  assert.ok(
    ratio >= minimum,
    `${foregroundToken} on ${backgroundToken}: ${ratio.toFixed(2)}:1, expected ${minimum}:1`,
  );
  console.log(`${foregroundToken} on ${backgroundToken}: ${ratio.toFixed(2)}:1`);
}

console.log(`Verified ${pairs.length} representative dark-theme contrast pairs.`);
