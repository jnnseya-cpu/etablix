/**
 * Document text extraction for AI agent runs.
 *
 * Tender packs, PQQs and employer's requirements arrive as PDFs and
 * Word files, not as text a person can comfortably paste. This turns an
 * uploaded file into the plain text an agent reads, so the source
 * document reaches the agent whole — every clause, in order — rather
 * than whatever survived a copy-and-paste.
 *
 * Supported: .pdf, .docx, and plain text (.txt, .md, .csv).
 * Legacy .doc and scanned image-only PDFs are not readable here and say
 * so plainly, so nobody assumes a silent extraction succeeded.
 */

import fs from "node:fs/promises";
import path from "node:path";

/** Hard ceiling per run so one enormous pack cannot exhaust the model context. */
export const MAX_EXTRACT_CHARS = 180000;

const readable = new Set([".pdf", ".docx", ".txt", ".md", ".csv", ".json"]);

export const isExtractable = (name) => readable.has(path.extname(String(name || "")).toLowerCase());

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
    if (ext === ".pdf") out = await extractPdf(buffer);
    else if (ext === ".docx") out = await extractDocx(buffer);
    else if (readable.has(ext)) out = { text: buffer.toString("utf8"), pages: null };
    else {
      return { name, text: "", error: `${ext || "this file type"} cannot be read as text — supply a PDF, .docx or plain text version.` };
    }
    const text = out.text.replace(/\r\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();
    if (!text) {
      return { name, text: "", error: "no selectable text found — this looks like a scanned or image-only document, so its wording cannot be read." };
    }
    return { name, text, pages: out.pages, chars: text.length };
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
    if (!r.text) continue;
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
