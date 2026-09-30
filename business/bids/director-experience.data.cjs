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
 * NOTHING HERE IS INVENTED. Every value was taken from the director's
 * curriculum vitae or supplied by him directly. Where a value came from his
 * description of a scheme rather than from a document, it is marked CONFIRM
 * and the builder repeats that in the notes file.
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
      /* THE STRONGEST ENTRY IN THE SUBMISSION. This is the scheme on which the
         director built a worker accommodation village from nothing: defined the
         five packages, ran the enquiries, assessed the returns, recommended the
         awards, and then consolidated the running of the village under a single
         facilities management contract. That last step is ETABLIX Model 02,
         performed before ETABLIX existed. */
      ref: "4.1",
      title: "Skye Reinforcement Project — worker accommodation village",
      employer: "GE Vernova – Grid Solutions",
      role: "Construction Subcontract Manager",
      dates: "Dec 2022 – Dec 2025",
      location: "Fort Augustus to the Isle of Skye, Scotland",
      endClient: "SSEN Transmission (scheme promoter)",
      schemeValue: "£690 million (the promoter's value for the whole reinforcement scheme, not for the accommodation scope)",
      scopeValue: "",
      /* CONFIRM: 309 bedrooms and 36 months come from the director's earlier
         description of the turnkey programme carrying the village. Check both
         against the project record before this is submitted. */
      beds: "309 bedrooms",
      peakWorkforce: "",
      establishmentMonths: "36 months",
      outcome: "",
      referee: "",
    },
    {
      ref: "4.2",
      title: "Sofia Offshore Wind Farm — grid connection, 1,400 MW",
      employer: "GE Vernova – Grid Solutions",
      role: "Construction Subcontract Manager",
      dates: "Dec 2022 – Dec 2025",
      location: "United Kingdom, within a role covering Ireland and Northern and Southern Europe",
      endClient: "", schemeValue: "", scopeValue: "", beds: "",
      peakWorkforce: "", establishmentMonths: "", outcome: "", referee: "",
    },
    {
      ref: "4.3",
      title: "West Midlands regional infrastructure and regeneration programme",
      employer: "West Midlands Combined Authority",
      role: "Programme Delivery Manager",
      dates: "Nov 2021 – Dec 2022",
      location: "West Midlands, United Kingdom",
      endClient: "", schemeValue: "", scopeValue: "", beds: "",
      peakWorkforce: "", establishmentMonths: "", outcome: "", referee: "",
    },
    /* HELD IN RESERVE, NOT DELETED. Midland Main Line is the stronger entry
       where a category asks for rail or for work in a live operational
       environment. Its scope bullets are written and live in the builder under
       the ref "MML". To use it, give it the ref of the scheme it replaces —
       three schemes in detail is what a procurement assessor expects, and a
       fourth dilutes rather than adds. */
    {
      ref: "MML",
      include: false,
      title: "Midland Main Line Upgrade",
      employer: "Mott MacDonald",
      role: "Senior Project Manager",
      dates: "Oct 2018 – Nov 2021",
      location: "United Kingdom",
      endClient: "", schemeValue: "", scopeValue: "", beds: "",
      peakWorkforce: "", establishmentMonths: "", outcome: "", referee: "",
    },
  ],

  /* Each: { name, position, organisation, scheme, telephone, email, agreedOn }
     ASK EVERY REFEREE BEFORE NAMING THEM. An empty list renders section 5 as
     "available on request", which is an ordinary and acceptable answer. */
  referees: [],
};
