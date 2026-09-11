/**
 * Binding the real adapters to their ports, once, at startup.
 *
 * A port with nothing bound to it is a diagram. This is the file that makes
 * the six of them real, and it is deliberately the ONLY place in the system
 * that names an adapter: everything else asks for a port and gets whatever
 * was bound here.
 *
 * WHY use() THROWS RATHER THAN FALLING BACK. A core that quietly substitutes
 * a default when a port is unbound has a hidden dependency and will keep
 * working right up until the moment the default is wrong. Failing at startup
 * is the cheapest possible place to find that out.
 */

import path from "node:path";
import { register } from "./ports.js";
import { systemClock } from "./adapters/clock.js";
import { sqliteStore } from "./adapters/store.js";
import { diskFiles } from "./adapters/files.js";
import { memoryMail, transportMail } from "./adapters/mail.js";
import { localBilling } from "./adapters/billing.js";
import { scriptedLlm, providerLlm } from "./adapters/llm.js";
import { dataDir } from "../store.js";

let done = false;

/** Bind everything. Idempotent, so a second import is harmless. */
export function bindPorts({ mailSend = null, mailVerify = null, llmClient = null } = {}) {
  if (done) return { ok: true, already: true, faults: [] };
  const faults = [];
  const bind = (port, adapter, name) => {
    const r = register(port, adapter, { name });
    if (!r.ok) faults.push(...r.faults);
  };

  bind("clock", systemClock, "system");
  bind("store", sqliteStore, "sqlite");
  bind("files", diskFiles(path.join(dataDir(), "port-files")), "disk");
  bind("billing", localBilling(), "local");

  // Mail and the model are bound to the real thing when the application has
  // one and to an honest stand-in when it does not — a stand-in that refuses
  // the same inputs, so a development environment behaves like production
  // rather than appearing to succeed at everything.
  bind("mail", mailSend ? transportMail(mailSend, mailVerify) : memoryMail(), mailSend ? "transport" : "memory");
  bind("llm", llmClient ? providerLlm(llmClient) : scriptedLlm({}), llmClient ? "anthropic" : "scripted");

  done = faults.length === 0;
  return { ok: faults.length === 0, already: false, faults };
}
