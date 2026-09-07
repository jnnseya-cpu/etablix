const fs = require("fs");
const D = require(process.env.DOCX);
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
        HeadingLevel, AlignmentType, BorderStyle, Header, Footer, PageNumber, PageBreak } = D;
const G = require("/home/user/etablix/business/tender/gap-register.cjs").gaps;
const INK="14181D", GOLD="9C7A3C", SLATE="5B6672", RED="C0392B", PAPER="F2EFE7", F="Arial", W=9020;
const b={top:{style:BorderStyle.SINGLE,size:2,color:"D5D5D5"},bottom:{style:BorderStyle.SINGLE,size:2,color:"D5D5D5"},
         left:{style:BorderStyle.SINGLE,size:2,color:"D5D5D5"},right:{style:BorderStyle.SINGLE,size:2,color:"D5D5D5"}};
const SEV={Fatal:"C0392B",Major:"B07A1E",Significant:"5B6672",Moderate:"8A8A8A"};
// bold **…** inside a cell
const runs=(t,o={})=>String(t).split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(s=>
  s.startsWith("**")?new TextRun({text:s.slice(2,-2),font:F,size:o.size??16,bold:true,color:o.color??INK})
                    :new TextRun({text:s,font:F,size:o.size??16,color:o.color??INK}));
const cell=(t,o={})=>new TableCell({width:{size:o.w,type:WidthType.DXA},borders:b,
  margins:{top:70,bottom:70,left:90,right:90},
  shading:o.fill?{type:ShadingType.CLEAR,color:"auto",fill:o.fill}:undefined,columnSpan:o.span,
  children:[new Paragraph({spacing:{before:20,after:20,line:240},
    children:runs(t,{size:o.size,color:o.color}).map(r=>o.bold?new TextRun({text:r.options?.text??"",font:F,size:o.size??16,bold:true,color:o.color??INK}):r)})]});
const p=(t,o={})=>new Paragraph({spacing:{before:o.before??70,after:o.after??70,line:260},
  children:runs(t,{size:o.size??19,color:o.color})});
const h1=(t)=>new Paragraph({heading:HeadingLevel.HEADING_1,spacing:{before:340,after:130},
  children:[new TextRun({text:t,font:F,size:28,bold:true,color:INK})]});

const kids=[];
kids.push(new Paragraph({spacing:{before:1400,after:0},children:[new TextRun({text:"ETABLIX",font:F,size:52,bold:true,color:INK})]}));
kids.push(new Paragraph({spacing:{after:800},children:[new TextRun({text:"I N T E G R A T E D   S I T E   S E R V I C E S",font:F,size:14,bold:true,color:GOLD})]}));
kids.push(p("GAP REGISTER",{size:38}));
kids.push(p("Employer's Requirements, P2 Modular Accommodation — Rev A reviewed against itself",{size:24,color:GOLD,after:600}));
kids.push(p("Twenty-five findings against a document this office issued. Three of them mean a tenderer cannot price it safely. "
  +"They are recorded here in the same form as findings against anyone else's document, because a review that goes easy on its own work is not a review.",
  {italics:true,color:SLATE,size:19}));
kids.push(new Paragraph({children:[new PageBreak()]}));
kids.push(h1("Summary"));
const counts={};G.forEach(r=>counts[r[1]]=(counts[r[1]]||0)+1);
const sw=[2000,1400,5620];
kids.push(new Table({columnWidths:sw,width:{size:W,type:WidthType.DXA},rows:[
 new TableRow({tableHeader:true,children:["Severity","Findings","What it means"].map((t,i)=>cell(t,{w:sw[i],bold:true,fill:INK,color:"FFFFFF"}))}),
 ...[["Fatal",counts.Fatal,"A tenderer cannot price the document safely. Returns will not be comparable."],
     ["Major",counts.Major,"A material requirement is absent; the risk sits with the Employer by default."],
     ["Significant",counts.Significant,"The requirement exists but is unenforceable or will be qualified."],
     ["Moderate",counts.Moderate,"Would be picked up at review; costs credibility rather than money."]]
   .map(r=>new TableRow({children:r.map((v,i)=>cell(String(v),{w:sw[i],bold:i===0,color:i===0?SEV[r[0]]:INK}))}))]}));
kids.push(new Paragraph({children:[new PageBreak()]}));
kids.push(h1("The findings"));
const gw=[620,1080,1180,2100,2020,2020];
kids.push(new Table({columnWidths:gw,width:{size:W,type:WidthType.DXA},rows:[
 new TableRow({tableHeader:true,children:["Ref","Severity","Where","Finding","Why it matters","Fix"]
   .map((t,i)=>cell(t,{w:gw[i],bold:true,fill:INK,color:"FFFFFF",size:16}))}),
 ...G.map(r=>new TableRow({children:r.map((v,i)=>cell(v,{w:gw[i],size:15,
   bold:i===0,color:i===1?SEV[r[1]]:INK}))}))]}));
kids.push(new Paragraph({children:[new PageBreak()]}));
kids.push(h1("The two that matter most"));
kids.push(p("**G01 — no design responsibility matrix.** Everything else on this list is a clause that can be added. This one is structural. "
 +"A modular accommodation package is bought either as a contractor-designed package against performance requirements, or as construction to "
 +"the Employer's design, and the price, the programme and the liability are different in each case. The document never says which. Every "
 +"competent tenderer will qualify its return, and qualified returns cannot be compared — which quietly defeats the evaluation model built to "
 +"compare them."));
kids.push(p("**G02 — the specification takes back the risk it was meant to transfer.** Ten lines of the room data sheet name a product rather "
 +"than a performance. Specifying a 1.0 kW panel heater rather than \"maintain 21 °C at −4 °C external\" means that if the room is cold, the "
 +"Employer specified the heater and the Employer owns the problem. That is the opposite of what a performance specification is for. The fix is "
 +"not to make everything performance-based — an Employer is entitled to specify the accessible WC it wants — but to decide, line by line, which "
 +"it is doing and to accept the liability that follows."));
kids.push(p("**G03 is the one that would matter at an inquiry.** Electronic locks on bedroom doors in sleeping accommodation, and no statement "
 +"anywhere of what they do when the fire alarm sounds. It is a single sentence to fix and it should never have been absent.",{color:RED}));

const doc=new Document({creator:"ETABLIX",title:"Gap register — ER P2 Rev A",
 styles:{default:{document:{run:{font:F,size:19,color:INK}}}},
 sections:[{properties:{page:{margin:{top:1440,bottom:1440,left:1440,right:1440}}},
  headers:{default:new Header({children:[new Paragraph({border:{bottom:{style:BorderStyle.SINGLE,size:6,color:GOLD}},
    children:[new TextRun({text:"ETABLIX   ·   Gap register   ·   Employer's Requirements P2 Rev A",font:F,size:15,color:SLATE})]})]})},
  footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.RIGHT,
    children:[new TextRun({text:"Page ",font:F,size:15,color:SLATE}),new TextRun({children:[PageNumber.CURRENT],font:F,size:15,color:SLATE}),
              new TextRun({text:" of ",font:F,size:15,color:SLATE}),new TextRun({children:[PageNumber.TOTAL_PAGES],font:F,size:15,color:SLATE})]})]})},
  children:kids}]});
Packer.toBuffer(doc).then(x=>{fs.writeFileSync("/home/user/etablix/business/tender/ETABLIX-ER-P2-gap-register.docx",x);
 console.log("gap register written:",(x.length/1024).toFixed(0),"KB");});
