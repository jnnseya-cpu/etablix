/**
 * The payment timetable, as mechanism rather than doctrine.
 *
 * The Commercial Playbook requires "distinct valuation, due, notice and
 * final dates satisfying HGCRA 1996 ss.110–113". Until now only the due
 * date existed on an application and the rest were typed by hand into a
 * notice — which is exactly how a prescribed period gets missed. Every
 * date is now derived from the day a compliant application was
 * received, carried on the application, and watched by the automation.
 *
 * The statutory shape (Housing Grants, Construction and Regeneration
 * Act 1996, as amended by the LDEDC Act 2009):
 *
 *   s.110   the contract fixes the due date and the final date for
 *           payment. Ours: due 30 days from a compliant application,
 *           final date 14 days after the due date.
 *   s.110A  the payer's payment notice must be given not later than
 *           five days after the payment due date, stating the notified
 *           sum and the basis on which it is calculated.
 *   s.111   the notified sum must be paid by the final date unless a
 *           pay-less notice is given before the prescribed period
 *           expires. Ours: seven days before the final date.
 *
 * Miss the s.110A notice and the sum applied for becomes the notified
 * sum. Miss the s.111 deadline and it must be paid in full whatever the
 * work is worth. Both failures are silent and expensive, so they are
 * computed and alerted rather than remembered.
 *
 * These periods are the contract's, not the statute's — the Act fixes
 * the framework and leaves the lengths to the parties. Change them here
 * and the supplier terms in supplierflow.js together, never separately.
 */

const DAY = 86400000;

/** Contractual periods, in days. */
export const TERMS = {
  dueFromApplication: 30,
  paymentNoticeAfterDue: 5,
  finalDateAfterDue: 14,
  payLessBeforeFinal: 7,
};

/**
 * Every date the timetable turns on, derived from receipt of a
 * compliant application. Returns epoch milliseconds throughout so the
 * store keeps one representation.
 */
export function paymentDates(receivedAt = Date.now()) {
  const received = Number(receivedAt) || Date.now();
  const dueDate = received + TERMS.dueFromApplication * DAY;
  const finalDate = dueDate + TERMS.finalDateAfterDue * DAY;
  return {
    receivedAt: received,
    dueDate,
    paymentNoticeBy: dueDate + TERMS.paymentNoticeAfterDue * DAY,
    finalDate,
    payLessBy: finalDate - TERMS.payLessBeforeFinal * DAY,
  };
}

/**
 * Fill in the timetable for an application that predates it, without
 * writing to the store — so historic records read correctly rather
 * than showing blanks.
 */
export function withDates(payApp) {
  if (!payApp) return payApp;
  const base = paymentDates(payApp.receivedAt);
  return {
    ...payApp,
    paymentDueDate: payApp.paymentDueDate || base.dueDate,
    paymentNoticeBy: payApp.paymentNoticeBy || base.paymentNoticeBy,
    finalDateForPayment: payApp.finalDateForPayment || base.finalDate,
    payLessBy: payApp.payLessBy || base.payLessBy,
  };
}

/**
 * What the timetable demands of this application right now.
 *
 * `severity` is "critical" where a statutory consequence has already
 * landed, "warning" where a deadline is inside three days, and null
 * where nothing is owed — so a queue can sort by what actually bites.
 */
export function noticeStatus(payApp, now = Date.now()) {
  const a = withDates(payApp);
  const paid = a.status === "paid";
  const certified = Boolean(a.certifiedAt) || ["certified", "paid"].includes(a.status);

  const items = [];

  // s.110A — the payment notice. Certification is how we serve it.
  if (!certified) {
    const days = Math.ceil((a.paymentNoticeBy - now) / DAY);
    if (now > a.paymentNoticeBy) {
      items.push({
        code: "s110A_missed",
        severity: "critical",
        label: "Payment notice deadline passed",
        detail: `The s.110A notice was due by ${fmt(a.paymentNoticeBy)}. Without it the sum applied for becomes the notified sum and is payable in full unless a pay-less notice is served in time.`,
        by: a.paymentNoticeBy,
        days,
      });
    } else if (days <= 3) {
      items.push({
        code: "s110A_due",
        severity: "warning",
        label: `Payment notice due in ${days} day${days === 1 ? "" : "s"}`,
        detail: `Certify this application by ${fmt(a.paymentNoticeBy)} to serve the s.110A notice in time.`,
        by: a.paymentNoticeBy,
        days,
      });
    }
  }

  // s.111 — the pay-less notice, only relevant while money is unpaid.
  if (!paid) {
    const days = Math.ceil((a.payLessBy - now) / DAY);
    if (now > a.payLessBy && now <= a.finalDateForPayment) {
      items.push({
        code: "s111_closed",
        severity: "critical",
        label: "Pay-less window closed",
        detail: `The last date to serve a s.111 pay-less notice was ${fmt(a.payLessBy)}. The notified sum must now be paid in full by ${fmt(a.finalDateForPayment)}.`,
        by: a.payLessBy,
        days,
      });
    } else if (days <= 3 && days >= 0) {
      items.push({
        code: "s111_due",
        severity: "warning",
        label: `Pay-less window closes in ${days} day${days === 1 ? "" : "s"}`,
        detail: `Any pay-less notice must be served by ${fmt(a.payLessBy)}, ahead of the final date for payment on ${fmt(a.finalDateForPayment)}.`,
        by: a.payLessBy,
        days,
      });
    }

    const toFinal = Math.ceil((a.finalDateForPayment - now) / DAY);
    if (now > a.finalDateForPayment) {
      items.push({
        code: "final_passed",
        severity: "critical",
        label: "Final date for payment passed",
        detail: `Payment was due by ${fmt(a.finalDateForPayment)}. Late payment carries statutory interest and suspension rights.`,
        by: a.finalDateForPayment,
        days: toFinal,
      });
    } else if (toFinal <= 3) {
      items.push({
        code: "final_due",
        severity: "warning",
        label: `Payment due in ${toFinal} day${toFinal === 1 ? "" : "s"}`,
        detail: `Final date for payment is ${fmt(a.finalDateForPayment)}.`,
        by: a.finalDateForPayment,
        days: toFinal,
      });
    }
  }

  const severity = items.some((i) => i.severity === "critical")
    ? "critical"
    : items.some((i) => i.severity === "warning")
      ? "warning"
      : null;

  return { severity, items, dates: { ...a } };
}

function fmt(ts) {
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** A one-line plain-English timetable, for notices and emails. */
export function describeTimetable(payApp) {
  const a = withDates(payApp);
  return [
    `Application received: ${fmt(a.receivedAt)}`,
    `Payment due date: ${fmt(a.paymentDueDate)}`,
    `Payment notice (s.110A) by: ${fmt(a.paymentNoticeBy)}`,
    `Pay-less notice (s.111) by: ${fmt(a.payLessBy)}`,
    `Final date for payment: ${fmt(a.finalDateForPayment)}`,
  ].join("\n");
}
