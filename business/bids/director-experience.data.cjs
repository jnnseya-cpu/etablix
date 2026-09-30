/**
 * THE ONE FILE TO EDIT. Everything the director's experience document says
 * that only the director can know lives here, and nowhere else.
 *
 * THE RULE THE BUILDER ENFORCES: a field left empty is OMITTED from the
 * document. It is never rendered as "[  ]". A bid document showing empty
 * brackets tells an assessor it was submitted unfinished, which is worse than
 * a document that simply does not make a claim. So an unfilled file still
 * produces a complete, issuable document — it just makes fewer claims.
 *
 * NOTHING HERE IS INVENTED. Every value below was taken from the director's
 * curriculum vitae or supplied by him directly. The quantity fields are empty
 * because he has not stated them, and a figure in a procurement document that
 * nobody can source is the one mistake that cannot be recovered from.
 *
 * WHAT TO FILL FIRST, in order of what it is worth to an assessor:
 *   1. schemes[].outcome  — what was different because he did it
 *   2. schemes[].peakWorkforce and .establishmentMonths
 *   3. referees            — CHIC asked for these and said they will call
 *   4. schemes[].schemeValue and .scopeValue
 *   5. schemes[].endClient — only where no confidentiality obligation bites
 */
module.exports = {
  /* Set per submission, or pass as the first command-line argument:
       node business/bids/build-director-experience.cjs "CHIC Development DPS, Category 1"
     Empty means the row is left out of the cover table. */
  submittedFor: "",

  /* Empty means today's date is used. */
  date: "",

  schemes: [
    {
      ref: "4.1",
      title: "Sofia Offshore Wind Farm — grid connection, 1,400 MW",
      employer: "GE Vernova – Grid Solutions",
      role: "Construction Subcontract Manager",
      dates: "Dec 2022 – Dec 2025",
      location: "United Kingdom, within a role covering Ireland and Northern and Southern Europe",
      endClient: "",
      schemeValue: "",
      scopeValue: "",
      peakWorkforce: "",
      establishmentMonths: "",
      outcome: "",
      referee: "",
    },
    {
      ref: "4.2",
      title: "Midland Main Line Upgrade",
      employer: "Mott MacDonald",
      role: "Senior Project Manager",
      dates: "Oct 2018 – Nov 2021",
      location: "United Kingdom",
      endClient: "",
      schemeValue: "",
      scopeValue: "",
      peakWorkforce: "",
      establishmentMonths: "",
      outcome: "",
      referee: "",
    },
    {
      ref: "4.3",
      title: "West Midlands regional infrastructure and regeneration programme",
      employer: "West Midlands Combined Authority",
      role: "Programme Delivery Manager",
      dates: "Nov 2021 – Dec 2022",
      location: "West Midlands, United Kingdom",
      endClient: "",
      schemeValue: "",
      scopeValue: "",
      peakWorkforce: "",
      establishmentMonths: "",
      outcome: "",
      referee: "",
    },
  ],

  /* Each: { name, position, organisation, scheme, telephone, email, agreedOn }
     ASK EVERY REFEREE BEFORE NAMING THEM. An empty list renders section 5 as
     "available on request", which is an ordinary and acceptable answer. */
  referees: [],
};
