import fs from "node:fs";
const S = "/tmp/claude-0/-home-user-etablix/fe91c2e4-7425-5fd0-aa86-a0a156d734f1/scratchpad";
const B = "http://127.0.0.1:4123";
const c = JSON.parse(fs.readFileSync(S + "/cap.json", "utf8"));
const tok = (await (await fetch(B + "/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(c) })).json()).token;
const H = { "content-type": "application/json", authorization: "Bearer " + tok };
const t = await (await fetch(B + "/api/docs/templates", { headers: H })).json();
console.log("templates:", t.templates.map((x) => x.id).join(", "));
const gen = async (template, data) => {
  const r = await fetch(B + "/api/docs/generate", { method: "POST", headers: H, body: JSON.stringify({ template, data }) });
  const j = await r.json();
  console.log(template, "->", r.status, j.document ? j.document.number : j.error);
  return j.document?.id;
};
const er = await gen("requirements", {
  client: "Marrowbridge Infrastructure Ltd", project: "Workforce accommodation village", package: "P2 — Modular accommodation",
  purpose: "Supply, deliver, install and commission the accommodation and amenity buildings for a 225-room workforce village serving a 38-month energy project.",
  scope: "- Bedroom blocks, amenity buildings, reception and village office\n- Module transport, craneage and setting out\n- Internal M&E within each module\n- Connection to the termination points provided under P1\n- Commissioning of building services and handover",
  excluded: "| Excluded from this package | Held by |\n|---|---|\n| Ground preparation, bases and plinths | P1 Civil works |\n| Loose furniture, including in bedrooms | P4 Furniture |\n| Catering equipment and kitchen fit-out | P3 Kitchen |\n| Operation, maintenance and housekeeping | P5 FM and operation |\n\nEvery exclusion above names the package that holds it. Nothing is excluded into thin air.",
  interfaces: "| Ref | With | What is handed over | Certified by |\n|---|---|---|---|\n| IF-01 | P1 | Bases set out and levels certified to the module tolerance | P1, in writing, before delivery |\n| IF-02 | P1 | One termination point per service per block | A joint drawing signed by both parties |\n| IF-05 | P4 | The bedroom specification, item by item, fixed before either package is let | Both, against a common schedule |\n| IF-09 | P5 | Commissioning sign-off before any occupation | P2, witnessed by P5 |\n| IF-10 | P5 | Water system at first fill, with the legionella duty passing at that point and not at first occupation | P2 to P5, recorded |",
  performance: "Rooms to achieve the acoustic, thermal and fire performance at Appendix 4. Building services to be commissioned and demonstrated under load before handover.",
  standards: "Building Regulations, BS 9991 for the fire strategy, CDM 2015. The fire strategy is a single design across all five packages and is issued by the client's fire engineer, not developed by the tenderer.",
  programme: "Modules delivered and installed within the window at Appendix 5. The village must be live before the first travelling worker arrives; that date, not the tender return, is the fixed point.",
  siteinfo: "Ground investigation report — **not available**. Bases are designed and constructed under P1 and are not this tenderer's risk. Topographical survey, utility record search and the planning consent with its conditions are issued at Appendix 6.",
  quality: "Inspection and test plan proportionate to the works, submitted within four weeks of award. Handover pack defined at Appendix 7 and priced at tender, not negotiated at completion.",
  hse: "Specific to modular installation and craneage: lift plans, exclusion zones, working at height, and the interface with live site traffic.",
  commercial: "Fixed lump sum against these Employer's Requirements. Monthly valuation, payment terms per the subcontract, 5% retention released in two stages. Pay-when-paid is prohibited. Departures from this document are to be stated and priced separately in the tender return.",
});
const itt = await gen("itt", {
  client: "Marrowbridge Infrastructure Ltd", project: "Workforce accommodation village", package: "P2 — Modular accommodation",
  returnBy: "2026-11-13", clarifyBy: "2026-10-30", validity: "90 days from the return date",
  contract: "NEC4 Engineering and Construction Subcontract, Option A — priced contract with activity schedule — with the Z clauses issued at Appendix 3. The conditions are issued with this invitation and are not negotiable after return.",
  returns: "1. Form of tender, signed\n2. Pricing schedule as issued, unaltered in structure\n3. Method statement, maximum eight sides\n4. Programme, showing the interface dates at Appendix 2\n5. Key personnel, named, with the percentage of their time committed\n6. Schedule of departures from the Employer's Requirements, priced separately\n\nA return that alters the pricing schedule cannot be compared with the others and will be marked accordingly.",
  evaluation: "Quality 60%, price 40%.\n\nQuality is scored 0–5 against eight criteria whose individual weightings are published at Appendix 1. A score of 3 meets the requirement; 4 and 5 require evidence in the tender rather than an impression of the tenderer.\n\nThe lowest compliant price scores full marks and the others in proportion. A tender more than 25% below the mean will be asked to explain its price in writing before it is either excluded or accepted.",
  clarifications: "By email to the address at Appendix 2, by the clarification deadline above. Every question and its answer is issued to all tenderers without attribution. No answer given by any other route may be relied on.",
  conduct: "Tendering costs lie with the tenderer. Canvassing any officer or adviser of the client, or any agreement with another tenderer as to price or content, will disqualify. The client is not bound to accept the lowest or any tender.",
});
fs.writeFileSync(S + "/ids.json", JSON.stringify({ cap: fs.readFileSync(S + "/capdoc.txt", "utf8").trim(), er, itt, tok }));
