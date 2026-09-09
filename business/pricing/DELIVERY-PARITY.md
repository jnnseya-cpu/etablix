# Delivery parity — every deliverable at the level of the diagnostic

**Prepared 9 September 2026.**

The Site Systems Diagnostic works. A client answers nine questions in their
portal, uploads their pack once, and an engine reads eighteen documents against
each other over six passes and produces twelve deliverables with sixty-five
sourced contradictions in the appendix. It is branded, numbered, held to its
promised date, and issuable without a retype.

Nothing else did any of that. **Four of the five Model A deliverables were an
intake checklist, a price, and somebody writing forty pages by hand.**

---

## 1 · Why this is a pricing problem before it is a delivery problem

The margins certified in PRICING-REVIEW-2026 assume the effort of an engine.
The Site Management Requirements Package is priced at £14,000 to £45,000 on an
assumption of ten to thirty-four chargeable days. Written from a blank page
that is forty days or more — so **the margin on that band was not thin, it was
wrong.** The same is true of the village package and the mobilisation review.

Which makes parity a commercial requirement rather than a refinement. Either
the engine exists and the price is right, or it does not and the price has to
come down to something that pays for the hours.

---

## 2 · Where each deliverable stands

| Deliverable | Fee | Client intake | Production engine | Branded document | Portal join |
|---|---|---|---|---|---|
| **Site Systems Diagnostic** | £6,500 – £18,500 | 9 questions | **Agent 8** — 6 passes, 12 sections | SSD series | Yes |
| **Site Management Requirements** | £14,000 – £45,000 | 9 questions | **Agent 9** — 6 passes, 12 sections | SMR series | Yes |
| Workforce Village Requirements | £18,000 – £55,000 | 9 questions | **none** | none | no |
| Managed Procurement Desk | £5,000 – £13,500 | 9 questions | **none** | ITT template only | no |
| Mobilisation-readiness review | £5,500 – £15,000 | 9 questions | **none** | none | no |

Two of five now deliver alike. Three do not, and the console says so rather
than offering a button the endpoint would refuse.

---

## 3 · What was built, and what makes it reusable

**The engine now takes a spec.** Everything it does — reading a client's
documents against each other, continuing a pass that runs out of room,
resuming an interrupted run, caching the pack across six calls, keeping the
money and the notes straight — is product-neutral, and it was welded to one
product. A deliverable is now a description of what it must contain:
`pipelineSpec({ reconcileTask, sectionPasses, finalTask })`. The next three are
each a spec file rather than a second copy of the machinery.

**Agent 9 is a genuinely different product, not a reskin.** The diagnostic
reads documents against each other and reports what does not hold — it
produces findings. Agent 9 produces **instruments**: text a tenderer prices and
a contract later enforces. Three rules follow, and they are in the brief rather
than in a comment:

- **Every requirement is objectively verifiable.** "Adequate welfare" is not a
  requirement. A requirement a supplier can satisfy two ways is a variation
  already priced against the client.
- **Every requirement is traced to its source** — a client document and
  section, a statutory duty, a planning condition, or an ETABLIX proposal
  marked `[PROPOSED — client approval required]`. A requirement with no source
  is one the client never asked for and will not pay for.
- **Nothing is invented.** Where the client has stated no standard, the package
  says so, proposes one, names the basis, and marks it for approval. A
  specification with a silently assumed standard is how a supplier prices the
  wrong thing and is entitled to be paid for it.

Its working paper is different too. The diagnostic's is a contradictions
ledger; Agent 9's is a **requirement source register** — what the client has
mandated, where each mandate comes from, where their own documents mandate two
different things, and every point at which a standard must exist and does not.

**And it carries the CDM boundary on the face of the document.** Nothing in a
requirements package appoints ETABLIX as Principal Contractor. Under CDM 2015
that is a defined legal role with specific duties, and holding it must be an
explicit, priced, insured decision rather than an inference from a word in a
specification.

---

## 4 · A defect worth recording, because it was nearly invisible

The mock model matched Agent 9's passes with the diagnostic's answers. Both
agents' passes say "Write deliverables 1, 2 and 3", the diagnostic's pattern
was tested first, and **the output splitter takes sections by number rather
than by title — so the wrong content landed in the right fields and looked
entirely correct.** Twelve populated sections, a valid document, a real
number, the right headings, and every word underneath belonging to a different
product.

The first version of the test asserted that the section fields were populated,
and passed. It now asserts what the words say: that section 2 reads as
Employer's Requirements and section 9 as the commercial requirements. That is
the difference between a test and a formality.

---

## 5 · The next three, in the order they should be built

**Mobilisation-readiness review** first, despite being the cheapest. It is the
closest sibling of the diagnostic — same intake shape, same "worked backwards
from a fixed date" method — so it is the cheapest spec to get right, and it is
the entry product for a client who will not buy a full diagnostic.

**Workforce Village Requirements** second. £18,000 to £55,000, the most
specialist thing ETABLIX sells, and the one with the fewest competitors. On
NORTHREACH the accommodation decision alone moved between £3.15m and £11.7m
against a client basis that was a graduate's desk research with no rates in it.

**Managed Procurement Desk** last, and differently. It is a recurring service
rather than a document, so the engine it needs is not a six-pass pipeline —
it is per-package evaluation and comparison against the requirements. Building
it as a pipeline would be forcing the wrong shape.

Until each exists, its fee assumes hand production. Say that plainly when
quoting one, and do not quote the top of a band for work that will be typed.
