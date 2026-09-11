/**
 * Connections to the real Groupe Nseya product platforms:
 *
 *   VERYX    — Platform API (veryxjnn.com):  vx_ key via Bearer / X-API-Key,
 *              contract: /ping /projects /tasks /risks /agents /usage.
 *   CONSTRUX — construxvg.com: bearer-token API, self-documented by
 *              GET /v1/routes ("the API is the product").
 *
 * Credentials are entered by an administrator in the Control Desk and
 * stored server-side only (db settings) — they are never sent to the
 * browser unmasked. Every outbound call is timeboxed so a slow platform
 * can never hang the Control Desk; callers fall back to workspace data.
 */

import { getSettings, saveSettings } from "./store.js";

export const PLATFORMS = {
  veryx: { label: "VERYX", defaultBaseUrl: "https://www.veryxjnn.com/api/public/v1", pingPath: "/ping" },
  construx: { label: "CONSTRUX", defaultBaseUrl: "https://construxvg.com/api", pingPath: "/v1/routes" },
};

const key = (name) => `integration_${name}`;

export function getIntegration(name) {
  const stored = getSettings()[key(name)] || {};
  return {
    baseUrl: stored.baseUrl || PLATFORMS[name].defaultBaseUrl,
    apiKey: stored.apiKey || "",
    lastTest: stored.lastTest || null,
  };
}

export function setIntegration(name, { baseUrl, apiKey }) {
  const current = getSettings()[key(name)] || {};
  saveSettings({
    [key(name)]: {
      ...current,
      baseUrl: String(baseUrl || "").trim().replace(/\/+$/, "") || PLATFORMS[name].defaultBaseUrl,
      // Empty string keeps the existing key so admins can edit the URL alone.
      ...(apiKey ? { apiKey: String(apiKey).trim() } : {}),
      lastTest: null,
    },
  });
  return getIntegration(name);
}

export function recordTest(name, result) {
  const current = getSettings()[key(name)] || {};
  saveSettings({ [key(name)]: { ...current, lastTest: { ...result, at: Date.now() } } });
}

export function isConnected(name) {
  const i = getIntegration(name);
  return Boolean(i.apiKey && i.lastTest?.ok);
}

/** Masked view, safe to send to the browser. */
export function publicIntegration(name) {
  const i = getIntegration(name);
  return {
    platform: name,
    label: PLATFORMS[name].label,
    baseUrl: i.baseUrl,
    keyPreview: i.apiKey ? `${i.apiKey.slice(0, 6)}…${i.apiKey.slice(-4)}` : null,
    connected: isConnected(name),
    lastTest: i.lastTest,
  };
}

/** Timeboxed authenticated request against a platform. */
export async function platformFetch(name, path, { timeoutMs = 6000, method = "GET", body } = {}) {
  const { baseUrl, apiKey } = getIntegration(name);
  if (!apiKey) throw new Error(`${PLATFORMS[name].label} is not connected — add an API key first.`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(baseUrl + path, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-API-Key": apiKey,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = payload.error?.message || payload.detail || payload.title || `HTTP ${res.status}`;
      throw new Error(`${PLATFORMS[name].label} responded: ${detail}`);
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

/** Live connection test; records and returns the outcome. */
export async function testIntegration(name) {
  try {
    const body = await platformFetch(name, PLATFORMS[name].pingPath);
    const summary =
      name === "construx"
        ? `Reachable — self-documented API${Array.isArray(body.routes) ? ` (${body.routes.length} routes)` : body.count ? ` (${body.count} routes)` : ""}.`
        : `Reachable — ${body.status || "pong"}${body.workspace ? ` · workspace: ${body.workspace}` : ""}.`;
    const result = { ok: true, summary };
    recordTest(name, result);
    return result;
  } catch (err) {
    const result = { ok: false, summary: err.message };
    recordTest(name, result);
    return result;
  }
}

/* -------------------------------------------------- route discovery */
//
// CONSTRUX documents itself at GET /v1/routes ("the API is the product"), so
// a path does not have to be guessed. That matters here: a guessed endpoint
// that 404s is indistinguishable, from the caller's side, from a platform
// that is down — both fall back to workspace data, and the note blames the
// wrong thing. Asking the platform what it serves means a fallback can say
// "no such route" when that is the truth and "unreachable" when that is.
//
// Cached for five minutes: the route list changes when the platform deploys,
// not between two reads of the same page.

const routeCache = new Map();

/** Test seam: forget what the platform said it served. */
export function clearRouteCache() {
  routeCache.clear();
}

/** Normalise the several shapes a route list can arrive in. */
export function normaliseRoutes(body) {
  const raw = Array.isArray(body)
    ? body
    : Array.isArray(body?.routes)
      ? body.routes
      : Array.isArray(body?.endpoints)
        ? body.endpoints
        : Array.isArray(body?.data)
          ? body.data
          : null;
  if (!raw) return null;
  const out = [];
  for (const entry of raw) {
    if (typeof entry === "string") {
      const m = entry.trim().match(/^(?:([A-Za-z]+)\s+)?(\/\S*)$/);
      if (m) out.push({ method: (m[1] || "GET").toUpperCase(), path: m[2] });
    } else if (entry && typeof entry === "object") {
      const path = entry.path || entry.route || entry.url || entry.href;
      if (typeof path === "string" && path.startsWith("/")) {
        out.push({ method: String(entry.method || "GET").toUpperCase(), path });
      }
    }
  }
  return out.length ? out : null;
}

/**
 * What the platform says it serves, or null when it would not say.
 * Null is not an empty list: an unreadable route list means "unknown", and
 * callers must not read it as "serves nothing".
 */
export async function platformRoutes(name, { ttlMs = 300000 } = {}) {
  const hit = routeCache.get(name);
  if (hit && Date.now() - hit.at < ttlMs) return hit.routes;
  let routes = null;
  try {
    routes = normaliseRoutes(await platformFetch(name, PLATFORMS[name].pingPath));
  } catch {
    routes = null;
  }
  routeCache.set(name, { at: Date.now(), routes });
  return routes;
}

/** /v1/projects/{id} and /v1/projects/:id both cover /v1/projects/P-4. */
function templateCovers(template, path) {
  const t = template.split("?")[0].split("/").filter(Boolean);
  const p = path.split("?")[0].split("/").filter(Boolean);
  if (t.length !== p.length) return false;
  return t.every((seg, i) => /^[:{*]/.test(seg) || seg.toLowerCase() === p[i].toLowerCase());
}

/**
 * true  — advertised;
 * false — the platform listed its routes and this is not one of them;
 * null  — it did not say, so try the call and let it answer.
 */
export function advertises(routes, path, method = "GET") {
  if (!routes) return null;
  return routes.some((r) => r.method === method.toUpperCase() && templateCovers(r.path, path));
}
