/**
 * Drawings and programmes: the documents you cannot read by reading them.
 *
 * Text extraction was built for tender packs — prose and clauses, where
 * pulling the words out loses nothing. A site layout is the opposite. Run
 * one through a text extractor and you get the labels with none of the
 * geometry: "OFFICES  WELFARE  CANTEEN" and no idea what sits next to
 * what, how far the parking is from the gate, that one entrance serves
 * both HGVs and cars, or that the hatched area is parking at all.
 *
 * Worse, that extraction SUCCEEDS. It returns four hundred characters and
 * no error, so an agent building a package map from it cannot tell it is
 * working from a fraction of the drawing. A scanned drawing at least
 * fails honestly; a vector one lies.
 *
 * So a visual document is not extracted at all. It is sent to the model
 * as a page to look at, the way a person would — geometry, adjacency,
 * hatching, title block, revision, scale and all. The same applies to a
 * printed programme: the bars, the links and the float are the content,
 * and the text under them is a list of task names in arbitrary order.
 *
 * What decides which path a file takes is how much text it carries per
 * page. Prose runs to thousands of characters a page; a drawing runs to
 * a few hundred; a scan runs to none. That one measure sorts them
 * without anyone having to label the upload, and it catches the scanned
 * document that used to be rejected outright.
 */

import fs from "node:fs/promises";
import path from "node:path";

/**
 * Below this many characters per page, a PDF is something to look at.
 *
 * Measured rather than guessed: a page of prose in these packs runs to
 * about 3,600 characters, a Gantt print to 1,800, an annotation-heavy A1
 * drawing to 800–1,000, a scan to none.
 *
 * The threshold sits deliberately high, because the two mistakes are not
 * equal. Sending a sparse text PDF as a page to look at costs some payload
 * and reads correctly anyway. Sending a drawing down the text path
 * produces label soup that reports itself as a successful extraction —
 * silent, and the whole reason this module exists. So the doubt goes to
 * looking at it.
 */
const TEXT_PER_PAGE = 2000;

/**
 * Drawings are lettered in capitals. It is a drafting convention rather
 * than an accident, and it holds across CAD packages: these test drawings
 * come out at 87–98% capitals against 7% for prose. It catches a drawing
 * so covered in notes that it clears the density threshold.
 */
const DRAWING_CAPS_RATIO = 0.6;

/** Formats the model can be shown directly. */
const IMAGE_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

/**
 * Total raw bytes of visual material in one run. The request itself is
 * capped at 32 MB and base64 inflates by a third, so this leaves room
 * for the written inputs and the model's reply.
 */
export const MAX_VISUAL_BYTES = 15 * 1024 * 1024;

/**
 * Pages of one document the model is asked to look at. A drawing set is
 * a handful of sheets; a scanned tender pack can be hundreds, and
 * sending that whole would fail the request outright rather than
 * degrade. Cap it and say which pages were sent.
 */
export const MAX_VISUAL_PAGES = 100;

export const isImage = (name) => Boolean(IMAGE_TYPES[path.extname(String(name || "")).toLowerCase()]);

/**
 * Formats that carry a programme but that nothing here can open. Named
 * explicitly so the answer is "ask for it as a PDF" rather than a
 * shrug — every planning tool exports one, and asking for the right
 * format up front is cheaper than guessing at the wrong one.
 */
const PLANNING_FORMATS = {
  ".mpp": "Microsoft Project",
  ".xer": "Primavera P6",
  ".xml": "Primavera P6 XML",
  ".pp": "Asta Powerproject",
  ".pod": "Asta Powerproject",
};

export function planningFormatNote(name) {
  const tool = PLANNING_FORMATS[path.extname(String(name || "")).toLowerCase()];
  return tool
    ? `${name} is in ${tool} format, which cannot be opened here. Ask for the programme as a PDF print of the Gantt chart (which is read as a drawing, bars and links included) and a task list as CSV — every planning tool exports both.`
    : null;
}

/**
 * Decide how one already-extracted file should reach the model.
 *
 * `extracted` is the result from extract.js. Returns "text" for prose,
 * "visual" for anything whose meaning is in its layout, and "unreadable"
 * when neither path can carry it.
 */
export function classify(name, extracted) {
  if (isImage(name)) return "visual";
  const ext = path.extname(String(name || "")).toLowerCase();
  if (ext !== ".pdf") return extracted?.text ? "text" : "unreadable";

  const pages = extracted?.pages || 1;
  const text = extracted?.text || "";
  const chars = text.length;

  // A scan yields nothing and a drawing yields labels; both are looked at.
  if (chars / pages < TEXT_PER_PAGE) return "visual";

  const letters = (text.match(/[A-Za-z]/g) || []).length;
  const caps = (text.match(/[A-Z]/g) || []).length;
  if (letters > 200 && caps / letters > DRAWING_CAPS_RATIO) return "visual";

  return "text";
}

/**
 * Turn the uploads into content blocks the model can see, alongside the
 * per-file record of what happened to each one.
 *
 * Nothing is silently dropped: a file too large to send, or in a format
 * nothing can open, comes back with the reason, so the basis of
 * preparation can say what was received and what was actually read.
 */
export async function visualBlocks(files = [], classifications = new Map(), pageCounts = new Map()) {
  const blocks = [];
  const seen = [];
  let budget = MAX_VISUAL_BYTES;

  for (const file of files) {
    const name = file.originalname || file.filename;
    if (classifications.get(name) !== "visual") continue;

    const planning = planningFormatNote(name);
    if (planning) {
      seen.push({ name, sent: false, reason: planning });
      continue;
    }

    try {
      const buffer = await fs.readFile(file.path);
      if (buffer.length > budget) {
        seen.push({
          name,
          sent: false,
          reason: `too large to send with the rest of this run (${Math.round(buffer.length / 1e6)} MB). Send it on its own, or supply a reduced-size PDF.`,
        });
        continue;
      }
      const pages = pageCounts.get(name) || 0;
      if (pages > MAX_VISUAL_PAGES) {
        seen.push({
          name,
          sent: false,
          reason: `${pages} pages is too many to look at in one run (limit ${MAX_VISUAL_PAGES}). Send the sheets that matter — a drawing set rather than the whole scanned pack.`,
        });
        continue;
      }
      budget -= buffer.length;
      const ext = path.extname(name).toLowerCase();
      const data = buffer.toString("base64");
      blocks.push(
        ext === ".pdf"
          ? { type: "document", source: { type: "base64", media_type: "application/pdf", data }, title: name }
          : { type: "image", source: { type: "base64", media_type: IMAGE_TYPES[ext], data } }
      );
      seen.push({ name, sent: true, bytes: buffer.length, kind: ext === ".pdf" ? "drawing or plan (PDF)" : "image" });
    } catch (err) {
      seen.push({ name, sent: false, reason: err.message });
    }
  }

  return { blocks, seen };
}

/**
 * The sentence that tells the model what it is looking at.
 *
 * Without it, drawings arrive as unexplained pages. With it, the model
 * knows these are the client's own documents, that their content is the
 * layout rather than the words, and that a thing it cannot make out is
 * to be reported rather than guessed.
 */
export function visualPreamble(seen) {
  const sent = seen.filter((s) => s.sent);
  if (!sent.length) return "";
  return [
    `ATTACHED DOCUMENTS YOU CAN SEE — ${sent.length} item${sent.length === 1 ? "" : "s"}: ${sent.map((s) => s.name).join(", ")}.`,
    "",
    "These are the client's own drawings and plans. Their content is the",
    "layout, not the labels: what adjoins what, what shares an access, what",
    "is inside which boundary, how far one thing is from another, what the",
    "hatching and line types mean, and what the title block says about",
    "revision, scale and date. Read them as a person would.",
    "",
    "Two rules for them. Cite a drawing by its number and revision when you",
    "rely on it, exactly as any other source. And where something is",
    "illegible, ambiguous, unscaled or simply not shown, say so and say what",
    "it prevents — never infer a dimension from a drawing you cannot scale,",
    "and never treat a drawing's silence as a decision.",
  ].join("\n");
}
