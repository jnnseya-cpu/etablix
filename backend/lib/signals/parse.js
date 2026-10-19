/**
 * The parts with no database behind them: triggers, sources, parsing.
 *
 * WHY THESE ARE SEPARATE. signals-check.mjs is a diagnostic — it reads a URL
 * and says whether it answers. It needs none of the storage, yet it imported
 * the queue, which imports the store, which imports node:sqlite. On a host
 * running Node 20 that is not a built-in module, so the tool for diagnosing a
 * problem could not start, with an error about SQLite that had nothing to do
 * with anything it does.
 *
 * A diagnostic that cannot run on the machine you are diagnosing is not a
 * diagnostic. So the pure half lives here and depends on nothing but Node:
 * the check tool runs anywhere fetch exists, inside the container or on the
 * host, whatever version it happens to be.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/**
 * WHERE THE SOURCE LIST LIVES, AND A CLAIM THAT WAS WRONG.
 *
 * The file this shipped with said "sources are data, not code — edit the file
 * and the next sweep picks it up; no deploy". That is true of a checkout and
 * false of this deployment. content/ is copied into the Docker image at build
 * time, so editing /opt/etablix/content on the host changes a file the running
 * container never reads, and the next deploy overwrites it anyway. Following
 * that instruction would have looked exactly like the watcher ignoring the
 * list.
 *
 * So the live list belongs on the data volume, which is mounted, persists
 * across deploys and is the only writable thing in there. The copy in the
 * repository becomes a seed: it is written to the volume once, if nothing is
 * there yet, and is never read again. After that the file on the volume is
 * the truth and editing it needs no deploy — which is what was promised.
 */
const REPO_SOURCES = path.join(root, "content", "signals", "sources.json");

/**
 * AND THE PROMISE WAS STILL NOT KEPT, WHICH THE FIRST LIVE RUN PROVED.
 *
 * This resolved the volume only when ETABLIX_DATA_DIR was set. Nothing sets it
 * in production: deploy.sh mounts the named volume at /app/backend/data and
 * store.js finds it by falling back to that path, not by reading an
 * environment variable. So on the server DATA_DIR was null, the live list was
 * never used, and the check tool printed "reading: /app/content/signals/
 * sources.json" — the copy baked into the image, which a deploy overwrites.
 *
 * Editing the list without a deploy would have silently done nothing for the
 * second time. The fix is to default to the same path store.js defaults to,
 * computed here rather than imported, because parse.js must not reach the
 * store. A test asserts the two agree, so the next person to move it moves
 * both.
 */
const DATA_DIR = process.env.ETABLIX_DATA_DIR
  ? path.resolve(process.env.ETABLIX_DATA_DIR)
  : path.join(root, "backend", "data");
const LIVE_SOURCES = path.join(DATA_DIR, "signals-sources.json");

export function sourcesFile() {
  if (process.env.ETABLIX_SIGNALS_SOURCES) return path.resolve(process.env.ETABLIX_SIGNALS_SOURCES);
  if (!fs.existsSync(path.dirname(LIVE_SOURCES))) return REPO_SOURCES;
  if (!fs.existsSync(LIVE_SOURCES)) {
    // Seeded once, and only if the volume has nothing. A deploy must never
    // overwrite a list somebody has edited.
    try { fs.copyFileSync(REPO_SOURCES, LIVE_SOURCES); } catch { return REPO_SOURCES; }
  }
  return LIVE_SOURCES;
}

export const TRIGGERS = [
  // HOW THE TRADE PRESS ACTUALLY WRITES. The first version of this matched
  // "has been awarded a contract" and scored ten items from a live UK
  // construction awards feed at zero. Nobody writes that. They write wins,
  // lands, secures, nets, bags, named on, picked for, gets the nod. Ten
  // items and no hits was not a quiet market, it was a wrong list, and it
  // would have been read as the former for weeks.
  { id: "award", label: "Contract awarded or contractor appointed", weight: 3,
    patterns: [
      /\b(wins?|won|lands?|secures?|nets?|bags?|clinches?|scoops?)\b[^.]{0,70}\b(contracts?|deals?|jobs?|schemes?|works|packages?|frameworks?|projects?)\b/i,
      /\b(contracts?|deals?|jobs?|schemes?|works|packages?|frameworks?)\b[^.]{0,50}\b(win|won|awarded|handed|landed)\b/i,
      /\b(awarded|appointed|selected|chosen|named|picked|confirmed)\b[^.]{0,70}\b(contracts?|contractors?|suppliers?|partners?|frameworks?|to (build|deliver|design))\b/i,
      // "OCU Utility Services awarded Walpole SGT4 substation WORKS". The
      // pattern above wanted a contract noun and "works", "package" and
      // "scheme" are not in it, so the plainest phrasing in a real award
      // notice — the one the procurement portals themselves use — missed.
      /\b(awarded|appointed|selected|chosen|named|picked)\b[^.]{0,70}\b(works|packages?|schemes?|projects?|jobs?|lots?)\b/i,
      // The ACTIVE voice, where the client is the subject: "SSEN awards the
      // works", "Network Rail issues the framework". Every pattern above is
      // passive or contractor-led, so the client-led half of the trade press
      // was invisible. A contract noun is still required, so an industry
      // awards ceremony does not qualify.
      /\b(awards?|issues?|lets?)\b[^.]{0,70}\b(contracts?|deals?|works|packages?|frameworks?|projects?|jobs?)\b/i,
      /\b(main|principal|managing|tier[- ]?1|lead)?\s*contractor\b[^.]{0,50}\b(appointed|selected|named|confirmed|revealed|chosen|lined up)\b/i,
      // "Contractor appointed for the campus" — the noun leads and no contract
      // word follows, which the patterns above all required.
      /\b(contractor|builder|supplier|partner)\s+(appointed|selected|named|chosen|confirmed)\b/i,
      /\b(preferred bidder|contractor revealed|winner revealed|gets the nod|green ?lit)\b/i,
      // "Kier ON BOARD FOR Manchester tram stop upgrade" — a real Construction
      // Enquirer headline that scored nothing. This is how that paper says
      // appointed, and it says it constantly.
      /\b(on board|lined up|in the frame|in line|tapped)\s+(for|to)\b/i,
      /\bsigns?\b[^.]{0,40}\b(contracts?|deals?|agreements?)\b/i,
    ] },

  // A price tag in a headline is the single most reliable sign that a real
  // scheme has just become real. It is also how this press writes.
  { id: "value", label: "A scheme with a price on it", weight: 2,
    patterns: [
      /[£€$]\s?\d+(\.\d+)?\s?(m\b|bn\b|billion|million)/i,
      // "600 million euro", "€600 million", "EUR 4.17m" — the European
      // portals write it every one of these ways and sterling-only missed
      // all of them.
      /\b\d+(\.\d+)?\s?(m|bn|billion|million)\s+(euro|euros|pounds|dollars)\b/i,
      /\b(EUR|GBP|USD)\s?\d+(\.\d+)?\s?(m|bn|billion|million)?\b/,
    ] },

  { id: "consent", label: "Consent or permission granted", weight: 3,
    patterns: [
      /\b(planning (permission|consent|approval)|consent)\b[^.]{0,50}\b(granted|approved|secured|won|given|obtained)\b/i,
      /\b(approves?|approved|grants?|granted|backs?|backed|green ?light)\b[^.]{0,60}\b(scheme|plans?|project|development|application|proposals?)\b/i,
      /\bsection 36\b[^.]{0,50}\b(approv|grant|consent)/i,
      /\bdevelopment consent order\b[^.]{0,40}\b(granted|approved|made)\b/i,
      /\b(plans?|proposals?|application|scheme|project|development)\b[^.]{0,40}\b(approved|cleared)\b/i,
      // "Given the go-ahead" needs no noun in front of it: the phrase only
      // ever means one thing, and it is how half the trade press says it.
      /\bgiven the go[- ]?ahead\b/i,
      /\bgets? the go[- ]?ahead\b/i,
      // "Data centre approved", "Solar farm consented", "Substation cleared".
      // The thing approved is named and no planning noun follows it, which
      // every pattern above required.
      /\b(cent(re|er)|campus|farm|plant|station|facility|site|works|terminal|depot|village|park|hub)\b[^.]{0,30}\b(approved|consented|cleared|granted)\b/i,
    ] },

  { id: "transfer", label: "Project sold or transferred to an owner", weight: 3,
    patterns: [
      /\b(acquires?|acquired|acquisition|buys?|bought|purchases?)\b[^.]{0,70}\b(project|scheme|portfolio|site|stake|business)\b/i,
      /\b(sold|sells?|divests?|divested|divestment|disposal)\b[^.]{0,70}\b(project|scheme|portfolio|site|stake)\b/i,
      /\bcompletes? the (sale|acquisition|purchase)\b/i,
      /\b(takes? over|change of ownership|new owner)\b/i,
    ] },

  { id: "close", label: "Financial close or investment decision", weight: 3,
    patterns: [/\bfinancial close\b/i, /\bfinal investment decision\b/i, /\bFID\b/,
               /\breaches? (financial )?close\b/i, /\b(funding|investment) (secured|agreed|signed)\b/i] },

  // WEIGHT 3, NOT 2, AND THE REASON IS COMMERCIAL RATHER THAN TECHNICAL.
  // A construction start is late for the best version of this work — by then
  // the contractor is appointed and the site establishment is largely
  // decided. But an active site with a compound still buys services, and at
  // weight 2 a bare "construction begins" scored below the threshold and was
  // never seen at all. Better to read it ranked low than not to read it.
  { id: "mobilise", label: "Construction starting", weight: 3,
    patterns: [
      /\b(construction|works|enabling works|building|groundworks?)\b[^.]{0,40}\b(begin|begins|start|starts|started|commence|commences|under ?way|get(s)? going)\b/i,
      /\b(ground|spade)[- ]?break/i, /\bsite establishment\b/i, /\bmobilis(ation|ing|e)\b/i,
      /\b(on site|start on site|work starts)\b/i,
      /\bfirst (concrete|steel|sod|turf)\b/i,
    ] },

  /**
   * A LIVE OPPORTUNITY, WITH A DATE ON IT.
   *
   * WHY THIS WAS MISSING, AND IT IS THE BIGGEST HOLE OF THE LOT. Every source
   * in the list was trade press — somebody writing about a decision after it
   * was taken. The decisions themselves are published, in full, with the
   * winner named, the value stated and the dates given, on the procurement
   * portals: Find a Tender, Contracts Finder, Sell2Wales, Public Contracts
   * Scotland, TED, TenderNed. A watcher that reads only the commentary will
   * always be a week behind the record, and will never see the notices the
   * press does not bother to cover — which is most of them.
   */
  { id: "tender", label: "An open opportunity we could bid", weight: 3,
    patterns: [
      /\b(contract|tender|procurement|prior information|concession)\s+notice\b/i,
      /\b(invitation to tender|\bITT\b|invitation to negotiate|request for (quotation|proposal)|\bRFQ\b|\bRFP\b)\b/i,
      /\b(expressions? of interest|\bEOI\b|pre[- ]?qualification|\bPQQ\b|selection questionnaire|\bSQ\b)\b/i,
      /\b(closing date|deadline for (receipt|submission|tenders|participation|requests)|tenders? (are )?invited|bids? (are )?invited|seeking (a )?(contractor|supplier|provider))\b/i,
      /\b(dynamic purchasing system|\bDPS\b|framework (agreement|opportunity)|call[- ]off)\b/i,
      /\bopen (to|for) (tender|bid)/i,
      // "RACE STARTS FOR £800m south Wales civils framework" — a framework
      // coming to market, which is the earliest point at which we can bid,
      // and the trade press announces it exactly like this.
      /\b(race|hunt|search|contest|bidding)\b[^.]{0,20}\b(starts?|begins?|is on|under ?way|opens?)\b[^.]{0,60}\b(framework|contracts?|deals?|works|jobs?|packages?)\b/i,
      /\b(framework|contracts?|works|packages?|schemes?)\b[^.]{0,40}\b(to market|out to tender|up for grabs|put out|goes out)\b/i,
    ] },

  /**
   * A DOOR SOMEBODY HAS DELIBERATELY LEFT OPEN.
   *
   * The highest-value thing on the list and the watcher had no idea it
   * existed. When a client or a principal contractor runs a Meet the Buyer,
   * a supplier day or an early market engagement, they are asking to be
   * approached — the approach needs no excuse, no cold opening and no
   * apology, and the date is published. Nothing else in this file finds a
   * moment where the other side has already said yes to being contacted.
   */
  { id: "supplier-event", label: "They are asking to meet suppliers", weight: 3,
    patterns: [
      /\bmeet[- ]the[- ]buyer\b/i,
      /\b(supplier|supply chain|industry|bidder'?s?|contractor)\s+(day|event|briefing|forum|workshop|webinar|engagement|roadshow)\b/i,
      /\b(early )?market (engagement|consultation|sounding|testing|warming)\b/i,
      /\bsupply chain (opportunit|event|portal|register|briefing)/i,
      /\b(pre[- ]?market|pre[- ]?procurement)\s+engagement\b/i,
      /\bregister (your )?interest\b/i,
    ] },

  /**
   * EARLIER THAN ANY TRIGGER HERE FIRED, WHICH IS WHERE THE WORK IS WON.
   *
   * Consent granted is already late for site-establishment work: by then the
   * developer has a programme and often a contractor. The money moves one
   * step before that — an eligibility submission to Ofgem, a pre-construction
   * funding request, a planning application lodged, a scoping report issued.
   * Those name the scheme, the promoter and roughly when construction starts,
   * eighteen months before anybody is asking for a quote. Low weight on
   * purpose: it queues, it does not shout.
   */
  { id: "prefunding", label: "Funded or submitted, not yet consented", weight: 2,
    patterns: [
      /\b(eligibility|pre[- ]construction|early construction)\s+(submission|funding|request|application)\b/i,
      /\b(submits?|submitted|lodges?|lodged|files?|filed)\b[^.]{0,60}\b(application|submission|proposal|needs case|business case|plans?)\b/i,
      /\b(application|submission)\b[^.]{0,40}\b(submitted|lodged|accepted|validated|registered)\b/i,
      /\b(ASTI|RIIO[- ]?T\d|\bLOTI\b|\bCSNP\b|Great Grid (Upgrade|Partnership))\b/,
      /\b(scoping (report|opinion)|\bEIA\b scoping|environmental impact assessment)\b/i,
      /\b(funding|investment)\b[^.]{0,40}\b(approved|allocated|committed|earmarked)\b/i,
      /\b(preferred (route|site|option)|route (corridor|refinement))\b/i,
    ] },

  /**
   * A PUBLISHED DATE AND A ROOM FULL OF THE PROMOTER'S STAFF.
   *
   * A consultation drop-in is not a sales event, and it is not treated as
   * one. It is a fixed, dated point at which a named scheme's project team
   * is in public and the scheme's scale, programme and compound locations
   * are on the boards. It is also the cheapest possible way to learn whether
   * a scheme has a temporary worker estate at all.
   */
  { id: "consultation", label: "Consultation or public event, with a date", weight: 2,
    patterns: [
      /\b(public|statutory|community|non[- ]statutory)\s+(consultation|exhibition|engagement)\b/i,
      /\b(drop[- ]?in|open day|information (event|session)|public (meeting|event|exhibition))\b/i,
      /\bconsultation\b[^.]{0,40}\b(opens?|launch(es|ed)?|runs?|closes?|begins?)\b/i,
      /\bhave your say\b/i,
    ] },

  /**
   * THE SCHEME MOVED, SO THE NEXT PACKAGE IS BEING PRICED NOW.
   *
   * A tunnel drive finishing, a TBM coming out, first power, energisation,
   * topping out: each one means a contractor who is already on that site is
   * about to need the next thing, and that the site establishment they have
   * is about to be wrong for the next phase. These never read as news about
   * a contract, so nothing here caught them.
   */
  { id: "phase", label: "A phase finished, the next one starts", weight: 2,
    patterns: [
      /\b(tunnel (drive|boring)|\bTBM\b)\b[^.]{0,50}\b(complete|completed|finish(es|ed)?|breakthrough|through|removed?|extract)/i,
      /\b(breakthrough|topping out|topped out|energis(ed|ation)|energiz(ed|ation)|first power|first (export|generation)|commissioning|handover|handed over)\b/i,
      /\b(phase|stage|package)\s+(one|two|three|1|2|3|\w+)\b[^.]{0,40}\b(complete|completed|finished|begins?|starts?)\b/i,
      /\b(completes?|completed)\b[^.]{0,50}\b(works|tunnel|section|span|deck|foundation|platform|drive)\b/i,
      /\b(next|second|final)\s+phase\b/i,
    ] },

  { id: "scale", label: "A workforce large enough to need housing", weight: 2,
    patterns: [
      /\b([2-9]\d{2,}|\d{1,3},\d{3})\s+(workers|operatives|people|staff|jobs|personnel)\b/i,
      /\b(worker|workers|workforce|construction|temporary)[- ]?(accommodation|village|camp|lodge|housing)\b/i,
      /\bpeak workforce\b/i,
      /\b(creat(e|es|ing)|support(s|ing)?)\b[^.]{0,30}\b([2-9]\d{2,}|\d{1,3},\d{3})\s+jobs\b/i,
    ] },
];

/**
 * THE SIX SECTORS ETABLIX SELLS INTO, AND WHY THEY ARE SCORED SEPARATELY.
 *
 * The triggers answer "has something happened". They do not answer "is it
 * ours", and without that a retail park award and a substation award score
 * identically — so a general construction feed buries the one that matters
 * under thirty that do not. The sector carries no veto: a signal with no
 * sector still queues, because a moment in an unnamed sector is still a
 * moment. It carries weight and a label, so the queue can be ranked and
 * filtered by the thing that actually decides relevance.
 *
 * These are the sectors as the business states them publicly, in the same
 * order, so the queue and the sales argument cannot drift apart.
 */
export const SECTORS = [
  { id: "grid", label: "Grid and power",
    patterns: [/\b(substation|switchyard|converter station|transmission|overhead line|OHL|pylon|grid connection|national grid|cable (project|route|works|circuit)|underground cable|subsea cable|HVDC|high[- ]voltage|\b\d{2,3}\s?kV\b|electricity network|interconnector|distribution network operator|DNO|SSEN|SP Energy|Ofgem)\b/i] },

  { id: "renewables", label: "Renewable energy",
    patterns: [/\b(offshore wind|onshore wind|wind farm|windfarm|turbine|solar farm|solar park|photovoltaic|\bPV\b|battery (energy )?storage|\bBESS\b|pumped storage|hydro|green hydrogen|electrolyser|electrolyzer|nuclear|\bSMR\b|small modular reactor)\b/i] },

  { id: "datacentres", label: "Data centres",
    patterns: [/\b(data ?cent(re|er)|hyperscale|colocation|co-location|\bDC\b campus|\d+\s?MW\s+(IT|campus|facility)|server farm|cloud campus)\b/i] },

  { id: "rail", label: "Rail and major civils",
    patterns: [/\b(rail|railway|network rail|HS2|station (upgrade|redevelopment)|tunnelling|tunnel boring|\bTBM\b|viaduct|highways? england|national highways|motorway|bypass|bridge replacement|depot)\b/i] },

  { id: "industrial", label: "Industrial and mining",
    patterns: [/\b(mine|mining|quarry|smelter|refinery|petrochemical|process plant|gigafactory|manufacturing (plant|facility)|steelworks|cement works|terminal|port expansion|worker (village|accommodation)|camp)\b/i] },

  { id: "epc", label: "Developers and EPCs",
    patterns: [/\b(EPC contractor|\bEPC\b|developer|independent power producer|\bIPP\b|turnaround|shutdown|outage|planned maintenance (period|shutdown))\b/i] },
];

/** Which of ours a piece of text belongs to. None is a valid answer. */
export function classify(text) {
  return SECTORS.filter((s) => s.patterns.some((p) => p.test(text))).map((s) => s.id);
}

export const SECTOR_LABEL = Object.fromEntries(SECTORS.map((s) => [s.id, s.label]));

/** What a sector match is worth. Enough to separate, never enough to admit. */
export const SECTOR_WEIGHT = 3;

/**
 * Sectors that are plainly not ours, and the one case where saying so matters.
 *
 * At weight 2 a retail park award outscored a data centre appointment, which
 * is the complaint this whole change answers: the triggers knew something had
 * happened and nothing knew whether it was ours. Raising the sector weight
 * separates the two, but a general construction feed is still mostly housing,
 * retail and schools — real awards, real money, no temporary worker estate and
 * no work for us.
 *
 * So an item that matches one of these AND matches none of ours is pushed
 * below the threshold rather than ranked beneath it. The "and" is load
 * bearing: a data centre on a retail park is still a data centre, and a
 * station redevelopment is still rail.
 */
export const OFF_SECTOR = [
  /\b(hous(e|ing)|homes?|residential|apartments?|flats?|build[- ]to[- ]rent|student accommodation|care home|retirement)\b/i,
  /\b(retail|shopping cent(re|er)|supermarket|store|leisure cent(re|er)|hotel|restaurant|stadium)\b/i,
  /\b(school|academy|college|university building|classroom|nursery)\b/i,
  /\b(office (block|fit[- ]?out|refurbishment)|fit[- ]?out|refurbishment of)\b/i,
];
export const OFF_SECTOR_PENALTY = 3;

/**
 * WHAT KIND OF MOMENT IT IS — AND WHY ONE QUEUE WAS NOT ENOUGH.
 *
 * Everything above answers "has something happened". Nothing answered "and
 * what do I do about it today", so a notice closing in eleven days sat in the
 * same undifferentiated list as a consultation about a scheme that breaks
 * ground in 2028. Those need opposite reactions and they were ranked as peers.
 *
 *   open       a live opportunity with a date. Act this week or lose it.
 *   confirmed  it has happened, somebody holds it. Approach the holder.
 *   early      funded, submitted or being consulted on. Build the relationship.
 *
 * This is a classification, not a filter: all three queue. An early signal
 * approached well is worth more than a confirmed one approached late, which is
 * exactly why they must not be read as the same thing.
 */
export const OPEN_TRIGGERS = ["tender", "supplier-event"];
export const CONFIRMED_TRIGGERS = ["award", "close", "transfer", "mobilise"];

export function stage(triggers = []) {
  if (triggers.some((t) => OPEN_TRIGGERS.includes(t))) return "open";
  if (triggers.some((t) => CONFIRMED_TRIGGERS.includes(t))) return "confirmed";
  return "early";
}

export const STAGE_LABEL = {
  open: "Open to bid",
  confirmed: "Awarded or under way",
  early: "Early — before the work is let",
};

/**
 * THE NAMES IN THE ITEM, AND A WARNING ABOUT WHAT THEY ARE.
 *
 * The thing the queue was missing was not information, it was the ANSWER TO
 * "who do I write to". An award notice says a client let a contract; the
 * person who needs temporary accommodation, welfare and a compound is the
 * contractor who won it. The queue showed the source and the headline and
 * made a reader open every link to find the one name that decides whether
 * the signal is worth an hour.
 *
 * HOW IT DECIDES, AND WHAT IT WILL GET WRONG. A capitalised run qualifies if
 * it either ends in a company-ish word (Ltd, Group, Infrastructure, Civils,
 * UK...) or sits within sixty characters of an appointment word. That catches
 * "OCU Utility Services", "United Infrastructure", "Hochtief UK" and will
 * sometimes catch a place name or a scheme name instead. So it is labelled on
 * screen as names FOUND IN THE ITEM, not as the contractor, and a reader is
 * told to check it. A hint that is honest about being a hint saves the hour;
 * a guess dressed as a fact costs a misdirected approach.
 */
const COMPANY_TAIL = /^(ltd|limited|plc|llp|group|holdings|construction|constructions|constructors|constructor|civils|civil|infrastructure|utilities|utility|contractors|contractor|contracting|engineering|services|service|partnership|consortium|joint venture|\bjv\b|uk|international|energy|power|networks|rail|solutions|industries|works)$/i;

const APPOINTMENT_NEAR = /\b(wins?|won|lands?|secures?|awarded|awards?|appoints?|appointed|named|selected|chosen|preferred bidder|supplier|contractor|principal contractor)\b/i;

// Words that start a sentence or a headline and are capitalised for that
// reason alone. Without this, "The Walpole scheme" becomes an organisation.
const NOT_A_NAME = new Set([
  "the","a","an","and","or","but","for","from","with","after","as","at","by","in","on","of","to","this","that","new","first","two","three","more","up","over","under","into",
  "january","february","march","april","may","june","july","august","september","october","november","december",
  "monday","tuesday","wednesday","thursday","friday","saturday","sunday",
  "contract","contracts","tender","tenders","notice","award","awards","project","scheme","works","framework","construction","phase","stage","package",
]);

/**
 * IS THE CAPITALISATION TELLING US ANYTHING?
 *
 * THE DEFECT THIS ANSWERS, AND IT CAME STRAIGHT OFF THE LIVE RUN. Find a
 * Tender titles are Title Case: "HPB - Provision of Radioactive Waste
 * Management Services", "Pricing Agreement - Cough Assist Therapy Devices".
 * Every word is capitalised, so a method that treats a capital as a signal
 * read those as organisations and put "AGR Unique Ref", "Cough Assist Therapy
 * Devices" and "Hong Kong SCR Rightsizing" on cards as names to write to.
 *
 * Where nearly every word is capitalised, the capital carries no information
 * at all, so nothing is claimed. Better an empty field than a confident
 * wrong one.
 */
function looksTitleCase(fragment) {
  const words = String(fragment).split(/\s+/).filter((w) => /^[A-Za-z]/.test(w));
  if (words.length < 4) return false;
  const caps = words.filter((w) => /^[A-Z]/.test(w)).length;
  return caps / words.length > 0.72;
}

export function namedOrgs(text) {
  const str = String(text || "");
  const found = [];
  // One to five capitalised words, allowing &, 'and', hyphens and apostrophes
  // inside a name, which is how these companies are actually written.
  // A full stop may sit INSIDE a name ("St.Modwen") but never bridges one:
  // the period is only consumed when a letter follows it immediately. Without
  // that, "...Transmission. Civils at Walpole" was read as the single
  // organisation "National Grid Electricity Transmission. Civils", which is
  // not a company and would have gone onto a card as if it were.
  const WORD = String.raw`[A-Z][A-Za-z&''’-]*(?:\.[A-Za-z][A-Za-z&''’-]*)*`;
  const re = new RegExp(String.raw`\b(${WORD}(?:\s+(?:${WORD}|and|&|of|de|la|van|der))*)\b`, "g");
  for (const m of str.matchAll(re)) {
    let words = m[1].split(/\s+/).filter(Boolean);
    // Trim leading filler: "The OCU Utility Services" -> "OCU Utility Services".
    while (words.length && NOT_A_NAME.has(words[0].toLowerCase())) words.shift();
    // Trim trailing filler and connectives left dangling by the trim above.
    while (words.length && (NOT_A_NAME.has(words[words.length - 1].toLowerCase()) || /^(and|&|of|de)$/i.test(words[words.length - 1]))) words.pop();
    if (!words.length || words.length > 5) continue;
    const name = words.join(" ");
    if (name.length < 3) continue;

    const tailed = COMPANY_TAIL.test(words[words.length - 1].replace(/[.]$/, ""));
    // A single word only counts when it carries a company tail of its own,
    // which "Hochtief" does not and "Balfour Beatty" does not need. And a
    // single word that IS the generic tail — "Civils", "Services", "Group" —
    // is a noun somebody used in a sentence, not anybody's name.
    if (words.length === 1 && !tailed) continue;
    if (words.length === 1 && COMPANY_TAIL.test(words[0].replace(/[.]$/, ""))) continue;

    // In Title Case the capital means nothing, so neither test below means
    // anything either. Checked for both branches, including the company-tail
    // one: "Provision of Associated Services" ends in a tail word.
    const near = str.slice(Math.max(0, m.index - 60), Math.min(str.length, m.index + m[1].length + 60));
    if (looksTitleCase(near)) continue;

    if (!tailed && !APPOINTMENT_NEAR.test(near)) continue;
    if (!found.some((f) => f.toLowerCase() === name.toLowerCase())) found.push(name);
  }
  return found.slice(0, 6);
}

/**
 * THE DATE, AND THE REASON A MISSED ONE IS WORSE THAN A MISSED SIGNAL.
 *
 * An open notice is only an opportunity until its deadline, after which it is
 * a history lesson that still occupies a line in the queue. Nothing here
 * recorded a date, so a notice with eleven days left looked identical to one
 * that closed in March — and the queue, sorted by score, would happily put the
 * closed one first.
 *
 * Read conservatively: a date is only taken when a deadline word stands near
 * it, because a published date and a closing date are not the same thing and
 * inventing the difference is worse than leaving the field empty.
 */
const MONTHS = "january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec";
const DEADLINE_WORD = /(deadline|closing date|closes?|close of|expir\w*|no later than|not later than|by no later|submission(s)? (by|due)|due by|last date|participation|tenders? must|bids? must|responses? by)/i;

/**
 * An event is a date too, and missing it costs the same as missing a deadline.
 *
 * "Public drop-in 27 October" and "deadline for participation 31 October" are
 * both a day on which the opportunity changes state, and both are useless the
 * day after. The kind is kept separate because what you do about them differs:
 * one you answer in writing, the other you attend.
 */
const EVENT_WORD = /(event|drop[- ]?in|open day|exhibition|session|briefing|webinar|meet[- ]the[- ]buyer|supplier day|takes place|will be held|runs (from|until)|on site at)/i;

const DATE_PATTERNS = [
  // 31 October 2026, 31 Oct 2026, 31st October 2026
  new RegExp(String.raw`\b(\d{1,2})(?:st|nd|rd|th)?\s+(${MONTHS})\.?\s+(\d{4})\b`, "i"),
  // October 31, 2026
  new RegExp(String.raw`\b(${MONTHS})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b`, "i"),
  /\b(\d{4})-(\d{2})-(\d{2})\b/,
  /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/,
];

/** One date out of a fragment, or nothing. Day-first, because this is the UK. */
function firstDate(fragment) {
  let best = null;
  for (const re of DATE_PATTERNS) {
    const m = re.exec(fragment);
    if (!m) continue;
    let at = null;
    if (/^\d{4}-/.test(m[0])) at = Date.parse(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
    else if (m[0].includes("/")) at = Date.parse(`${m[3]}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}T00:00:00Z`);
    else at = Date.parse(`${m[0].replace(/(st|nd|rd|th)/gi, "")} UTC`);
    if (!at || Number.isNaN(at)) continue;
    // The one that appears EARLIEST in the fragment, since the fragment
    // starts immediately after the word that introduced it.
    if (!best || m.index < best.index) best = { at, text: m[0], index: m.index };
  }
  return best;
}

export function extractDeadline(text) {
  const str = String(text || "");

  /**
   * READ FORWARD FROM THE WORD, NOT OUTWARD FROM THE DATE.
   *
   * THE BUG THIS REPLACES, WHICH WAS WORSE THAN NO DATE AT ALL. The first
   * version found every date and kept the first one with a deadline word
   * anywhere within ninety characters either side. Given a real award notice
   * — "Period 2026-10-26 to 2028-03-15. Closing date 2026-10-31." — it
   * returned 26 October: the contract START date, because "Closing date"
   * happened to sit within the window AFTER it. A watcher that reports the
   * wrong date confidently is worse than one that reports none, because the
   * wrong one gets written into a letter.
   *
   * English puts the date after the phrase that introduces it. So find the
   * phrase, then read forward from it, and only look backwards when nothing
   * follows — which is the "31 October — deadline for responses" case.
   */
  const words = [[DEADLINE_WORD, "deadline"], [EVENT_WORD, "event"]];
  const found = [];
  for (const [re, kind] of words) {
    const scan = new RegExp(re.source, "gi");
    for (const m of str.matchAll(scan)) {
      const after = firstDate(str.slice(m.index + m[0].length, m.index + m[0].length + 80));
      if (after) { found.push({ at: after.at, text: after.text, kind, where: m.index }); continue; }
      const beforeText = str.slice(Math.max(0, m.index - 40), m.index);
      const before = firstDate(beforeText);
      if (before) found.push({ at: before.at, text: before.text, kind, where: m.index });
    }
  }
  if (!found.length) return null;

  // A deadline outranks an event: it is the one that ends the opportunity
  // rather than merely passing. Otherwise, whichever was introduced first.
  found.sort((a, b) => (a.kind === b.kind ? a.where - b.where : a.kind === "deadline" ? -1 : 1));
  const { at, text: when, kind } = found[0];
  return { at, text: when, kind };
}

/**
 * A SOURCE URL THAT NEEDS TODAY'S DATE IN IT.
 *
 * The procurement APIs are not feeds — they are windowed queries, and several
 * refuse a request with no window at all. A static string cannot express
 * "notices published in the last week", so the source file would have had to
 * be edited by hand every Monday, which means it would have been edited once.
 *
 *   {{date:-7}}   seven days ago, as 2026-10-12
 *   {{date:0}}    today
 */
export function resolveUrl(url) {
  return String(url || "").replace(/\{\{date:(-?\d+)\}\}/g, (_, d) => {
    const t = new Date(Date.now() + Number(d) * 86400000);
    return t.toISOString().slice(0, 10);
  });
}

/** Sources are data, not code: the director edits them without a deploy. */
export function sources() {
  try {
    const list = JSON.parse(fs.readFileSync(sourcesFile(), "utf8"));
    return Array.isArray(list) ? list.filter((s) => s && s.url && s.enabled !== false) : [];
  } catch { return []; }
}


/** Stable identity for an item, so the same story does not queue twice. */
export const fingerprint = (url, title) =>
  crypto.createHash("sha256").update(`${String(url).split("#")[0]}|${String(title).trim().toLowerCase()}`).digest("hex").slice(0, 32);

export function score(text) {
  const hit = [];
  let total = 0;
  for (const t of TRIGGERS) {
    if (t.patterns.some((p) => p.test(text))) { hit.push(t.id); total += t.weight; }
  }
  const sectors = classify(text);

  // A SECTOR IS NOT A MOMENT, AND ON ITS OWN IT MUST COUNT FOR NOTHING.
  // Adding the sector weight unconditionally gave "a nice photograph of a
  // turbine" a score of three — the renewables sector, no event, straight
  // into the queue. The sector answers "is this ours"; only a trigger
  // answers "has something happened", and the second question comes first.
  if (!hit.length) return { triggers: hit, sectors, score: 0 };

  // Given that something happened, the sector lifts it above its neighbours.
  // A substation award and a retail park award are both awards; only one of
  // them is work we could do, and the ranking has to say so.
  if (sectors.length) total += SECTOR_WEIGHT;
  else if (OFF_SECTOR.some((p) => p.test(text))) total -= OFF_SECTOR_PENALTY;
  return { triggers: hit, sectors, score: Math.max(0, total) };
}

/**
 * A NOTICE OUT OF A PROCUREMENT API, WHICH IS JSON AND NOT A FEED.
 *
 * WHY THIS HAD TO EXIST. extract() read RSS, Atom and, failing those, links
 * out of an HTML page. The procurement portals publish neither: Find a Tender
 * and Contracts Finder publish OCDS release packages, TenderNed publishes its
 * own JSON. Pointing the old extractor at one of those got a body that parsed
 * to nothing and a source that looked broken, so the single most valuable
 * class of source in this whole file was unreadable by construction.
 *
 * OCDS is a published standard, so the shape is known rather than guessed:
 * releases[] with tender.title, buyer.name, tenderPeriod.endDate and, once
 * let, awards[].suppliers[].name and awards[].value. That last pair is the
 * answer to "who won it and for how much" straight from the record, with no
 * trade journalist in between and no name to infer.
 *
 * Deliberately tolerant about the envelope. Every portal wraps the same
 * releases in a differently named key, and a watcher should not fail on the
 * name of a container.
 */
const strip = (s) => String(s || "").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;|&#\d+;/gi, " ").replace(/\s+/g, " ").trim();

const JSON_ENVELOPES = ["releases", "results", "items", "data", "notices", "publicaties", "records", "embedded"];

const money = (v) => {
  if (!v || typeof v !== "object") return "";
  const n = Number(v.amount);
  if (!Number.isFinite(n)) return "";
  const cur = v.currency === "GBP" ? "£" : v.currency === "EUR" ? "€" : `${v.currency || ""} `;
  // Written the way the trade press writes it, so the value trigger — which
  // matches "£4.17m" and not "4170000" — sees it.
  if (n >= 1e9) return `${cur}${(n / 1e9).toFixed(2).replace(/\.00$/, "")}bn`;
  if (n >= 1e6) return `${cur}${(n / 1e6).toFixed(2).replace(/\.00$/, "")}m`;
  return `${cur}${n.toLocaleString("en-GB")}`;
};

export function extractJson(body, baseUrl) {
  let doc;
  try { doc = JSON.parse(body); } catch { return null; }
  let rows = Array.isArray(doc) ? doc : null;
  if (!rows) {
    for (const key of JSON_ENVELOPES) {
      const v = doc && doc[key];
      if (Array.isArray(v)) { rows = v; break; }
      // One level of nesting, which is where HAL-style APIs keep theirs.
      if (v && typeof v === "object") {
        for (const inner of JSON_ENVELOPES) if (Array.isArray(v[inner])) { rows = v[inner]; break; }
      }
      if (rows) break;
    }
  }
  if (!Array.isArray(rows)) return null;

  const items = [];
  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    const tender = r.tender || r.Tender || {};
    const title = strip(tender.title || r.title || r.name || r.publicatieNaam || r.opdrachtNaam || r.noticeTitle || "");
    if (!title) continue;

    const parts = [];
    const buyer = strip((r.buyer && r.buyer.name) || r.buyerName || r.aanbestedendeDienstNaam || (r.parties && r.parties[0] && r.parties[0].name) || "");
    if (buyer) parts.push(`Buyer: ${buyer}.`);
    const desc = strip(tender.description || r.description || r.omschrijving || "");
    if (desc) parts.push(desc.slice(0, 600));

    // The winner and the price, from the record itself.
    for (const a of (Array.isArray(r.awards) ? r.awards : [])) {
      const who = (Array.isArray(a.suppliers) ? a.suppliers : []).map((x) => strip(x && x.name)).filter(Boolean);
      const sum = money(a.value);
      if (who.length) parts.push(`Contract awarded to ${who.join(", ")}${sum ? ` — ${sum}` : ""}.`);
      else if (sum) parts.push(`Contract value ${sum}.`);
      if (a.contractPeriod && (a.contractPeriod.startDate || a.contractPeriod.endDate)) {
        parts.push(`Period ${strip(a.contractPeriod.startDate || "")} to ${strip(a.contractPeriod.endDate || "")}.`);
      }
    }
    const tv = money(tender.value || tender.minValue || r.value);
    if (tv && !parts.some((x) => x.includes(tv))) parts.push(`Estimated value ${tv}.`);

    // The closing date, said in words so extractDeadline reads it the same
    // way it reads a date out of a press release. One path, not two.
    const period = tender.tenderPeriod || tender.participationPeriod || {};
    const ends = period.endDate || r.sluitingsdatum || r.deadline || "";
    if (ends) parts.push(`Closing date ${String(ends).slice(0, 10)}.`);

    let url = "";
    for (const cand of [r.url, r.uri, r.noticeUrl, r.links && r.links.self, r.publicatieUrl,
                        (Array.isArray(tender.documents) && tender.documents[0] && tender.documents[0].url)]) {
      if (typeof cand === "string" && cand) { url = cand; break; }
    }
    try { url = new URL(url || baseUrl, baseUrl).toString(); } catch { url = baseUrl; }

    /**
     * THE NAMES COME OFF THE RECORD, NOT OUT OF A REGEX.
     *
     * This is the whole advantage of reading the notice rather than an
     * article about it: OCDS states who the buyer is and who the suppliers
     * are in named fields. Guessing them from a Title Case notice heading
     * produced "AGR Unique Ref" and "Cough Assist Therapy Devices" on the
     * live run. There is no reason to guess when the record says.
     */
    const orgs = [];
    const add = (n) => { const v = strip(n); if (v && v.length > 2 && !orgs.includes(v)) orgs.push(v); };
    for (const a of (Array.isArray(r.awards) ? r.awards : [])) {
      for (const sup of (Array.isArray(a.suppliers) ? a.suppliers : [])) add(sup && sup.name);
    }
    add(buyer);   // the supplier first: on an award it is the one who needs a compound

    items.push({
      title, url, orgs: orgs.slice(0, 6),
      summary: parts.join(" "),
      publishedAt: Date.parse(r.date || r.publishedDate || r.publicatieDatum || tender.datePublished || "") || null,
    });
  }
  return items.length ? items : null;
}

/**
 * Items out of a feed or a listing page.
 *
 * RSS and Atom first because they are structured and stable; an HTML listing
 * is a fallback and is read conservatively — a link with enough text beside
 * it to judge, and nothing inferred that is not on the page.
 */
export function extract(body, baseUrl) {
  // JSON first: a procurement API's body would otherwise fall through to the
  // HTML branch and parse to nothing, which reads on screen as a dead source.
  const asJson = extractJson(body, baseUrl);
  if (asJson) return asJson;

  const items = [];
  const rss = [...String(body).matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map((m) => m[0]);
  for (const block of rss) {
    const title = strip((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(block) || [])[1]);
    let link = strip((/<link[^>]*>([\s\S]*?)<\/link>/i.exec(block) || [])[1])
            || (/<link[^>]*href=["']([^"']+)["']/i.exec(block) || [])[1] || "";
    const summary = strip((/<(description|summary|content[^>]*)>([\s\S]*?)<\/(description|summary|content)>/i.exec(block) || [])[2]);
    const date = strip((/<(pubDate|published|updated)>([\s\S]*?)<\/\1>/i.exec(block) || [])[2]);
    if (!title) continue;
    try { link = new URL(link, baseUrl).toString(); } catch { link = baseUrl; }
    items.push({ title, url: link, summary, publishedAt: Date.parse(date) || null });
  }
  if (items.length) return items;

  for (const m of String(body).matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{8,300}?)<\/a>/gi)) {
    const title = strip(m[2]);
    if (title.length < 20) continue;             // navigation, not a story
    let link;
    try { link = new URL(m[1], baseUrl).toString(); } catch { continue; }
    items.push({ title, url: link, summary: "", publishedAt: null });
  }
  return items.slice(0, 200);
}
