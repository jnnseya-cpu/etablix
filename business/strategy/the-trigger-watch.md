# The trigger watch — what it is, and what it refuses to be

**Built 17 October 2026, after the question: could ETABLIX have something that
goes round the internet, finds company email addresses and sends them an
automatic approach?**

Technically, yes. Crawl pages, regex for addresses, send over SMTP. A few
hundred lines and no third-party service needed. It was not built, and this
records why, because the question will come back when money is short.

## Why not the harvester

**It would destroy the only channel the business runs on.** `etablix.com` is a
young domain with almost no sending history. Cold volume from it reaches spam
traps and blocklists within days, and then nothing arrives: not the ILI
follow-up, not the Mace introduction, not a supplier reply. Every careful
letter written this month depends on the domain still being trusted. Domain
reputation is slow to earn and fast to lose.

**The legal position is narrower than it looks.** Under PECR, marketing email
to corporate subscribers — limited companies and LLPs — does not need prior
consent, so business-to-business cold email is lawful in principle provided the
sender is identified and opt-outs are honoured. Three things then bite. Sole
traders and ordinary partnerships count as individual subscribers and need
consent. A named work address is personal data under the UK GDPR even though
the company is not a person. And Article 14 obliges anyone who collects
personal data from somewhere other than the person to tell them where it came
from, normally within a month — answerable for ten people and dishonest at any
scale a crawler reaches.

**And it contradicts what works.** The replies that landed this month landed
because they had evidently been written by somebody who read the other side's
material. An automated blast is recognisable in one line.

## What was built instead

A watcher that finds **moments, not addresses**: the point at which a scheme
has just become somebody's problem and nobody has answered it yet. Consent
granted. Main contractor appointed. Project transferred to an owner. Financial
close. A workforce large enough to need housing.

It queues what it finds, with the evidence and the published route in. **A
person reads the queue, writes the approach and sends it from their own
mailbox.** Nothing is sent by the machine, and nothing in it can send.

| Part | Where |
|---|---|
| Polite fetching: robots.txt, rate limits, conditional requests | `backend/lib/signals/fetch.js` |
| The published contact route, and the personal-data gate | `backend/lib/signals/contact.js` |
| Triggers, deduplication, suppression, the sweep | `backend/lib/signals/index.js` |
| The reading queue | `backend/routes/signals.js` |
| Sources, edited without a deploy | `content/signals/sources.json` |
| Source health check | `backend/tools/signals-check.mjs` |
| Runs on the existing sweep as rule `signal_watch` | `backend/lib/automation.js` |

## The three rules, and why each is a test rather than a comment

**robots.txt is obeyed and hosts are rate limited.** Consulted before the
request, never after. One request per host at a time, never faster than the
host's own Crawl-delay and never faster than five seconds. A host whose
robots.txt cannot be read is treated as closed rather than open. Ignoring
robots.txt is not a shortcut; it is a company deciding other people's stated
wishes do not apply to it, which is a strange position for one that sells
accountability.

**No personal email address is ever stored.** Role addresses only, from a
closed allowlist — a local part containing a dot, a plus or a digit is personal
by definition, so `j.smith@`, `jsmith2@` and `info.john@` are all discarded.
Everything written passes through one scrubbing function that also strips raw
page text, so a change elsewhere cannot start persisting personal data without
that function being changed, and changing it fails the build.

**The suppression list cannot be overridden.** It is checked inside the only
function that writes to the queue, and again when a signal is marked
approached — so something queued before a suppression existed still cannot be
acted on. There is no API route to remove a suppression: taking a name off a
do-not-contact list should cost a database edit and a moment's thought, not a
button.

**And a fourth, structural.** There is no transport anywhere in the module, and
the test asserts there is none. The moment a watcher can also send, it becomes
the thing it was built instead of.

## Using it

Sources ship **disabled**, because a URL invented at build time is a 404 at run
time, and a watcher quietly fetching nothing looks exactly like a quiet market.

1. Edit `content/signals/sources.json`. An RSS or Atom feed works far better
   than a listing page. Add the organisation's own supplier or contact page as
   `contactPage` and the watcher will find the published route in.
2. Check the URL in a browser, then set `enabled: true`.
3. Run the check **inside the container**, because the live source list lives
   on the data volume and the host's Node is older than the container's:

       docker exec etablix node backend/tools/signals-check.mjs --all

   It names the file it read, says which sources answer, which are barred by
   robots.txt and which have moved, follows a site's own declared feed when a
   guessed path is wrong, and — when a feed parses but nothing matches —
   prints what it actually holds, so a quiet day can be told from a wrong
   pattern.

4. Sweep, also inside the container, since it writes to the same volume:

       docker exec etablix node backend/tools/signals-sweep.mjs

   It prints what queued and why. Running it on the host would write to a
   different store and report success while the screen stayed empty.
5. The automation sweep runs it from then on. Signals scoring five or more
   raise one notification every twelve hours.

**Start with the sources already known to matter.** The acquirers that buy ILI
schemes announce transfers by press release. Main contractor appointments are
carried by the trade press. Section 36 and DCO decisions are published. Those
are three real feeds and worth more than thirty speculative ones.

## The honest expectation

This does not produce customers. It produces **ten well-aimed approaches a week
instead of one**, and it removes the hour a day that finding them costs. The
conversion still depends on the letter, and the letter still has to be written
by the person who will answer the telephone afterwards.
