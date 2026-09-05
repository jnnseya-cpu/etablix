/**
 * Supplier lifecycle after prequalification — the money side.
 *
 * Flow: prequalified/approved → ONBOARDING (payment structure, bank
 * details, CIS/VAT, framework declarations, via the tokenised supplier
 * portal) → named human verifies bank details BY CALL-BACK (invoice
 * fraud control: no payment can be marked paid until verified, and any
 * change to bank details re-locks it) → supplier raises APPLICATIONS
 * FOR PAYMENT in the portal with evidence → assessor CERTIFIES against
 * evidence (certified may differ from claimed; reasons become the
 * payment/pay-less notice wording) → retention and CIS computed →
 * PAID with remittance. Retention feeds the Commercial OS ledger.
 */

export const SUPPLIER_TERMS = [
  "Payment against certified work with evidence — applications are assessed, never paid on bare invoice.",
  "Payment terms: 30 days from a compliant application, with payment notices per the Construction Act (HGCRA 1996 ss.110–111). We never impose pay-when-paid.",
  "Retention: 5% of certified work, capped at 5% of order value — half released at accepted demobilisation, half at the end of the 12-month defects period (or an agreed retention alternative).",
  "CIS: labour elements are paid net of the deduction at your verified rate.",
  "VAT: domestic reverse charge applies to CIS-scope construction services — invoice without VAT and state the reverse-charge wording.",
  "Change control: no work beyond instructed scope is certifiable.",
];

/** The onboarding questionnaire — completed once, in the supplier portal. */
export const ONBOARDING_SECTIONS = [
  { id: "bank", title: "Payment account", note: "We verify these details by a call-back to your registered contact before any payment is released. A change to these details re-triggers verification.", fields: [
    { id: "bank_name", label: "Bank name", type: "text", required: true },
    { id: "bank_account_name", label: "Account name (must match your legal or trading name)", type: "text", required: true },
    { id: "bank_sort", label: "Sort code (6 digits)", type: "text", required: true, pattern: "^\\d{2}-?\\d{2}-?\\d{2}$" },
    { id: "bank_account", label: "Account number (8 digits)", type: "text", required: true, pattern: "^\\d{8}$" },
    { id: "remit_email", label: "Remittance / accounts email", type: "text", required: true },
  ]},
  { id: "tax", title: "CIS & VAT", fields: [
    { id: "cis_status", label: "CIS registration status", type: "select", options: ["Registered — gross payment", "Registered — 20% deduction", "Not registered (30% deduction)", "Not applicable — no construction operations"], required: true },
    { id: "cis_utr", label: "UTR (for CIS verification)", type: "text" },
    { id: "vat_number", label: "VAT registration number", type: "text", required: true },
    { id: "company_reg", label: "Company registration number", type: "text", required: true },
  ]},
  { id: "contacts", title: "Commercial contacts", fields: [
    { id: "commercial_contact", label: "Commercial contact for applications and queries (name, phone, email)", type: "text", required: true },
    { id: "director_contact", label: "Director we may call to verify bank details (name and phone)", type: "text", required: true },
  ]},
  { id: "terms", title: "Framework terms — declarations", fields: [
    { id: "t_certified", label: "We accept payment against certified work with evidence, on 30-day terms with statutory payment notices", type: "declaration", required: true },
    { id: "t_retention", label: "We accept the retention rule (5% capped, released in two tranches) or an agreed alternative", type: "declaration", required: true },
    { id: "t_change", label: "We accept that work beyond instructed scope is not certifiable", type: "declaration", required: true },
    { id: "t_chain", label: "We pay our own supply chain on time and never impose pay-when-paid", type: "declaration", required: true },
  ]},
];

/**
 * Mutual confidentiality undertaking accepted in the portal before an
 * enquiry pack opens. Electronic acceptance is recorded with the
 * signatory's name, position and timestamp. Have construction counsel
 * review this wording periodically, per the enterprise risk register.
 */
export const NDA_TEXT = [
  "This Confidentiality Undertaking is made between JNN GLOBAL LTD trading as ETABLIX (Company No. 15405437) (\"ETABLIX\") and the supplier named in the acceptance record (\"the Supplier\"), in connection with the enquiry to which it is attached (\"the Purpose\").",
  "1. Confidential Information means all information disclosed by either party in connection with the Purpose — including project identities, client identities, requirements, specifications, programmes, commercial terms and pricing — whether marked confidential or not.",
  "2. Each party shall use the other's Confidential Information solely for the Purpose, and shall disclose it only to its personnel and professional advisers who need it for the Purpose and are bound by equivalent obligations.",
  "3. Neither party shall disclose the existence or content of the enquiry, nor the identity of ETABLIX's client or project, to any third party without prior written consent.",
  "4. These obligations do not apply to information that is or becomes public other than by breach, was lawfully known before disclosure, is independently developed, or must be disclosed by law or a regulator.",
  "5. The Supplier's pricing and tender return will be treated by ETABLIX as the Supplier's Confidential Information on the same terms.",
  "6. On request, each party shall return or destroy the other's Confidential Information, save for copies required by law or professional regulation.",
  "7. This undertaking takes effect on electronic acceptance, continues for three years, does not oblige either party to enter any further contract, and is governed by the laws of England and Wales.",
];

/** Field ids whose values are sensitive — masked outside finance views. */
export const SENSITIVE_FIELDS = ["bank_sort", "bank_account"];

export function maskAccount(value) {
  const s = String(value || "");
  return s.length > 3 ? "•••• " + s.slice(-3) : "••••";
}

/**
 * Certification maths for one application. Retention is 5% of the sum
 * certified this period, additionally capped so cumulative retention
 * never exceeds 5% of the order value when one is known (the retention
 * ledger tracks the cumulative position).
 */
export function certificationMaths({ certified = 0, cisDeduction = 0, orderValue = 0, retainedToDate = 0 }) {
  const c = Math.max(0, Number(certified) || 0);
  let retention = Number((0.05 * c).toFixed(2));
  if (orderValue > 0) {
    const cap = 0.05 * orderValue;
    retention = Number(Math.max(0, Math.min(retention, cap - retainedToDate)).toFixed(2));
  }
  const cis = Math.max(0, Math.min(Number(cisDeduction) || 0, c - retention));
  const net = Number((c - retention - cis).toFixed(2));
  return { certified: c, retention, cisDeduction: Number(cis.toFixed(2)), netPayable: net };
}
