/**
 * Document text extraction for AI agent runs.
 *
 * Tender packs, PQQs and employer's requirements arrive as PDFs and
 * Word files, not as text a person can comfortably paste. This turns an
 * uploaded file into the plain text an agent reads, so the source
 * document reaches the agent whole — every clause, in order — rather
 * than whatever survived a copy-and-paste.
 *
 * Supported as text: .pdf, .docx, .xlsx, and plain text (.txt, .md, .csv).
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

const readable = new Set([".pdf", ".docx", ".xlsx", ".xlsm", ".txt", ".md", ".csv", ".json"]);

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

/** Rows per sheet before a spreadsheet is trimmed, with a note saying so. */
const MAX_SHEET_ROWS = 2000;

/**
 * A spreadsheet reaches the agent as the table it is.
 *
 * Programmes, package registers and workforce curves arrive as
 * spreadsheets more often than as anything else, and the value is in the
 * rows: a task list with its dates, a package list with its status. So
 * each sheet is written out as a pipe table, which the document renderer
 * already turns back into a real table and which a model reads as one.
 *
 * Two things a naive dump gets wrong. A date cell holds a Date, not the
 * "12/03/27" the author sees, and printing it raw gives a timestamp
 * nobody can read — so dates are written ISO, unambiguously, because a
 * diagnostic works backwards from dates and 03/12 is a different day in
 * two countries. And a formula cell holds the formula, not the number —
 * so the cached result is taken, and where there is no cached result the
 * formula is shown rather than a blank, because a column of empty cells
 * reads as "no data" when it means "not recalculated".
 */
async function extractXlsx(buffer) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  const cell = (v) => {
    if (v === null || v === undefined) return "";
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (typeof v === "object") {
      if (v.richText) return v.richText.map((r) => r.text).join("");
      if (v.text) return String(v.text);
      if ("result" in v) return v.result === null || v.result === undefined ? `=${v.formula}` : cell(v.result);
      if (v.formula) return `=${v.formula}`;
      if (v.error) return String(v.error);
      return "";
    }
    return String(v);
  };

  const out = [];
  wb.eachSheet((sheet) => {
    const rows = [];
    let truncated = false;
    sheet.eachRow({ includeEmpty: false }, (row, n) => {
      if (rows.length >= MAX_SHEET_ROWS) { truncated = true; return; }
      const values = Array.isArray(row.values) ? row.values.slice(1) : [];
      const cells = values.map((v) => cell(v).replace(/\|/g, "\\|").replace(/\s+/g, " ").trim());
      while (cells.length && !cells[cells.length - 1]) cells.pop();
      if (cells.some(Boolean)) rows.push(`| ${cells.join(" | ")} |`);
    });
    if (!rows.length) return;
    // A leading separator makes the first row a header, which is what a
    // spreadsheet's first row nearly always is.
    const body = rows.length > 1 ? [rows[0], `|${" --- |".repeat((rows[0].match(/\|/g) || []).length - 1)}`, ...rows.slice(1)] : rows;
    out.push(
      `--- SHEET: ${sheet.name} (${rows.length} row${rows.length === 1 ? "" : "s"}${truncated ? `, trimmed at ${MAX_SHEET_ROWS}` : ""}) ---\n${body.join("\n")}`
    );
  });

  if (!out.length) return { text: "", pages: null };
  return { text: out.join("\n\n"), pages: null };
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
    else if (ext === ".xlsx" || ext === ".xlsm") out = await extractXlsx(buffer);
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
 * Extract every uploaded file, and share the run's character budget out
 * between them fairly.
 *
 * This used to spend the budget in upload order and then `break`. One
 * long document — a 300-page employer's requirements is ordinary — took
 * the whole 180,000 characters and every document after it was dropped
 * WITHOUT A WORD: no note in the prompt, no mark on the run record, and
 * a `sources` row still reporting the character count as though it had
 * been read. The report then confidently found no contradiction between
 * two documents, one of which the model had never seen.
 *
 * So the budget is now shared. Every document gets an equal allowance;
 * anything under its allowance gives the remainder back, and the
 * documents over it divide what is left over, repeatedly, until nothing
 * more can be given away. Every document therefore reaches the model,
 * and any that had to be cut says so in its own block and on the run
 * record.
 *
 * Returns { text, files, documents, notes }.
 */
export async function extractAll(files = [], { budget = MAX_EXTRACT_CHARS } = {}) {
  const results = [];
  for (const f of files) {
    const r = await extractFile(f);
    // Where the caller knows what a document was supplied against — the
    // portal does, because the client attached it to a named requirement
    // — that travels with it, so the model reads it under the right
    // heading instead of in one undifferentiated heap.
    if (f.field) r.field = f.field;
    if (f.label) r.label = f.label;
    if (f.stored || f.filename) r.stored = f.stored || f.filename;
    if (f.mimetype) r.type = f.mimetype;
    results.push(r);
  }

  const textDocs = results.filter((r) => r.text);
  const allowances = shareOut(textDocs.map((r) => r.text.length), budget);

  const notes = [];
  const documents = [];
  const blocks = [];
  textDocs.forEach((r, i) => {
    const allowed = allowances[i];
    const cut = r.text.length > allowed;
    const body = cut
      ? r.text.slice(0, allowed) +
        `\n\n[CUT HERE — ${r.name} is ${r.text.length.toLocaleString("en-GB")} characters and ${allowed.toLocaleString("en-GB")} were read. ` +
        `Everything above was read in full; nothing below it was seen. Say so wherever a finding would have depended on the rest.]`
      : r.text;
    r.chars = r.text.length;
    r.charsRead = Math.min(allowed, r.text.length);
    r.cut = cut;
    if (cut) notes.push(`${r.name}: ${r.charsRead.toLocaleString("en-GB")} of ${r.chars.toLocaleString("en-GB")} characters were read.`);
    const heading = `===== DOCUMENT: ${r.name}${r.pages ? ` (${r.pages} pages)` : ""}${r.label ? ` — supplied against: ${r.label}` : ""} =====`;
    documents.push({ name: r.name, label: r.label || null, field: r.field || null, pages: r.pages || null, text: body, cut });
    blocks.push(`${heading}\n${body}`);
  });

  if (notes.length) {
    blocks.unshift(
      `===== A NOTE ON WHAT YOU WERE GIVEN =====\n` +
      `${notes.length} of these ${textDocs.length} documents were too long to send whole, so each was cut at the point marked in its own block. ` +
      `Nothing was dropped silently and nothing was summarised for you. Where a finding would have needed the part that was cut, say so rather than inferring it.\n\n` +
      notes.map((n) => `• ${n}`).join("\n")
    );
  }

  return { text: blocks.join("\n\n"), files: results, documents, notes };
}

/**
 * Share a budget between documents by their length: equal shares, with
 * whatever the short ones do not need handed to the long ones, until no
 * more can be given away. Ten documents and one giant then means the
 * giant is cut and the other nine arrive whole — the opposite of what
 * spending the budget in upload order does.
 */
export function shareOut(lengths, budget) {
  const out = lengths.map(() => 0);
  let remaining = budget;
  let open = lengths.map((_, i) => i);
  while (open.length && remaining > 0) {
    const share = Math.floor(remaining / open.length);
    if (share <= 0) break;
    const settled = open.filter((i) => lengths[i] <= share);
    if (!settled.length) {
      for (const i of open) out[i] = share;
      remaining -= share * open.length;
      break;
    }
    for (const i of settled) { out[i] = lengths[i]; remaining -= lengths[i]; }
    open = open.filter((i) => !settled.includes(i));
  }
  return out;
}
