import { mkdir } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"

const ROOT = process.cwd()
const WIDTH = 1128
const HEIGHT = 191
const PHOTO = path.join(ROOT, "public/brand/source/qalam-guide-reference.png")
const MARK = path.join(ROOT, "public/byqalam-logo-dark-bg.png")
const OUT = path.join(ROOT, "public/brand/linkedin")

const svg = (body) => Buffer.from(`
  <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    ${body}
  </svg>
`)

const photo = await sharp(PHOTO)
  .resize(292, HEIGHT, { fit: "cover", position: "attention" })
  .png()
  .toBuffer()

const mark = await sharp(MARK)
  .resize(52, 52, { fit: "cover" })
  .png()
  .toBuffer()

const render = async (name, background, overlay) => {
  await sharp(background)
    .composite([
      { input: photo, left: 836, top: 0 },
      { input: overlay, left: 0, top: 0 },
      { input: mark, left: 224, top: 22 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, name))
}

await mkdir(OUT, { recursive: true })

await render(
  "qalam-linkedin-banner-a.png",
  svg(`
    <rect width="1128" height="191" fill="#0D4A45"/>
    <path d="M0 22H190M0 169H162" stroke="#C9871F" stroke-width="2" opacity=".42"/>
    <circle cx="96" cy="96" r="57" fill="none" stroke="#C9871F" stroke-width="1" opacity=".18"/>
    <circle cx="96" cy="96" r="35" fill="none" stroke="#F7F2E8" stroke-width="1" opacity=".08"/>
  `),
  svg(`
    <defs>
      <linearGradient id="fade" x1="0" x2="1"><stop stop-color="#0D4A45"/><stop offset="1" stop-color="#0D4A45" stop-opacity="0"/></linearGradient>
    </defs>
    <rect x="805" width="96" height="191" fill="url(#fade)"/>
    <text x="290" y="42" fill="#F7F2E8" font-family="Arial, sans-serif" font-size="14" font-weight="700" letter-spacing="2.8">QALAM</text>
    <text x="224" y="112" fill="#F7F2E8" font-family="Arial, sans-serif" font-size="38" font-weight="800" letter-spacing="-.8">Career Visibility OS</text>
    <rect x="224" y="130" width="42" height="3" rx="1.5" fill="#C9871F"/>
    <text x="278" y="137" fill="#D9E9E6" font-family="Arial, sans-serif" font-size="15" font-weight="500">LinkedIn. Content. Career proof. One system.</text>
  `)
)

await render(
  "qalam-linkedin-banner-b.png",
  svg(`
    <rect width="1128" height="191" fill="#F7F2E8"/>
    <rect width="188" height="191" fill="#0D4A45"/>
    <path d="M42 28L144 163M18 62L91 159" stroke="#C9871F" stroke-width="1" opacity=".22"/>
    <rect x="804" width="32" height="191" fill="#C9871F"/>
  `),
  svg(`
    <text x="290" y="42" fill="#0D4A45" font-family="Arial, sans-serif" font-size="14" font-weight="700" letter-spacing="2.8">QALAM</text>
    <text x="224" y="98" fill="#0D4A45" font-family="Arial, sans-serif" font-size="36" font-weight="800" letter-spacing="-.7">Be found. Be trusted. Be hired.</text>
    <text x="225" y="128" fill="#485C59" font-family="Arial, sans-serif" font-size="15">One professional story across LinkedIn, content, and career.</text>
    <text x="225" y="160" fill="#0D4A45" font-family="Arial, sans-serif" font-size="11" font-weight="700" letter-spacing="1.5">POSITIONING</text>
    <circle cx="330" cy="156" r="2.5" fill="#C9871F"/>
    <text x="348" y="160" fill="#0D4A45" font-family="Arial, sans-serif" font-size="11" font-weight="700" letter-spacing="1.5">PROOF</text>
    <circle cx="410" cy="156" r="2.5" fill="#C9871F"/>
    <text x="428" y="160" fill="#0D4A45" font-family="Arial, sans-serif" font-size="11" font-weight="700" letter-spacing="1.5">OPPORTUNITY</text>
  `)
)

await render(
  "qalam-linkedin-banner-c.png",
  svg(`
    <rect width="1128" height="191" fill="#C9871F"/>
    <rect width="194" height="191" fill="#082E2B"/>
    <path d="M194 0H804V191H194Z" fill="#C9871F"/>
    <path d="M196 25H760M196 166H700" stroke="#0D4A45" stroke-width="1" opacity=".22"/>
  `),
  svg(`
    <text x="290" y="42" fill="#082E2B" font-family="Arial, sans-serif" font-size="14" font-weight="800" letter-spacing="2.8">QALAM</text>
    <text x="224" y="101" fill="#082E2B" font-family="Arial, sans-serif" font-size="37" font-weight="900" letter-spacing="-.9">Your work should be visible.</text>
    <rect x="224" y="121" width="470" height="32" fill="#082E2B"/>
    <text x="242" y="143" fill="#F7F2E8" font-family="Arial, sans-serif" font-size="14" font-weight="700">Turn expertise into proof, recognition, and opportunity.</text>
  `)
)

await sharp(svg(`
  <defs>
    <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M32 0H0V32" fill="none" stroke="#D5B66F" stroke-width="1" opacity=".055"/>
    </pattern>
    <linearGradient id="vault" x1="0" x2="1">
      <stop stop-color="#C9871F"/>
      <stop offset="1" stop-color="#E2B65A"/>
    </linearGradient>
  </defs>
  <rect width="1128" height="191" fill="#0B403C"/>
  <rect width="1128" height="191" fill="url(#grid)"/>

  <circle cx="82" cy="96" r="66" fill="none" stroke="#C9871F" stroke-width="1" opacity=".17"/>
  <circle cx="82" cy="96" r="45" fill="none" stroke="#F5EFE3" stroke-width="1" opacity=".07"/>
  <path d="M0 24H164M0 167H136" stroke="#C9871F" stroke-width="2" opacity=".35"/>

  <text x="291" y="48" fill="#D7A641" font-family="Georgia, serif" font-size="27" font-weight="700" letter-spacing="5">QALAM</text>
  <text x="224" y="103" fill="#F5EFE3" font-family="Arial, sans-serif" font-size="31" font-weight="750" letter-spacing="-.45">The Career Visibility OS</text>
  <text x="225" y="134" fill="#BFD4D0" font-family="Arial, sans-serif" font-size="14.5" font-weight="500">One credible professional story across LinkedIn, content, and career.</text>
  <rect x="225" y="155" width="34" height="2" fill="#C9871F"/>
  <text x="271" y="159" fill="#F5EFE3" font-family="Arial, sans-serif" font-size="10.5" font-weight="700" letter-spacing="1.4">BE FOUND</text>
  <circle cx="351" cy="155" r="2" fill="#C9871F"/>
  <text x="366" y="159" fill="#F5EFE3" font-family="Arial, sans-serif" font-size="10.5" font-weight="700" letter-spacing="1.4">BE TRUSTED</text>
  <circle cx="469" cy="155" r="2" fill="#C9871F"/>
  <text x="484" y="159" fill="#F5EFE3" font-family="Arial, sans-serif" font-size="10.5" font-weight="700" letter-spacing="1.4">BE HIRED</text>

  <path d="M730 48H1034M730 96H1034M730 144H1034" stroke="#7FA09B" stroke-width="1" opacity=".42"/>
  <path d="M816 48V144M948 48V144" stroke="#7FA09B" stroke-width="1" opacity=".28" stroke-dasharray="3 5"/>
  <rect x="790" y="76" width="184" height="40" rx="4" fill="#082E2B" stroke="url(#vault)" stroke-width="1.5"/>
  <text x="882" y="92" fill="#C9871F" font-family="Arial, sans-serif" font-size="9" font-weight="700" letter-spacing="2.1" text-anchor="middle">SHARED SYSTEM</text>
  <text x="882" y="108" fill="#F5EFE3" font-family="Arial, sans-serif" font-size="14" font-weight="750" text-anchor="middle">CAREER VAULT</text>
  <circle cx="730" cy="48" r="4" fill="#C9871F"/>
  <circle cx="730" cy="96" r="4" fill="#C9871F"/>
  <circle cx="730" cy="144" r="4" fill="#C9871F"/>
  <text x="746" y="52" fill="#DCE8E5" font-family="Arial, sans-serif" font-size="11.5" font-weight="600">LinkedIn positioning</text>
  <text x="988" y="52" fill="#DCE8E5" font-family="Arial, sans-serif" font-size="11.5" font-weight="600">Content intelligence</text>
  <text x="746" y="148" fill="#DCE8E5" font-family="Arial, sans-serif" font-size="11.5" font-weight="600">ATS career engine</text>
  <text x="988" y="148" fill="#DCE8E5" font-family="Arial, sans-serif" font-size="11.5" font-weight="600">Professional growth</text>
`))
  .composite([{ input: mark, left: 224, top: 20 }])
  .png({ compressionLevel: 9 })
  .toFile(path.join(OUT, "qalam-linkedin-banner-v2.png"))

console.log(`Generated LinkedIn banners in ${OUT}`)
