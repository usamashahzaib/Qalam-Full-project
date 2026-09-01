import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const OUTPUT = "X:/Usama/Qalam/Code/Full project/byqalam-website/deliverables/qalam-linkedin-content-september-2026";
const W = 1080;
const H = 1080;
const C = {
  ink: "#102A2A",
  teal: "#0E6B63",
  gold: "#C9973E",
  coral: "#D36B55",
  paper: "#F7F3EA",
  sand: "#E8DEC9",
  muted: "#66736E",
  white: "#FFFDF7",
};

const carousels = [
  {
    id: "01-career-visibility-os",
    slot: "Week 1 - Monday",
    title: "Your experience is valuable. Your career story should prove it.",
    caption: `A career story breaks when every surface tells a different version of you.

Your resume says one thing.
Your LinkedIn profile says another.
Your content sounds like a third person.
Your interview answers begin from zero again.

Qalam is built around one simple idea: your real professional evidence should be reusable.

Save the work, outcomes, responsibilities, and voice once. Use that context to create clearer career assets without inventing experience.

The goal is not to sound impressive everywhere.

The goal is to be understood and trusted wherever an opportunity finds you.

#CareerVisibility #LinkedIn #CareerGrowth #Qalam`,
    slides: [
      ["Your experience is valuable.", "Your career story should prove it."],
      ["THE PROBLEM", "Your career surfaces drift apart", "Resume, LinkedIn, content, and interview answers often start from separate blank pages."],
      ["THE COST", "Good work becomes harder to evaluate", "People see fragments instead of a clear pattern of what you can do."],
      ["THE SHIFT", "Keep one trusted record", "Save evidence, goals, voice, and context once. Reuse them with review and control."],
      ["THE RESULT", "One story across the places that matter", "A coherent professional presence makes useful work easier to understand."],
      ["QALAM", "Turn experience into visible proof", "Build a career story from what actually happened."],
    ],
  },
  {
    id: "02-resume-ats-signal",
    slot: "Week 1 - Thursday",
    title: "An ATS score is useful only when it tells you what to fix next",
    caption: `A resume score without a clear next action is just a number.

Qalam's ATS Resume Checker looks at the signals that affect whether a resume is understood: structure, relevance, evidence, clarity, and risk.

The point is not to chase a perfect score.

The point is to find the highest-impact gap before you apply.

Is the target role clear?
Are your achievements specific?
Does the document make sense to a recruiter and a parsing system?

Start with the gap that changes the decision.

No account is needed to run the free check.

#ResumeTips #ATS #JobSearch #Qalam`,
    slides: [
      ["An ATS score is useful", "only when it tells you what to fix next"],
      ["CHECK THE SIGNAL", "Structure", "Can a recruiter and a parsing system find the important sections without guessing?"],
      ["CHECK THE SIGNAL", "Relevance", "Does the resume speak to the role you want, or only describe every role you have held?"],
      ["CHECK THE SIGNAL", "Evidence", "Are responsibilities supported by specific actions, outcomes, scope, or tools?"],
      ["CHECK THE SIGNAL", "Clarity and risk", "Is the writing direct? Are there gaps, contradictions, or vague claims that need attention?"],
      ["START WITH THE GAP", "Not the score", "Run the free Qalam ATS Resume Checker and fix the highest-impact issue first."],
    ],
  },
  {
    id: "03-linkedin-voice",
    slot: "Week 2 - Monday",
    title: "Your LinkedIn content should sound like you on your clearest day",
    caption: `Most AI writing tools begin with a blank prompt.

Qalam begins with your voice.

The phrases you actually use.
The level of certainty you are comfortable with.
The experiences you can stand behind.
The ideas you want to be known for.

Save a voice profile, bring your real evidence, and keep the final edit in your hands.

Good professional content should feel clearer after editing, not less like you.

If a draft could belong to anyone, it is not finished.

#LinkedInWriting #PersonalBrand #ProfessionalContent #Qalam`,
    slides: [
      ["Your LinkedIn content should sound like you", "on your clearest day"],
      ["GENERIC AI", "Starts with a blank prompt", "It can produce fluent words without knowing what you actually believe or have done."],
      ["QALAM", "Starts with saved voice and evidence", "Your tone, experience, goals, and approved context shape the draft."],
      ["THE HUMAN PART", "Edit for truth and judgment", "Keep the nuance. Remove the claim you cannot stand behind. Make the idea yours."],
      ["THE TEST", "Could a colleague recognize you?", "If the draft sounds like everyone, it needs more of your language and less generic polish."],
      ["WRITE WITH CONTEXT", "Publish with control", "Qalam helps you start from your voice. You decide what goes live."],
    ],
  },
  {
    id: "04-career-vault",
    slot: "Week 2 - Thursday",
    title: "Stop rewriting your professional history every time an opportunity appears",
    caption: `Every new application should not require rebuilding your professional context from memory.

The project you delivered.
The problem you solved.
The decision you influenced.
The feedback you received.
The work you are proud to repeat.

Qalam's Career Vault is designed to keep those pieces together so they can support more than one document.

The same evidence can inform a resume, a LinkedIn draft, a cover letter, or an interview answer.

Save it once. Review it every time. Reuse it with permission.

#CareerVault #JobSearch #ProfessionalGrowth #Qalam`,
    slides: [
      ["Stop rewriting your professional history", "every time an opportunity appears"],
      ["CAPTURE", "The work while it is still clear", "Projects, decisions, outcomes, responsibilities, feedback, and the details you will forget later."],
      ["ORGANIZE", "Keep evidence with context", "A fact without its role, scope, or goal is difficult to reuse well."],
      ["REUSE", "Build more than one asset", "The same trusted evidence can support a resume, LinkedIn draft, cover letter, or interview answer."],
      ["REVIEW", "Keep control of every claim", "Nothing should quietly become a public statement without your approval."],
      ["YOUR CAREER RECORD", "Should get more useful over time", "Qalam makes saved context part of the next useful workflow."],
    ],
  },
  {
    id: "05-evidence-to-proof",
    slot: "Week 3 - Tuesday",
    title: "The difference between experience and visible proof",
    caption: `Experience is what happened.

Visible proof is what another person can understand about what happened, why it mattered, and what you can do again.

That translation is where many strong professionals get stuck.

They list tasks instead of decisions.
They describe activity instead of outcomes.
They use a job title as a substitute for evidence.

Qalam helps turn the raw material of your work into clearer career assets, while keeping you in control of the claims.

The words are not the point.

The proof is.

#CareerProof #ResumeWriting #LinkedInProfile #Qalam`,
    slides: [
      ["The difference between experience", "and visible proof"],
      ["EXPERIENCE", "What happened", "The work, responsibility, decision, or problem you were part of."],
      ["PROOF", "What another person can understand", "The context, action, outcome, and scope that make the work credible."],
      ["COMMON DRIFT", "Activity replaces evidence", "Job descriptions become lists of tasks. Titles carry more weight than examples."],
      ["THE TRANSLATION", "Make the pattern legible", "Show what you did, what changed, and what capability the example demonstrates."],
      ["QALAM", "Starts with the work", "Then helps you express it across the career surfaces that need to see it."],
    ],
  },
  {
    id: "06-ai-without-invention",
    slot: "Week 4 - Wednesday",
    title: "AI can improve the wording. It cannot become your experience.",
    caption: `The most important boundary in AI-assisted career writing is simple:

The tool can help express the evidence.
It cannot create evidence that is not there.

Qalam is designed around that boundary.

Bring your real work, role, goals, and voice. Review the output. Remove anything you cannot verify. Keep the final decision with the person whose reputation is on the line.

Faster writing is useful.

Invented experience is expensive.

#ResponsibleAI #CareerWriting #ProfessionalTrust #Qalam`,
    slides: [
      ["AI can improve the wording.", "It cannot become your experience."],
      ["THE INPUT", "Real work, real context", "Projects, responsibilities, outcomes, goals, and language you can stand behind."],
      ["THE ASSIST", "Structure and expression", "Use AI to find a clearer frame, a stronger draft, or a missing detail to review."],
      ["THE BOUNDARY", "No invented evidence", "A fluent sentence is not proof. Delete claims that cannot be verified."],
      ["THE CONTROL", "You approve the final version", "Review, edit, save, publish, or export only when it represents you accurately."],
      ["CREDIBILITY FIRST", "Qalam keeps the person in control", "Better career writing should make trust easier, not riskier."],
    ],
  },
];

const posters = [
  { id: "01-scattered-proof", slot: "Week 1 - Tuesday", quote: "Your experience is not invisible. It is scattered.", caption: `The resume has one part. LinkedIn has another. Your best examples are hidden in old messages, project folders, and memory.\n\nThe first step is not writing better. It is keeping the evidence together.\n\nQalam is built to help you turn scattered experience into visible proof.\n\n#CareerVisibility #Qalam #CareerGrowth` },
  { id: "02-one-source", slot: "Week 1 - Friday", quote: "One truthful source can power every career asset.", caption: `A trusted record of your work should not produce only one resume.\n\nIt should make the next resume, LinkedIn draft, cover letter, and interview answer easier to ground.\n\nSave context once. Reuse it with review.\n\n#CareerVault #ProfessionalGrowth #Qalam` },
  { id: "03-generic-ai", slot: "Week 2 - Wednesday", quote: "Generic AI writes faster. Qalam keeps your story true.", caption: `Fluent words are not the same as credible words.\n\nThe useful question is not whether a tool can generate a paragraph. It is whether the paragraph still belongs to your real experience.\n\n#ResponsibleAI #CareerWriting #Qalam` },
  { id: "04-surfaces-agree", slot: "Week 3 - Monday", quote: "Your resume, LinkedIn, and interview answers should agree.", caption: `Consistency does not mean repeating the same sentence everywhere.\n\nIt means the same person, priorities, evidence, and direction are visible across the places opportunities evaluate you.\n\n#LinkedIn #ResumeTips #CareerVisibility #Qalam` },
  { id: "05-proof-not-volume", slot: "Week 3 - Friday", quote: "Visibility is not volume. It is credible proof in the right place.", caption: `More posts, more applications, and more words do not automatically make professional work easier to trust.\n\nStart with the proof. Then choose the surface where it matters.\n\n#CareerProof #ProfessionalContent #Qalam` },
  { id: "06-missing-evidence", slot: "Week 4 - Friday", quote: "Better words cannot rescue missing evidence.", caption: `Before rewriting the sentence, ask what the sentence needs to prove.\n\nA clear claim still needs a real example behind it.\n\n#ResumeWriting #CareerGrowth #Qalam` },
];

const textPosts = [
  { id: "01-drift", slot: "Week 1 - Wednesday", title: "Why professional stories drift", caption: `Professional stories drift for a practical reason: they are rebuilt separately every time.\n\nA resume is updated during a job search.\nLinkedIn is edited when someone asks for a profile.\nContent is written from whatever is top of mind that day.\nInterview answers are reconstructed under pressure.\n\nThe result is not always false. It is simply inconsistent.\n\nQalam treats professional context as something worth saving and reusing.\n\nOne source. Multiple useful surfaces. Your review at every step.\n\n#CareerVisibility #LinkedIn #JobSearch #Qalam` },
  { id: "02-visible-proof", slot: "Week 2 - Tuesday", title: "What Qalam means by visible proof", caption: `Visible proof is not a louder version of your job title.\n\nIt is a clear connection between:\n\nWhat you were responsible for.\nWhat problem you faced.\nWhat you decided or changed.\nWhat happened because of the work.\n\nThat connection helps a recruiter, client, or collaborator evaluate you without filling every gap themselves.\n\nQalam helps turn that evidence into a coherent resume, LinkedIn presence, and content voice.\n\n#CareerProof #ProfessionalGrowth #Qalam` },
  { id: "03-ats-action", slot: "Week 2 - Friday", title: "A resume checker should leave you with a decision", caption: `The useful output of a resume review is not a score you can screenshot.\n\nIt is a short list of changes that improve the document's chance of being understood.\n\nQalam's free ATS Resume Checker looks at structure, relevance, evidence, clarity, and risk, then points to the highest-impact gaps.\n\nNo account required. No need to guess which edit to make first.\n\n#ATS #ResumeTips #JobSearch #Qalam` },
  { id: "04-career-vault", slot: "Week 3 - Thursday", title: "Your best work should not disappear after the project ends", caption: `The most useful career evidence is often created while you are busy doing the work.\n\nThen the project ends, the messages move, and six months later you are trying to remember the details for a resume or interview.\n\nSave the decision. Save the outcome. Save the context.\n\nQalam's Career Vault is designed to make that record useful again later.\n\n#CareerVault #CareerGrowth #Qalam` },
  { id: "05-voice", slot: "Week 4 - Monday", title: "A professional voice is more than a tone setting", caption: `Your voice is not just formal, casual, or confident.\n\nIt is the level of certainty you use, the examples you choose, the phrases you repeat, and the things you refuse to exaggerate.\n\nThat is why Qalam lets professional context and saved voice shape the draft.\n\nThe goal is not polished sameness.\n\nThe goal is recognisable clarity.\n\n#LinkedInWriting #PersonalBrand #Qalam` },
  { id: "06-user-control", slot: "Week 4 - Tuesday", title: "Career tools should give you more control, not less", caption: `Qalam does not post, comment, or interact on LinkedIn on your behalf in the manual workflow.\n\nYou choose what to save.\nYou review the output.\nYou decide what to publish or export.\n\nAutomation can remove repetitive work. It should not remove your ability to inspect the result.\n\n#ResponsibleAI #LinkedIn #CareerVisibility #Qalam` },
  { id: "07-first-workflow", slot: "Week 4 - Thursday", title: "Do not start with the whole career system", caption: `Start with the decision in front of you.\n\nCheck the resume before applying.\nDraft the LinkedIn post you have been avoiding.\nSave one project while the details are fresh.\n\nA useful first artifact creates more momentum than a tour of every feature.\n\nQalam is designed to help you start with one real career task, then build context that makes the next one easier.\n\n#CareerGrowth #JobSearch #Qalam` },
  { id: "08-market-fit", slot: "Week 5 - Monday", title: "Career software should understand the market you are actually in", caption: `The job search is not the same everywhere.\n\nTitles, salary expectations, remote work, proof of skill, and professional language vary by market and industry.\n\nQalam is starting with a Pakistan-first view of career visibility, while keeping the underlying principle universal: use real evidence, express it clearly, and keep control of the claim.\n\n#PakistanTech #CareerVisibility #Qalam` },
];

function text(slide, value, x, y, w, h, style = {}) {
  const shape = slide.shapes.add({ geometry: "textbox", position: { left: x, top: y, width: w, height: h }, fill: "none", line: { style: "solid", fill: "none", width: 0 } });
  shape.text = value;
  shape.text.style = { fontFamily: "Georgia", fontSize: 34, color: C.ink, verticalAlignment: "middle", ...style };
  return shape;
}

function rect(slide, x, y, w, h, fill, line = "none", radius = "rounded-xl") {
  return slide.shapes.add({ geometry: radius === "none" ? "rect" : "roundRect", position: { left: x, top: y, width: w, height: h }, fill, line: { style: "solid", fill: line, width: line === "none" ? 0 : 1 }, ...(radius === "none" ? {} : { borderRadius: radius }) });
}

function chrome(slide, index, total, dark = false) {
  const color = dark ? C.paper : C.ink;
  text(slide, "QALAM", 76, 42, 220, 32, { fontFamily: "Aptos", fontSize: 17, bold: true, color, verticalAlignment: "top", letterSpacing: 3 });
  text(slide, "CAREER VISIBILITY", 250, 42, 300, 32, { fontFamily: "Aptos", fontSize: 13, color: dark ? C.sand : C.muted, verticalAlignment: "top", letterSpacing: 2 });
  text(slide, `${String(index).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, 850, 42, 150, 32, { fontFamily: "Aptos", fontSize: 15, bold: true, color, alignment: "right", verticalAlignment: "top" });
  rect(slide, 76, 1008, 928, 2, dark ? C.sand : C.ink, "none", "none");
}

function carouselSlide(slide, data, index, total) {
  const cover = index === 1;
  const close = index === total;
  const dark = cover || close;
  slide.background.fill = dark ? C.ink : C.paper;
  chrome(slide, index, total, dark);
  if (cover) {
    rect(slide, 76, 128, 928, 790, C.sand, "none", "rounded-2xl");
    rect(slide, 88, 140, 904, 766, C.paper, C.gold, "rounded-2xl");
    text(slide, "CAREER VISIBILITY OS", 132, 188, 760, 42, { fontFamily: "Aptos", fontSize: 17, bold: true, color: C.coral, letterSpacing: 2.6, verticalAlignment: "top" });
    text(slide, data[0], 132, 282, 800, 250, { fontSize: 59, bold: true, color: C.ink, verticalAlignment: "bottom" });
    text(slide, data[1], 132, 550, 780, 150, { fontFamily: "Aptos", fontSize: 39, bold: true, color: C.teal, verticalAlignment: "top" });
    rect(slide, 132, 760, 86, 8, C.coral, "none", "none");
    text(slide, "Evidence first. Clearer proof everywhere.", 132, 792, 760, 42, { fontFamily: "Aptos", fontSize: 20, color: C.muted, verticalAlignment: "top" });
    return;
  }
  if (close) {
    text(slide, data[0], 96, 230, 888, 350, { fontSize: data[0].length > 45 ? 54 : 63, bold: true, color: C.paper, alignment: "center" });
    rect(slide, 430, 635, 220, 6, C.coral, "none", "none");
    text(slide, data[1], 140, 696, 800, 120, { fontFamily: "Aptos", fontSize: 29, bold: true, color: C.sand, alignment: "center", verticalAlignment: "top" });
    text(slide, "Turn experience into visible proof", 140, 884, 800, 40, { fontFamily: "Aptos", fontSize: 18, color: "#B9C0BB", alignment: "center" });
    return;
  }
  const label = data.length >= 3 ? data[0] : "";
  const heading = data.length >= 3 ? data[1] : data[0];
  const body = data.length >= 3 ? data[2] : data[1];
  const numbered = /^\d\d$/.test(label);
  if (numbered) text(slide, label, 68, 182, 330, 270, { fontSize: 186, bold: true, color: C.sand, verticalAlignment: "top" });
  else if (label) text(slide, label, 82, 178, 500, 44, { fontFamily: "Aptos", fontSize: 18, bold: true, color: C.coral, letterSpacing: 2.6, verticalAlignment: "top" });
  text(slide, heading, numbered ? 270 : 82, numbered ? 252 : label ? 282 : 224, numbered ? 720 : 880, 250, { fontSize: numbered ? 52 : 58, bold: true, color: C.ink, verticalAlignment: "bottom" });
  rect(slide, numbered ? 274 : 82, 566, 102, 7, C.teal, "none", "none");
  text(slide, body, numbered ? 274 : 82, 618, numbered ? 700 : 860, 240, { fontFamily: "Aptos", fontSize: 29, color: C.muted, verticalAlignment: "top" });
}

function posterSlide(slide, item, index, total) {
  const dark = index % 2 === 1;
  slide.background.fill = dark ? C.ink : C.paper;
  chrome(slide, index, total, dark);
  const fg = dark ? C.paper : C.ink;
  const muted = dark ? "#BAC3BD" : C.muted;
  text(slide, "QALAM NOTE", 82, 155, 300, 42, { fontFamily: "Aptos", fontSize: 18, bold: true, color: C.coral, letterSpacing: 2.6, verticalAlignment: "top" });
  text(slide, `“${item.quote}”`, 82, 284, 916, 430, { fontSize: item.quote.length > 65 ? 54 : 62, bold: true, color: fg });
  rect(slide, 82, 780, 124, 7, C.coral, "none", "none");
  text(slide, "Qalam", 82, 817, 520, 52, { fontFamily: "Aptos", fontSize: 25, bold: true, color: fg, verticalAlignment: "top" });
  text(slide, "Career visibility built from evidence", 82, 874, 780, 46, { fontFamily: "Aptos", fontSize: 19, color: muted, verticalAlignment: "top" });
}

async function blob(file, value) { await fs.writeFile(file, new Uint8Array(await value.arrayBuffer())); }

async function buildCarousel(item) {
  const dir = path.join(OUTPUT, "carousels", item.id);
  await fs.mkdir(path.join(dir, "slides-png"), { recursive: true });
  const deck = Presentation.create({ slideSize: { width: W, height: H } });
  item.slides.forEach((data, idx) => { const slide = deck.slides.add(); carouselSlide(slide, data, idx + 1, item.slides.length); });
  for (const [idx, slide] of deck.slides.items.entries()) await blob(path.join(dir, "slides-png", `slide-${String(idx + 1).padStart(2, "0")}.png`), await deck.export({ slide, format: "png", scale: 1 }));
  await blob(path.join(dir, "contact-sheet.webp"), await deck.export({ format: "webp", montage: true, scale: 0.45 }));
  const pptx = await PresentationFile.exportPptx(deck); await pptx.save(path.join(dir, `${item.id}.pptx`));
}

async function buildPosters() {
  const dir = path.join(OUTPUT, "posters"); await fs.mkdir(path.join(dir, "png"), { recursive: true });
  const deck = Presentation.create({ slideSize: { width: W, height: H } });
  posters.forEach((item, idx) => { const slide = deck.slides.add(); posterSlide(slide, item, idx + 1, posters.length); });
  for (const [idx, slide] of deck.slides.items.entries()) await blob(path.join(dir, "png", `${posters[idx].id}.png`), await deck.export({ slide, format: "png", scale: 1 }));
  await blob(path.join(dir, "contact-sheet.webp"), await deck.export({ format: "webp", montage: true, scale: 0.45 }));
  const pptx = await PresentationFile.exportPptx(deck); await pptx.save(path.join(dir, "poster-pack.pptx"));
}

async function buildCalendar() {
  const schedule = [
    ["Week 1 - Monday", "Carousel", carousels[0]], ["Week 1 - Tuesday", "Poster", posters[0]], ["Week 1 - Wednesday", "Text", textPosts[0]], ["Week 1 - Thursday", "Carousel", carousels[1]], ["Week 1 - Friday", "Poster", posters[1]],
    ["Week 2 - Monday", "Carousel", carousels[2]], ["Week 2 - Tuesday", "Text", textPosts[1]], ["Week 2 - Wednesday", "Poster", posters[2]], ["Week 2 - Thursday", "Carousel", carousels[3]], ["Week 2 - Friday", "Text", textPosts[2]],
    ["Week 3 - Monday", "Poster", posters[3]], ["Week 3 - Tuesday", "Carousel", carousels[4]], ["Week 3 - Wednesday", "Text", textPosts[3]], ["Week 3 - Thursday", "Text", textPosts[4]], ["Week 3 - Friday", "Poster", posters[4]],
    ["Week 4 - Monday", "Text", textPosts[5]], ["Week 4 - Tuesday", "Text", textPosts[6]], ["Week 4 - Wednesday", "Carousel", carousels[5]], ["Week 4 - Thursday", "Text", textPosts[7]], ["Week 4 - Friday", "Poster", posters[5]],
  ];
  let md = `# Qalam - One Month LinkedIn Content\n\nQalam page positioning: turn real professional experience into visible proof across resumes, LinkedIn, and content.\n\nNo personal founder name appears in this pack.\n\n| Slot | Format | Topic | Asset |\n|---|---|---|---|\n`;
  schedule.forEach(([slot, format, item]) => { const asset = format === "Carousel" ? `carousels/${item.id}/${item.id}.pdf` : format === "Poster" ? `posters/png/${item.id}.png` : "No asset"; md += `| ${slot} | ${format} | ${item.title || item.quote} | ${asset} |\n`; });
  schedule.forEach(([slot, format, item], idx) => { md += `\n## ${String(idx + 1).padStart(2, "0")} - ${slot} - ${format}\n\n**Topic:** ${item.title || item.quote}\n\n${item.caption}\n`; if (format === "Carousel") md += `\n**Asset:** \`carousels/${item.id}/${item.id}.pdf\`\n`; if (format === "Poster") md += `\n**Asset:** \`posters/png/${item.id}.png\`\n`; });
  await fs.writeFile(path.join(OUTPUT, "CONTENT-CALENDAR.md"), md, "utf8");
  const csvRows = [["Slot", "Format", "Topic", "Asset"]]; schedule.forEach(([slot, format, item]) => csvRows.push([slot, format, item.title || item.quote, format === "Carousel" ? `carousels/${item.id}/${item.id}.pdf` : format === "Poster" ? `posters/png/${item.id}.png` : ""]));
  await fs.writeFile(path.join(OUTPUT, "CONTENT-CALENDAR.csv"), csvRows.map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n"), "utf8");
  await fs.writeFile(path.join(OUTPUT, "README.md"), `# Qalam LinkedIn content pack\n\nThis is a Qalam company-page content pack. It contains 20 complete posts, six carousel PDFs, six poster PNGs, individual carousel slides, and editable PowerPoint source files.\n\nNo personal founder name is used in captions, visual copy, or footer copy. Product statements are grounded in the Qalam website and product documentation.\n`, "utf8");
}

async function main() { await fs.mkdir(OUTPUT, { recursive: true }); for (const item of carousels) await buildCarousel(item); await buildPosters(); await buildCalendar(); console.log(`Created ${carousels.length} carousels, ${posters.length} posters, and ${textPosts.length} text posts.`); }
main().catch(error => { console.error(error); process.exitCode = 1; });
