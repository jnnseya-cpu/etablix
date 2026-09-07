/**
 * Document text extraction for AI agent runs.
 *
 * Tender packs, PQQs and employer's requirements arrive as PDFs and
 * Word files, not as text a person can comfortably paste. This turns an
 * uploaded file into the plain text an agent reads, so the source
 * document reaches the agent whole — every clause, in order — rather
 * than whatever survived a copy-and-paste.
 *
 * Supported as text: .pdf, .docx, and plain text (.txt, .md, .csv).
 *
 * Not everything belongs on this path. A drawing, a printed programme or
 * a scan carries its meaning in its layout, and extracting its labels
 * produces something that reads like a successful extraction while
 * holding almost none of the document. Those are routed to visual.js and
 * shown to the model as pages instead; see `route` on each result.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { classify, isImage, planningFormatNote } from "./visual.js";

/** Hard ceiling per run so one enormous pack cannot exhaust the model context. */
export const MAX_EXTRACT_CHARS = 180000;

const readable = new Set([".pdf", ".docx", ".txt", ".md", ".csv", ".json"]);

// Images carry no text to extract; they are shown to the model instead.
export const isViewable = (name) => isImage(name);

export const isExtractable = (name) => readable.has(path.extname(String(name || "")).toLowerCase()) || isImage(name);

async function extractPdf(buffer) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return { text: result.text || "", pages: result.total ?? null };
  } finally {
    await parser.destroy?.().catch(() => {});
  }
}

async function extractDocx(buffer) {
  const mammoth = (await import("mammoth")).default;
  const result = await mammoth.extractRawText({ buffer });
  return { text: result.value || "", pages: null };
}

/**
 * Extract one uploaded file. Returns { name, text, pages, chars, error }.
 * Never throws: a failed extraction is reported, not fatal, so a run
 * with three good files and one bad one still proceeds.
 */
export async function extractFile(file) {
  const name = file.originalname || file.filename;
  const ext = path.extname(name).toLowerCase();
  try {
    const buffer = await fs.readFile(file.path);
    let out;
    // An image has nothing to extract — it is looked at, not read.
    if (isImage(name)) return { name, text: "", route: "visual", chars: 0 };
    if (ext === ".pdf") out = await extractPdf(buffer);
    else if (ext === ".docx") out = await extractDocx(buffer);
    else if (readable.has(ext)) out = { text: buffer.toString("utf8"), pages: null };
    else {
      // A planning file gets the specific instruction rather than a
      // shrug: every tool that writes one exports what we can read.
      const planning = planningFormatNote(name);
      return {
        name,
        text: "",
        error: planning || `${ext || "this file type"} cannot be read as text — supply a PDF, .docx or plain text version.`,
      };
    }
    const text = out.text.replace(/\r\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();
    const route = classify(name, { text, pages: out.pages });

    // A drawing, a printed programme or a scan: its meaning is in the
    // layout, so the extracted labels are discarded rather than passed
    // off as the document. Sending those on would look like a successful
    // read of something that was barely read at all.
    if (route === "visual") {
      return { name, text: "", route: "visual", pages: out.pages, textChars: text.length };
    }
    if (!text) {
      return { name, text: "", error: "no readable content — this file could not be opened as text or as a page to look at." };
    }
    return { name, text, route: "text", pages: out.pages, chars: text.length };
  } catch (err) {
    return { name, text: "", error: err.message };
  }
}

/**
 * Extract every uploaded file into one labelled block for the agent,
 * with a per-run character ceiling. Returns { text, files } where files
 * carries the per-document result for the run record.
 */
export async function extractAll(files = []) {
  const results = [];
  for (const f of files) results.push(await extractFile(f));

  let budget = MAX_EXTRACT_CHARS;
  const blocks = [];
  for (const r of results) {
    if (!r.text) continue; // visual files travel as pages, handled by visual.js
    let body = r.text;
    if (body.length > budget) {
      body = body.slice(0, Math.max(0, budget)) + `\n\n[TRUNCATED — this document exceeded the per-run limit. Split it and run again to cover the remainder.]`;
    }
    budget -= body.length;
    blocks.push(`===== DOCUMENT: ${r.name}${r.pages ? ` (${r.pages} pages)` : ""} =====\n${body}`);
    if (budget <= 0) break;
  }
  return { text: blocks.join("\n\n"), files: results };
}
