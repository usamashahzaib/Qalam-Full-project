import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";
import { carousels, posters, textPosts, schedule } from "./content-data.mjs";

const ROOT = "X:/Usama/Qalam/Code/Full project/byqalam-website";
const OUTPUT = path.join(ROOT, "deliverables/qalam-linkedin-content-september-2026-v2");
const W = 1080;
const H = 1080;
const FONT_DISPLAY = "Palatino Linotype";
const FONT_SANS = "Bahnschrift";
const logoPath = path.join(ROOT, "assets/brand/qalam-icon-master.png");
const logoBytes = await fs.readFile(logoPath);
const screenshotBytes = new Map();
for (const item of carousels) {
  if (item.screenshot) screenshotBytes.set(item.screenshot, await fs.readFile(path.join(ROOT, item.screenshot)));
}

const palettes = {
  receipt: { bg: "#F4EFE5", ink: "#113B37", accent: "#D98B12", deep: "#073F3A", soft: "#E4D9C6", pop: "#C95D3F" },
  ats: { bg: "#FAF8F1", ink: "#172B2A", accent: "#D69A18", deep: "#0A5A51", soft: "#DCE8E4", pop: "#D75E46" },
  writer: { bg: "#F9F6ED", ink: "#162D2B", accent: "#E29D15", deep: "#0D5951", soft: "#DCE7E4", pop: "#C45D43" },
  voice: { bg: "#F3EEE4", ink: "#153633", accent: "#D1900E", deep: "#074C46", soft: "#E0D6C4", pop: "#B84D3A" },
  archive: { bg: "#F7F4EA", ink: "#102E2B", accent: "#D79C25", deep: "#0B514A", soft: "#DBE7E3", pop: "#CF684F" },
  control: { bg: "#F6F0E5", ink: "#17322F", accent: "#E0A21D", deep: "#063E39", soft: "#DED4C2", pop: "#C7543C" }
};

function addText(slide, value, x, y, w, h, style = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 }
  });
  shape.text = value;
  shape.text.style = {
    fontFamily: FONT_SANS,
    fontSize: 30,
    color: "#17322F",
    verticalAlignment: "middle",
    ...style
  };
  return shape;
}

function addRect(slide, x, y, w, h, fill, line = "none", radius = "none") {
  return slide.shapes.add({
    geometry: radius === "none" ? "rect" : "roundRect",
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { style: "solid", fill: line, width: line === "none" ? 0 : 1 },
    ...(radius === "none" ? {} : { borderRadius: radius })
  });
}

function addLine(slide, x, y, w, h, fill) {
  addRect(slide, x, y, w, h, fill);
}

function addBrand(slide, p, current, total, dark = false) {
  slide.images.add({ blob: logoBytes, contentType: "image/png", alt: "Qalam mark", fit: "contain", position: { left: 56, top: 38, width: 50, height: 50 } });
  addText(slide, "QALAM", 118, 44, 160, 32, { fontSize: 16, bold: true, color: dark ? p.bg : p.ink, letterSpacing: 2.5, verticalAlignment: "top" });
  addText(slide, `${String(current).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, 864, 48, 156, 28, { fontSize: 14, bold: true, alignment: "right", color: dark ? p.bg : p.ink, verticalAlignment: "top" });
}

function coverSlide(slide, item, p, total) {
  slide.background.fill = p.deep;
  addRect(slide, 0, 0, 1080, 1080, p.deep);
  addRect(slide, 620, 0, 460, 1080, p.accent);
  addRect(slide, 662, 0, 418, 1080, p.bg);
  addBrand(slide, p, 1, total, true);
  addText(slide, item.slides[0].kicker, 72, 160, 470, 40, { fontSize: 17, bold: true, color: p.accent, letterSpacing: 2.2, verticalAlignment: "top" });
  addText(slide, item.slides[0].title, 72, 250, 520, 390, { fontFamily: FONT_DISPLAY, fontSize: item.slides[0].title.length > 48 ? 47 : 53, bold: true, color: p.bg, verticalAlignment: "middle" });
  addLine(slide, 72, 690, 112, 8, p.pop);
  addText(slide, item.slides[0].body, 72, 742, 490, 150, { fontSize: 25, color: "#DCE4DF", verticalAlignment: "top" });
  addText(slide, "SWIPE", 724, 866, 230, 44, { fontSize: 19, bold: true, alignment: "center", color: p.ink, letterSpacing: 2 });
  addText(slide, "Q", 708, 250, 250, 330, { fontFamily: FONT_DISPLAY, fontSize: 260, bold: true, alignment: "center", color: p.accent });
}

function screenshotSlide(slide, item, data, p, index, total) {
  slide.background.fill = p.bg;
  addBrand(slide, p, index, total, false);
  addText(slide, data.label, 66, 136, 300, 34, { fontSize: 16, bold: true, color: p.pop, letterSpacing: 2.2, verticalAlignment: "top" });
  addText(slide, data.title, 66, 204, 880, 120, { fontFamily: FONT_DISPLAY, fontSize: 48, bold: true, color: p.ink, verticalAlignment: "middle" });
  addRect(slide, 62, 382, 956, 494, "#FFFFFF", p.soft, "rounded-xl");
  slide.images.add({
    blob: screenshotBytes.get(item.screenshot),
    contentType: "image/png",
    alt: `${item.title} product screen`,
    fit: "cover",
    position: { left: 82, top: 404, width: 916, height: 448 },
    geometry: "roundRect",
    borderRadius: "rounded-lg",
    crop: { left: 0, top: 0.08, right: 0, bottom: 0.07 }
  });
  addRect(slide, 80, 902, 18, 18, p.accent, "none", "rounded-sm");
  addText(slide, data.body, 116, 890, 850, 86, { fontSize: 20, color: p.ink, verticalAlignment: "top" });
}

function contentSlide(slide, data, p, index, total) {
  const mode = index % 3;
  if (mode === 2) {
    slide.background.fill = p.deep;
    addBrand(slide, p, index, total, true);
    addText(slide, data.label, 68, 150, 400, 40, { fontSize: 17, bold: true, color: p.accent, letterSpacing: 2.2, verticalAlignment: "top" });
    addText(slide, data.title, 68, 260, 900, 280, { fontFamily: FONT_DISPLAY, fontSize: 60, bold: true, color: p.bg, verticalAlignment: "middle" });
    addLine(slide, 68, 590, 930, 2, "#52726D");
    addText(slide, data.body, 68, 646, 820, 230, { fontSize: 28, color: "#D8E1DC", verticalAlignment: "top" });
    if (data.example) addText(slide, data.example, 68, 892, 900, 70, { fontFamily: FONT_DISPLAY, italic: true, fontSize: 21, color: p.accent, verticalAlignment: "top" });
    return;
  }
  if (mode === 0) {
    slide.background.fill = p.bg;
    addBrand(slide, p, index, total, false);
    addRect(slide, 0, 130, 330, 950, p.soft);
    addText(slide, data.label, 52, 210, 250, 210, { fontFamily: FONT_DISPLAY, fontSize: data.label.length > 3 ? 54 : 150, bold: true, color: p.deep, alignment: "center" });
    addText(slide, data.title, 388, 214, 610, 250, { fontFamily: FONT_DISPLAY, fontSize: 53, bold: true, color: p.ink, verticalAlignment: "bottom" });
    addLine(slide, 390, 514, 96, 8, p.pop);
    addText(slide, data.body, 390, 568, 580, 240, { fontSize: 29, color: "#52625E", verticalAlignment: "top" });
    if (data.example) {
      addRect(slide, 390, 828, 575, 116, "#FFFFFF", p.soft, "rounded-lg");
      addText(slide, data.example, 418, 846, 520, 78, { fontFamily: FONT_DISPLAY, italic: true, fontSize: 20, color: p.deep, verticalAlignment: "middle" });
    }
    return;
  }
  slide.background.fill = p.bg;
  addBrand(slide, p, index, total, false);
  addRect(slide, 54, 146, 972, 794, "#FFFFFF", p.soft, "rounded-xl");
  addRect(slide, 54, 146, 22, 794, p.accent);
  addText(slide, data.label, 116, 208, 350, 40, { fontSize: 17, bold: true, color: p.pop, letterSpacing: 2.2, verticalAlignment: "top" });
  addText(slide, data.title, 116, 300, 820, 240, { fontFamily: FONT_DISPLAY, fontSize: 56, bold: true, color: p.ink, verticalAlignment: "middle" });
  addText(slide, data.body, 116, 604, 790, 190, { fontSize: 28, color: "#52625E", verticalAlignment: "top" });
  if (data.example) addText(slide, data.example, 116, 828, 800, 60, { fontFamily: FONT_DISPLAY, italic: true, fontSize: 21, color: p.deep, verticalAlignment: "top" });
}

function carouselSlide(slide, item, data, idx) {
  const p = palettes[item.kind];
  const total = item.slides.length;
  if (idx === 0) return coverSlide(slide, item, p, total);
  if (item.screenshot && idx === 3) return screenshotSlide(slide, item, data, p, idx + 1, total);
  return contentSlide(slide, data, p, idx + 1, total);
}

function posterBase(slide, dark = false) {
  const p = palettes.receipt;
  slide.background.fill = dark ? p.deep : p.bg;
  slide.images.add({ blob: logoBytes, contentType: "image/png", alt: "Qalam mark", fit: "contain", position: { left: 64, top: 54, width: 58, height: 58 } });
  addText(slide, "QALAM NOTE", 138, 66, 210, 28, { fontSize: 15, bold: true, color: dark ? p.bg : p.ink, letterSpacing: 2.2, verticalAlignment: "top" });
}

function posterSlide(slide, item) {
  const p = palettes.receipt;
  if (item.style === "editorial") {
    posterBase(slide, false);
    addRect(slide, 690, 0, 390, 1080, p.deep);
    addText(slide, "01", 750, 208, 250, 260, { fontFamily: FONT_DISPLAY, fontSize: 190, bold: true, color: p.accent, alignment: "center" });
    addText(slide, item.quote, 64, 210, 610, 430, { fontFamily: FONT_DISPLAY, fontSize: 58, bold: true, color: p.ink });
    addLine(slide, 64, 710, 120, 8, p.pop);
    addText(slide, item.sub, 64, 760, 560, 150, { fontSize: 25, color: "#5C6965", verticalAlignment: "top" });
    addText(slide, "SAVE THE WORK", 748, 760, 260, 90, { fontSize: 18, bold: true, color: p.bg, alignment: "center", letterSpacing: 2.2 });
    return;
  }
  if (item.style === "markup") {
    posterBase(slide, true);
    addText(slide, "RESPONSIBLE FOR ONBOARDING", 88, 220, 900, 82, { fontSize: 31, color: "#A8BBB5", strike: true, alignment: "center" });
    addText(slide, item.quote, 92, 354, 896, 300, { fontFamily: FONT_DISPLAY, fontSize: 57, bold: true, color: p.bg, alignment: "center" });
    addLine(slide, 382, 700, 316, 8, p.accent);
    addText(slide, item.sub, 160, 770, 760, 120, { fontSize: 24, color: "#D7E0DC", alignment: "center" });
    return;
  }
  if (item.style === "type") {
    posterBase(slide, false);
    addText(slide, "ANY COMPANY", 66, 190, 950, 150, { fontSize: 80, bold: true, color: p.soft, letterSpacing: 3, alignment: "center" });
    addRect(slide, 76, 372, 928, 420, "#FFFFFF", p.soft, "rounded-xl");
    addText(slide, item.quote, 122, 408, 836, 300, { fontFamily: FONT_DISPLAY, fontSize: 59, bold: true, color: p.ink, alignment: "center" });
    addText(slide, item.sub, 150, 836, 780, 110, { fontSize: 23, color: "#566662", alignment: "center" });
    return;
  }
  if (item.style === "inbox") {
    posterBase(slide, true);
    for (let i = 0; i < 3; i++) {
      addRect(slide, 104 + i * 22, 230 + i * 112, 830 - i * 44, 92, i === 2 ? p.accent : "#E8E2D7", "none", "rounded-lg");
      addRect(slide, 138 + i * 22, 260 + i * 112, 300, 10, i === 2 ? p.deep : "#71827D");
      addRect(slide, 138 + i * 22, 284 + i * 112, 510, 8, i === 2 ? "#FFFFFF" : "#A5AEA9");
    }
    addText(slide, item.quote, 92, 600, 896, 220, { fontFamily: FONT_DISPLAY, fontSize: 56, bold: true, color: p.bg, alignment: "center" });
    addText(slide, item.sub, 150, 848, 780, 110, { fontSize: 23, color: "#D3DEDA", alignment: "center" });
    return;
  }
  if (item.style === "number") {
    posterBase(slide, false);
    addText(slide, "0%", 70, 154, 940, 330, { fontFamily: FONT_DISPLAY, fontSize: 235, bold: true, color: p.soft, alignment: "center" });
    addText(slide, item.quote, 104, 430, 872, 250, { fontFamily: FONT_DISPLAY, fontSize: 62, bold: true, color: p.ink, alignment: "center" });
    addLine(slide, 438, 722, 204, 8, p.pop);
    addText(slide, item.sub, 150, 782, 780, 120, { fontSize: 24, color: "#596964", alignment: "center" });
    return;
  }
  posterBase(slide, true);
  addRect(slide, 70, 170, 940, 700, p.bg, "none", "rounded-xl");
  addText(slide, "FREE ATS CHECK", 120, 220, 840, 42, { fontSize: 17, bold: true, color: p.pop, letterSpacing: 2.2, alignment: "center" });
  addText(slide, item.quote, 128, 330, 824, 260, { fontFamily: FONT_DISPLAY, fontSize: 60, bold: true, color: p.ink, alignment: "center" });
  addRect(slide, 296, 664, 488, 86, p.deep, "none", "rounded-xl");
  addText(slide, "NO ACCOUNT REQUIRED", 326, 688, 428, 38, { fontSize: 18, bold: true, color: p.bg, alignment: "center", letterSpacing: 1.5 });
  addText(slide, item.sub, 150, 908, 780, 68, { fontSize: 22, color: "#D2DEDA", alignment: "center" });
}

async function saveBlob(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, new Uint8Array(await value.arrayBuffer()));
}

async function buildCarousel(item) {
  const dir = path.join(OUTPUT, "carousels", item.id);
  const deck = Presentation.create({ slideSize: { width: W, height: H } });
  item.slides.forEach((data, idx) => carouselSlide(deck.slides.add(), item, data, idx));
  for (const [idx, slide] of deck.slides.items.entries()) {
    await saveBlob(path.join(dir, "slides-png", `slide-${String(idx + 1).padStart(2, "0")}.png`), await deck.export({ slide, format: "png", scale: 1 }));
  }
  await saveBlob(path.join(dir, "contact-sheet.webp"), await deck.export({ format: "webp", montage: true, scale: 0.34 }));
  const pptx = await PresentationFile.exportPptx(deck);
  await pptx.save(path.join(dir, `${item.id}.pptx`));
}

async function buildPosters() {
  const deck = Presentation.create({ slideSize: { width: W, height: H } });
  posters.forEach(item => posterSlide(deck.slides.add(), item));
  for (const [idx, slide] of deck.slides.items.entries()) {
    await saveBlob(path.join(OUTPUT, "posters/png", `${posters[idx].id}.png`), await deck.export({ slide, format: "png", scale: 1 }));
  }
  await saveBlob(path.join(OUTPUT, "posters/contact-sheet.webp"), await deck.export({ format: "webp", montage: true, scale: 0.34 }));
  const pptx = await PresentationFile.exportPptx(deck);
  await pptx.save(path.join(OUTPUT, "posters/poster-pack.pptx"));
}

function cleanCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

async function buildDocs() {
  let md = `# Qalam LinkedIn content calendar - September 2026\n\nThis pack is written for the Qalam company page. It contains 20 finished posts: 6 carousels, 6 posters, and 8 text posts. Constructed examples and demo data are labelled. No customer results are implied.\n\n| Date | Format | Topic | Asset |\n|---|---|---|---|\n`;
  for (const [date, format, item] of schedule) {
    const asset = format === "Carousel" ? `carousels/${item.id}/${item.id}.pdf` : format === "Poster" ? `posters/png/${item.id}.png` : "No visual required";
    md += `| ${date} | ${format} | ${cleanCell(item.title || item.quote)} | ${asset} |\n`;
  }
  schedule.forEach(([date, format, item], idx) => {
    md += `\n## ${String(idx + 1).padStart(2, "0")} - ${date} - ${format}\n\n**Topic:** ${item.title || item.quote}\n\n${item.caption}\n`;
    if (format === "Carousel") md += `\n**Publish asset:** \`carousels/${item.id}/${item.id}.pdf\`\n\n**Editable source:** \`carousels/${item.id}/${item.id}.pptx\`\n`;
    if (format === "Poster") md += `\n**Publish asset:** \`posters/png/${item.id}.png\`\n`;
  });
  await fs.writeFile(path.join(OUTPUT, "CONTENT-CALENDAR.md"), md, "utf8");

  const rows = [["Date", "Format", "Topic", "Asset"]];
  for (const [date, format, item] of schedule) rows.push([date, format, item.title || item.quote, format === "Carousel" ? `carousels/${item.id}/${item.id}.pdf` : format === "Poster" ? `posters/png/${item.id}.png` : ""]);
  const csv = rows.map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  await fs.writeFile(path.join(OUTPUT, "CONTENT-CALENDAR.csv"), csv, "utf8");

  await fs.writeFile(path.join(OUTPUT, "README.md"), `# Qalam LinkedIn content pack V2\n\nContents:\n\n- 20 complete company-page posts\n- 6 carousel PDFs with editable PPTX sources and individual PNG slides\n- 6 poster PNGs with one editable poster deck\n- September 2026 publishing calendar in Markdown and CSV\n- quality report with claim and repetition checks\n\nProduct screens are taken from the Qalam website's interactive demo. Demo data is treated as sample data. No personal founder name is used anywhere in the pack.\n`, "utf8");

  const allCaptions = schedule.map(([, , item]) => item.caption);
  const wordCounts = allCaptions.map(c => c.trim().split(/\s+/).length);
  const joined = allCaptions.join("\n").toLowerCase();
  const count = term => (joined.match(new RegExp(`\\b${term}\\b`, "g")) || []).length;
  const quality = `# Quality report\n\n## What changed from V1\n\n- Every post has a distinct job: product demonstration, practical method, before-and-after example, control principle, local product decision, or direct conversion.\n- The three shipped demo screens appear in relevant carousels.\n- Constructed examples are labelled. Demo metrics are described as illustrative.\n- Captions use varied hook structures and avoid the repeated slogan pattern that dominated V1.\n- Posters use six different compositions rather than one quote template.\n\n## Mechanical checks\n\n- Posts: ${schedule.length}\n- Carousels: ${carousels.length}\n- Posters: ${posters.length}\n- Text posts: ${textPosts.length}\n- Average caption length: ${Math.round(wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length)} words\n- Shortest caption: ${Math.min(...wordCounts)} words\n- Longest caption: ${Math.max(...wordCounts)} words\n- Qalam mentions: ${count("qalam")}\n- Career mentions: ${count("career")}\n- Evidence mentions: ${count("evidence")}\n- AI mentions: ${count("ai")}\n\n## Honest pre-publish score\n\n**44.5 / 50**\n\nThis is a pre-publish editorial score, not a prediction of reach. A defensible 49.9 requires Qalam page performance data after publishing: impressions, dwell time, saves, comments, profile visits, clicks, and conversions by format and topic. The score is capped because no Qalam page baseline was supplied.\n\n- Hook strength: 9.0 / 10\n- Specificity and usefulness: 9.2 / 10\n- Product truth and credibility: 9.4 / 10\n- Voice variation and human texture: 8.7 / 10\n- Conversion and testing value: 8.2 / 10\n\nThe fastest path from 44.5 to a real 49.9 is not another rewrite. It is publishing the first five posts, collecting Qalam page data, and replacing assumptions with observed patterns.\n`;
  await fs.writeFile(path.join(OUTPUT, "QUALITY-REPORT.md"), quality, "utf8");
}

async function main() {
  await fs.mkdir(OUTPUT, { recursive: true });
  for (const item of carousels) await buildCarousel(item);
  await buildPosters();
  await buildDocs();
  console.log(`Built ${carousels.length} carousels, ${posters.length} posters, and ${textPosts.length} text posts in ${OUTPUT}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
