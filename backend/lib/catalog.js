/**
 * ETABLIX Communication Event Architecture — the catalogue.
 *
 * One event engine (lib/comms.js) fans every event out across its
 * declared channels: email · in-app · sms · push. Email and in-app are
 * wired live; sms and push are recorded in sandbox until a provider key
 * is added. Events marked mandatory are operational/security notices
 * that would bypass user opt-outs.
 *
 * audience: client | supplier | employee | internal
 */

const E = (code, name, severity, channels, subject, line, opts = {}) => ({
  code,
  name,
  severity,
  channels: channels.split(" "),
  subject,
  line,
  mandatory: Boolean(opts.m),
  audience: opts.a || "internal",
});

export const CATEGORIES = [
  {
    id: "intake",
    name: "Commercial intake",
    events: [
      E("enquiry.received", "Enquiry received (client)", "info", "email inapp", "ETABLIX — enquiry received ({{reference}})", "Thank you for your enquiry. It has been received and logged under reference {{reference}} — please quote it in any correspondence. A member of our commercial team is reviewing your brief.", { a: "client" }),
      E("enquiry.logged", "New enquiry logged", "info", "email inapp push", "ETABLIX enquiry {{reference}} — {{company}} ({{service}})", "New business project enquiry {{reference}} from {{company}}. Review and progress it in the Control Desk.", {}),
      E("enquiry.contacted", "Enquiry contacted", "info", "inapp", "Enquiry {{reference}} moved to contacted", "{{actor}} marked enquiry {{reference}} ({{company}}) as contacted.", {}),
      E("enquiry.qualified", "Enquiry qualified", "success", "inapp", "Enquiry {{reference}} qualified", "Enquiry {{reference}} ({{company}}) is qualified — prepare the proposal.", {}),
      E("enquiry.won", "Enquiry won", "success", "email inapp push", "Enquiry {{reference}} WON — {{company}}", "Enquiry {{reference}} ({{company}}) has been marked won. Mobilisation and commercial set-up can begin.", {}),
      E("enquiry.lost", "Enquiry lost", "info", "inapp", "Enquiry {{reference}} closed as lost", "Enquiry {{reference}} ({{company}}) was closed as lost. Record the reason for the pipeline review.", {}),
      E("diagnostic.booked", "Site Systems Diagnostic booked", "success", "email inapp", "Site Systems Diagnostic confirmed — {{company}}", "Your Site Systems Diagnostic is confirmed. We will contact you to agree access, dates and the information pack.", { a: "client" }),
      E("proposal.issued", "Proposal issued", "info", "email inapp", "Your ETABLIX proposal — {{reference}}", "Our written proposal for {{reference}} has been issued. It defines scope, assumptions, exclusions and price.", { a: "client" }),
    ],
  },
  {
    id: "supply",
    name: "Supply chain",
    events: [
      E("supplier.registration.received", "Registration received (supplier)", "info", "email inapp", "ETABLIX — supplier registration received ({{reference}})", "Thank you for registering {{company}} with the ETABLIX specialist supply chain. Your application is logged under reference {{reference}}. We assess every registration against our Supplier Code and will notify you as it progresses.", { a: "supplier" }),
      E("supplier.registration.logged", "New registration logged", "info", "email inapp push", "ETABLIX supplier registration {{reference}} — {{company}} ({{capability}})", "New supplier registration {{reference}} from {{company}}. Assess it in the Control Desk.", {}),
      E("supplier.under_review", "Application under review", "info", "email inapp", "ETABLIX — your registration {{reference}} is under review", "Your registration is under active review by our commercial team. We may contact you for insurances, accreditations or references — no action is needed at this stage.", { a: "supplier" }),
      E("supplier.prequalified", "Supplier prequalified", "success", "email inapp", "ETABLIX — {{reference}}: prequalified for the ETABLIX supply chain", "{{company}} has been prequalified in the category {{capability}}. You are eligible to receive controlled enquiries and tender invitations. Keep insurances and accreditations current — we verify them again at tender.", { a: "supplier" }),
      E("supplier.approved", "Supplier approved", "success", "email inapp", "ETABLIX — {{reference}}: approved supplier", "{{company}} is approved as an ETABLIX supply-chain partner in the category {{capability}}. Our commercial team will contact you to complete onboarding: framework terms, verification and payment details.", { a: "supplier" }),
      E("supplier.declined", "Registration declined", "info", "email inapp", "ETABLIX — your supplier registration {{reference}}", "After assessment against our current supply-chain requirements we will not take your application forward at this time. This reflects our present package needs, not a judgement on your business — you are welcome to register again as your capability develops.", { a: "supplier" }),
      E("supplier.docs_requested", "Documents requested", "warning", "email inapp", "ETABLIX — documents needed for {{reference}}", "To progress your registration we need: {{item}}. Reply to this email with the documents attached, quoting {{reference}}.", { a: "supplier" }),
      E("supplier.insurance_expiring", "Insurance expiring", "warning", "email inapp sms", "ETABLIX — insurance evidence expiring for {{company}}", "Our records show your {{item}} expires on {{date}}. Send updated evidence to remain eligible for call-offs.", { a: "supplier", m: true }),
      E("supplier.tender_invited", "Invited to tender", "info", "email inapp push", "ETABLIX — invitation to tender: {{item}}", "{{company}} is invited to tender for the package: {{item}}. The enquiry pack and return date are attached.", { a: "supplier" }),
      E("supplier.bid_received", "Bid received", "info", "inapp", "Bid received — {{company}} for {{item}}", "A tender return has been received from {{company}} for {{item}}.", {}),
      E("supplier.bid_outcome", "Bid outcome", "info", "email inapp", "ETABLIX — tender outcome for {{item}}", "The tender for {{item}} has concluded. The outcome for your submission is: {{outcome}}. Thank you for the quality of your return.", { a: "supplier" }),
      E("supplier.message", "Direct message to suppliers", "info", "email", "ETABLIX — {{subject}}", "{{message}}", { a: "supplier" }),
      E("supplier.message.sent", "Supplier message dispatched", "info", "inapp", "Message sent to {{value}} suppliers — {{subject}}", "{{actor}} sent \"{{subject}}\" to {{value}} suppliers ({{outcome}}).", {}),
    ],
  },
  {
    id: "accounts",
    name: "Employee accounts",
    events: [
      E("user.created", "Employee account created", "success", "email inapp", "Your ETABLIX Control Desk account", "An ETABLIX Control Desk account has been created for you with the role {{role}}. Sign in at https://etablix.com/internal/login.html — your administrator will give you your initial password separately. Change is managed through your administrator.", { a: "employee" }),
      E("user.role_changed", "Role changed", "info", "email inapp", "ETABLIX — your role was updated", "Your Control Desk role is now {{role}}. Your access reflects the new role from your next sign-in.", { a: "employee" }),
      E("user.password_reset", "Password reset", "warning", "email inapp", "ETABLIX — your password was reset", "An administrator reset your Control Desk password. If you did not expect this, contact your administrator immediately.", { a: "employee", m: true }),
      E("user.deactivated", "Account deactivated", "warning", "email inapp", "ETABLIX — your access has been removed", "Your ETABLIX Control Desk access has been deactivated. Contact your administrator with any questions.", { a: "employee", m: true }),
      E("user.reactivated", "Account reactivated", "success", "email inapp", "ETABLIX — your access is restored", "Your ETABLIX Control Desk access has been reactivated. Sign in at https://etablix.com/internal/login.html.", { a: "employee" }),
    ],
  },
  {
    id: "security",
    name: "Login & security",
    events: [
      E("auth.login.failed", "Failed sign-in attempts", "warning", "inapp", "Repeated failed sign-ins — {{email}}", "Repeated failed sign-in attempts were recorded for {{email}}.", {}),
      E("security.alert", "Security alert", "critical", "email inapp sms", "ETABLIX — security alert on your account", "A security alert was raised on your account: {{item}}. If this was not you, contact your administrator now.", { a: "employee", m: true }),
      E("account.locked", "Account locked", "critical", "email inapp sms", "ETABLIX — your account has been locked", "Your account was locked after repeated failed attempts. An administrator can unlock it.", { a: "employee", m: true }),
      E("session.revoked", "Session revoked", "warning", "email inapp", "ETABLIX — a session was signed out", "One of your sessions was signed out by an administrator.", { a: "employee", m: true }),
      E("secret.rotation_due", "Token secret rotation due", "warning", "inapp", "Rotate ETABLIX_TOKEN_SECRET", "The platform token secret has been in service for over a year — schedule a rotation.", { m: true }),
    ],
  },
  {
    id: "projects",
    name: "Projects (CONSTRUX)",
    events: [
      E("project.mobilising", "Project mobilising", "info", "email inapp push", "Mobilisation started — {{project}}", "Mobilisation has started on {{project}}. Readiness gates and the mobilisation programme are live in CONSTRUX.", {}),
      E("project.completed", "Project completed", "success", "email inapp", "Project completed — {{project}}", "{{project}} is complete. Demobilisation records, final accounts and lessons learned are being closed out.", {}),
      E("milestone.overdue", "Milestone overdue", "warning", "email inapp push", "Milestone overdue — {{item}}", "The milestone {{item}} on {{project}} is overdue. The recovery position is in CONSTRUX.", {}),
      E("rfi.raised", "RFI raised", "info", "inapp push", "RFI raised — {{item}}", "A new RFI has been raised on {{project}}: {{item}}.", {}),
      E("rfi.overdue", "RFI overdue", "warning", "email inapp", "RFI overdue — {{item}}", "RFI {{item}} on {{project}} has passed its response date.", {}),
      E("inspection.failed", "Inspection failed", "warning", "email inapp push", "Inspection failed — {{item}}", "Inspection {{item}} on {{project}} failed. Non-conformances have been raised for the failed items.", {}),
      E("ncr.raised", "Non-conformance raised", "warning", "email inapp", "NCR raised — {{item}}", "A non-conformance has been raised on {{project}}: {{item}}.", {}),
      E("ncr.overdue", "Non-conformance overdue", "warning", "email inapp sms", "NCR overdue — {{item}}", "Non-conformance {{item}} on {{project}} is overdue for close-out.", { m: true }),
      E("sensor.alert", "Site telemetry alert", "warning", "inapp push", "Telemetry alert — {{item}}", "Sensor {{item}} on {{project}} breached its threshold: {{value}}.", {}),
    ],
  },
  {
    id: "commercial",
    name: "Commercial control",
    events: [
      E("valuation.due", "Monthly valuation due", "info", "email inapp", "Valuation cycle — day 20 submissions due for {{project}}", "Supplier applications for {{project}} are due today (day 20 of the cycle). Verification runs days 21–23.", {}),
      E("application.received", "Supplier application received", "info", "inapp", "Payment application received — {{company}}", "A payment application has been received from {{company}} on {{project}}.", {}),
      E("payment.certified", "Payment certified", "success", "email inapp", "Payment certified — {{company}} on {{project}}", "Certified value for {{company}} this cycle: {{amount}}. Payment follows the contractual due date.", { a: "supplier" }),
      E("payment.notice", "Pay-less notice issued", "warning", "email inapp", "Payment notice — {{project}}", "A payment/pay-less notice has been issued for your application on {{project}}. The assessment detail is attached.", { a: "supplier", m: true }),
      E("reserve.low", "Cash reserve below one month", "critical", "email inapp sms", "Rolling reserve below threshold — {{project}}", "The rolling cash reserve on {{project}} has fallen below one month of committed supplier expenditure. Condition-precedent mechanics apply.", { m: true }),
      E("evm.breach", "EVM performance breach", "warning", "email inapp", "EVM alert — {{item}} below 0.95 on {{project}}", "{{item}} on {{project}} is below 0.95. Recovery / commercial review is triggered.", {}),
      E("retention.release_due", "Retention release due", "info", "email inapp", "Retention release due — {{company}}", "A retention release for {{company}} falls due on {{date}}. Verify defects status before certifying.", {}),
    ],
  },
  {
    id: "risk",
    name: "Risk & intelligence (VERYX)",
    events: [
      E("risk.identified", "Risk identified", "warning", "email inapp", "New risk on {{project}}", "A new risk has been identified on {{project}}: {{item}}.", {}),
      E("risk.escalated", "Risk escalated", "critical", "email inapp sms", "Risk escalated — {{item}}", "Risk {{item}} has been escalated. Score: {{value}}. Mitigation ownership and drawdown implications are in VERYX.", { m: true }),
      E("risk.resolved", "Risk resolved", "success", "inapp", "Risk resolved — {{item}}", "Risk {{item}} has been closed.", {}),
      E("agent.run_completed", "AI agent run completed", "info", "inapp", "Agent run — {{item}}", "{{item}} completed: {{outcome}}", {}),
      E("agent.run_failed", "AI agent run failed", "warning", "inapp push", "Agent run failed — {{item}}", "The agent {{item}} failed to complete: {{outcome}}", {}),
      E("acu.low", "ACU balance low", "warning", "email inapp", "VERYX ACU balance low", "The workspace ACU balance is {{value}} — top up to keep agent runs available.", {}),
      E("api.quota_warning", "API quota near limit", "warning", "email inapp", "VERYX API quota at {{value}}", "The monthly Platform API quota has reached {{value}}. Calls are rejected with 429 at 100%.", {}),
    ],
  },
  {
    id: "documents",
    name: "Documents & compliance",
    events: [
      E("document.uploaded", "Document uploaded", "info", "inapp", "Document uploaded — {{item}}", "{{item}} was uploaded against {{reference}}.", {}),
      E("document.expiring", "Document expiring", "warning", "email inapp", "Document expiring — {{item}}", "{{item}} expires on {{date}}. Replace it to keep the record compliant.", {}),
      E("compliance.breach", "Compliance breach", "critical", "email inapp sms", "Compliance breach — {{item}}", "A compliance breach has been recorded: {{item}}. Containment and investigation actions are required now.", { m: true }),
      E("compliance.resolved", "Compliance issue resolved", "success", "email inapp", "Compliance issue resolved — {{item}}", "The compliance issue {{item}} has been closed with evidence on file.", {}),
      E("modern_slavery.review_due", "Modern slavery review due", "info", "email inapp", "Annual modern-slavery statement review due", "The modern-slavery statement is due its annual review and board approval.", { m: true }),
    ],
  },
  {
    id: "platform",
    name: "Platform administration",
    events: [
      E("system.maintenance_scheduled", "Scheduled maintenance", "info", "email inapp", "ETABLIX — scheduled maintenance on {{date}}", "Planned maintenance is scheduled for {{date}}. The Control Desk may be briefly unavailable.", { a: "employee" }),
      E("system.outage", "System outage", "critical", "email inapp sms", "ETABLIX — service disruption", "A service disruption is in progress. We are restoring service and will confirm when resolved.", { a: "employee", m: true }),
      E("system.restored", "Service restored", "success", "email inapp", "ETABLIX — service restored", "Service has been fully restored. Submissions made during the disruption are safe in the intake store.", { a: "employee" }),
      E("backup.failed", "Backup failed", "critical", "email inapp", "ETABLIX — nightly backup failed", "The nightly data backup did not complete. Investigate before the next cycle.", { m: true }),
      E("integration.disconnected", "Platform connection lost", "warning", "email inapp", "{{item}} connection lost", "The {{item}} platform connection is failing — the Control Desk has fallen back to workspace data.", {}),
    ],
  },
  {
    id: "automation",
    name: "Delivery automation",
    events: [
      E("automation.digest", "Daily operating digest", "info", "email inapp", "ETABLIX daily digest — {{date}}", "Automated daily digest for {{date}}: {{outcome}}", {}),
      E("enquiry.stale", "Enquiry needs action", "warning", "email inapp", "Enquiry {{reference}} untouched for {{value}} days", "Enquiry {{reference}} ({{company}}) is still marked new after {{value}} days. Contact the client or update its status.", {}),
      E("application.stale", "Supplier application awaiting review", "warning", "email inapp", "Supplier application {{reference}} awaiting review", "Registration {{reference}} ({{company}}) has waited {{value}} days without assessment. Review it in the Control Desk.", {}),
      E("exposure.breach", "Committed exposure exceeds cover", "critical", "email inapp sms", "EXPOSURE RULE BREACH — {{project}}", "Committed supplier exposure on {{project}} ({{amount}}) exceeds cash reserve plus confirmed receivables. No new supplier commitments until cover is restored.", { m: true }),
      E("bid.screened", "Opportunity screened", "info", "inapp", "Bid screen — {{item}}: {{outcome}}", "{{actor}} screened opportunity {{item}} for {{company}}. Verdict: {{outcome}}.", {}),
      E("supplier.assessed", "Supplier prequalification assessed", "info", "email inapp", "Prequalification — {{company}}: {{outcome}} ({{value}})", "{{actor}} completed the twelve-criterion prequalification assessment for {{company}}. Weighted result {{value}}, outcome: {{outcome}}. Scores and notes are on the registration record.", {}),
      E("supplier.pqq.sent", "PQQ issued to supplier", "info", "email inapp", "ETABLIX — prequalification questionnaire for {{company}}", "Thank you for registering with ETABLIX. To progress your prequalification, please complete our questionnaire — the secure link is below and remains valid for {{value}} days. It covers financial standing, references, HSE, insurance, quality, ethical standards and working requirements, with document uploads at the end.", { a: "supplier" }),
      E("supplier.pqq.received", "PQQ received", "success", "email inapp", "PQQ received — {{company}}", "{{company}} has completed the prequalification questionnaire ({{value}} document(s) attached). It is ready to assess in the Control Desk — Agent 7 can draft the scorecard from the answers.", {}),
      E("gate.passed", "Prime-bid gate passed", "success", "inapp", "Prime gate passed — {{item}}", "{{actor}} marked the prime-bid gate complete: {{item}}.", {}),
    ],
  },
  {
    id: "privacy",
    name: "Legal & privacy",
    events: [
      E("privacy.request_received", "Data request received", "info", "email inapp", "ETABLIX — we received your data request", "Your data-protection request has been received and logged. We respond within one calendar month as set out in our privacy policy.", { a: "client", m: true }),
      E("privacy.export_ready", "Data export ready", "success", "email inapp", "ETABLIX — your data export is ready", "The personal-data export you requested is ready and attached to this message.", { a: "client", m: true }),
      E("privacy.deletion_completed", "Deletion completed", "info", "email inapp", "ETABLIX — your data has been deleted", "Your personal data has been deleted from our systems, except records we must retain by law.", { a: "client", m: true }),
      E("policy.updated", "Policy updated", "info", "email inapp", "ETABLIX — {{item}} updated", "We have updated our {{item}}. The current version is always at etablix.com.", { a: "client" }),
    ],
  },
];

export const EVENTS = Object.fromEntries(
  CATEGORIES.flatMap((c) => c.events.map((e) => [e.code, { ...e, category: c.name, categoryId: c.id }]))
);

export const SAMPLE_VARS = {
  name: "Alex Example",
  actor: "Dana Okafor",
  email: "alex@example.com",
  company: "Northshore EPC Ltd",
  capability: "Modular-building suppliers",
  service: "Management Integrator",
  reference: "SUP-1A2B3C",
  item: "Welfare compound readiness review",
  project: "400kV Substation — Site Establishment",
  role: "project manager",
  amount: "£84,250",
  number: "INV-2043",
  date: "12/09/2026",
  value: "82 dB",
  outcome: "successful",
};
