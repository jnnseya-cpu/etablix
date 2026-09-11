/**
 * Record-store adapters.
 *
 * Two implementations that could not be more different underneath: one is
 * SQLite on disk through this application's own store, the other is a Map in
 * memory. If the conformance script cannot tell them apart, then moving off
 * the embedded database really is a hosting decision.
 *
 * The edges are where adapters diverge, so both are explicit about them:
 * patching a missing id returns null, dropping a missing id returns false,
 * and an unknown collection reads as an empty array rather than throwing.
 */

import { collection, insert, update, remove, id as newId } from "../../store.js";

/** The real one, through the application's own store. */
export const sqliteStore = {
  name: "sqlite",
  read(name) { return collection(String(name)).map((r) => ({ ...r })); },
  write(name, record) { return { ...insert(String(name), { id: newId(), ...record }) }; },
  patch(name, rowId, fields) {
    const found = collection(String(name)).find((r) => r.id === String(rowId));
    if (!found) return null;
    const r = update(String(name), String(rowId), fields);
    return r ? { ...r } : null;
  },
  drop(name, rowId) {
    const found = collection(String(name)).find((r) => r.id === String(rowId));
    if (!found) return false;
    remove(String(name), String(rowId), { by: "ports", why: "adapter drop" });
    return true;
  },
};

/** A store that is a Map, so the comparison is between two real things. */
export function memoryStore() {
  const data = new Map();
  let n = 0;
  const rows = (name) => {
    if (!data.has(name)) data.set(name, []);
    return data.get(name);
  };
  return {
    name: "memory",
    read(name) { return rows(String(name)).map((r) => ({ ...r })); },
    write(name, record) {
      const r = { id: `mem-${++n}`, ...record };
      rows(String(name)).push(r);
      return { ...r };
    },
    patch(name, rowId, fields) {
      const list = rows(String(name));
      const i = list.findIndex((r) => r.id === String(rowId));
      if (i === -1) return null;
      list[i] = { ...list[i], ...fields };
      return { ...list[i] };
    },
    drop(name, rowId) {
      const list = rows(String(name));
      const i = list.findIndex((r) => r.id === String(rowId));
      if (i === -1) return false;
      list.splice(i, 1);
      return true;
    },
  };
}
