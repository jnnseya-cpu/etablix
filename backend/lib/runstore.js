/**
 * The big per-run payloads, kept OUT of the database file.
 *
 * db.json is rewritten in full on every change — every checklist answer,
 * every lead, every notification. That is fine for rows measuring
 * hundreds of bytes and ruinous for rows measuring megabytes, and an
 * agent run is the second kind: the client's whole document set as text
 * (up to 180,000 characters) and then six completed passes of reasoning
 * on top of it. Three hundred of those in the run log is a database that
 * has to be serialised, written and fsynced from scratch every time
 * anybody touches anything.
 *
 * So the run row keeps what it is: who ran it, when, which documents,
 * which passes finished, and the finished report. The bulk — the
 * document text and the text of each pass — lives in one file per run,
 * beside the database and inside the same backup, and is read only by
 * the pipeline that needs it.
 *
 * Every write is atomic (temp file, fsync, rename), because a pack that
 * is half-written when the container dies is worse than one that is
 * missing: a resumed run would build on half a pass.
 */

import fs from "node:fs";
import path from "node:path";
import { dataDir } from "./store.js";

const dir = () => path.join(dataDir(), "runs");
const file = (runId) => path.join(dir(), `${String(runId).replace(/[^a-zA-Z0-9_-]/g, "")}.json`);

/** Everything held for one run, or an empty pack if there is none. */
export function readPack(runId) {
  try {
    return JSON.parse(fs.readFileSync(file(runId), "utf8"));
  } catch {
    return { documents: [], passes: {} };
  }
}

/** Merge a patch into the pack and write it atomically. */
export function savePack(runId, patch) {
  const next = { ...readPack(runId), ...patch };
  fs.mkdirSync(dir(), { recursive: true });
  const tmp = file(runId) + ".tmp";
  const fd = fs.openSync(tmp, "w");
  try {
    fs.writeFileSync(fd, JSON.stringify(next));
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, file(runId));
  return next;
}

/** Record one completed pass without rewriting the documents. */
export function savePass(runId, key, text) {
  const pack = readPack(runId);
  return savePack(runId, { passes: { ...(pack.passes || {}), [key]: text } });
}

export function deletePack(runId) {
  try { fs.unlinkSync(file(runId)); } catch {}
}

/**
 * Delete packs whose run is gone.
 *
 * The run log is capped, so rows fall off the end; without this their
 * packs would stay on the disk for ever. Called at boot and whenever the
 * log is trimmed.
 */
export function sweepPacks(validIds) {
  const keep = new Set([...validIds].map(String));
  let removed = 0;
  try {
    for (const name of fs.readdirSync(dir())) {
      if (!name.endsWith(".json")) continue;
      if (keep.has(name.slice(0, -5))) continue;
      try { fs.unlinkSync(path.join(dir(), name)); removed += 1; } catch {}
    }
  } catch {}
  return removed;
}

/** Total bytes held in packs — reported by /api/health. */
export function packBytes() {
  let bytes = 0;
  try {
    for (const name of fs.readdirSync(dir())) {
      try { bytes += fs.statSync(path.join(dir(), name)).size; } catch {}
    }
  } catch {}
  return bytes;
}
