"""Tender evaluation model — quality, price, and whether the answer is robust."""
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
exec(open("styles.py").read())
GBP = '£#,##0;(£#,##0);-'
wb = Workbook()
N_T = 5          # tenderers
T0 = 4           # first tenderer column (D)
TC = [get_column_letter(T0 + i) for i in range(N_T)]

# ── ReadMe
ws = wb.active; ws.title = "ReadMe"; ws.sheet_view.showGridLines = False
for c, w in zip("ABC", (3, 30, 100)): ws.column_dimensions[c].width = w
ws["B2"] = "TENDER EVALUATION MODEL"; ws["B2"].font = H1
ws["B3"] = "ETABLIX — Integrated Site Services, part of Groupe Nseya"; ws["B3"].font = SMALL
rows = [
 ("WHAT IT DOES", "Scores quality against published criteria, normalises price, combines the two on the published split, and then asks the "
  "question that decides whether an award will survive being challenged: would a different weighting have picked a different winner?"),
 ("", ""),
 ("THE ORDER", "1. Criteria — set the criteria and weightings BEFORE tenders are opened, and publish them in the ITT."),
 ("", "2. Scores — each evaluator scores each tenderer against each criterion, 0 to 5, with a written reason."),
 ("", "3. Prices — enter tendered prices exactly as returned, before any negotiation."),
 ("", "4. Result — the combined score, the ranking, and the margin between first and second."),
 ("", "5. Sensitivity — the test that matters. If a small change in weighting flips the winner, the award is fragile and you need to know now."),
 ("", ""),
 ("THE RULE THAT MATTERS", "Weightings are set and published before tenders are opened, and are not changed afterwards. A weighting adjusted "
  "once the prices are known is not an evaluation, it is a justification, and it is the single commonest reason an award is successfully challenged."),
 ("", ""),
 ("SCORING", "0 — no response, or wholly non-compliant.   1 — poor, major concerns.   2 — below the requirement.   "
  "3 — meets the requirement.   4 — above the requirement, evidenced.   5 — excellent, evidenced, adds value.\n"
  "A score of 3 is a pass. Scores of 4 and 5 require evidence in the tender, not an impression of the tenderer."),
 ("", ""),
 ("PRICE", "Lowest compliant price scores full marks; the others score in proportion. Set out in the ITT so nobody is surprised. "
  "An abnormally low tender is flagged rather than accepted: the check is on the Result sheet and the duty is to ask, not to assume."),
 ("", ""),
 ("AUDIT", "Every score carries the evaluator's name and a written reason. Moderation is recorded as a change from the raw score with its "
  "own reason. If you cannot explain a score to the tenderer who lost, it is not yet a score."),
]
r = 6
for a, b in rows:
    ws.cell(row=r, column=2, value=a).font = H3 if a else BODY
    c = ws.cell(row=r, column=3, value=b); c.font = BODY
    c.alignment = Alignment(wrap_text=True, vertical="top")
    if a in ("THE RULE THAT MATTERS",): c.fill = WARNFILL
    ws.row_dimensions[r].height = 30 if len(b) > 105 else 14
    r += 1

# ── Criteria
ws = wb.create_sheet("Criteria"); ws.sheet_view.showGridLines = False
for c, w in zip("ABCDE", (4, 10, 46, 13, 70)): ws.column_dimensions[c].width = w
ws["B2"] = "EVALUATION CRITERIA AND WEIGHTINGS"; ws["B2"].font = H1
ws["B3"] = "Set and published in the ITT before tenders are opened. Blue cells are yours. The weightings must total 100%."; ws["B3"].font = SMALL
for i, h in enumerate(["Ref", "Criterion", "Weighting", "What a score of 3 looks like — the pass mark"]):
    c = ws.cell(row=5, column=i + 2, value=h); c.font = H3; c.fill = SECFILL
    c.border = Border(bottom=Side(style="medium", color="14181D"))
CRIT = [
 ("Q1", "Understanding of the scope and its interfaces", 0.15, "Identifies the package boundaries and names what is handed over to and from each adjacent package. A tenderer who has not read the interface schedule scores 2."),
 ("Q2", "Method statement and buildability", 0.15, "A method that is specific to this site and this programme, not a generic capability statement with the project name changed."),
 ("Q3", "Programme and resource realism", 0.12, "Resources match the durations offered. A programme that cannot be resourced from the histogram provided scores 2 however attractive its end date."),
 ("Q4", "Key personnel and their availability", 0.08, "Named individuals with relevant experience, and a stated percentage of their time on this contract."),
 ("Q5", "Health, safety and environmental approach", 0.10, "Specific to the hazards of this scope. Accident statistics alone score 2."),
 ("Q6", "Quality, inspection and handover", 0.08, "An ITP proportionate to the works, and a handover pack defined at tender rather than negotiated at completion."),
 ("Q7", "Supply chain and delivery security", 0.07, "Named suppliers for long-lead items with lead times stated and evidenced."),
 ("Q8", "Social value and local employment", 0.05, "Commitments that are measurable and reportable, not aspirations."),
]
r = 6
for ref, name, wgt, pass3 in CRIT:
    ws.cell(row=r, column=2, value=ref).font = H3
    ws.cell(row=r, column=3, value=name).font = BODY
    c = ws.cell(row=r, column=4, value=wgt); c.font = INPUT; c.number_format = "0.0%"; c.fill = KEYFILL
    p = ws.cell(row=r, column=5, value=pass3); p.font = SMALL
    p.alignment = Alignment(wrap_text=True, vertical="top"); ws.row_dimensions[r].height = 26
    for cc in range(2, 6): ws.cell(row=r, column=cc).border = BOX
    r += 1
Q0, Q1 = 6, r - 1
ws.cell(row=r, column=3, value="QUALITY — TOTAL").font = H3
ws.cell(row=r, column=4, value=f"=SUM(D{Q0}:D{Q1})").font = H3
ws.cell(row=r, column=4).number_format = "0.0%"; ws.cell(row=r, column=4).fill = TOTFILL
QT = r; r += 1
ws.cell(row=r, column=2, value="P1").font = H3
ws.cell(row=r, column=3, value="Price").font = BODY
c = ws.cell(row=r, column=4, value=0.40); c.font = INPUT; c.number_format = "0.0%"; c.fill = KEYFILL
ws.cell(row=r, column=5, value="The price/quality split is a decision, not a default. On a scope where the risk is interface failure rather than rate, a lower price weighting buys a better outcome — and you must be able to say why you chose it.").font = SMALL
ws.cell(row=r, column=5).alignment = Alignment(wrap_text=True, vertical="top"); ws.row_dimensions[r].height = 34
PW = r; r += 1
ws.cell(row=r, column=3, value="TOTAL").font = H3
ws.cell(row=r, column=4, value=f"=D{QT}+D{PW}").font = H3
ws.cell(row=r, column=4).number_format = "0.0%"; ws.cell(row=r, column=4).fill = TOTFILL
TOT = r; r += 1
ws.cell(row=r, column=3, value="Check").font = H3
ws.cell(row=r, column=4, value=f'=IF(ROUND(D{TOT},4)=1,"Weightings total 100% — correct","ERROR: weightings total "&TEXT(D{TOT},"0.0%")&" — they must total 100%")')
ws.cell(row=r, column=4).font = Font(name="Arial", size=10, bold=True, color="C0392B")
import json; json.dump({"Q0":Q0,"Q1":Q1,"QT":QT,"PW":PW,"NCRIT":len(CRIT)}, open("eval.json","w"))
wb.save("/home/user/etablix/tools/tender-evaluation.xlsx")
print("Criteria written:", len(CRIT), "quality criteria, rows", Q0, "-", Q1)
