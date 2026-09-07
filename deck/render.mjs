/**
 * Render the ETABLIX executive deck to the published capability statement.
 *
 *   node deck/render.mjs
 *
 * Writes frontend/public/docs/ETABLIX-Capability-Statement.pdf — the file
 * the website offers for download. Fonts and images resolve relative to
 * this directory, so the deck rebuilds anywhere the repository is cloned.
 */
import { chromium } from "playwright-core";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, "..", "frontend", "public", "docs", "ETABLIX-Capability-Statement.pdf");

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(`file://${path.join(here, "etablix-deck.html")}`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: out, width: "1280px", height: "720px", printBackground: true, pageRanges: "1-12" });
await browser.close();
console.log("Capability statement written:", out);
