import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

const repoRoot = resolve(new URL("../../..", import.meta.url).pathname);
const readme = readFileSync(resolve(repoRoot, "README.md"), "utf8");
const webReadme = readFileSync(resolve(repoRoot, "apps/web/README.md"), "utf8");
const extensionReadme = readFileSync(
  resolve(repoRoot, "apps/extension/README.md"),
  "utf8",
);
const homePageSource = readFileSync(resolve(repoRoot, "apps/web/app/page.tsx"), "utf8");
const footerSource = readFileSync(
  resolve(repoRoot, "apps/web/app/components/Footer.tsx"),
  "utf8",
);
const layoutSource = readFileSync(resolve(repoRoot, "apps/web/app/layout.tsx"), "utf8");
const extensionIconSource = readFileSync(
  resolve(repoRoot, "apps/extension/public/icon.svg"),
  "utf8",
);

test("README keeps the vibe-coded note hidden from rendered docs", () => {
  const visibleReadme = readme.replace(/<!--[\s\S]*?-->/g, "");

  assert.doesNotMatch(visibleReadme, /^> \[!IMPORTANT\]/m);
  assert.match(readme, /<!--[\s\S]*Vibe Coding Transparency[\s\S]*-->/);
});

test("Open Graph image referenced by metadata exists in public assets", () => {
  const match = layoutSource.match(/url:\s*"https:\/\/cognitivemode\.app\/([^"]+)"/);
  assert.ok(match, "Expected layout metadata to reference an absolute Open Graph image URL");

  const publicAssetPath = resolve(repoRoot, "apps/web/public", match[1]);
  assert.ok(existsSync(publicAssetPath), `Missing public asset: ${match[1]}`);
  assert.match(layoutSource, /width:\s*1200/);
  assert.match(layoutSource, /height:\s*630/);
});

test("website reuses the extension logo assets", () => {
  const webIconSource = readFileSync(resolve(repoRoot, "apps/web/public/icon.svg"), "utf8");

  assert.equal(webIconSource, extensionIconSource);
  assert.ok(existsSync(resolve(repoRoot, "apps/web/public/icon-16.png")));
  assert.ok(existsSync(resolve(repoRoot, "apps/web/public/icon-48.png")));
  assert.ok(existsSync(resolve(repoRoot, "apps/web/public/icon-128.png")));
  assert.ok(existsSync(resolve(repoRoot, "apps/web/app/favicon.ico")));
  assert.match(layoutSource, /icons:\s*{/);
  assert.match(layoutSource, /icon:\s*\[\s*{ url: "\/icon\.svg", type: "image\/svg\+xml" }/);
  assert.match(layoutSource, /apple:\s*\[{ url: "\/icon-128\.png", sizes: "128x128" }\]/);
});

test("site metadata includes canonical, app identity, and crawl routes", () => {
  const robotsSource = readFileSync(resolve(repoRoot, "apps/web/app/robots.ts"), "utf8");
  const sitemapSource = readFileSync(resolve(repoRoot, "apps/web/app/sitemap.ts"), "utf8");

  assert.match(layoutSource, /applicationName:\s*"Cognitive Mode"/);
  assert.match(layoutSource, /alternates:\s*{\s*canonical:\s*"\/"/);
  assert.match(layoutSource, /"@type": "SoftwareApplication"/);
  assert.match(robotsSource, /sitemap:\s*"https:\/\/cognitivemode\.app\/sitemap\.xml"/);
  assert.match(sitemapSource, /https:\/\/cognitivemode\.app/);
  assert.match(sitemapSource, /\/privacy/);
  assert.match(sitemapSource, /\/welcome/);
  assert.match(sitemapSource, /\/goodbye/);
});

test("public docs describe the published Chrome Web Store install path", () => {
  for (const source of [readme, webReadme, extensionReadme]) {
    assert.match(source, /Chrome Web Store/);
    assert.doesNotMatch(source, /not published to the Chrome Web Store/i);
    assert.doesNotMatch(source, /until the extension is published/i);
    assert.doesNotMatch(source, /current install path/i);
  }

  assert.match(
    extensionReadme,
    /https:\/\/chromewebstore\.google\.com\/detail\/cognitive-mode\/hlflicjdpooonfjaciliblnmhkdmakgh/,
  );
});

test("public site does not expose repository links", () => {
  for (const source of [homePageSource, footerSource]) {
    assert.doesNotMatch(source, /github\.com\/hsingla378\/cognitivemode/);
    assert.doesNotMatch(source, /View Source/);
    assert.doesNotMatch(source, />\s*GitHub\s*</);
  }
});
