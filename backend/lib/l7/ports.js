/**
 * Ports and adapters — and the one test that makes the phrase mean something.
 *
 * "Platform-agnostic core" is the easiest of the seven properties to claim
 * and the easiest to fake. Any codebase can be described as having a clean
 * core; the description costs nothing and nothing checks it. So the question
 * this module has to answer is not "are there ports?" but:
 *
 *     IF THE ADAPTER WERE SWAPPED, WOULD THE CORE NOTICE?
 *
 * That is answerable. Every port below has a real adapter and a second,
 * completely different one, and the conformance suite runs the SAME sequence
 * of operations against both and asserts the observable behaviour is
 * identical. A port whose two adapters disagree is not a port, it is an
 * interface with a preferred implementation — and the disagreement is a
 * finding rather than a matter of opinion.
 *
 * THE SECOND TEST IS THE STRICTER ONE.
 *
 *     No business logic in an adapter.
 *
 * That is what actually rots. The first version of a mail adapter sends an
 * email. The fourth decides which template to use, then whether a notice is
 * overdue, and one day the answer to a contractual question lives inside the
 * thing that talks to an SMTP server. `noBusinessLogic()` reads every adapter
 * and fails if it imports a domain module — the clause graph, the gates, the
 * compliance matrix, the estimator. A rule nothing enforces is a rule that
 * has already been broken somewhere nobody has looked.
 *
 * WHAT THIS DOES NOT CLAIM.
 *
 * Six boundaries have ports. The common data environment, BIM, scheduling,
 * the ERP and field applications do not, because there is nothing behind them
 * to adapt — and declaring a port with no adapter would be exactly the inert
 * list this whole exercise exists to remove. They are named in `UNPORTED`
 * as boundaries that are still called directly or not at all, which is a
 * statement of where the work is rather than a claim to have done it.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");

/**
 * The port contracts. Each names the methods an adapter must provide and what
 * each returns, in enough detail that two adapters can be compared.
 */
export const PORTS = {
  clock: {
    id: "clock",
    name: "Clock",
    why: "Time is an external dependency. A core that calls Date.now() directly cannot be tested against a deadline, and every date rule in this system turns on one.",
    methods: {
      now: { args: [], returns: "number", say: "epoch milliseconds" },
      today: { args: [], returns: "string", say: "an ISO day" },
    },
  },
  llm: {
    id: "llm",
    name: "Language model",
    why: "The model provider changes, and a run has to be reproducible against the one that was used.",
    methods: {
      complete: { args: ["request"], returns: "object", say: "{ text, model, usage }" },
      // NOT `name`. The registry labels every adapter with a `name` property,
      // and a port method of the same name would be shadowed by it — the
      // adapter would conform on paper and the call would fail at runtime.
      provider: { args: [], returns: "string", say: "the provider's identifier" },
    },
  },
  store: {
    id: "store",
    name: "Record store",
    why: "Moving off the embedded database must be a hosting decision, not a correctness one.",
    methods: {
      read: { args: ["collection"], returns: "array" },
      write: { args: ["collection", "record"], returns: "object" },
      patch: { args: ["collection", "id", "fields"], returns: "object" },
      drop: { args: ["collection", "id"], returns: "boolean" },
    },
  },
  mail: {
    id: "mail",
    name: "Outbound mail",
    why: "Nothing in the core should know whether a message left by SMTP, an API or a queue.",
    methods: {
      send: { args: ["message"], returns: "object", say: "{ ok, id }" },
      verify: { args: [], returns: "object", say: "{ ok, reason }" },
    },
  },
  files: {
    id: "files",
    name: "File storage",
    why: "Local disk today, object storage the day there is more than one process.",
    methods: {
      put: { args: ["key", "bytes"], returns: "object" },
      get: { args: ["key"], returns: "buffer|null" },
      has: { args: ["key"], returns: "boolean" },
      remove: { args: ["key"], returns: "boolean" },
      list: { args: ["prefix"], returns: "array" },
    },
  },
  billing: {
    id: "billing",
    name: "Spend and balance",
    why: "The ACU meter records what was spent; where a prepaid balance lives is somebody else's problem.",
    methods: {
      balance: { args: [], returns: "object", say: "{ acu, uncapped }" },
      charge: { args: ["amount", "detail"], returns: "object" },
    },
  },
};

/**
 * Boundaries with no port, named rather than quietly omitted. Each of these
 * is either called directly or does not exist, and saying which is the useful
 * half of a statement about a platform-agnostic core.
 */
export const UNPORTED = [
  { id: "cde", name: "Common data environment", state: "absent", say: "Nothing connects to one. A port with no adapter would be a claim rather than a capability." },
  { id: "bim", name: "BIM and model data", state: "absent", say: "Nothing reads a model." },
  { id: "scheduling", name: "Scheduling tool", state: "absent", say: "Programmes arrive as documents and are read as text." },
  { id: "erp", name: "ERP and accounting", state: "absent", say: "No connection exists; money lives in this system's own ledger." },
  { id: "field", name: "Field applications and sensors", state: "absent", say: "Nothing on site reports into this." },
  { id: "documents", name: "Document rendering", state: "direct", say: "Rendered in-process. One implementation, called directly, and honestly a port here would be ceremony." },
];

const registry = new Map();

/** Register an adapter against a port, refusing one that does not fit it. */
export function register(portId, adapter, { name = null } = {}) {
  const port = PORTS[String(portId)];
  if (!port) return { ok: false, faults: [`"${portId}" is not a port`] };
  const check = conforms(portId, adapter);
  if (!check.ok) return { ok: false, faults: check.faults };
  registry.set(port.id, { adapter, name: name || adapter.name || "unnamed" });
  return { ok: true, faults: [], port: port.id, name: name || adapter.name || "unnamed" };
}

/** The adapter currently bound to a port. */
export function use(portId) {
  const bound = registry.get(String(portId));
  if (!bound) throw new Error(`No adapter is registered for the ${portId} port. A core that falls back to a default when a port is unbound is a core with a hidden dependency.`);
  return bound.adapter;
}

/** What is bound to what, for the internal page. */
export function bound() {
  return Object.keys(PORTS).map((id) => ({
    port: id,
    name: PORTS[id].name,
    adapter: registry.has(id) ? registry.get(id).name : null,
    bound: registry.has(id),
  }));
}

/** Does this object satisfy the port's contract? Shape only, not behaviour. */
export function conforms(portId, adapter) {
  const port = PORTS[String(portId)];
  if (!port) return { ok: false, faults: [`"${portId}" is not a port`] };
  const faults = [];
  if (!adapter || typeof adapter !== "object") return { ok: false, faults: ["the adapter is not an object"] };
  for (const [method, spec] of Object.entries(port.methods)) {
    if (typeof adapter[method] !== "function") { faults.push(`${port.id}: no ${method}()`); continue; }
    if (adapter[method].length < spec.args.length) {
      faults.push(`${port.id}.${method}() takes ${adapter[method].length} argument(s), the contract says ${spec.args.length}`);
    }
  }
  return { ok: faults.length === 0, faults };
}

/**
 * Run the same operations against two adapters and compare what they do.
 *
 * SHAPE CONFORMANCE IS NOT ENOUGH. Two objects can both have put(), get() and
 * has() and disagree about whether get() on a missing key returns null or
 * throws — and the core built on the first breaks on the second. That
 * difference is invisible to an interface check and obvious to this one.
 */
export async function compare(portId, a, b) {
  const port = PORTS[String(portId)];
  if (!port) return { ok: false, faults: [`"${portId}" is not a port`] };
  const script = SCRIPTS[port.id];
  if (!script) return { ok: false, faults: [`no conformance script for the ${port.id} port — an unexercised port is an untested one`] };

  const ra = await runScript(script, a);
  const rb = await runScript(script, b);
  const faults = [];
  for (let i = 0; i < Math.max(ra.length, rb.length); i += 1) {
    const x = ra[i], y = rb[i];
    if (!x || !y) { faults.push(`step ${i + 1}: one adapter produced no result`); continue; }
    if (x.step !== y.step) { faults.push(`step ${i + 1}: the adapters ran different steps`); continue; }
    if (JSON.stringify(x.value) !== JSON.stringify(y.value)) {
      faults.push(`${x.step}: ${JSON.stringify(x.value)} against ${JSON.stringify(y.value)}`);
    }
  }
  return {
    ok: faults.length === 0,
    port: port.id,
    steps: ra.length,
    faults,
    say: faults.length === 0
      ? `${ra.length} operation(s) behaved identically through both adapters, so the core could not tell them apart.`
      : `${faults.length} behavioural difference(s) — these adapters are not interchangeable and the core WOULD notice.`,
  };
}

/**
 * The same comparison, synchronously, for ports whose scripts do not await.
 *
 * THIS EXISTS BECAUSE OF A REAL BUG. The probe layer is synchronous and it
 * called the async compare(), so every step came back as a pending Promise,
 * `r.ok` was undefined, and the property reported itself as partial while the
 * adapters were in fact interchangeable. A silent false negative is better
 * than a silent false positive and it is still wrong.
 *
 * It REFUSES rather than quietly awaiting: a script that returns a promise
 * here throws, so a port whose script becomes asynchronous later cannot pass
 * this by accident.
 */
export function compareSync(portId, a, b) {
  const port = PORTS[String(portId)];
  if (!port) return { ok: false, faults: [`"${portId}" is not a port`] };
  const script = SCRIPTS[port.id];
  if (!script) return { ok: false, faults: [`no conformance script for the ${port.id} port`] };

  const run = (adapter) => script.map(([step, fn]) => {
    try {
      const value = fn(adapter);
      if (value && typeof value.then === "function") {
        throw new Error(`the "${step}" step is asynchronous; use compare() for this port`);
      }
      return { step, value };
    } catch (err) {
      return { step, value: { threw: String(err.message).slice(0, 60) } };
    }
  });

  const ra = run(a), rb = run(b);
  const faults = [];
  for (let i = 0; i < Math.max(ra.length, rb.length); i += 1) {
    const x = ra[i], y = rb[i];
    if (!x || !y) { faults.push(`step ${i + 1}: one adapter produced no result`); continue; }
    if (JSON.stringify(x.value) !== JSON.stringify(y.value)) {
      faults.push(`${x.step}: ${JSON.stringify(x.value)} against ${JSON.stringify(y.value)}`);
    }
  }
  return {
    ok: faults.length === 0,
    port: port.id,
    steps: ra.length,
    faults,
    say: faults.length === 0
      ? `${ra.length} operation(s) behaved identically through both adapters, so the core could not tell them apart.`
      : `${faults.length} behavioural difference(s) — these adapters are not interchangeable and the core WOULD notice.`,
  };
}

async function runScript(script, adapter) {
  const out = [];
  for (const [step, fn] of script) {
    try {
      const value = await fn(adapter);
      out.push({ step, value });
    } catch (err) {
      // A throw is a behaviour too, and two adapters must agree on it.
      out.push({ step, value: { threw: String(err.message).slice(0, 60) } });
    }
  }
  return out;
}

/**
 * The conformance scripts. Each exercises the port's contract INCLUDING its
 * edge cases, because the edges are where two adapters diverge.
 */
export const SCRIPTS = {
  clock: [
    ["now is a number", (a) => typeof a.now() === "number"],
    ["now is finite", (a) => Number.isFinite(a.now())],
    ["today is an ISO day", (a) => /^\d{4}-\d{2}-\d{2}$/.test(a.today())],
    ["now does not go backwards", (a) => { const x = a.now(); return a.now() >= x; }],
  ],
  store: [
    ["an empty collection reads as an empty array", (a) => JSON.stringify(a.read("conformance")) === "[]"],
    ["write returns the record with an id", (a) => { const r = a.write("conformance", { v: 1 }); return typeof r.id === "string" && r.id.length > 0; }],
    ["the record reads back", (a) => a.read("conformance").length === 1],
    ["patch changes a field", (a) => { const r = a.read("conformance")[0]; return a.patch("conformance", r.id, { v: 2 }).v === 2; }],
    ["patch on a missing id returns null", (a) => a.patch("conformance", "nope", { v: 3 })],
    ["drop removes it", (a) => { const r = a.read("conformance")[0]; return a.drop("conformance", r.id); }],
    ["drop on a missing id is false", (a) => a.drop("conformance", "nope")],
    ["the collection is empty again", (a) => a.read("conformance").length === 0],
  ],
  files: [
    ["a missing key is absent", (a) => a.has("conf/a.txt") === false],
    ["get on a missing key is null", (a) => a.get("conf/a.txt") === null],
    ["put then has", (a) => { a.put("conf/a.txt", Buffer.from("hello")); return a.has("conf/a.txt"); }],
    ["get returns what was put", (a) => a.get("conf/a.txt").toString() === "hello"],
    ["list finds it by prefix", (a) => a.list("conf/").includes("conf/a.txt")],
    ["put overwrites", (a) => { a.put("conf/a.txt", Buffer.from("again")); return a.get("conf/a.txt").toString() === "again"; }],
    ["remove returns true", (a) => a.remove("conf/a.txt")],
    ["remove on a missing key is false", (a) => a.remove("conf/a.txt")],
    ["and it is gone", (a) => a.has("conf/a.txt") === false],
  ],
  mail: [
    ["verify returns a verdict", async (a) => typeof (await a.verify()).ok === "boolean"],
    ["a message with no recipient is refused", async (a) => (await a.send({ subject: "x", text: "y" })).ok === false],
    ["a message with no subject is refused", async (a) => (await a.send({ to: "a@b.c", text: "y" })).ok === false],
    ["a complete message is accepted or refused with a reason", async (a) => {
      const r = await a.send({ to: "a@b.c", subject: "s", text: "t" });
      return typeof r.ok === "boolean" && (r.ok ? typeof r.id === "string" : typeof r.reason === "string");
    }],
  ],
  billing: [
    ["balance has an acu figure or says it is uncapped", async (a) => { const b = await a.balance(); return typeof b.uncapped === "boolean"; }],
    ["a negative charge is refused", async (a) => (await a.charge(-1, "x")).ok === false],
    ["a charge with no detail is refused", async (a) => (await a.charge(1, "")).ok === false],
    ["a valid charge is recorded", async (a) => (await a.charge(1, "conformance")).ok === true],
  ],
  llm: [
    ["provider is a string", (a) => typeof a.provider() === "string" && a.provider().length > 0],
    ["a request with no prompt is refused", async (a) => {
      const r = await a.complete({}).catch((e) => ({ error: String(e.message).slice(0, 40) }));
      return Boolean(r.error) || r.text === undefined || r.text === "";
    }],
  ],
};

/** Domain modules an adapter must never reach for. */
const DOMAIN = [
  "clauses.js", "compliance.js", "bidscore.js", "estimating.js", "assurance.js",
  "manifest.js", "gates.js", "policy.js", "evidence.js", "lineage.js", "agentrun.js",
  "memory.js", "bitemporal.js", "challengecheck.js", "bidcheck.js", "controlcheck.js",
  "interfacecheck.js", "tenderpack.js", "paymentdates.js", "organisation.js",
];

/**
 * No business logic in an adapter, checked rather than asked for.
 *
 * An adapter that imports the clause graph has stopped being a way of talking
 * to something and started being part of the answer. That is the rot this
 * property is about, and it happens one helpful import at a time.
 */
export function noBusinessLogic(dir = path.join(ROOT, "backend", "lib", "l7", "adapters")) {
  if (!fs.existsSync(dir)) return { ok: false, faults: [`no adapter directory at ${dir}`], adapters: 0 };
  const faults = [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".js"));
  for (const f of files) {
    const src = fs.readFileSync(path.join(dir, f), "utf8");
    for (const d of DOMAIN) {
      if (new RegExp(`from\\s+["'][^"']*${d.replace(".", "\\.")}["']`).test(src)) {
        faults.push(`${f} imports ${d} — an adapter that reaches into the domain has stopped being a way of talking to something and started being part of the answer`);
      }
    }
    // A second smell: an adapter making a decision about the domain.
    for (const word of ["timeBar", "compensationEvent", "payLess", "complianceMatrix", "markup"]) {
      if (new RegExp(`\\b${word}\\b`).test(src)) faults.push(`${f} mentions "${word}", which is a domain concept an adapter has no business holding`);
    }
  }
  return { ok: faults.length === 0, faults, adapters: files.length, files };
}

/** The whole picture, for the probe and the internal page. */
export function state() {
  const b = bound();
  const logic = noBusinessLogic();
  return {
    ports: Object.values(PORTS).map((p) => ({ id: p.id, name: p.name, why: p.why, methods: Object.keys(p.methods) })),
    bound: b,
    allBound: b.every((x) => x.bound),
    unported: UNPORTED,
    noBusinessLogic: logic,
    scripts: Object.keys(SCRIPTS).length,
    say: b.every((x) => x.bound)
      ? `${b.length} port(s), every one bound, and ${logic.adapters} adapter(s) carrying no domain logic.`
      : `${b.filter((x) => !x.bound).length} port(s) have no adapter bound.`,
  };
}
