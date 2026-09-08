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
export const uploadDocuments = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024, files: 20 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (ALLOWED.has(file.mimetype) || ALLOWED_EXT.has(ext)) return cb(null, true);
    cb(new Error(
      `“${file.originalname}” is not a type we can read. Send PDF, Word, Excel, CSV, text or an image. ` +
      "A drawing exported to PDF at scale, and a programme as a PDF print plus a CSV task list."
    ));
  },
}).array("documents", 20);

/** Wrap the multer middleware so upload errors return clean JSON. */
export function acceptDocuments(req, res, next) {
  uploadDocuments(req, res, (err) => {
    if (err) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "Each supporting document must be 10 MB or smaller."
          : err.message || "Upload failed.";
      return res.status(400).json({ error: message });
    }
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
