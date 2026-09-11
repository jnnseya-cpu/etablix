/**
 * File-storage adapters.
 *
 * Local disk today; object storage the day there is more than one process.
 * The port exists so that day is a configuration change, and the two adapters
 * below prove the core cannot tell which it is talking to.
 *
 * A key is a path-like string and it is deliberately NOT a path: the disk
 * adapter refuses anything that would climb out of its own directory, which
 * is a storage concern rather than a domain one and belongs exactly here.
 */

import fs from "node:fs";
import path from "node:path";

/** Files under one directory, with no way out of it. */
export function diskFiles(root) {
  const base = path.resolve(root);
  fs.mkdirSync(base, { recursive: true });
  const resolve = (key) => {
    const p = path.resolve(base, String(key));
    // A key that escapes the base is refused. Not a domain rule: a storage
    // adapter that can be talked into writing anywhere is a storage adapter
    // with a hole in it.
    if (p !== base && !p.startsWith(base + path.sep)) return null;
    return p;
  };
  return {
    name: "disk",
    put(key, bytes) {
      const p = resolve(key);
      if (!p) return { ok: false, reason: "the key escapes the storage root" };
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, bytes);
      return { ok: true, key: String(key), bytes: Buffer.byteLength(bytes) };
    },
    get(key) {
      const p = resolve(key);
      if (!p || !fs.existsSync(p) || !fs.statSync(p).isFile()) return null;
      return fs.readFileSync(p);
    },
    has(key) {
      const p = resolve(key);
      return Boolean(p) && fs.existsSync(p) && fs.statSync(p).isFile();
    },
    remove(key) {
      const p = resolve(key);
      if (!p || !fs.existsSync(p)) return false;
      fs.rmSync(p);
      return true;
    },
    list(prefix) {
      const out = [];
      const walk = (dir, rel) => {
        if (!fs.existsSync(dir)) return;
        for (const f of fs.readdirSync(dir)) {
          const abs = path.join(dir, f);
          const key = rel ? `${rel}/${f}` : f;
          if (fs.statSync(abs).isDirectory()) walk(abs, key);
          else if (!prefix || key.startsWith(String(prefix))) out.push(key);
        }
      };
      walk(base, "");
      return out.sort();
    },
  };
}

/** The same contract over a Map, so the comparison is real. */
export function memoryFiles() {
  const data = new Map();
  return {
    name: "memory",
    put(key, bytes) {
      const k = String(key);
      if (k.includes("..")) return { ok: false, reason: "the key escapes the storage root" };
      const buf = Buffer.from(bytes);
      data.set(k, buf);
      return { ok: true, key: k, bytes: buf.length };
    },
    get(key) { return data.has(String(key)) ? Buffer.from(data.get(String(key))) : null; },
    has(key) { return data.has(String(key)); },
    remove(key) { return data.delete(String(key)); },
    list(prefix) { return [...data.keys()].filter((k) => !prefix || k.startsWith(String(prefix))).sort(); },
  };
}
