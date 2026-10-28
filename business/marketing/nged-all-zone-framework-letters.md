# The three NGED all-zone framework holders — approach letters

National Grid Electricity Distribution named 31 suppliers on its £600m substation
civils framework on 1 October 2026, across ten geographical lots covering the
South West, Wales and the Midlands. Four firms hold a place on **all ten lots**:
AmcoGiffen, M Group, Pod-Trak and Coombes Forestry. The first three took the
same argument in three forms. Coombes needed a different letter and now has
one — see section 4 for why it is a different argument rather than a weaker
version of the same one.

## Verified contact routes

| Company | Route | Source |
|---|---|---|
| **Pod-Trak** | `procurement@pod-trak.com` (Supply Chain), `tenders@pod-trak.com` (tenders and frameworks) | Published on their own contact page |
| **AmcoGiffen** | `supplychain@amcogiffen.co.uk` | Published on their own supply chain page |
| **M Group** | `info@mgroupltd.com` — confirmed by the director. ~~`enquiries@mgroupltd.com`~~ was wrong and was rejected | Address confirmed directly; the fields to send are from their contact page |
| **Coombes Group** | `enquiries@coombesgroup.com` | Published on their own contact page |

Pod-Trak also publishes 0845 450 4190; AmcoGiffen 01226 243413; M Group
+44 (0)1438 743 744; Coombes 01730 231 761, at Unit 6 New Buildings Farm,
Winchester Road, Petersfield GU32 3PB. Two addresses found for Coombes
elsewhere — one on a membership page naming the managing director directly, one
on a directory using a domain the company no longer uses — are deliberately not
used: the first is years old and the second does not match their current site. A named procurement and supply chain director was announced
at AmcoGiffen in 2022 — do not use the name without confirming the person is
still in post.

## The term is NOT quoted as fact in any of these letters

Trade reporting puts it at 14 October 2026 to 13 October 2027 with a 12-month
extension option. The Find a Tender notice, published April 2026, gives
estimated dates of 22 June 2026 to 21 June 2027 with an extension to June 2028.
**The two disagree and both predate the award.** Each letter therefore says
"reported as" and invites correction, which is honest, shows the homework, and
is better letter-craft than asserting a date to the company that holds the
contract and knows it.

## What happened when they were sent, 28 October 2026

Pod-Trak, AmcoGiffen and Coombes were delivered without a bounce. **M Group's
gateway rejected the message outright:**

    554 Email rejected due to security policies
    eu-smtp-inbound-1.mimecast.com (195.130.217.201)

**Three delivering and one refusing is the useful fact.** It clears this
domain's mail authentication: a broken DKIM key or a failing SPF record would
have troubled all four, not one. The DKIM revocation recorded in
`deploy/EMAIL-DELIVERABILITY.md` on 8 September is still worth fixing, but it
is not what caused this.

**THE ADDRESS WAS WRONG.** `enquiries@mgroupltd.com` came from structured data
on their website rather than from a visible contact line, and it was flagged at
the time as needing confirmation. It was not confirmed before sending. The
correct address is **`info@mgroupltd.com`**.

**And the bounce code hid it.** A non-existent mailbox normally returns 550 with
"user unknown", which is why a 554 citing a security policy was read here as a
filter rejecting a known-good address. That reading was wrong: Mimecast tenants
commonly configure recipient validation AS a policy, so an unknown recipient
comes back as a generic 554 rather than a clean 550. The lesson is not about
Mimecast — it is that an address taken from page metadata is a guess until
somebody confirms it, and the bounce you get from a guess may not tell you that
is what happened.

Do not resend to the old address. Send to `info@mgroupltd.com`.

## Why three letters and not one sent three times

They are competitors and will not compare notes, but each is a different
situation and a generic letter reads like one:

- **Pod-Trak** said publicly that this is their **first framework with NGED**.
  The pattern-setting argument lands hardest here — nothing is established yet,
  so the early call-offs become the precedent.
- **AmcoGiffen** is long established in rail and energy and already works for
  network owners. The argument is not capability; it is **ten zones at once**,
  and they are visibly set up for this conversation with a published supply
  chain route.
- **M Group** is a group of operating businesses. The argument is
  **consistency between them**, and their contact page asks for specific
  information, so that letter answers those fields in order.

## The thing none of them may be told

There is no completed contract example. `the-bottleneck.md` records that every
live thread asks the same question in a different form: *has anyone paid you to
do this, and will they say so?* The M Group letter asks for project examples
directly, so it says plainly that the record offered is the director's, not the
company's — which is the same position a government assessment team accepted in
writing as satisfying their requirement.

Nothing in these letters implies CDM Principal Contractor or Principal Designer;
all three hold those roles themselves on their own sites. Prime Service
Contractor is not offered, because the insurance covers a consultant. No price
appears.

---

## 1 · Pod-Trak

**To:** procurement@pod-trak.com · **cc:** tenders@pod-trak.com
**Subject:** Site-services package on the NGED substation civils framework

Dear Pod-Trak Supply Chain team,

Congratulations on securing all ten lots on National Grid Electricity
Distribution's substation civils framework. You described it as your first
framework with NGED, which is the reason I am writing today rather than in six
months.

These are distribution substations from 132kV down to 11kV — many small sites
rather than a few large ones. The site-services package that goes with them
(site establishment, access, welfare, security and waste) is the part that gets
repeated on every call-off, and on a first framework the way the earliest ones
are set up becomes the pattern everything later copies. Reporting puts the term
at one year plus a twelve-month option; if that is right, there is not much
runway to re-learn it.

I am Justin Ngolu Nseya, director of JNN Global Ltd, trading as ETABLIX. I do
that package in two halves:

- **The paper** — output specification, package boundaries and tender documents,
  so it is specified once and reused across the lots.
- **The site** — procurement, mobilisation and the interfaces between those
  suppliers.

Under either, **you hold every supplier contract and I never hold your
supply-chain money.** Fixed scope, fixed fee.

Would a twenty-minute call with whoever is setting up the call-off process be
useful? I am happy to come to you.

Kind regards,

Justin Ngolu Nseya
Managing Director, JNN Global Ltd (company number 15405437), trading as ETABLIX
Groupe Nseya House, Kingstanding, Birmingham B44 8DJ
contact@etablix.com · +44 7493 216101

---

## 2 · AmcoGiffen

**To:** supplychain@amcogiffen.co.uk
**Subject:** Site-services package across all ten NGED lots

Dear AmcoGiffen Supply Chain team,

Congratulations on your place across all ten lots on National Grid Electricity
Distribution's substation civils framework.

I am not writing about whether you can deliver substation civils — you have been
doing it for network owners for years. I am writing about the arithmetic of ten
geographical zones at once. The site-services package on each call-off — site
establishment, access, welfare, security and waste — is small enough per site to
be handled locally and repeated often enough that handling it locally ten times
over is how inconsistency and cost creep in.

I am Justin Ngolu Nseya, director of JNN Global Ltd, trading as ETABLIX. That
package is what I do, in two halves:

- **The paper** — one output specification and one set of package boundaries,
  written once and applied across every zone.
- **The site** — procurement, mobilisation and the interfaces between those
  suppliers, so the standard is the same in Cornwall as in Lincolnshire.

Under either, **you hold every supplier contract and I never hold your
supply-chain money.** Fixed scope, fixed fee.

Reporting puts the framework term at one year plus a twelve-month option. If
that is right, the window to set this up once rather than ten times is now; if
it is longer, I would be glad to be corrected.

Could you point me to whoever owns the site-services or temporary-works
packages on these call-offs?

Kind regards,

Justin Ngolu Nseya
Managing Director, JNN Global Ltd (company number 15405437), trading as ETABLIX
Groupe Nseya House, Kingstanding, Birmingham B44 8DJ
contact@etablix.com · +44 7493 216101

---

## 3 · M Group

**To:** enquiries@mgroupltd.com
**Subject:** Supply chain consideration — site services, NGED substation civils framework

Dear M Group,

Your contact page invites organisations seeking inclusion in your supply chain
to get in touch with specific details. They are set out below.

I am writing now because of your place across all ten lots on National Grid
Electricity Distribution's substation civils framework. With several operating
businesses working across those zones, the site-services package on each
call-off — site establishment, access, welfare, security and waste — is
repeated often, in small amounts, by different teams. Keeping it consistent
between those businesses is the problem I would like to help with.

**Company name:** JNN Global Ltd, company number 15405437, trading as ETABLIX.
Registered office: Groupe Nseya House, Kingstanding, Birmingham B44 8DJ.

**Contact:** Justin Ngolu Nseya, Managing Director. contact@etablix.com,
+44 7493 216101.

**Services and areas of expertise:** the site-services package on construction
and utilities projects — site establishment, worker accommodation, welfare,
catering, security and waste — delivered in two halves. **Advisory:** output
specification, package boundaries and tender documents, with you contracting
every supplier. **Management Integrator:** you still hold every contract, and I
run the procurement, mobilisation and the interfaces between those suppliers.
Under both, **I never hold your supply-chain money.** Fixed scope, fixed fee.

**Geographic trading locations:** England, Scotland and Wales.

**Annual turnover and project examples:** here I will be straight with you
rather than waste your assessor's time. The company is newly trading and has no
completed contract example of its own. What is offered instead is the director's
delivery record, set out as a formal statement of relevant experience — the same
position a government framework assessment team confirmed in writing satisfies
their contract-example requirement. I will send it on request, with management
accounts and insurance certificates.

Professional indemnity and public liability are in force at £5,000,000 each. The
company is registered on the Central Digital Platform and the share code is
available. There is no employers' liability, correctly: the only employee is the
director, who holds a majority of the issued share capital, so the company is
exempt under the Employers' Liability (Compulsory Insurance) Act 1969.

If site services sit outside what you buy centrally, I would be grateful to be
told so plainly rather than left in a queue.

Kind regards,

Justin Ngolu Nseya
Managing Director, JNN Global Ltd, trading as ETABLIX
contact@etablix.com · +44 7493 216101

---

## 4 · Coombes Group (Coombes Forestry)

**Why this is a different argument, not a weaker one.** The note that produced
these letters said Coombes "is vegetation management and needs a different
letter". That was right, and the reason is specific: Coombes is the only one of
the four whose core trade *produces* a waste stream rather than merely
generating a skip. For a civils contractor arisings are a container at the gate.
For a vegetation contractor across ten zones they are volume, duty of care,
haulage and a disposal route, on dozens of small rural sites at once.

The letter is careful not to suggest they cannot manage their own arisings —
that is their trade and they are better at it than anybody writing to them. The
offer is everything *around* the cutting: the compound, welfare and access for
crews, security while working inside a live substation, and the chain off site.

**And they are a target twice over.** Their own site describes them as rail and
forestry contractors. Rail is one of the six sectors this business sells into,
and possession work has the same repeated site-establishment problem on a much
shorter clock. The letter raises that once, at the end, as a request for an
introduction rather than a second pitch.

Note for the avoidance of confusion: the signals watcher deliberately excludes
vegetation management from the queue, because ETABLIX does not bid for tree
work. Selling site services *to* a vegetation contractor is the opposite
transaction and there is no conflict between the two.

**To:** enquiries@coombesgroup.com
**Subject:** Site establishment and arisings across the ten NGED zones

Dear Coombes team,

Congratulations on your place across all ten lots on National Grid Electricity
Distribution's substation civils framework.

I am writing about the part of that work which is not your trade. The vegetation
is. What repeats on every one of ten zones is everything around it — the
compound, welfare and access for crews on small rural sites, security while
working inside a live substation, and the arisings chain off site. On a civils
call-off, waste is a skip at the gate. On yours it is volume, duty of care,
haulage and a disposal route, on dozens of sites at once.

I am Justin Ngolu Nseya, director of JNN Global Ltd, trading as ETABLIX. I do
that package in two halves:

- **The paper** — output specification, package boundaries and tender documents,
  written once and applied across every zone.
- **The site** — procurement, mobilisation and the interfaces between those
  suppliers.

Under either, **you hold every supplier contract and I never hold your
supply-chain money.** Fixed scope, fixed fee.

One other thing. Your own site describes Coombes as rail and forestry
contractors, and rail possession work has the same repeated site-establishment
problem on a much shorter clock. If that sits with someone else at Coombes, I
would welcome the introduction.

Could you point me to whoever owns the site-services or temporary-works packages
on these call-offs?

Kind regards,

Justin Ngolu Nseya
Managing Director, JNN Global Ltd (company number 15405437), trading as ETABLIX
Groupe Nseya House, Kingstanding, Birmingham B44 8DJ
contact@etablix.com · +44 7493 216101
