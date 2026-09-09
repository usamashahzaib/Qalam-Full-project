import "server-only"

import JSZip from "jszip"
import type { ResumeData } from "@/lib/career-resume"
import { RESUME_TEMPLATES } from "@/lib/resume-templates"

/**
 * Builds an editable .docx from resume data.
 *
 * A PDF is the safer thing to email, but most applicant tracking systems
 * extract text more reliably from Word, several agency portals accept nothing
 * else, and a recruiter working on a candidate's behalf needs a file they can
 * actually edit. Offering only a PDF quietly excluded all three.
 *
 * The document is written as OOXML by hand rather than through a new
 * dependency, and it deliberately uses only the features an ATS parses
 * cleanly: one column, real headings, a real bullet list, no tables, no text
 * boxes, no header or footer, no images.
 */

const escapeXml = (value: string) =>
  (value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    // Control characters are not valid in XML content and make Word refuse
    // to open the file rather than degrade gracefully.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`

const DOCUMENT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>`

/**
 * Heading styles are real Word styles rather than bold text, because that is
 * what lets a parser recognise "Experience" as a section rather than a line
 * that happens to be bold.
 */
const styles = (accent: string) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="60" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="40"/></w:pPr><w:rPr><w:b/><w:sz w:val="40"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="${accent}"/></w:pBdr><w:spacing w:before="220" w:after="80"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:caps/><w:color w:val="${accent}"/><w:sz w:val="20"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="120" w:after="0"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="21"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="20"/><w:ind w:left="360" w:hanging="180"/></w:pPr></w:style>
</w:styles>`

/** One plain bullet level. Nested or decorative lists confuse extraction. */
const NUMBERING = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="&#8226;"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="360" w:hanging="180"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`

const core = (title: string) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${escapeXml(title)}</dc:title><dc:creator>Qalam</dc:creator><cp:lastModifiedBy>Qalam</cp:lastModifiedBy></cp:coreProperties>`

type RunOptions = { bold?: boolean; italic?: boolean; size?: number; color?: string }

const run = (text: string, options: RunOptions = {}) => {
  const properties = [
    options.bold ? "<w:b/>" : "",
    options.italic ? "<w:i/>" : "",
    options.size ? `<w:sz w:val="${options.size}"/>` : "",
    options.color ? `<w:color w:val="${options.color}"/>` : "",
  ].join("")
  return `<w:r>${properties ? `<w:rPr>${properties}</w:rPr>` : ""}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`
}

const paragraph = (text: string, options: RunOptions & { style?: string } = {}) => {
  if (!text) return ""
  const style = options.style ? `<w:pPr><w:pStyle w:val="${options.style}"/></w:pPr>` : ""
  return `<w:p>${style}${run(text, options)}</w:p>`
}

const bullet = (text: string) =>
  `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>${run(text)}</w:p>`

const joinParts = (parts: (string | undefined)[], separator = " | ") => parts.filter((part) => part && part.trim()).join(separator)

export async function buildResumeDocx(data: ResumeData, templateKey: string): Promise<Uint8Array> {
  const template = RESUME_TEMPLATES.find((item) => item.key === templateKey) || RESUME_TEMPLATES[0]
  const accent = template.accent.replace("#", "").toUpperCase()

  const entryBlock = (entries: ResumeData["experience"]) =>
    entries
      .map((entry) => {
        const dates = joinParts([entry.startDate, entry.endDate], " - ")
        return [
          paragraph(joinParts([entry.title, entry.organization]), { style: "Heading2" }),
          paragraph(joinParts([entry.location, dates]), { italic: true, size: 17, color: "555555" }),
          entry.bullets.map(bullet).join(""),
        ].join("")
      })
      .join("")

  const section = (title: string, body: string) => (body ? paragraph(title, { style: "Heading1" }) + body : "")

  const body = [
    paragraph(data.fullName || "Your Name", { style: "Title" }),
    paragraph(data.headline, { bold: true, size: 22, color: accent }),
    paragraph(joinParts([data.email, data.phone, data.location, data.linkedinUrl]), { size: 17, color: "555555" }),
    section("Professional Summary", paragraph(data.summary)),
    section("Core Skills", paragraph(data.skills.join(" | "))),
    section("Professional Experience", entryBlock(data.experience)),
    section("Projects", entryBlock(data.projects)),
    section("Education", entryBlock(data.education)),
    section("Certifications", data.certifications.map(bullet).join("")),
  ].join("")

  // A4 with 2cm margins, single column. The section properties are the last
  // child of the body, which is where the schema requires them.
  const sectionProperties =
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="0" w:footer="0" w:gutter="0"/><w:cols w:space="708"/></w:sectPr>'

  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}${sectionProperties}</w:body></w:document>`

  const zip = new JSZip()
  zip.file("[Content_Types].xml", CONTENT_TYPES)
  zip.file("_rels/.rels", RELS)
  zip.file("docProps/core.xml", core(`${data.fullName || "Candidate"} Resume`))
  zip.file("word/document.xml", document)
  zip.file("word/_rels/document.xml.rels", DOCUMENT_RELS)
  zip.file("word/styles.xml", styles(accent))
  zip.file("word/numbering.xml", NUMBERING)

  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" })
}

export const resumeDocxFilename = (title: string) => {
  const stem =
    (title || "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "ats-resume"
  return `${stem}.docx`
}
