/**
 * Turning one agent's finished output back into its numbered sections.
 *
 * Every pipeline deliverable comes out of the engine as one long piece of
 * text: a summary paragraph numbered 0, its numbered sections, and a lettered
 * appendix. The document studio needs them apart again, one per field, so the
 * person issuing the report reviews filled fields instead of retyping forty
 * pages.
 *
 * It matches on the heading NUMBER rather than its wording, because a model
 * will decorate a heading (`## 7. Mobilisation constraints`,
 * `**7 · MOBILISATION CONSTRAINTS**`) far more readily than it will renumber
 * it. That is also the single most dangerous property in the system: content
 * from the wrong product lands in the right fields and the document looks
 * entirely correct, so the tests assert on the WORDS of a section and not on
 * whether the field is populated.
 *
 * It lives in lib/ rather than in the document route because two other things
 * need it — the client route mints from it, and the tender pack's
 * scope-to-price reconciliation reads two sections out of a finished run
 * before anybody approves it. Three copies of a parser this fussy would drift
 * the first time any agent's headings moved.
 */

/**
 * Split a finished pipeline output into { data, missing, matched }.
 *
 * `sections` is the deliverable's own [id, label] list, and its LENGTH is
 * what bounds the numbers this will accept. That bound used to be a hard 12
 * for every deliverable, which quietly truncated the eight-section ones: a
 * line like "10. Provide the RAMS" inside section 8 was taken for the start
 * of a section 10, and everything after it was cut from section 8's body and
 * then thrown away because no field 10 existed to receive it.
 */
export function splitPipelineOutput(output, sections) {
  const lines = String(output || "").replace(/\r\n/g, "\n").split("\n");
  const last = sections.length;

  // A heading line: optional markdown hashes or bold, a number, a
  // separator, then title text. The title must not read as a sentence,
  // which is what keeps "10. Issue the DNO enquiry" inside section 12
  // from being mistaken for the start of section 10.
  const HEADING = /^\s*(?:#{1,4}\s*)?(?:\*\*|__)?\s*(\d{1,2})\s*[.)·:—-]\s*([^\n]*?)\s*(?:\*\*|__)?\s*$/;

  const found = new Map();
  const marks = [];
  for (let i = 0; i < lines.length; i += 1) {
    const m = HEADING.exec(lines[i]);
    if (!m) continue;
    const n = Number(m[1]);
    if (n < 0 || n > last || found.has(n)) continue;
    const title = m[2].trim();
    // Headings are short and unpunctuated; list items are neither.
    const decorated = /^\s*#/.test(lines[i]) || /^\s*(?:\*\*|__)/.test(lines[i]);
    const headingish = title.length > 2 && title.length <= 70 && !/[.;]$/.test(title);
    if (!decorated && !headingish) continue;
    found.set(n, marks.length);
    marks.push({ n, at: i });
  }

  const data = {};
  const missing = [];
  const take = (n) => {
    const idx = found.get(n);
    if (idx === undefined) return "";
    const start = marks[idx].at + 1;
    const end = idx + 1 < marks.length ? marks[idx + 1].at : lines.length;
    return lines.slice(start, end).join("\n").trim();
  };

  const findings = take(0);
  if (findings) data.findings = findings;
  else missing.push("Findings in one paragraph");

  sections.forEach(([id, label], i) => {
    const body = take(i + 1);
    if (body) data[id] = body;
    else missing.push(`${i + 1}. ${label}`);
  });

  // The appendix is lettered, not numbered, so it never collides with a
  // deliverable. It is not counted as missing: it exists only when the
  // reconciliation pass found something worth appending.
  const appendixAt = lines.findIndex((l) => /^\s*(?:#{1,4}\s*)?(?:\*\*|__)?\s*A\s*[.)·:—-]\s*\S/.test(l));
  if (appendixAt >= 0) {
    const after = marks.filter((m) => m.at > appendixAt).map((m) => m.at);
    const end = after.length ? Math.min(...after) : lines.length;
    const body = lines.slice(appendixAt + 1, end).join("\n").trim();
    if (body) data.appendix = body;
  }

  // The summary plus the sections. This was a hard 13, so an eight-section
  // deliverable that lost three sections still reported thirteen matched.
  return { data, missing, matched: sections.length + 1 - missing.length };
}
