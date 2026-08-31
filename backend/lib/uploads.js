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
export const UPLOAD_DIR = path.join(__dirname, "..", "data", "uploads");
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
]);

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    cb(null, `${crypto.randomBytes(12).toString("hex")}${ext}`);
  },
});

export const uploadDocuments = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) return cb(null, true);
    cb(new Error("Only PDF, Word, Excel or image files are accepted."));
  },
}).array("documents", 5);

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
