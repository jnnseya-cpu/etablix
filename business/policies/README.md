# Policies

`build-occupational-health.cjs` — **Management of Occupational Health,
including mental health and fatigue.** One script, two outputs, one content
list, so the Word file and the PDF cannot disagree.

```
node business/policies/build-occupational-health.cjs
```

Produces `ETABLIX-Occupational-Health-Policy.docx` and
`ETABLIX-Occupational-Health-Policy.pdf`.

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
installed in the session scratchpad and the path is at the top of the script.
Reinstall with `npm install docx` in that directory if the path has gone.

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
