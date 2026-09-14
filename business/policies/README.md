# Policies

Branded ETABLIX policy documents, each built as Word and PDF from one content
list so the two files cannot disagree.

| Script | Document | Pages |
|---|---|---|
| `build-occupational-health.cjs` | Management of Occupational Health, including mental health and fatigue | 12 |
| `build-edi.cjs` | Equality, Diversity and Inclusion | 10 |
| `build-health-safety.cjs` | Health and Safety Policy and Arrangements | 9 |
| `build-environmental.cjs` | Environmental Policy | 7 |
| `build-quality.cjs` | Quality Management Arrangements | 5 |

```
for f in business/policies/build-*.cjs; do node "$f"; done
```

Every one of them ends with a section headed **what is not yet in place**.
That is the section to leave in. Each item is the correct answer for a company
of this size today and carries the trigger that changes it, and an assessor who
sees the gaps stated will believe the rest. Each can be checked in minutes —
an SSIP registration, an ISO certificate, a retained adviser — so a document
that claims one it does not hold fails at the first search.

`brand.cjs` holds the house style and both renderers. A new policy is a
content file and nothing else — no layout, no fonts, no cover, no footer:

```js
const B = require("./brand.cjs");
const d = B.doc({ slug, running, kicker, title, sub, rev, control });
const { p, rich, h1, h2, bullet, richBullet, note, fillIn, table,
        pageBreak, approval } = d;
h1("1. Statement of intent");
p("...");
approval();
d.build().catch((err) => { console.error(err); process.exit(1); });
```

## Why the PDF is not converted from the Word file

LibreOffice in this environment ships without its Writer module
(`libswlo.so` is absent), so `soffice` cannot load a `.docx` at all — not this
one, not any. Every block is therefore recorded as data as it is built, and
rendered twice: once through the `docx` library for Word, once as HTML that
Playwright prints to PDF. The footer template is the reason the print goes
through Playwright rather than the Chromium command line: only the protocol
print exposes one, and a twelve-page policy with no page numbers is a document
nobody can reference in a meeting.

`docx` is not a project dependency and is not in `package.json`. It is
installed in the session scratchpad, and `brand.cjs` holds the path.
Reinstall with `npm install docx` in that directory if it has gone, or set
`ETABLIX_DOCX` to point elsewhere.

## Before this document is issued

It is a draft until every bracketed field is filled and it is signed and dated.
The brackets are not decoration — each one marks a fact only the company can
supply, and an unsigned policy evidences nothing at a selection stage.

Three need real decisions rather than typing:

- **Section 7, the fatigue limits.** Set each figure to what will genuinely be
  worked to. A limit stated at a level the company routinely breaches is worse
  than no limit, because it is evidence of a rule being ignored.
- **Section 8, the support contacts.** Verify every route before issue. A
  helpline number printed wrongly in a wellbeing policy is the worst error
  available in this document and the one nobody checks.
- **Section 11, what is not in place.** Leave it in. It claims no occupational
  health provider, no employee assistance programme and no health surveillance,
  because none is in place. An assessor can verify a provider in one telephone
  call, and the document that survives that call is the one that did not claim
  one.

## What is deliberate

**It never says the company is safe or healthy.** It says what is assessed,
what is controlled and what is not yet in place.

**It refuses CDM duty holder roles by implication.** Section 1 states that
Principal Contractor and Principal Designer duties are not accepted by conduct
or by silence, consistent with every other ETABLIX document.

**No statistic appears without a source.** Section 5 points at the Office for
National Statistics analysis of suicide by occupation rather than quoting a
figure, because a number in a wellbeing policy that a reader cannot verify
costs more than it earns.

**The fatigue section reaches past our own hours.** This company specifies and
manages worker accommodation, so the duty starts at the specification: a room
without blackout fails a night shift worker months before anyone arrives on
site. That section is the part of the document that is ours rather than
generic, and it is the part a construction client will recognise.


---

## Equality, Diversity and Inclusion

Ten pages. The structure follows the occupational health policy: the law as a
table, then what the company does in its own work, then what it specifies for
others, then what is not in place.

### What is deliberate

**It publishes no workforce figures.** With one working director there are
none, and a table of percentages derived from one person is a fiction. Section
9 says so and lists what will be recorded from the first engagement instead.
This is the single most damaging thing an EDI policy could get wrong, and an
assessor reading a start-up's diversity statistics knows exactly what they are
looking at.

**Protective equipment is in it.** Most standard equipment is made to fit an
average adult male body, and equipment that does not fit does not protect. That
falls disproportionately on women, on smaller and larger workers, and on anyone
whose observance affects what can be worn — which makes it a safety defect and
a discrimination issue in the same breath. It is usually missing from both
policies that should carry it.

**Section 5 is the part that is ours.** The company specifies welfare, site
services and worker accommodation, so most of its real influence is exercised
in a specification written months before anybody arrives: separate secure
facilities, a mixed workforce assumed from the outset rather than retrofitted,
somewhere to pray and wash, catering that feeds everybody, and a proportion of
accessible rooms so a worker who becomes disabled mid-project does not have to
leave it. Each is cheaper on paper than on site.

**It names the gap it cannot close alone.** A company with one director has no
credible grievance route, because a procedure whose only destination is the
person complained about is not a procedure. Section 7 says so and section 11
repeats it as the first thing to fix. An external HR or employment law adviser
on a call-off basis closes it cheaply, and it is the section an assessor will
test.

### Before it is issued

- Name the independent grievance route at section 7. Everything else in the
  document can wait; this cannot.
- Record the training actually completed at section 8, or the booked date.
- Set the review interval and sign the cover.


---

## Health and Safety

Nine pages. Section 5 tabulates every CDM 2015 duty holder role against this
company's position on it, because "we do not accept Principal Contractor
duties" is worth more as a table a client cannot misread than as a sentence in
a paragraph.

Section 6 is the part that is ours. The company specifies compounds, temporary
power, welfare siting, lighting and logistics, and those decisions are made
months before the first operative arrives. A hazard designed into a compound
layout is one everybody on that site lives with for the duration, and no amount
of supervision afterwards removes it — pedestrian and vehicle segregation,
distribution sized for the actual load, lighting on the routes people walk at
shift change rather than only at the work faces, and an interface register that
names an owner for every boundary.

Two brackets must be filled before issue: the competent adviser at section 3,
because regulation 7 is not satisfied by an intention to appoint one, and the
insurance position at 4.12.

## Environmental

Seven pages. Section 4 says the company does not measure its carbon footprint
and does not report one, then says what will be measured and from when. A
figure produced for a policy rather than from data invites a question the
company cannot answer.

Section 5 is where the influence is. The largest environmental saving on any
project is the material never ordered, so the commitment is to challenge
quantity allowances and over-ordering and to record the challenge whether or
not it is accepted — a challenge made and refused is a different record from
one never made. It also specifies sub-metering in welfare and accommodation,
which is the cheapest decision in the section and the one most often left out,
and it treats silt entering a watercourse as what it is: an offence under
section 85 of the Water Resources Act 1991, not untidiness.

## Quality Management Arrangements

Five pages, and short on purpose. It is not laid out as an ISO 9001 manual and
does not use clause numbering that mirrors the standard, because the company
does not hold the certificate and a document that merely looks certified costs
more than it earns.

Two things in it are worth the read. It defines a defect as this work actually
produces one — a wrong number, a missed obligation, a notice issued after its
deadline — and it says plainly that with one director the check is the author's
own recorded second pass, which is not independent review and is not called
that.

The retention table is the part to act on. Section 135 of the Building Safety
Act 2022 extended the limitation period for claims under section 1 of the
Defective Premises Act 1972 to fifteen years prospectively and thirty
retrospectively. For anything touching dwellings a twelve-year retention is no
longer sufficient, and a firm that destroyed records on the old assumption will
defend a claim without the evidence that would have answered it.
