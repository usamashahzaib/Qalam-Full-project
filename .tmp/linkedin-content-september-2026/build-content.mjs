import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const OUTPUT = "X:/Usama/Qalam/Code/Full project/byqalam-website/deliverables/linkedin-content-september-2026";
const W = 1080;
const H = 1080;

const palette = {
  paper: "#F4EFE5",
  paper2: "#EAE2D3",
  ink: "#17231E",
  green: "#0B5D4B",
  coral: "#D76855",
  gold: "#C59A45",
  white: "#FFFDF8",
  muted: "#67736B",
};

const carousels = [
  {
    id: "01-startup-hr-systems",
    date: "Week 1 - Monday",
    title: "Before your startup hires HR, build these 5 systems",
    caption: `Most founders hire HR when the noise becomes impossible to ignore.

Offers are inconsistent.
Onboarding depends on whoever is free.
Leave rules change by manager.
Feedback only happens after someone resigns.

By then, the problem is no longer a missing HR person. It is five missing systems.

I have built people functions from zero across four startups. The order matters more than the software.

Start with hiring decisions, onboarding, basic policies, feedback, and a written record of workforce decisions.

Everything else becomes easier once those five stop living inside one person's head.

Which one is currently the weakest in your company?

#StartupHR #PeopleOperations #Founders #HRStrategy`,
    slides: [
      ["Before your startup hires HR,", "build these 5 systems"],
      ["01", "A hiring decision that can be explained", "Define the role, decision owner, must-have evidence, salary band, and final approval before the first CV arrives."],
      ["02", "Onboarding that does not depend on memory", "Every new hire should know what success looks like in week one, month one, and day 90."],
      ["03", "One place for attendance, leave, and payroll rules", "If the answer changes by manager, it is not a rule. It is a negotiation."],
      ["04", "A feedback rhythm", "Do not wait for appraisal season. Managers need a simple way to notice good work and address problems early."],
      ["05", "A record of workforce decisions", "Why did we hire, promote, adjust salary, or let someone go? Write it down while the context is fresh."],
      ["HR starts when decisions stop living only in the founder's head.", "Which system is missing in your startup?"],
    ],
  },
  {
    id: "02-founder-people-audit",
    date: "Week 1 - Thursday",
    title: "A 10-minute people audit for founders",
    caption: `A founder does not need a 60-page HR audit to find the first people risk.

Five honest questions are usually enough.

Can you explain why every open role exists now?
Does every new hire know who owns their first 30 days?
Can a struggling employee describe what good performance looks like?
Do you know who is at risk before resignation day?
Can two managers give the same answer about leave, attendance, and payroll?

If three of those made you pause, do not buy another tool yet.

Fix the decision, owner, and process first.

If you are building a team of 10 to 50 people, DM me "AUDIT". I will send you the self-assessment I use to locate the first risk.

#Founders #StartupHR #WorkforcePlanning #PeopleAndCulture`,
    slides: [
      ["A 10-minute people audit", "for founders"],
      ["HIRING", "Can you explain why every open role exists now?", "If the business case is unclear, the job description will be unclear too."],
      ["ONBOARDING", "Does every new hire know who owns their first 30 days?", "Shared responsibility often becomes no responsibility."],
      ["PERFORMANCE", "Can a struggling employee describe what good looks like?", "A warning without a clear standard is only frustration in writing."],
      ["RETENTION", "Do you know who is at risk before resignation day?", "The exit interview is too late to begin listening."],
      ["POLICY", "Can two managers give the same answer?", "Leave, attendance, payroll, and flexibility cannot depend on who gets asked."],
      ["If three answers made you pause, your risk is already visible.", "DM me AUDIT"],
    ],
  },
  {
    id: "03-ai-hiring-judgment",
    date: "Week 2 - Monday",
    title: "AI cut our time-to-hire by 30%. Here is where I did not let it decide.",
    caption: `AI-assisted screening helped me reduce time-to-hire by 30%.

The useful part was not asking a model to decide who deserved a job.

It was removing work that should never have consumed human judgment in the first place.

Organizing applications.
Checking for role evidence.
Structuring the shortlist.
Making the same criteria visible for every candidate.

The final decision still belongs to a person who can explain it.

Career gaps, unusual backgrounds, motivation, and potential do not fit neatly into a score.

Use AI to reduce waiting and inconsistency.

Do not use it to hide responsibility.

#AIinHR #TalentAcquisition #Hiring #StartupHR`,
    slides: [
      ["AI cut our time-to-hire by 30%.", "Here is where I did not let it decide."],
      ["USE AI FOR", "The work that slows people down", "Organize applications. Surface role evidence. Flag missing information. Structure the shortlist."],
      ["KEEP HUMAN", "The judgment that changes a life", "Context, motivation, potential, career gaps, and the final decision need an accountable person."],
      ["DO NOT", "Turn a score into a verdict", "A clean number can still hide weak criteria, missing context, or a biased starting point."],
      ["DO", "Make the criteria visible", "Decide what evidence matters before screening begins. Apply it consistently. Record why the decision was made."],
      ["THE TEST", "Can you explain the rejection without blaming the tool?", "If not, the process is not ready for automation."],
      ["Use AI to reduce waiting.", "Keep judgment accountable."],
    ],
  },
  {
    id: "04-before-hris-spreadsheet",
    date: "Week 2 - Thursday",
    title: "Before you buy an HRIS, open a spreadsheet",
    caption: `Startups often buy an HR tool when the real problem is that nobody has agreed on the process.

A new system gives the confusion better-looking screens.

I have built Excel-based people dashboards because early-stage teams do not always need expensive HR software.

They need a small set of numbers that leadership will actually use.

Headcount.
Open roles.
Hiring movement.
Attendance patterns.
Leave exposure.
Early retention signals.

Define the decision first. Then collect the minimum information required to make it.

Upgrade when the spreadsheet becomes the constraint, not when a salesperson makes complexity sound mature.

#PeopleAnalytics #StartupHR #HRTech #Founders`,
    slides: [
      ["Before you buy an HRIS,", "open a spreadsheet"],
      ["FIRST PRINCIPLE", "A tool cannot repair an undefined process", "It only gives the confusion a cleaner interface."],
      ["Start with the decision", "What will leadership do differently after seeing this information?"],
      ["Track less", "Headcount, open roles, hiring movement, attendance patterns, leave exposure, and early retention signals."],
      ["Name an owner", "Every number needs one person responsible for updating it and one rhythm for review."],
      ["Know when to upgrade", "Move beyond the spreadsheet when access, scale, history, or compliance becomes the actual constraint."],
      ["Start cheap. Stay disciplined.", "Buy complexity only when complexity earns its place."],
    ],
  },
  {
    id: "05-first-30-days",
    date: "Week 3 - Tuesday",
    title: "Your onboarding is not complete when the laptop arrives",
    caption: `A working email address is not onboarding.

Neither is a welcome lunch, an employee handbook, or a list of tools.

Onboarding works when a new hire can answer five questions:

What am I responsible for?
What does good work look like here?
Who do I go to when I am blocked?
Which relationships matter first?
When will someone tell me how I am doing?

The manager owns those answers. HR can build the structure, reminders, and feedback loop. It cannot replace the manager.

If a new hire reaches day 30 still guessing, the company has already spent a month creating avoidable doubt.

#Onboarding #PeopleOperations #Managers #StartupHR`,
    slides: [
      ["Your onboarding is not complete", "when the laptop arrives"],
      ["DAY 1", "Remove basic uncertainty", "Role, access, immediate priorities, working norms, and the person who can unblock them."],
      ["WEEK 1", "Build the right relationships", "A new hire needs context from the people their work affects, not a calendar full of introductions."],
      ["DAY 14", "Ask where the friction is", "The first useful feedback question is often: What is still harder than it should be?"],
      ["DAY 30", "Compare reality with the role", "What is clear now? What changed? Where does support or expectation need to be reset?"],
      ["THE OWNER", "The manager owns the experience", "HR can build the system. It cannot outsource the relationship between a manager and a new hire."],
      ["Good onboarding replaces guessing", "with clarity"],
    ],
  },
  {
    id: "06-pakistan-startup-hr-truths",
    date: "Week 4 - Wednesday",
    title: "6 uncomfortable truths about startup HR in Pakistan",
    caption: `Some startup HR problems in Pakistan survive because everyone has learned how to work around them.

"Competitive salary" replaces a real range.
Six-day work weeks are defended as commitment.
Enterprise job descriptions are copied into ten-person companies.
Degrees become shortcuts for evaluating ability.
Policies change depending on the manager.
HR is expected to repair decisions the founder keeps contradicting.

None of this disappears because a company adds "people first" to its values.

The fix begins when leadership makes the tradeoffs visible and applies the same rules consistently.

Which one would you add?

#PakistanTech #StartupHR #WorkplaceCulture #Leadership`,
    slides: [
      ["6 uncomfortable truths", "about startup HR in Pakistan"],
      ["01", "Competitive salary is not a salary band", "Candidates cannot evaluate an offer you refuse to define."],
      ["02", "A six-day week is not proof of commitment", "It can also be proof that the company has normalized avoidable urgency."],
      ["03", "An enterprise job description does not fit a ten-person startup", "The title may match. The actual work rarely does."],
      ["04", "A degree is often used as a shortcut", "For non-regulated work, evidence of ability deserves more weight than access to education."],
      ["05", "A policy that changes by manager is not a policy", "Consistency matters most when the answer is inconvenient."],
      ["06", "HR cannot repair founder inconsistency", "Leadership has to follow the systems it asks HR to build."],
    ],
  },
];

const posters = [
  {
    id: "01-payroll-trust",
    date: "Week 1 - Tuesday",
    quote: "If payroll is wrong, the culture deck is decoration.",
    caption: `Payroll is not back-office admin.

It is a monthly test of whether the company keeps its most basic promise.

People can forgive a mistake. What destroys trust is silence, delay, or an explanation that changes every time they ask.

Fix the number quickly.
Explain what happened clearly.
Own the correction without making the employee chase it.

No engagement activity can compensate for uncertainty about salary.

#Payroll #HROperations #Trust #StartupHR`,
  },
  {
    id: "02-policy-purpose",
    date: "Week 1 - Friday",
    quote: "A policy earns its place when it prevents the same argument twice.",
    caption: `A startup does not need a policy for every possible situation.

It needs a written answer when the same question keeps producing different decisions.

Leave.
Late arrival.
Remote work.
Overtime.
Salary deductions.
Exit responsibility.

Write the principle, the owner, the exception process, and the date it will be reviewed.

That is not bureaucracy. It is memory the company no longer has to carry in people's heads.

#HRPolicy #PeopleOperations #StartupHR #Leadership`,
  },
  {
    id: "03-retention-clarity",
    date: "Week 2 - Wednesday",
    quote: "The cheapest retention strategy is clarity.",
    caption: `Retention conversations usually jump to salary, benefits, and engagement budgets.

Those matter. But uncertainty has a cost too.

Unclear priorities.
Unclear ownership.
Unclear growth.
Unclear feedback.
Unclear reasons behind decisions.

People can handle difficult work. What drains them is having to guess which version of success their manager expects today.

Before adding another benefit, remove one source of avoidable confusion.

#EmployeeRetention #Management #PeopleAndCulture #StartupHR`,
  },
  {
    id: "04-ai-accountability",
    date: "Week 3 - Monday",
    quote: "AI should remove admin from hiring. It should not remove accountability.",
    caption: `If a hiring decision cannot be explained without saying "the system scored them low," the process has already failed.

Automation can organize evidence and reduce repetitive screening work.

It cannot own the consequences.

The hiring team still needs clear criteria, a review process, and a person willing to explain the final decision.

Efficiency is useful.
Accountability is non-negotiable.

#AIinHR #Hiring #TalentAcquisition #ResponsibleAI`,
  },
  {
    id: "05-company-memory",
    date: "Week 3 - Friday",
    quote: "A startup becomes a company when decisions stop living only in the founder's head.",
    caption: `Early-stage speed often depends on one person remembering everything.

Why someone was hired.
What was promised.
Who approved an exception.
How performance was judged.
Why a salary changed.

That works until the team grows, memory differs, and employees begin receiving different answers.

Documentation is not about slowing the founder down.

It is how the company keeps moving when the founder is no longer in every conversation.

#Founders #StartupOperations #PeopleOperations #Scaling`,
  },
  {
    id: "06-role-clarity",
    date: "Week 4 - Friday",
    quote: "Hiring faster is useless when nobody agrees what good looks like.",
    caption: `A fast shortlist cannot rescue an unclear role.

Before publishing the job, agree on:

Why this role exists now.
What the person must deliver in the first 90 days.
Which evidence matters.
Who makes the final decision.
What salary range is actually approved.

Speed comes after clarity.

Otherwise you simply reject people faster for a job nobody has properly defined.

#HiringStrategy #Founders #TalentAcquisition #StartupHR`,
  },
];

const textPosts = [
  {
    id: "01-first-hr-system",
    date: "Week 1 - Wednesday",
    title: "The first HR system I build is not culture",
    caption: `The first HR system I build in a startup is not culture.

It is decision clarity.

Who can approve a hire?
Who can promise a salary?
Who owns onboarding?
Who can make an exception to policy?
Who documents the reason?

When those answers are missing, HR becomes a messenger carrying different instructions between founders, managers, and employees.

The company calls it flexibility.
The employees experience it as inconsistency.

Culture becomes easier to trust when the same situation receives the same answer.

Before planning another values session, write down who decides what.

#StartupHR #PeopleOperations #Founders #Leadership`,
  },
  {
    id: "02-cpa-lens",
    date: "Week 2 - Tuesday",
    title: "My CPA background changed how I think about people decisions",
    caption: `My CPA background changed how I think about HR.

Not because people can be reduced to a spreadsheet.

Because every workforce decision has a cost, return, and risk whether we measure it or not.

An open role has a cost.
A rushed hire has a risk.
A weak manager creates hidden operating expense.
Unplanned turnover delays work long after the replacement joins.

The human side and the commercial side are not enemies.

A good people decision should respect both.

That is the standard I try to bring into founder conversations: What will this cost, what problem will it solve, and what new risk are we creating?

#HRStrategy #WorkforcePlanning #PeopleAnalytics #Founders`,
  },
  {
    id: "03-building-without-budget",
    date: "Week 2 - Friday",
    title: "What I prioritize when HR has no team and no budget",
    caption: `I have built HR functions with no existing team and tight budgets.

That forces a useful question:

What breaks first if I ignore it?

My order is usually simple.

1. Payroll and attendance accuracy
2. Hiring ownership and approved roles
3. Onboarding responsibility
4. Leave, flexibility, and basic employment rules
5. A way to record employee issues and decisions
6. Useful workforce numbers for leadership

Employer branding can wait.
An expensive HRIS can wait.
The perfect engagement calendar can wait.

Trust-sensitive operations cannot.

Build the boring parts first. They are usually holding the company together.

#HROperations #StartupHR #PeopleAndCulture #Bootstrapped`,
  },
  {
    id: "04-loyalty-question",
    date: "Week 3 - Wednesday",
    title: "Loyalty is usually the wrong retention question",
    caption: `Founders sometimes ask, "How do we make employees more loyal?"

I think the better question is:

Have we made staying a sensible decision?

Can people see a future here?
Do managers keep their word?
Are strong performers recognized before they resign?
Are salary decisions explainable?
Does good work lead to more trust, or only more work?

Loyalty is not a policy you can announce.

It is the result of many small experiences that tell someone whether the relationship is still worth choosing.

Stop asking employees for commitment the company has not made easy to return.

#Retention #Leadership #EmployeeExperience #StartupHR`,
  },
  {
    id: "05-dashboard-question",
    date: "Week 3 - Thursday",
    title: "The first question before building a people dashboard",
    caption: `Before I add a number to a people dashboard, I ask one question:

What decision will this change?

If nobody can answer, the metric is decoration.

Headcount should inform workforce planning.
Open-role age should expose hiring delay.
Attendance patterns should reveal operational friction.
Early exits should trigger an onboarding review.

A dashboard is not useful because it contains more data.

It is useful when leadership looks at one number and knows what conversation must happen next.

Start with the decision. Then earn the metric.

#PeopleAnalytics #HRMetrics #WorkforcePlanning #StartupHR`,
  },
  {
    id: "06-international-hiring",
    date: "Week 4 - Monday",
    title: "International hiring is not only recruitment",
    caption: `I have recruited across Pakistan, Canada, and the US.

The sourcing channel is rarely the hardest part.

The difficult part is designing a working relationship across different expectations.

When will the person work?
Who owns their output?
How will feedback happen across time zones?
What does responsiveness mean?
Which local and company rules apply?
How will the first 30 days be reviewed?

Remote hiring fails when companies solve for access to talent but ignore the structure around the talent.

The contract starts the relationship.

The operating system determines whether it lasts.

#RemoteWork #InternationalRecruitment #PeopleOperations #Hiring`,
  },
  {
    id: "07-policy-test",
    date: "Week 4 - Tuesday",
    title: "The test I use before writing a new HR policy",
    caption: `Before writing a new HR policy, I ask three questions.

Has this problem happened more than once?
Are different managers giving different answers?
Would a written rule make the next decision fairer or faster?

If the answer is no, we may not need a policy.

We may need one conversation, one manager decision, or one exception recorded properly.

Policies should reduce repeated confusion.

They should not become a museum of every unusual situation the company has ever faced.

Write fewer rules.
Make the important ones clear enough to use.

#HRPolicy #PeopleOperations #Management #StartupHR`,
  },
  {
    id: "08-founder-hr-conversation",
    date: "Week 4 - Thursday",
    title: "What I need from a founder before HR can work",
    caption: `HR cannot build a reliable people system around decisions the founder is unwilling to make.

Before the templates, tools, and policies, I need clarity on five things:

Which roles matter most to the business now?
What behavior is unacceptable even from a high performer?
Who has authority to make salary decisions?
Which promises have already been made to the team?
Where is the founder willing to follow the same rule as everyone else?

Those answers shape the real people function.

Without them, HR can produce documents.

It cannot produce consistency.

#Founders #HRLeadership #PeopleStrategy #StartupHR`,
  },
];

function addText(slide, text, x, y, w, h, style = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    fontFamily: style.fontFamily || "Aptos",
    fontSize: style.fontSize || 36,
    bold: style.bold || false,
    color: style.color || palette.ink,
    alignment: style.alignment || "left",
    verticalAlignment: style.verticalAlignment || "middle",
    ...style,
  };
  return shape;
}

function addRect(slide, x, y, w, h, fill, radius = "rounded-xl", line = "none") {
  return slide.shapes.add({
    geometry: radius === "none" ? "rect" : "roundRect",
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { style: "solid", fill: line, width: line === "none" ? 0 : 1 },
    ...(radius === "none" ? {} : { borderRadius: radius }),
  });
}

function addChrome(slide, index, total, dark = false) {
  const ink = dark ? palette.paper : palette.ink;
  addText(slide, "USAMA SHAHZAIB", 76, 42, 390, 32, {
    fontSize: 15,
    bold: true,
    color: ink,
    verticalAlignment: "top",
    letterSpacing: 2.2,
  });
  addText(slide, `${String(index).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, 850, 42, 150, 32, {
    fontSize: 15,
    bold: true,
    color: ink,
    alignment: "right",
    verticalAlignment: "top",
    letterSpacing: 1.4,
  });
  addRect(slide, 76, 1008, 928, 2, dark ? palette.paper2 : palette.ink, "none");
}

function carouselSlide(slide, content, index, total) {
  const cover = index === 1;
  const close = index === total;
  const dark = cover || close;
  slide.background.fill = dark ? palette.ink : palette.paper;
  addChrome(slide, index, total, dark);

  if (cover) {
    addRect(slide, 76, 128, 928, 790, palette.paper2, "rounded-2xl");
    addRect(slide, 88, 140, 904, 766, palette.paper, "rounded-2xl", palette.gold);
    addText(slide, "PEOPLE SYSTEMS FOR FOUNDERS", 132, 188, 760, 42, {
      fontSize: 17,
      bold: true,
      color: palette.coral,
      letterSpacing: 2.6,
      verticalAlignment: "top",
    });
    addText(slide, content[0], 132, 290, 800, 240, {
      fontFamily: "Georgia",
      fontSize: 64,
      bold: true,
      color: palette.ink,
      verticalAlignment: "bottom",
    });
    addText(slide, content[1], 132, 548, 780, 140, {
      fontSize: 41,
      bold: true,
      color: palette.green,
      verticalAlignment: "top",
    });
    addRect(slide, 132, 760, 86, 8, palette.coral, "none");
    addText(slide, "Built from four startup people functions", 132, 792, 680, 42, {
      fontSize: 20,
      color: palette.muted,
      verticalAlignment: "top",
    });
    return;
  }

  if (close) {
    addText(slide, content[0], 96, 230, 888, 360, {
      fontFamily: "Georgia",
      fontSize: 61,
      bold: true,
      color: palette.paper,
      alignment: "center",
    });
    addRect(slide, 430, 635, 220, 6, palette.coral, "none");
    addText(slide, content[1], 140, 696, 800, 110, {
      fontSize: 31,
      bold: true,
      color: palette.paper2,
      alignment: "center",
      verticalAlignment: "top",
    });
    addText(slide, "People & Culture | Startup workforce decisions", 140, 884, 800, 40, {
      fontSize: 18,
      color: "#B9C0BB",
      alignment: "center",
    });
    return;
  }

  const hasLabel = content.length >= 3;
  const label = hasLabel ? content[0] : "";
  const heading = hasLabel ? content[1] : content[0];
  const body = hasLabel ? content[2] : content[1];
  const numeric = /^\d\d$/.test(label);
  if (numeric) {
    addText(slide, label, 68, 182, 330, 270, {
      fontFamily: "Georgia",
      fontSize: 186,
      bold: true,
      color: palette.paper2,
      verticalAlignment: "top",
    });
  } else if (hasLabel) {
    addText(slide, label, 82, 178, 420, 44, {
      fontSize: 18,
      bold: true,
      color: palette.coral,
      letterSpacing: 2.6,
      verticalAlignment: "top",
    });
  }
  addText(slide, heading, numeric ? 270 : 82, numeric ? 252 : hasLabel ? 282 : 224, numeric ? 720 : 880, 250, {
    fontFamily: "Georgia",
    fontSize: numeric ? 53 : 61,
    bold: true,
    color: palette.ink,
    verticalAlignment: "bottom",
  });
  addRect(slide, numeric ? 274 : 82, 566, 102, 7, palette.green, "none");
  addText(slide, body, numeric ? 274 : 82, 618, numeric ? 700 : 860, 240, {
    fontSize: 30,
    color: palette.muted,
    verticalAlignment: "top",
  });
}

async function writeBlob(filePath, blob) {
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

async function buildCarousel(item) {
  const dir = path.join(OUTPUT, "carousels", item.id);
  await fs.mkdir(path.join(dir, "slides-png"), { recursive: true });
  const deck = Presentation.create({ slideSize: { width: W, height: H } });
  item.slides.forEach((content, idx) => {
    const slide = deck.slides.add();
    carouselSlide(slide, content, idx + 1, item.slides.length);
  });
  for (const [idx, slide] of deck.slides.items.entries()) {
    await writeBlob(path.join(dir, "slides-png", `slide-${String(idx + 1).padStart(2, "0")}.png`), await deck.export({ slide, format: "png", scale: 1 }));
    await fs.writeFile(path.join(dir, "slides-png", `slide-${String(idx + 1).padStart(2, "0")}.layout.json`), await (await slide.export({ format: "layout" })).text());
  }
  await writeBlob(path.join(dir, "contact-sheet.webp"), await deck.export({ format: "webp", montage: true, scale: 0.45 }));
  const pptx = await PresentationFile.exportPptx(deck);
  await pptx.save(path.join(dir, `${item.id}.pptx`));
}

function posterSlide(slide, item, index, total) {
  slide.background.fill = index % 2 === 0 ? palette.paper : palette.ink;
  const dark = index % 2 !== 0;
  const textColor = dark ? palette.paper : palette.ink;
  const muted = dark ? "#BAC3BD" : palette.muted;
  addChrome(slide, index, total, dark);
  addText(slide, "FIELD NOTE", 82, 155, 300, 42, {
    fontSize: 18,
    bold: true,
    color: palette.coral,
    letterSpacing: 2.6,
    verticalAlignment: "top",
  });
  addText(slide, `“${item.quote}”`, 82, 284, 916, 430, {
    fontFamily: "Georgia",
    fontSize: item.quote.length > 70 ? 54 : 62,
    bold: true,
    color: textColor,
    verticalAlignment: "middle",
  });
  addRect(slide, 82, 780, 124, 7, palette.coral, "none");
  addText(slide, "Usama Shahzaib", 82, 817, 520, 52, {
    fontSize: 25,
    bold: true,
    color: textColor,
    verticalAlignment: "top",
  });
  addText(slide, "People & Culture | Built people functions across 4 startups", 82, 874, 780, 46, {
    fontSize: 19,
    color: muted,
    verticalAlignment: "top",
  });
}

async function buildPosters() {
  const dir = path.join(OUTPUT, "posters");
  await fs.mkdir(path.join(dir, "png"), { recursive: true });
  const deck = Presentation.create({ slideSize: { width: W, height: H } });
  posters.forEach((item, idx) => {
    const slide = deck.slides.add();
    posterSlide(slide, item, idx + 1, posters.length);
  });
  for (const [idx, slide] of deck.slides.items.entries()) {
    await writeBlob(path.join(dir, "png", `${posters[idx].id}.png`), await deck.export({ slide, format: "png", scale: 1 }));
    await fs.writeFile(path.join(dir, "png", `${posters[idx].id}.layout.json`), await (await slide.export({ format: "layout" })).text());
  }
  await writeBlob(path.join(dir, "contact-sheet.webp"), await deck.export({ format: "webp", montage: true, scale: 0.45 }));
  const pptx = await PresentationFile.exportPptx(deck);
  await pptx.save(path.join(dir, "poster-pack.pptx"));
}

function section(title) {
  return `\n## ${title}\n`;
}

async function buildCalendar() {
  const schedule = [
    ["Week 1 - Monday", "Carousel", carousels[0]],
    ["Week 1 - Tuesday", "Poster", posters[0]],
    ["Week 1 - Wednesday", "Text", textPosts[0]],
    ["Week 1 - Thursday", "Carousel", carousels[1]],
    ["Week 1 - Friday", "Poster", posters[1]],
    ["Week 2 - Monday", "Carousel", carousels[2]],
    ["Week 2 - Tuesday", "Text", textPosts[1]],
    ["Week 2 - Wednesday", "Poster", posters[2]],
    ["Week 2 - Thursday", "Carousel", carousels[3]],
    ["Week 2 - Friday", "Text", textPosts[2]],
    ["Week 3 - Monday", "Poster", posters[3]],
    ["Week 3 - Tuesday", "Carousel", carousels[4]],
    ["Week 3 - Wednesday", "Text", textPosts[3]],
    ["Week 3 - Thursday", "Text", textPosts[4]],
    ["Week 3 - Friday", "Poster", posters[4]],
    ["Week 4 - Monday", "Text", textPosts[5]],
    ["Week 4 - Tuesday", "Text", textPosts[6]],
    ["Week 4 - Wednesday", "Carousel", carousels[5]],
    ["Week 4 - Thursday", "Text", textPosts[7]],
    ["Week 4 - Friday", "Poster", posters[5]],
  ];

  let md = `# Usama Shahzaib - One Month LinkedIn Content\n\n`;
  md += `Positioning: People and Culture operator helping founders make better workforce decisions.\n\n`;
  md += `Cadence: 5 posts per week for 4 weeks. The captions below are final copy. Replace nothing.\n\n`;
  md += `| Slot | Format | Topic | Asset |\n|---|---|---|---|\n`;
  for (const [slot, format, item] of schedule) {
    const asset = format === "Carousel" ? `carousels/${item.id}/${item.id}.pdf` : format === "Poster" ? `posters/png/${item.id}.png` : "No asset";
    md += `| ${slot} | ${format} | ${item.title || item.quote} | ${asset} |\n`;
  }
  for (const [index, [slot, format, item]] of schedule.entries()) {
    md += section(`${String(index + 1).padStart(2, "0")} - ${slot} - ${format}`);
    md += `**Topic:** ${item.title || item.quote}\n\n`;
    md += `${item.caption}\n`;
    if (format === "Carousel") {
      md += `\n**Asset:** \`carousels/${item.id}/${item.id}.pdf\`\n`;
    } else if (format === "Poster") {
      md += `\n**Asset:** \`posters/png/${item.id}.png\`\n`;
    }
  }
  await fs.writeFile(path.join(OUTPUT, "CONTENT-CALENDAR.md"), md, "utf8");

  const csvRows = [["Slot", "Format", "Topic", "Asset"]];
  schedule.forEach(([slot, format, item]) => {
    const asset = format === "Carousel" ? `carousels/${item.id}/${item.id}.pdf` : format === "Poster" ? `posters/png/${item.id}.png` : "";
    csvRows.push([slot, format, item.title || item.quote, asset]);
  });
  const csv = csvRows.map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  await fs.writeFile(path.join(OUTPUT, "CONTENT-CALENDAR.csv"), csv, "utf8");

  const readme = `# LinkedIn content pack\n\nOpen CONTENT-CALENDAR.md for the posting order and final captions.\n\n- Carousels: upload the PDF as a LinkedIn document post. The PPTX is editable. Individual PNG slides are included for review or reuse.\n- Posters: upload the matching PNG with its caption. The poster-pack PPTX is editable.\n- Text posts: publish the caption directly without an image.\n\nThe copy uses only facts present in the supplied LinkedIn profile. No new employer, client, revenue, team-size, or personal-story claims were added.\n`;
  await fs.writeFile(path.join(OUTPUT, "README.md"), readme, "utf8");
}

async function main() {
  await fs.mkdir(OUTPUT, { recursive: true });
  for (const item of carousels) await buildCarousel(item);
  await buildPosters();
  await buildCalendar();
  console.log(`Created ${carousels.length} carousels, ${posters.length} posters, and ${textPosts.length} text posts.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
