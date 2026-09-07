import fs from "node:fs";
const S = "/tmp/claude-0/-home-user-etablix/fe91c2e4-7425-5fd0-aa86-a0a156d734f1/scratchpad";
const c = JSON.parse(fs.readFileSync(S + "/cap.json", "utf8"));
const B = "http://127.0.0.1:4123";
const tok = (await (await fetch(B + "/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(c) })).json()).token;

const data = {
  client: "CHIC Development Dynamic Purchasing System — Right to Participate",
  project: "Site services and workforce accommodation",

  companyPosition:
"ETABLIX — Integrated Site Services is a trading name of JNN GLOBAL LTD, registered in England and Wales, company number 15405437, registered office Groupe Nseya House, Kingstanding, Birmingham B44 8DJ.\n\n" +
"ETABLIX is one accountable partner for the temporary site environment and workforce accommodation around the permanent works. It plans, procures, integrates and controls site set-up from first mobilisation to final reinstatement, across three delivery models: advisory, management integrator, and prime service contractor for the site-services system.\n\n" +
"**ETABLIX is not a main contractor.** It does not build, design or commission the permanent asset and does not compete with the contractor who does.\n\n" +
"The company is recently incorporated and has no completed contracts in its own name. We say so at the outset rather than leaving it to be inferred. What the company offers at this stage is the experience of its people, a defined method, and an operating platform that enforces it — all three set out below and all three open to examination.",

  insurance:
"Employers' liability, public liability and professional indemnity are being placed. Quotations are in hand and cover will be incepted before any contract is entered into or any person is engaged.\n\n" +
"No cover is claimed here as being in force. Certificates will be provided to the buyer on inception and before any award, and ETABLIX will not accept an appointment that requires cover it does not hold on the day.",

  accreditations:
"| Accreditation | Position |\n|---|---|\n" +
"| SSIP (Safety Schemes in Procurement) | Application in progress |\n" +
"| ISO 9001 · 14001 · 45001 | Not held. Management system documented and operating; certification targeted once trading history supports assessment |\n" +
"| CHAS / Constructionline | To follow SSIP |\n\n" +
"Nothing is claimed as held that is not held. Where a scheme is in progress it is stated as in progress, with no implied date beyond what the assessing body controls.",

  person1Name: "Director, ETABLIX — Integrated Site Services",
  person1Exp:
"Our Director's relevant experience was gained at GE Vernova as **Construction Subcontract Manager**, holding responsibility for construction subcontracting across **the United Kingdom and Northern Ireland, Northern Europe and Southern Europe**.\n\n" +
"The role is the discipline this company is built on: forming, awarding and administering construction subcontracts on major energy projects, across several jurisdictions and procurement regimes, for an original equipment manufacturer delivering into them.\n\n" +
"### Workforce accommodation — requirements through to consolidated delivery\n\n" +
"On a major energy project the responsibilities held were:\n\n" +
"- Producing the detailed project requirements and the employer's requirements for the workforce accommodation scope.\n" +
"- Writing the invitation to tender and the full procurement requirements.\n" +
"- Setting the procurement strategy and taking the scope to market.\n" +
"- Structuring the scope into five packages — civil works, modular accommodation, kitchen, furniture, and facilities management and operation — and running the evaluation and appointment of a contractor to each.\n" +
"- Subsequently consolidating all five appointed contractors under a single contractor, so that one party held the interfaces between them rather than the client.\n\n" +
"That final step is the substance of what ETABLIX offers. Splitting a scope into packages buys competition on each and leaves the client holding every interface between them. Consolidating them under one accountable party keeps the competition already won and moves the interfaces to a party who owns them. It is the harder thing to contract, and it is the thing ETABLIX exists to do.\n\n" +
"### Why this is the relevant experience for this framework\n\n" +
"Site services and workforce accommodation are bought as a set of subcontracts and fail at the boundaries between them. A subcontract manager operating across four territories spends the working week on exactly that problem: what each contract covers, what falls between two of them, who carries the risk when it does, and what it costs to find out late. The scope is the same scope; the discipline is the same discipline.\n\n" +
"*Dates, the project name, contract values and a reference contact are available on request and will be provided in the format the buyer requires. They are omitted here only because they are the former employer's information to release.*",

  person2Name: "",
  person2Exp: "",

  method:
"### How we would approach this scope\n\n" +
"**1. Establish what is actually being bought.** Most site-services scopes are described by what is visible — cabins, welfare, power — and priced accordingly. We begin by mapping every package the site needs against the buyer's own procurement list, and naming the ones nobody currently owns. On a typical scheme that is seven to twelve packages, each carrying a cost and a lead time held by no one.\n\n" +
"**2. Work every date backwards.** Consents, connections, licences and long-lead orders are worked backwards from the access or possession date to a latest responsible start. A lead time nobody has started is the most valuable finding available, and it is only visible when the programme is read against the constraints rather than alongside them.\n\n" +
"**3. Read the documents against each other.** The findings that matter sit between two documents written weeks apart by different people who have not compared them — a shift pattern against a planning condition, a headcount against a welfare schedule, an equipment enquiry against the schedule it was sized from. We reconcile the set and report the contradictions with both sources named.\n\n" +
"**4. Bundle so the interfaces are bought, not left.** Packages are grouped so that the interfaces between them fall inside a contract rather than between two. Where they cannot be, each interface is named, with what fails if nobody owns it and who should.\n\n" +
"**5. Control it in delivery.** Progress, cost, risk, supplier payment and site telemetry are held on one platform, with the commercial disciplines enforced in software rather than remembered — payment on earned value, statutory payment timetables computed on receipt, and no order placed against unverified bank details.\n\n" +
"Every figure we issue is a first-pass planning figure for validation by a competent person. Nothing safety-critical is resolved in a report; it is flagged.",

  capacity:
"ETABLIX is directly resourced for advisory and integration work now. Delivery capacity is built contract by contract, against the requirements of the contract rather than in anticipation of it, and is recovered through the contract rather than carried as central overhead.\n\n" +
"Specialist and statutory functions — health and safety advice, accountancy, legal — are retained on a fractional basis with defined boundaries. AI assists in drafting, checking and reconciliation across the platform; it does not replace competent human supervision, and no safety-critical or contractual decision is taken without a named person approving it.\n\n" +
"We would rather state capacity we can evidence and be marked accordingly than claim capacity that fails at the first contract review.",

  declare:
"Declared to the buyer, before it is asked for:\n\n" +
"- **No completed contracts in the company's name.** The company is newly incorporated. The relevant experience is the Director's, held in previous employment, and is stated as such throughout section 2.\n" +
"- **Limited filed accounts.** Financial standing should be assessed on that basis. Where a buyer requires a minimum turnover or filed accounts we will not meet it, and we would rather be told that at the outset than consume the buyer's evaluation time.\n" +
"- **Insurance not yet incepted.** In hand, and it will be in force before any award.\n" +
"- **SSIP in progress, ISO certifications not held.**\n\n" +
"Each of these costs marks at selection stage. Concealing any of them and being found out costs the framework, and rightly."
};

const r = await fetch(B + "/api/docs/generate", { method: "POST",
  headers: { "content-type": "application/json", authorization: "Bearer " + tok },
  body: JSON.stringify({ template: "capability", data }) });
const j = await r.json();
console.log("generate ->", r.status, JSON.stringify(j.document || j).slice(0, 160));
if (j.document) fs.writeFileSync(S + "/capdoc.txt", j.document.id);
