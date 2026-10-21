# What is outstanding — 21 October 2026

Everything still open, in the order it should be done. The order is by what
unblocks the most, not by what is easiest.

Updated 21 October. Two things moved off this list in four days, and one of
them was the blocker behind nearly everything else on it.

## Today

**1. Send the Siemens Energy self-nomination.** The form is answered field by
field at `business/bids/siemens-energy-supplier-form.md`. Four things only you
can supply: telephone number in international format, VAT status, last filed
revenue and EBIT (or the decision to leave them blank), and the
concurrent-engagement figure in the capacity answer. Check your first and last
name against Companies House before submitting — the entity check compares
them, and **the legal name is JNN GLOBAL LTD, not ETABLIX**.

The insurance question on that form can now be answered. Do not submit before
26 October, because until that morning the cover is not in force and the
honest answer is still no.

**2. Send the Mace introduction** to scm@macegroup.com. Written and ready.
Diana has already told you it will be assessed for current or future need.

**3. Reply to Chris at ILI**, to Felipe at EMECON, to Sherwin at Flamecore and
to the Siemens Energy ticket. All four are written. The ILI one matters most:
it asks him to flag the transfer when the press release goes out, which is the
cheapest favour in the pipeline and the one with a real trigger behind it.

**4. Send the Marc Townsend email** with the letterhead document and the NDA
clause 5 redline. It has been ready for days.

## This week

**5. Take the new source list onto the live volume.** The source check has now
run twice on the server and the watcher is live with thirteen sources and a
full queue. One thing is left, and it is the consequence of getting the
earlier fix right: the live list lives on the data volume and is never
overwritten by a deploy, so a change in the repository does not reach the
server by itself.

    docker exec etablix cp /app/content/signals/sources.json /app/backend/data/signals-sources.json
    docker exec etablix node backend/tools/signals-check.mjs --all
    docker exec etablix node backend/tools/signals-check.mjs --probe

Both tools now say loudly when the live list has fallen behind. The probe
tries each unresolved source's candidate paths and prints the exact line to
paste, which turns four browser sessions into one command. Sell2Wales and
Public Contracts Scotland are the two worth resolving: they carry the schemes
this business cares about most.

**6. Insurance — DONE, with three things to keep in view.** Professional
indemnity and public liability, **£5,000,000 each**, JNN Global Ltd (Etablix
and JNseya Construction Consultant), policy CHDB5802551XB with Simply
Business. **In force from 26 October 2026 to 25 October 2027.**

This was the most common single blocker across every prequalification answered
this month. It is gone.

Three things it does not do, and one date that matters more than the rest:

- **It is not in force until Monday 26 October.** Nothing submitted before
  that morning may state that cover is held. If a document or a scope is ready
  to go to a client, send it on or after the 26th.
- **No employers' liability, correctly.** The company's only employee is the
  director, who holds a majority of the issued share capital, so it is exempt
  under the Employers' Liability (Compulsory Insurance) Act 1969. The
  exemption ends the day anyone else is engaged, including an associate on a
  single job. Arrange cover before that day, not on it. On a form, write the
  exemption out in full rather than leaving the field blank.
- **The policy insures a consultant.** Trade is recorded as "Consultant —
  building" and "Consultant — procurement". It almost certainly does not
  respond to holding works contracts as Prime Service Contractor, or to taking
  operational control as Management Integrator. Those need contractors' all
  risks and product liability, and a different conversation with an
  underwriter. Advisory work is fully covered; the other two models are not.
- **NEVER LET IT LAPSE.** The retroactive date is inception, 26 October 2026,
  and it was confirmed that it cannot be backdated. That costs nothing today
  because there is no delivered client advisory work behind it. But the
  retroactive date only stays at October 2026 while cover is continuous. A
  single lapsed month resets it to the new inception and retrospectively
  uninsures every year of work before it. **Diary the renewal for mid-September
  2027**, not the week before, and set up auto-renewal if it is offered. Ask
  again at renewal whether the retroactive date can be extended once there is a
  clean trading year behind it.

Two questions are still open with Simply Business and neither blocks anything:
whether the £5m limit is each-and-every-claim or in the aggregate — several
client contracts specify each-and-every, and an aggregate policy at the same
headline figure can fail a contract review — and what run-off cover would cost.
The email asking both is written.

**7. Buy Cyber Essentials.** Its reason changed this month. It is no longer a
general improvement to the paperwork: the Siemens Energy qualification has a
named cybersecurity module, and this answers it directly. It is the cheapest
certification available and the only one with a specific door behind it.

**8. Resubmit CHIC** through the eSourcing portal. The method statement and the
resubmission note are written, and the insurance answer that held it up now
exists.

## The qualification stack, in the order that unblocks the most

The insurance was the gate behind all of this. The sequence from here:

**13. Achilles UVDB — the next real purchase, from Monday.** National Grid's
own supplier page states it uses UVDB when compiling lists of potential
suppliers, and that high-risk categories must additionally pass UVDB Verify,
an audit of health, safety, quality and environmental capability. The
questionnaire asks for insurance, which is why it could not be started before
now. There is a small-supplier tier for firms with fewer than ten employees and
under £1m turnover, which this company qualifies for. Confirm current fees with
Achilles directly — the published figures found were undated.

**14. SSIP or the Common Assessment Standard.** CAS replaced PAS 91, which was
withdrawn in April 2023, and is the benchmark buyers now mean when they ask for
it. Most SSIP schemes require insurance evidence, so this was blocked behind
item 6 as well. It is the health and safety pass/fail on nearly every utility
and local authority gate.

**15. ISO 9001 only when a bid demands it.** A recent trade warning is explicit
that ISO certification does not by itself satisfy UVDB, so buying it first
would be buying the wrong thing in the wrong order. Document the quality
arrangements; certify when something specific requires it.

**16. Central Digital Platform — DONE.** Registered through Find a Tender with
GOV.UK One Login, supplier information complete, share code held. This is
mandatory under the Procurement Act 2023 and the precondition for every public
procurement, National Grid's dynamic market included.

Worth ten minutes before relying on it: the record is self-certified and must
be kept current. Check connected persons are complete with date of birth and
nationality, that the exclusion-ground declarations under Schedules 6 and 7 are
answered rather than skipped, and that the share code is to hand. Insurance is
probably not a field on it — the core record is identity, legal form, financial
standing, connected persons and exclusions — so keep the certificate PDF ready
to attach at tender stage.

## The National Grid route, and why it is tier two

**17. The big frameworks are shut. The dynamic market is not.** The Great Grid
Partnership named seven partners in 2024 and the £59bn supply chain frameworks
completed their final stage in August 2025, running five years with a
three-year option. Neither is a route.

But National Grid's Substation Construction procurement is a **dynamic market**
under the Procurement Act 2023 — intention notice February 2026, established
April 2026, modified June and August 2026. Under the Act a dynamic market
accepts applications at any point in its life, the authority must consider them
within a reasonable period and admit anyone meeting the conditions, and it
cannot cap the number of members. There is no deadline to miss.

Two cautions. Utilities dynamic markets may issue tender notices only to
members, so membership is the gate rather than a nicety; and a utility may
charge a fee for membership. See the fee before committing. And Lot 1 requires
acting as Principal Contractor under CDM, which this company must not hold or
imply — read that scope as proof the offer is a named line in their cost plan,
not as a lot to bid.

**18. Two live things in exactly the right scope.** A five-year framework
engagement in June 2026 covered substations at £200k–£5m and cabling at
£200k–£10m, with traffic management, temporary works and site establishment
named in scope — value bands an order of magnitude more realistic than the
mega-frameworks. Expressions of interest closed 18 June; check Find a Tender
for whether a formal tender followed. A Plant Hire Services framework was
estimated for publication in September 2026 and may include welfare equipment
as a lot; if it does, that is a direct bid rather than a tier-two approach.

**19. Write to the three NGED all-zone framework holders.** National Grid
Electricity Distribution named 31 suppliers on a £600m substation civils
framework on 1 October 2026, across ten geographical lots covering the South
West, Wales and the Midlands. Four firms hold places on **all ten lots** at £40m
each: AmcoGiffen, M Group, Pod-Trak and Coombes Forestry. The first three are
the targets; Coombes is vegetation management and needs a different letter.

The term is reported as **14 October 2026 to 13 October 2027 with a 12-month
extension option** — one year plus one, which is short. That changes the
argument: not "specify once and reuse for years" but "you are mobilising now
and there is no runway to re-learn this on each call-off." Verify the dates on
Find a Tender before quoting them.

These are distribution substations at 132kV down to 11kV — numerous small
sites, not worker villages. The argument is repetition, not scale. Do not let
it drift into accommodation language.

## Standing, and not to be forgotten

**9. Watch the trade press for an ILI transfer.** Chris confirmed the acquirer
is the construction counterparty and that announcements are always picked up.
On the day it appears, approach the acquirer directly — do not wait for ILI's
register to reach them, which is the slower of the two routes. ILI's own feed
is now enabled on the watcher, so this should arrive without being remembered.

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

**20. The South West Wales civils framework closes 2pm, 26 November 2026.**
Five councils, up to £800m, sixteen lots. Fifteen of them are self-delivery and
closed to this company. The one worth re-testing now that insurance exists is
**civil engineering resource services up to £100,000**, which supplements the
councils' in-house workforces and is consultancy-shaped rather than
plant-and-labour. Download the selection questionnaire from eTenderWales and
check whether SSIP is pass/fail. If it is not, it may be biddable. If it is,
the questionnaire is still worth having: it is a free written specification of
what any UK public framework will demand next.

**21. Defence Construction Canada, winter 2027.** A 60MW data centre in the
National Capital Region, CA$1.5–1.85bn, announced by advance procurement notice
with the competition itself not posting until winter 2027. Not biddable: no
Canadian entity, no Canadian clearance. One email is worth sending — whether
the early security clearance sponsorship extends beyond the prime contractor,
since clearance cannot be bought quickly and that window is open now. One email
and a diary note, not an afternoon. The watcher has it queued as early.

## What is finished and needs nothing

The website and the whole platform are clear of AI and agent language, enforced
by `vendor-silence.test.mjs` rather than by memory. The backup alert was a
units bug and is fixed and deployed. The supplier assessment draft is fixed,
restructured into something readable, and has one-click information requests
that hold an application pending until a person validates it.

The trigger watch is built, tested, shipped and **running**: thirteen sources
enabled, a full reading queue, six sectors, three stages — open, confirmed and
early — deadlines read as a countdown, the contractor named rather than the
client who let the work, and procurement notices read natively from Find a
Tender's own OCDS records rather than second-hand from the trade press. It has
no transport and must never gain one.

Professional indemnity and public liability at £5m each, from 26 October.
Central Digital Platform registration and share code.

## The one thing to remember about all of it

Nothing on this list is a substitute for the twelve threads already open. The
replies written this month landed because a person read the other side's
material and answered it specifically. The platform work makes that faster; it
does not make it unnecessary, and no amount of it writes the letter that gets
the first engagement.

What changed this week is narrower than it feels. The insurance does not win
work. It removes the sentence that ended the conversation — and there were four
separate places this month where that sentence was the whole answer.
