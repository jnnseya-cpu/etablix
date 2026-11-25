# Brand source artwork

**Nothing in `source/` is approved for use.** These are the files as supplied,
kept so they are not lost and so the next version can be diffed against them.
The live mark is still `frontend/public/img/logo-mark.svg`, and the site header
is built from that mark plus HTML text rather than from a lockup image.

## What was supplied, 25 November 2026

| File | Strapline | Status |
|---|---|---|
| `source/etablix-lockup-2026-11-25.webp` / `.png` | "a Nseya Groupe Construction company" | superseded, same day |
| `source/etablix-endorsed-2026-11-25b.png` | "a Nseya Group **Construction** company" | latest supplied, **not approved** |

**Between the two files exactly one letter changed**, Groupe to Group. The
device, the wordmark, the "INTEGRATED SITE SERVICES" rule and the ink are
identical in both: dark `rgb(21,33,28)`, gold `rgb(198,163,98)`, transparent
background, 3:1. Neither file changes the mark, so the mark on the site is
already correct and nothing about it needs updating.

## Why neither is approved yet

See `STRAPLINE-CORRECTION.md`. In short, both straplines say **"a … company"**,
which asserts a parent entity. There is one legal entity — JNN GLOBAL LTD,
company 15405437 — and no parent. The second file is named `ETABLIX_Endorsed`,
which is the brand-architecture term for exactly that structure, so this reads
as deliberate design intent rather than a slip, and it is the thing to settle
before any of it is published.

## The colours are not taken from these files

The supplied WebP is lossy and the PNG is a conversion of it, so a sampled hex
is within compression noise of the truth and is **not** authoritative for a
brand colour. The hand-built `logo-mark.svg` keeps its own values until a
vector source arrives. The director confirmed on 25 November that the SVG or AI
file is coming; when it does, the lockup is rebuilt as SVG — a few KB instead
of 380 KB, crisp at any size, and themeable for dark backgrounds.

## Still outstanding, 25 November 2026

Three things, and only one of them is ours to do.

| Item | Owner | Status |
|---|---|---|
| Vector source (SVG or AI) for the ETABLIX lockup | Justin Nseya | confirmed coming; the lockup is rebuilt as SVG when it lands, and the brand gold is taken from it rather than sampled |
| Nseya Consultancy and Nseya Construction logos | Justin Nseya | **never supplied.** Nothing named for either exists in this repository; `find` returns only the director's photograph and the three ETABLIX lockups above. Nothing has been invented in their place |
| The group footer line on `etablix.com`, linking to the group site | done, this repository | the strapline words "Groupe Nseya" now link to `https://www.nseyagroup.com` on all 18 public pages that carry the strapline, held by `backend/test/brand-naming.test.mjs` |

**The group domain is unverified from here.** `www.nseyagroup.com` is refused by
the build session's network policy (403 from the proxy, no DNS answer), so the
URL has been recorded exactly as supplied by the director on 25 November and
has **not** been loaded. A footer link on 18 pages that returns nothing is a
worse fault than no link, so it is checked in a browser before the next
deployment. Owner: Justin Nseya. By: 26 November 2026.

**And the domain reads "Nseya Group", not "Groupe Nseya".** That is noted, not
acted on. The enforced form is "Groupe Nseya", matching the registered office
at Groupe Nseya House and 54 files, and a domain is not evidence of a renaming
— but if the group is genuinely "Nseya Group", the registered office building
name, the professional indemnity certificate and a Companies House check move
with it, and the rule in `CLAUDE.md` changes before the files do, not after.

## The site does not name the second trading name

Separate from the artwork, and found while linking the footer. Twenty-one
public pages carry:

> ETABLIX and Groupe Nseya are trading names of JNN GLOBAL LTD

**JNseya Construction Consultant appears on no page at all** — and that is the
form the professional indemnity certificate records, which makes it the only
trading name a reader can verify against a document. "Groupe Nseya" is named as
a trading name instead, and whether it is registered as one is a fact this
session does not hold.

Not changed here. A statement about the legal entity on twenty-one published
pages is the director's to settle, and the correction depends on which names
are actually registered. Owner: Justin Nseya. By: 1 December 2026.
