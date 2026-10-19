# What the weekly briefing caught, and the watcher did not

19 October 2026. Internal note. Not for circulation.

The same week's news was read twice over: once by a general assistant asked for
a weekly opportunity briefing, once by the trigger watcher built into the
platform. The briefing was better, and not by a little. This note says exactly
how, because the reason matters more than the result.

## It was not a tuning problem

Every miss was **structural** — a whole class of event the watcher had no
concept of, not a pattern that needed loosening. Six of them:

**1. It read commentary, never the record.** Every source was trade press:
somebody writing about a decision after it was taken. The decisions themselves
are published in full — winner named, value stated, contract period given — on
Find a Tender, Contracts Finder, Sell2Wales, Public Contracts Scotland, TED and
TenderNed. The briefing's hardest lead was a Sell2Wales award notice naming the
contractor, the value and the dates. The press had not covered it and probably
never will; it covers a small fraction of what is notified.

**2. It had no idea a supplier event existed.** A Meet the Buyer is a door
somebody has deliberately left open: the other side has already said yes to
being approached, the scheme is named, and the date is published. Nothing else
we watch for produces a moment like that, and we were not watching for it.

**3. It fired too late.** Our earliest trigger was consent granted. By then the
developer has a programme and usually a contractor. The money moves a step
earlier — an eligibility submission to Ofgem, a pre-construction funding
request, an application lodged. Those name the scheme, the promoter and roughly
when construction starts, eighteen months before anyone asks for a quote.

**4. It ignored dated public events.** A consultation drop-in is a fixed day on
which a named scheme's project team is in public with the compound locations on
the boards. It is the cheapest way there is to find out whether a scheme has a
temporary worker estate at all.

**5. It did not notice schemes moving.** A tunnel drive finishing, a TBM coming
out, first power, topping out — each means a contractor already on that site is
about to need the next thing, and that the establishment they have is about to
be wrong for the next phase. None of it reads as news about a contract, so
nothing caught it.

**6. It told us what happened, not who to write to.** On an award, the party
that needs accommodation, welfare, a compound and the logistics around them is
the **contractor who won it**, not the client who let it. The queue showed a
headline and a source and made the reader open every link to find the one name
that decides whether the signal is worth an hour.

And underneath all six: no dates, and no separation between a notice closing on
Friday and a consultation about a scheme that breaks ground in 2028. Sorted by
score, the queue would happily have put the closed one first.

## What has been changed

- **Procurement portals added** as sources, and the sweep now reads OCDS and
  other JSON notice APIs natively — the winner, the value and the contract
  period come off the record itself, with no journalist in between and no name
  inferred. Nine new sources, all shipped disabled until checked.
- **Five new triggers**: an open notice, a supplier event, pre-consent funding
  and submissions, a dated consultation, and a phase completing.
- **Three stages**, and the queue reads them separately. *Open* — a live
  opportunity with a date, act this week. *Confirmed* — it has happened,
  approach whoever holds it. *Early* — build the relationship, and say plainly
  that it is early. The approach draft now writes to the stage; an early
  approach that pretends to be a late one is the fastest way to be remembered
  badly.
- **Dates**, read as a countdown. An open notice whose date has passed is
  dropped at the door rather than left at the top of a queue sorted by score.
- **Names extracted**, and labelled honestly on screen as a hint rather than a
  fact, because the method will sometimes offer a place or a scheme instead.

## What is still true of the comparison

Three things the briefing did that this still does not, and one that it cannot.

- **TED cannot be read.** Its search API is POST-only. The watcher issues GET
  requests and must keep doing so — a watcher that can POST is one step from a
  watcher that can submit things, and that line is the whole design. TED is read
  by hand for the schemes we already follow, or not at all. It is not pretended
  otherwise.
- **Nine of the new sources are unverified**, and so are twelve of the older
  ones. A URL nobody has checked is disabled, because a watcher pointed at a
  dead address reports nothing and nothing looks exactly like a quiet market.
  Until `signals-check.mjs --all` has been run on the server and the answering
  ones switched on, the coverage above is a capability and not a fact.
- **It still does not judge.** It ranks a reading queue. The briefing drew
  connections between schemes — that the same promoter had three things moving
  at once, that one contractor was appearing repeatedly — and nothing here does
  that yet.
- **It will never send anything.** That is not a gap. The approach is written
  and sent by a person from their own mailbox, a few a week, and there is no
  transport anywhere in the module by design.

## The honest conclusion

A general reader with no rules beat a purpose-built watcher because the watcher
had been given a narrow idea of what counts as a moment, and had enforced it
very well. The patterns were not the problem; the definition was. The fix was to
widen what the thing is allowed to notice, not to make it cleverer about what it
already saw.

The one job outstanding is unglamorous and it is the whole of the value: run the
check on the server, and switch on the sources that answer.

---

## Addendum — the first live run, 19 October 2026

The check was run on the server against all 25 sources. It found six defects
the 248 tests did not, because every one of them needs a real feed to show up.

**Find a Tender and Contracts Finder both answered**, as OCDS JSON, exactly as
hoped. They are the first notice sources we have ever had. They also offered
**70 of 100** and **95 of 100** notices respectively — every one a genuine
contract award, and almost none of it our work: pricing agreements for cough
assist therapy devices, periodicals subscriptions, a rightsizing project in Hong
Kong. Unfiltered they would have ended the queue rather than filled it, so the
portals now require an item to land in one of our six sectors. Trade press is
deliberately *not* gated — an editor's judgement about what counts as
construction news is the only thing trade press is for.

**The award trigger was missing plurals.** Every noun in every pattern was
singular, so "Root-Power *awards contracts* for three BESS projects" and "Alstom
awarded €95 million signalling *contracts*" both scored as a bare value. The
most important trigger in the file, silently missing the commonest phrasing.

**Title Case defeated the name extractor.** Notice headings capitalise every
word, so "AGR Unique Ref", "Cough Assist Therapy Devices" and "Hong Kong SCR
Rightsizing" were being offered as organisations to write to. Where nearly every
word is capitalised the capital means nothing, so nothing is claimed now — and
for OCDS the names come out of the record's own fields instead of a regex.

**TenderNed's 406 was ours, not theirs.** Our accept header offered only HTML
and XML; it serves JSON. A notice API refused on content negotiation reads on
screen exactly like a dead URL.

**And the live source list was still not live.** It resolved the data volume
only when `ETABLIX_DATA_DIR` was set, and nothing sets it — the volume is found
by falling back to `/app/backend/data`. The check tool was reading the copy baked
into the image, which a deploy overwrites. "Edit it, no deploy needed" was false
for the second time. Now fixed against the path the database actually uses, with
a test asserting the two agree.

**Enabled, from 2 to 13**: SSEN Transmission, Solar Power Portal, Rail Business
Daily, Mining Weekly, Engineering News, reNEWS, Data Centre Dynamics, ILI Group
(its own declared feed — this is the ILI transfer watch), Find a Tender,
Contracts Finder and eTenders Ireland.

**Still outstanding**, in order of what they are worth: Sell2Wales and Public
Contracts Scotland, both of which carry the schemes we care about most;
TenderNed, which should be rechecked first since the fault was ours; and the two
supply-chain pages, which are where a Meet the Buyer would be found and which
nothing is yet watching.

The pattern across all six: the module was written against examples I invented,
and it passed 248 assertions while being wrong in ways only real feeds reveal.
The tests were not weak. They were testing a fiction.
