# Watermarks, and the hold banner

Two different questions hide behind "put a watermark on it", and running them
together is how a release control gets quietly defeated:

| Question | Controlled by |
|---|---|
| **What word** is stamped across the page | `mark` |
| **Is this the controlled copy** of the document | `sample` |

They are independent, and that is the whole design. `DRAFT` and
`CONFIDENTIAL` go on the **real** document and change nothing about it — the
hold banner, the delivery dates and the issue date all stay, because it is
still that document. Only `sample` says "this is not the controlled copy of
SSD-2026-014", and only that takes the banner and the dates off.

So `?mark=CONFIDENTIAL` cannot be used to get a report out before the date the
client was promised, and nobody has to remember the difference.

## Doing it from the screen

**Commercial tab → the documents table.** Every row has **Open** and a
**Sample** button beside it. Sample gives you the watermarked, dateless copy
in one click.

**On the rendered document itself**, top right: a **Watermark** menu. Pick any
mark, switch it off again, or take the sample copy. The menu does not print.
Then **Print / save as PDF**.

## Doing it from a link

```
/api/docs/<id>/render?token=<t>                              the document as issued
/api/docs/<id>/render?token=<t>&mark=DRAFT                   marked, otherwise unchanged
/api/docs/<id>/render?token=<t>&sample=1                     sample copy, marked SAMPLE
/api/docs/<id>/render?token=<t>&sample=1&mark=CONFIDENTIAL   sample copy, marked differently
/api/docs/<id>/render?token=<t>&part=4&mark=FOR%20REVIEW     one part of a pack
```

An unrecognised mark is **refused with a 400** listing the available ones,
rather than quietly rendering an unmarked page. A link that produced no mark
when you asked for one would be read as a marked page, which is worse than an
error.

## The marks

Gold describes the page's status. Red restricts what the reader may do with it.

| Mark | Tone | What it says |
|---|---|---|
| `DRAFT` | gold | Not final. Content may change. |
| `SAMPLE` | gold | Shows the shape of the deliverable. |
| `SPECIMEN` | gold | Synthetic content. |
| `FOR REVIEW` | gold | Issued for comment, not for use. |
| `COPY` | gold | Not the controlled original. |
| `CONFIDENTIAL` | red | Restricted circulation. |
| `COMMERCIAL IN CONFIDENCE` | red | Commercially sensitive. |
| `NOT FOR ISSUE` | red | Must not leave the company. |
| `SUPERSEDED` | red | A later revision exists. |
| `VOID` | red | Withdrawn. Do not rely on it. |

The list is `MARKS` at the top of `backend/routes/docs.js`. Adding one is a row
in that array; the picker, the validation and the tone all follow from it.

The word comes from that list rather than from the query string on purpose. A
free-text stamp is escaped either way, but a document is not the place for
one: `DARFT` across eleven pages is worse than no mark at all, and the
allowlist doubles as the record of which marks exist.

The mark is `position: fixed`, so **it repeats on every printed page** rather
than sitting on page one. It survives a screenshot and a single forwarded
sheet. A long mark is sized down automatically, or it runs off the page and
reads as a smudge.

## What a sample copy actually changes

| | Issued | Sample |
|---|---|---|
| Watermark | none, unless asked | `SAMPLE` |
| "Do not issue before…" banner | shown while held | **gone** |
| Information handover date | shown | **gone** |
| Issue date and the working days sold | shown | **gone** |
| Creation date in the header | shown | **gone** |
| Issued by | the person | "Sample copy" |
| Document number | shown | shown |
| Findings, sections, basis, legal note | all present | all present |

The delivery dates come off for a reason beyond tidiness. *"Sold as 10 working
days from information handover on 14 September"* is the **engagement's
commercial terms**. On a copy shown to a prospect it tells them what somebody
else paid for and how long it took, which is nobody's business but that
client's.

### It does not anonymise anything

The sample carries a notice saying so, in bold, on the page:

> **It is not anonymised:** whatever client, project and figures were entered
> are still in it, so do not send it outside this company unless every party
> named has agreed to that, or unless the content is synthetic.

A watermark is not confidentiality. If the document holds a real client's
name, project and figures, stamping SAMPLE on it does not make it shareable —
it makes it a watermarked breach. **To show a prospect the deliverable, use
the `specimen` template with synthetic content**, or send
`business/bids/ETABLIX-Specimen-Diagnostic.pdf`, which is a full worked report
on a project that does not exist.

`sample` is a **render option, not a document state**. The stored document, its
number and its hold status are untouched, so the desk's own copy still carries
the banner and a sample can never become the controlled copy by accident.

## Taking the hold banner off the real document

> **Do not issue before 26 September 2026.** This engagement was sold as 10
> working days from information handover on 14 September 2026. 6 working days
> remain. Internal review copy.

That banner is on the document rather than only in the console, because the
way a report goes out early is that somebody forwards the PDF without looking
at the console. It appears on diagnostics, site-requirements packages and
mobilisation reviews while the promised window is still running.

Three ways it comes off, and only three:

**1. The date arrives.** Nothing to do. `releaseStatus` recomputes on every
render, and the day the promised date is reached the banner is gone.

**2. A recorded early release** — the governed route, for when the client
genuinely needs it sooner:

```
POST /api/docs/<id>/release      { "reason": "..." }
```

Delivery or finance role. The reason must be at least a sentence, and it is
written onto the document row **and** into the append-only ledger as
`document.released-early`, with who, when, and how many working days early. A
released report then shows the client nothing about the hold — the record
lives in the audit trail, not in a red box the client reads and draws their
own conclusion from. Once per document.

**3. A sample copy** — `?sample=1`. Right for showing a prospect, wrong for
issuing to the client, because it is not the controlled copy and says so.

There is no fourth way, and there should not be. The banner exists because
issuing early tells a client the ten days they bought were padding. If the
report is genuinely finished before its date, route 2 is a sentence of typing
and it leaves a record that can be defended later.

## Tests

`backend/test/samplecopy.test.mjs` — 66 assertions, registered in
`run-all.sh`. The two it exists for:

- every mark keeps the hold banner and the delivery dates, so a mark can never
  become a way round the release date;
- rendering a sample changes nothing about the real render or the stored
  document.

`backend/test/circle.e2e.mjs` covers the specimen watermark end to end against
the running server.

## The documents built outside the app

The policies, the delivery record and the specimen diagnostic are built by
`business/policies/brand.cjs`, which has its own watermark option carried into
both the Word file and the PDF from one setting:

```js
const d = B.doc({ ..., watermark: "Sample" });
```

The PDF gets a `position: fixed` CSS layer; Word has no CSS, so the same mark
is rendered once to a PNG and anchored behind the text in the section header,
which repeats on every page. `ImageRun` needs an explicit `type: "png"` there —
without it the part is written as `.undefined` with no matching Default in
`[Content_Types].xml` and Word opens the file as corrupt.
