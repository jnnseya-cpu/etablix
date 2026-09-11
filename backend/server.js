/**
 * THE ENTRY POINT, AND ONLY THAT.
 *
 * This file exists to run four checks before anything else loads, and it is
 * deliberately the smallest file in the repository.
 *
 * The reason it has to be separate is a property of ES modules: imports are
 * resolved before any code in a file runs. The store imports `node:sqlite`
 * at the top level, so on Node 20 the process dies during module resolution
 * with ERR_UNKNOWN_BUILTIN_MODULE — before a single line of a check inside
 * the application could execute. A guard in the middle of the application is
 * a guard that never runs.
 *
 * So: this file imports nothing but the checks, runs them, and only then
 * loads the application dynamically. The application itself is app.js and is
 * unchanged; `node backend/server.js` remains the start command everywhere,
 * because that string is in the Dockerfile, render.yaml, the systemd unit and
 * two runbooks.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { preflight } from "./lib/preflight.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.ETABLIX_DATA_DIR || path.join(here, "data");

preflight({ dataDir });

await import("./app.js");
