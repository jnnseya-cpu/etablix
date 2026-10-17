# What is outstanding — 17 October 2026

Everything this session left open, in the order it should be done. The order
is by what unblocks the most, not by what is easiest.

## Today

**1. Send the Siemens Energy self-nomination.** The form is answered field by
field at `business/bids/siemens-energy-supplier-form.md`. Four things only you
can supply: telephone number in international format, VAT status, last filed
revenue and EBIT (or the decision to leave them blank), and the
concurrent-engagement figure in the capacity answer. Check your first and last
name against Companies House before submitting — the entity check compares
them, and **the legal name is JNN GLOBAL LTD, not ETABLIX**.

**2. Send the Mace introduction** to scm@macegroup.com. Written and ready.
Diana has already told you it will be assessed for current or future need.

**3. Reply to Chris at ILI**, to Felipe at EMECON, to Sherwin at Flamecore and
to the Siemens Energy ticket. All four are written. The ILI one matters most:
it asks him to flag the transfer when the press release goes out, which is the
cheapest favour in the pipeline and the one with a real trigger behind it.

**4. Send the Marc Townsend email** with the letterhead document and the NDA
clause 5 redline. It has been ready for days.

## This week

**5. Run the source check on the VPS.**

    cd /opt/etablix && node backend/tools/signals-check.mjs --all

Four real sources are in `content/signals/sources.json`, all disabled because
they could not be reached from the machine that wrote them. The tool says
which answer, follows a site's own declared feed when a guessed path is wrong,
and prints exactly which to switch on. Then set `"enabled": true` for those,
and the queue fills at `https://etablix.com/internal/signals.html`.

**6. Buy the insurances.** Professional indemnity, public liability and
employers' liability where it applies. This is now the most common single
blocker across every prequalification answered this month, and the only one
that cannot be answered with "documented, not certified".

**7. Buy Cyber Essentials.** Its reason changed this week. It is no longer a
general improvement to the paperwork: the Siemens Energy qualification has a
named cybersecurity module, and this answers it directly. It is the cheapest
certification available and the only one with a specific door behind it.

**8. Resubmit CHIC** through the eSourcing portal. The method statement and the
resubmission note are written.

## Standing, and not to be forgotten

**9. Watch the trade press for an ILI transfer.** Chris confirmed the acquirer
is the construction counterparty and that announcements are always picked up.
On the day it appears, approach the acquirer directly — do not wait for ILI's
register to reach them, which is the slower of the two routes.

**10. Work the owners who already hold ILI schemes**, independently of any new
transfer. Statkraft, Field, Eelpower, JLEN with Foresight. The developer is a
signpost, not a customer, and that conclusion does not depend on anything
happening next.

**11. Answer every subcontractor registration the same day**, from
`business/marketing/supply-chain-reply-template.md`. The Facebook carousel, if
it runs, makes this a daily obligation rather than an occasional one. An
advert that buys a registration and leaves it in silence proves its own first
card right.

**12. Telephone the mortgage lender while the account is up to date.** A
conversation started early is a different conversation from one started late,
and this is the only item on the list with a date that moves on its own.

## What is finished and needs nothing

The website and the whole platform are clear of AI and agent language, enforced
by `vendor-silence.test.mjs` rather than by memory. The backup alert was a
units bug and is fixed and deployed. The supplier assessment draft is fixed,
restructured into something readable, and has one-click information requests
that hold an application pending until a person validates it. The trigger watch
is built, tested and shipped with its sources ready to enable.

## The one thing to remember about all of it

Nothing on this list is a substitute for the twelve threads already open. The
replies written this month landed because a person read the other side's
material and answered it specifically. The platform work makes that faster; it
does not make it unnecessary, and no amount of it writes the letter that gets
the first engagement.
