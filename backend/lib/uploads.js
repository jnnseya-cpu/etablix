/**
 * Supporting-document uploads for the public enquiry and supplier
 * registration forms. Files land in backend/data/uploads (gitignored);
 * downloads are authenticated (see routes/files.js).
 */

import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = process.env.ETABLIX_DATA_DIR
  ? path.join(path.resolve(process.env.ETABLIX_DATA_DIR), "uploads")
  : path.join(__dirname, "..", "data", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
  // Plain-text sources for AI agent runs (pasted specs, exported notes).
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
]);

/**
 * Extensions we can actually read. The MIME type a browser reports is not
 * reliable: a .md or a .csv frequently arrives as application/octet-stream,
 * and rejecting it on that basis rejects a file we can read perfectly well
 * and that the file input invited the user to choose.
 *
 * The extension is also what extract.js dispatches on, so filtering by the
 * same thing keeps the gate and the reader in agreement.
 */
const ALLOWED_EXT = new Set([
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".xlsm",
  ".jpg", ".jpeg", ".png", ".webp",
  ".txt", ".md", ".csv", ".json",
]);

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    cb(null, `${crypto.randomBytes(12).toString("hex")}${ext}`);
  },
});

// A diagnostic pack is a dozen documents plus a drawing set, and an A1
// PDF is not a small file. Five at 10 MB was sized for a tender pack.
/** Named once, because the limit and the message that quotes it must agree. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_FILES = 20;

export const uploadDocuments = multer({
  storage,
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (ALLOWED.has(file.mimetype) || ALLOWED_EXT.has(ext)) return cb(null, true);
    cb(new Error(
      `“${file.originalname}” is not a type we can read. Send PDF, Word, Excel, CSV, text or an image. ` +
      "A drawing exported to PDF at scale, and a programme as a PDF print plus a CSV task list."
    ));
  },
}).array("documents", MAX_FILES);

/**
 * Delete what was uploaded for a request that then failed.
 *
 * multer writes every file to disk before any handler runs, so a
 * rejected request — wrong stage, unknown checklist item, closed
 * engagement, a bad token — left its files behind for ever. Nothing ever
 * referred to them and nothing ever removed them, so the disk filled at
 * the speed somebody chose to fill it. A response of 400 or worse now
 * takes its uploads with it.
 */
function discardOnFailure(req, res) {
  res.on("finish", () => {
    if (res.statusCode < 400) return;
    for (const f of req.files || []) {
      if (f?.path) fs.unlink(f.path, () => {});
    }
  });
}

/** Wrap the multer middleware so upload errors return clean JSON. */
export function acceptDocuments(req, res, next) {
  uploadDocuments(req, res, (err) => {
    if (err) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          // The number in this sentence has to be the number in `limits`
          // above. It said 10 MB while the limit was 25, so somebody with a
          // 14 MB drawing was told to shrink a file that would have been
          // accepted, and somebody with a 30 MB one was told a figure that
          // would still have been refused.
          ? `Each supporting document must be ${Math.round(MAX_FILE_BYTES / (1024 * 1024))} MB or smaller.`
          : err.message || "Upload failed.";
      for (const f of req.files || []) if (f?.path) fs.unlink(f.path, () => {});
      return res.status(400).json({ error: message });
    }
    discardOnFailure(req, res);
    next();
  });
}

/** Metadata to persist alongside a lead/application. */
export function describeFiles(files = []) {
  return files.map((f) => ({
    stored: f.filename,
    name: f.originalname,
    size: f.size,
    type: f.mimetype,
  }));
}
