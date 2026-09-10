/**
 * The valuation check — money out must not exceed value earned, and every
 * payment must carry its statutory dates.
 *
 * THE THIRD OF THREE, AND THE ONE WITH THE MONEY IN IT. Agent 13's check asks
 * whether every scope item has a price. Agent 2's asks whether every required
 * deliverable has an answer. This one asks the question a Management
 * Integrator appointment exists to answer every month: is what we are
 * recommending the client pay actually backed by work that has been done.
 *
 * Under Model 02 the client contracts directly with every supplier and
 * ETABLIX never holds their money. That is the whole commercial point of the
 * model, and it means our monthly output is not an invoice, it is a
 * RECOMMENDATION that somebody else acts on. A recommendation is trusted
 * exactly as far as it can be checked.
 *
 * Four failures, all silent, all expensive, and all of them arithmetic:
 *
 *   · A PAYMENT AGAINST NOTHING. A supplier recommended for payment on a
 *     control account that does not appear in the earned-value section. Money
 *     leaving against work nobody measured.
 *   · A PAYMENT EXCEEDING THE VALUE EARNED. The one that is never noticed,
 *     because the number looks reasonable and the total adds up. Over-
 *     certification is recovered by set-off if you are lucky and by
 *     litigation if you are not, and on a supplier that fails in month nine
 *     it is not recovered at all.
 *   · AN AMOUNT THAT IS NOT A NUMBER. "As previously", "per application",
 *     "TBC". A valuation line that cannot be added is a valuation that has
 *     not been done.
 *   · A PAYMENT WITH NO STATUTORY DATES. Part II of the Housing Grants,
 *     Construction and Regeneration Act 1996 turns on dates: miss the s.110A
 *     payment notice and the sum APPLIED FOR becomes the notified sum, miss
 *     the s.111 pay-less deadline and it must be paid in full whatever the
 *     work is worth. Both failures are invisible until the money is gone.
 *
 * The reference form is fixed and the agent is told it verbatim:
 *
 *     CA-<n>       e.g. CA-1, CA-14      a control account
 */

// The date test is SHARED with the bid check rather than copied. It carries a
// bug that was found once — a bare hyphen in the placeholder list rejected
// "2026-09-15", the most standard date form there is — and a second copy is a
// second place for that to come back. One wording, one behaviour.
import { isDate } from "./bidcheck.js";
import { TERMS } from "./paymentdates.js";

/** A control-account reference wherever it appears. */
const REF = /\bCA-(\d{1,3})\b/g;

/** The earned-value table's columns, mandated in the brief and checked here. */
export const EARNED_COLUMNS = ["Ref", "Control account", "Budget", "Value earned this period", "Value earned to date", "SPI", "CPI"];

/** The payment-recommendation table's columns. */
export const PAYMENT_COLUMNS = ["Ref", "Supplier", "Control account", "Amount recommended", "Due date", "Final date for payment", "Pay-less by"];

export { isDate };

/**
 * A money cell as a number, or null when it is not one.
 *
 * Deliberately strict. "£410,000" and "410000.00" are figures; "1.2m",
 * "as previously" and "per application" are not, and a valuation line that
 * cannot be added has not been valued. Returning null rather than guessing is
 * the point: a guessed figure in a payment recommendation is worse than a
 * refused one, because the refusal is visible.
 */
export function money(cell) {
  const raw = String(cell ?? "").replace(/[*_`]/g, "").trim();
  if (!raw) return null;
  // A dash or "nil" is an explicit zero, which is a valid recommendation.
  if (/^(-|—|–|nil|none|zero|0)$/i.test(raw)) return 0;
  // Brackets are an accountant's minus sign.
  const signed = raw.replace(/^\(([^)]*)\)$/, "-$1");
  const bare = signed.replace(/[£$€\s]/g, "");

  // THOUSANDS SEPARATORS ARE VALIDATED, NOT STRIPPED.
  //
  // Stripping first meant "12,3" — a plain typo in a money column — read as
  // 123. That is a silent misread of a figure, in a table whose whole purpose
  // is to be added up, and it is worse than a refusal: a refused cell is
  // reported and a misread one is paid.
  //
  // So a figure is either ungrouped digits, or digits grouped in threes from
  // the right. Anything else is not a number we are willing to guess at.
  const shape = /^-?(\d+|\d{1,3}(,\d{3})+)(\.\d{1,2})?$/;
  if (!shape.test(bare)) return null;
  return Number(bare.replace(/,/g, ""));
}

/** Every control-account reference in a block of text, first appearance first. */
export function refsIn(text) {
  const out = [];
  const seen = new Set();
  const src = String(text || "");
  REF.lastIndex = 0;
  let m;
  while ((m = REF.exec(src))) {
    const ref = `CA-${Number(m[1])}`;
    if (!seen.has(ref)) { seen.add(ref); out.push(ref); }
  }
  return out;
}

const byRef = (a, b) => Number(a.slice(3)) - Number(b.slice(3));

function tableRows(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((l) => l.trim().startsWith("|") && l.trim().endsWith("|"))
    .filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l))
    .map((l) => l.trim().slice(1, -1).split("|").map((c) => c.trim()));
}

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z]/g, "");

/**
 * The value earned this period, per control account.
 *
 * Headers are found by their columns rather than their position, because a
 * report split by package has several earned-value tables and every one of
 * them counts. Several rows against one account are summed.
 */
function earnedByAccount(earnedText) {
  const out = new Map();
  const unquantified = [];
  let refCol = -1, thisCol = -1, nameCol = -1;
  for (const cells of tableRows(earnedText)) {
    const header = cells.map(norm);
    const r = header.indexOf("ref");
    const t = header.findIndex((h) => h === "valueearnedthisperiod" || h === "earnedthisperiod" || h === "thisperiod");
    if (r >= 0 && t >= 0) {
      refCol = r; thisCol = t;
      nameCol = header.findIndex((h) => h === "controlaccount" || h === "account" || h === "package");
      continue;
    }
    if (refCol < 0) continue;
    const ref = refsIn(cells[refCol] || "")[0];
    if (!ref) continue;
    const v = money(cells[thisCol]);
    const name = nameCol >= 0 ? cells[nameCol] || "" : "";
    if (v === null) { unquantified.push({ ref, cell: cells[thisCol] || "(blank)", account: name, where: "earned value" }); continue; }
    out.set(ref, { earned: (out.get(ref)?.earned || 0) + v, account: name });
  }
  return { earned: out, unquantified };
}

/** The payment recommendations, per row, with their dates. */
function paymentRows(paymentText) {
  const rows = [];
  let refCol = -1, caCol = -1, amtCol = -1, dueCol = -1, finalCol = -1, plCol = -1, supCol = -1;
  for (const cells of tableRows(paymentText)) {
    const header = cells.map(norm);
    const a = header.findIndex((h) => h === "amountrecommended" || h === "amount" || h === "recommended");
    const c = header.findIndex((h) => h === "controlaccount" || h === "account");
    if (a >= 0 && c >= 0) {
      amtCol = a; caCol = c;
      refCol = header.indexOf("ref");
      supCol = header.findIndex((h) => h === "supplier" || h === "payee");
      dueCol = header.findIndex((h) => h === "duedate" || h === "due");
      finalCol = header.findIndex((h) => h === "finaldateforpayment" || h === "finaldate" || h === "final");
      plCol = header.findIndex((h) => h === "paylessby" || h === "payless");
      continue;
    }
    if (amtCol < 0) continue;
    const ca = refsIn(cells[caCol] || "")[0];
    if (!ca) continue;
    rows.push({
      ca,
      supplier: supCol >= 0 ? cells[supCol] || "" : "",
      line: refCol >= 0 ? cells[refCol] || "" : "",
      amountCell: cells[amtCol] || "(blank)",
      amount: money(cells[amtCol]),
      due: dueCol >= 0 ? cells[dueCol] || "" : "",
      final: finalCol >= 0 ? cells[finalCol] || "" : "",
      payLess: plCol >= 0 ? cells[plCol] || "" : "",
    });
  }
  return rows;
}

const ISO = /\b\d{4}-\d{2}-\d{2}\b/;
const dayOf = (cell) => {
  const s = String(cell || "");
  const iso = ISO.exec(s);
  if (iso) return Date.parse(`${iso[0]}T00:00:00Z`);
  const t = Date.parse(s.replace(/[*_`]/g, "").trim());
  return Number.isFinite(t) ? t : NaN;
};
const DAY = 86400000;

/**
 * Reconcile the payment recommendations against the value earned.
 *
 * `ok` is true only when every recommendation is backed by a measured control
 * account, no recommendation exceeds what that account earned, every amount is
 * a figure, and every payment carries dates in the statutory order.
 */
export function reconcilePaymentsToEarned(earnedText, paymentText) {
  const { earned, unquantified } = earnedByAccount(earnedText);
  const rows = paymentRows(paymentText);

  const unbacked = [];
  const overpaid = [];
  const undated = [];
  const recommendedBy = new Map();

  for (const r of rows) {
    // THE DATES ARE CHECKED FIRST AND UNCONDITIONALLY.
    //
    // They used to be checked last, after the amount and the backing, and
    // after a `continue` — so a row whose amount was unreadable never had its
    // dates looked at. One row with "as previously" in the amount column and
    // "TBC" as its due date was reported as one defect instead of two, and
    // fixing the amount would have revealed the second only on the next run.
    // They are independent faults on the same line.
    const problems = [];
    if (!isDate(r.due)) problems.push(`due date "${r.due || "(blank)"}"`);
    if (!isDate(r.final)) problems.push(`final date "${r.final || "(blank)"}"`);
    {
      const due = dayOf(r.due), fin = dayOf(r.final), pl = dayOf(r.payLess);
      if (Number.isFinite(due) && Number.isFinite(fin) && fin <= due) {
        problems.push("the final date for payment is not after the due date");
      }
      if (r.payLess && isDate(r.payLess) && Number.isFinite(fin) && Number.isFinite(pl)) {
        if (pl >= fin) problems.push("the pay-less deadline is not before the final date");
        else if (Math.round((fin - pl) / DAY) < TERMS.payLessBeforeFinal) {
          problems.push(`the pay-less deadline leaves ${Math.round((fin - pl) / DAY)} day(s) before the final date, not the ${TERMS.payLessBeforeFinal} the contract requires`);
        }
      }
    }
    if (problems.length) undated.push({ ref: r.ca, supplier: r.supplier, problems });

    if (r.amount === null) {
      unquantified.push({ ref: r.ca, cell: r.amountCell, account: r.supplier, where: "payment recommendation" });
      continue;
    }
    if (!earned.has(r.ca)) {
      unbacked.push({ ref: r.ca, supplier: r.supplier, amount: r.amount });
      continue;
    }
    recommendedBy.set(r.ca, (recommendedBy.get(r.ca) || 0) + r.amount);
  }

  for (const [ca, total] of recommendedBy) {
    const e = earned.get(ca);
    if (total > e.earned) {
      overpaid.push({ ref: ca, account: e.account, earned: e.earned, recommended: total, excess: Math.round((total - e.earned) * 100) / 100 });
    }
  }

  // Earned but not recommended is NOT a failure — an account can be measured
  // this period and paid the next, and a retention or a withheld sum is a
  // legitimate reason. It is reported so it is a decision rather than an
  // oversight.
  const unpaid = [...earned.entries()]
    .filter(([ca, e]) => e.earned > 0 && !recommendedBy.has(ca))
    .map(([ca, e]) => ({ ref: ca, account: e.account, earned: e.earned }))
    .sort((a, b) => byRef(a.ref, b.ref));

  const totalEarned = [...earned.values()].reduce((s, e) => s + e.earned, 0);
  const totalRecommended = [...recommendedBy.values()].reduce((s, n) => s + n, 0);

  return {
    accounts: earned.size,
    payments: rows.length,
    totalEarned: Math.round(totalEarned * 100) / 100,
    totalRecommended: Math.round(totalRecommended * 100) / 100,
    unbacked: unbacked.sort((a, b) => byRef(a.ref, b.ref)),
    overpaid: overpaid.sort((a, b) => b.excess - a.excess),
    unquantified,
    undated: undated.sort((a, b) => byRef(a.ref, b.ref)),
    unpaid,
    referenced: earned.size > 0 && rows.length > 0,
    ok:
      earned.size > 0 &&
      rows.length > 0 &&
      !unbacked.length &&
      !overpaid.length &&
      !unquantified.length &&
      !undated.length,
  };
}

const gbp = (n) => `£${Number(n || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const list = (items, cap = 8) =>
  items.slice(0, cap).join("; ") + (items.length > cap ? `, and ${items.length - cap} more` : "");

/**
 * The reconciliation as notes on the run — what the person approving the
 * valuation reads before they approve it.
 *
 * A valuation that reconciles produces NO notes. Run notes are an exception
 * report and a line of good news among them reads as one more thing wrong.
 */
export function controlNotes(result) {
  const notes = [];
  if (!result.referenced) {
    notes.push(
      "THE VALUATION COULD NOT BE CHECKED: the earned-value section or the payment recommendations carry no CA-n control-account references, " +
        "so there is no way to establish that what we are recommending the client pay is backed by work that has been measured. " +
        "Do not issue this valuation. Re-run it, and if it comes back the same the references have to be added by hand."
    );
    return notes;
  }
  if (result.overpaid.length) {
    notes.push(
      `${result.overpaid.length} payment recommendation(s) EXCEED the value earned on that control account: ` +
        `${list(result.overpaid.map((o) => `${o.ref}${o.account ? ` (${o.account})` : ""} earned ${gbp(o.earned)}, recommended ${gbp(o.recommended)} — over by ${gbp(o.excess)}`))}. ` +
        "Over-certification is recovered by set-off if the supplier is solvent and not at all if they are not. " +
        "Correct the recommendation to the value measured, or state on the row what the excess is for and who authorised it, before this valuation is issued."
    );
  }
  if (result.unbacked.length) {
    notes.push(
      `${result.unbacked.length} payment recommendation(s) name a control account that DOES NOT APPEAR in the earned-value section: ` +
        `${list(result.unbacked.map((u) => `${u.ref}${u.supplier ? ` (${u.supplier})` : ""} — ${gbp(u.amount)}`))}. ` +
        "That is money recommended against work nobody measured. Either the account is missing from the earned-value table, in which case the table is incomplete, " +
        "or the payment has no basis. The two have opposite fixes and both must be resolved before issue."
    );
  }
  if (result.unquantified.length) {
    notes.push(
      `${result.unquantified.length} figure(s) cannot be read as a number: ` +
        `${list(result.unquantified.map((u) => `${u.ref} ${u.where} "${u.cell}"`))}. ` +
        "A valuation line that cannot be added has not been valued. Put a figure in, or remove the line."
    );
  }
  if (result.undated.length) {
    notes.push(
      `${result.undated.length} payment recommendation(s) have a problem with their statutory dates: ` +
        `${list(result.undated.map((u) => `${u.ref}${u.supplier ? ` (${u.supplier})` : ""}: ${u.problems.join(", ")}`))}. ` +
        "Under Part II of the Housing Grants, Construction and Regeneration Act 1996 a missed payment notice makes the sum APPLIED FOR payable, " +
        "and a missed pay-less deadline makes the notified sum payable in full whatever the work is worth. Both failures are silent until the money has gone."
    );
  }
  if (result.unpaid.length) {
    // Not a failure. A decision, said out loud so it is one.
    notes.push(
      `${result.unpaid.length} control account(s) earned value this period and are NOT in the payment recommendations: ` +
        `${list(result.unpaid.map((u) => `${u.ref}${u.account ? ` (${u.account})` : ""} — ${gbp(u.earned)}`))}. ` +
        "That may be right — retention, a withheld sum, or an account measured this period and paid next. Say which on the row, because an unexplained omission is how a supplier's application goes unanswered and the sum they applied for becomes payable in full."
    );
  }
  return notes;
}

/**
 * The reconciliation as a table for the valuation certificate — the same
 * result the desk saw, printed in the report so the client can see that the
 * money was checked and by what.
 */
export function controlStatement(result) {
  if (!result.referenced) {
    return "**This valuation has not passed the payment check.** The earned-value section and the payment recommendations do not carry matching control-account references, so it cannot be confirmed that what is recommended for payment is backed by measured work. Do not issue it on this basis.";
  }
  const rows = [
    "| Check | Result |",
    "|---|---|",
    `| Control accounts measured | ${result.accounts} |`,
    `| Value earned this period | ${gbp(result.totalEarned)} |`,
    `| Recommended for payment | ${gbp(result.totalRecommended)} |`,
    `| Recommendations exceeding value earned | ${result.overpaid.length} |`,
    `| Recommendations against an unmeasured account | ${result.unbacked.length} |`,
    `| Figures that are not a number | ${result.unquantified.length} |`,
    `| Payments with a statutory-date problem | ${result.undated.length} |`,
  ].join("\n");
  const verdict = result.ok
    ? "\n\n**This valuation reconciles.** Every sum recommended for payment is backed by a measured control account, no recommendation exceeds the value earned on it, every figure is a number, and every payment carries its due date, final date and pay-less deadline in the order Part II of the Housing Grants, Construction and Regeneration Act 1996 requires. The check is performed by the system on every run, not by eye. It says nothing about whether the measurement itself is right — that is the quantity surveyor's judgement and it has not been delegated."
    : "\n\n**This valuation does not reconcile and must not be issued as it stands.** The exceptions are listed in the run notes and each one must be closed before it goes to the client.";
  return rows + verdict;
}
