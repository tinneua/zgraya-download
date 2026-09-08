import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { detectStore } from "../site/device-routing.mjs";
import { STORE_LINKS } from "../site/store-links.mjs";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const siteDirectory = join(testDirectory, "..", "site");
const repositoryDirectory = join(siteDirectory, "..");

let mainModuleRun = 0;

async function runMainModule({ userAgent = "", platform = "", maxTouchPoints = 0 } = {}) {
  const anchors = ["apple", "google"].map((store) => ({
    dataset: { storeLink: store },
    href: "",
    removedAttributes: [],
    removeAttribute(attribute) {
      this.removedAttributes.push(attribute);
    },
  }));
  const status = { textContent: "unchanged" };
  const replacements = [];

  const originalGlobals = new Map(
    ["document", "navigator", "window"].map((name) => [
      name,
      Object.getOwnPropertyDescriptor(globalThis, name),
    ]),
  );

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      querySelectorAll() {
        return anchors;
      },
      querySelector() {
        return status;
      },
    },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { userAgent, platform, maxTouchPoints },
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: {
        replace(destination) {
          replacements.push(destination);
        },
      },
    },
  });

  try {
    await import(`../site/main.mjs?test-run=${mainModuleRun++}`);
    return { anchors, replacements, status };
  } finally {
    for (const [name, descriptor] of originalGlobals) {
      if (descriptor) {
        Object.defineProperty(globalThis, name, descriptor);
      } else {
        delete globalThis[name];
      }
    }
  }
}

test("store destinations are immutable external HTTPS URLs", () => {
  assert.deepEqual(Object.keys(STORE_LINKS), ["apple", "google"]);
  assert.ok(Object.isFrozen(STORE_LINKS));

  for (const destination of Object.values(STORE_LINKS)) {
    const url = new URL(destination);
    assert.equal(url.protocol, "https:");
    assert.notEqual(url.hostname, "get.zgraya.app");
  }
});

test("Android phones and tablets route to Google Play", () => {
  assert.equal(
    detectStore({
      userAgent:
        "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/128 Mobile Safari/537.36",
      platform: "Linux armv8l",
      maxTouchPoints: 5,
    }),
    "google",
  );
  assert.equal(
    detectStore({
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 Chrome/126 Safari/537.36",
    }),
    "google",
  );
});

test("iPhone, iPad, and iPod route to the App Store", () => {
  for (const userAgent of [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
    "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
    "Mozilla/5.0 (iPod touch; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
  ]) {
    assert.equal(detectStore({ userAgent }), "apple");
  }
});

test("iPadOS desktop mode routes to Apple without redirecting a Mac", () => {
  const desktopSafari =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15";

  assert.equal(
    detectStore({
      userAgent: desktopSafari,
      platform: "MacIntel",
      maxTouchPoints: 5,
    }),
    "apple",
  );
  assert.equal(
    detectStore({
      userAgent: desktopSafari,
      platform: "MacIntel",
      maxTouchPoints: 0,
    }),
    null,
  );
});

test("desktop and unrecognized clients stay on the fallback", () => {
  for (const client of [
    {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128 Safari/537.36",
      platform: "Win32",
    },
    {
      userAgent:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Firefox/130.0",
      platform: "Linux x86_64",
    },
    { userAgent: "Googlebot/2.1", platform: "Linux x86_64" },
    {},
  ]) {
    assert.equal(detectStore(client), null);
  }
});

test("fallback exposes two accessible links hydrated from the shared config", async () => {
  const html = await readFile(join(siteDirectory, "index.html"), "utf8");
  const main = await readFile(join(siteDirectory, "main.mjs"), "utf8");

  assert.match(html, /<html lang="uk">/);
  assert.match(
    html,
    /<h1 id="page-title">Приєднуйтесь до своєї Зграї<\/h1>/,
  );
  assert.match(
    html,
    /Для завантаження застосунку оберіть магазин для вашого пристрою/,
  );
  assert.match(html, /src="\.\/app-icon\.png"/);
  assert.match(html, /src="\.\/badges\/app-store-en\.svg"/);
  assert.match(html, /src="\.\/badges\/google-play-en\.png"/);
  assert.match(html, /alt="Завантажити в App Store"/);
  assert.match(html, /alt="Завантажити з Google Play"/);
  assert.match(html, /data-store-link="apple"/);
  assert.match(html, /data-store-link="google"/);
  assert.match(html, /aria-label="Посилання на магазини застосунків"/);
  assert.match(html, /aria-live="polite"/);
  assert.doesNotMatch(html, /Без аналітики та файлів cookie/);
  assert.doesNotMatch(html, /store-icon|store-arrow/);
  assert.match(main, /import \{ STORE_LINKS \} from "\.\/store-links\.mjs"/);
  assert.doesNotMatch(html, /https:\/\/(?:apps\.apple|play\.google)/);
});

test("main hydrates links and redirects iPhone clients to the App Store", async () => {
  const { anchors, replacements, status } = await runMainModule({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
  });

  assert.equal(anchors[0].href, STORE_LINKS.apple);
  assert.equal(anchors[1].href, STORE_LINKS.google);
  assert.deepEqual(anchors[0].removedAttributes, ["aria-disabled"]);
  assert.deepEqual(anchors[1].removedAttributes, ["aria-disabled"]);
  assert.equal(status.textContent, "Відкриваємо App Store. Opening App Store.");
  assert.deepEqual(replacements, [STORE_LINKS.apple]);
});

test("main redirects Android clients to Google Play", async () => {
  const { anchors, replacements, status } = await runMainModule({
    userAgent:
      "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/128 Mobile Safari/537.36",
  });

  assert.equal(anchors[0].href, STORE_LINKS.apple);
  assert.equal(anchors[1].href, STORE_LINKS.google);
  assert.equal(status.textContent, "Відкриваємо Google Play. Opening Google Play.");
  assert.deepEqual(replacements, [STORE_LINKS.google]);
});

test("main keeps desktop clients on the hydrated fallback", async () => {
  const { anchors, replacements, status } = await runMainModule({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128 Safari/537.36",
    platform: "Win32",
  });

  assert.equal(anchors[0].href, STORE_LINKS.apple);
  assert.equal(anchors[1].href, STORE_LINKS.google);
  assert.equal(status.textContent, "unchanged");
  assert.deepEqual(replacements, []);
});

test("public artifact contains no analytics, cookies, or browser storage", async () => {
  const publicFiles = [
    "index.html",
    "styles.css",
    "store-links.mjs",
    "device-routing.mjs",
    "main.mjs",
  ];
  const source = (
    await Promise.all(
      publicFiles.map((file) => readFile(join(siteDirectory, file), "utf8")),
    )
  ).join("\n");

  assert.doesNotMatch(
    source,
    /google-analytics|googletagmanager|gtag\s*\(|posthog|mixpanel|segment\.com|document\.cookie|localStorage|sessionStorage/i,
  );
  assert.match(source, /connect-src 'none'/);
});

test("official store badge files are shipped without inline reconstructions", async () => {
  const appleBadge = await readFile(
    join(siteDirectory, "badges", "app-store-en.svg"),
    "utf8",
  );
  const googleBadge = await readFile(
    join(siteDirectory, "badges", "google-play-en.png"),
  );

  assert.match(appleBadge, /^<svg[^>]+viewBox=/);
  assert.deepEqual([...googleBadge.subarray(0, 8)], [
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
});

test("official store badge files match the recorded SHA-256 receipts", async () => {
  const receipts = await readFile(
    join(repositoryDirectory, "ASSET_SOURCES.md"),
    "utf8",
  );
  const recordedAssets = [
    ...receipts.matchAll(
      /- Stored as: `([^`]+)`[\s\S]*?- SHA-256: `([0-9a-f]{64})`/gi,
    ),
  ];

  assert.equal(recordedAssets.length, 2);

  for (const [, relativePath, recordedHash] of recordedAssets) {
    const bytes = await readFile(join(repositoryDirectory, relativePath));
    const normalizedBytes = relativePath.endsWith(".svg")
      ? Buffer.from(bytes.toString("utf8").replace(/\r\n?/g, "\n"))
      : bytes;
    const actualHash = createHash("sha256")
      .update(normalizedBytes)
      .digest("hex");

    assert.equal(
      actualHash.toUpperCase(),
      recordedHash.replace(/\s/g, "").toUpperCase(),
      `SHA-256 mismatch for ${relativePath}`,
    );
  }
});
