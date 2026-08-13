import { chromium } from "playwright"
import sharp from "sharp"
import { mkdir } from "node:fs/promises"
import { fileURLToPath, pathToFileURL } from "node:url"
import path from "node:path"

const root=path.dirname(fileURLToPath(import.meta.url)),out=path.join(root,"exports")
await mkdir(out,{recursive:true})
const ids=["founder-01","founder-02","founder-03","founder-04","founder-05","founder-06","qalam-01","qalam-02","qalam-03","qalam-04","qalam-05","qalam-06"]
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:3400,height:1500},deviceScaleFactor:1})
await page.goto(pathToFileURL(path.join(root,"posters.html")).href)
await page.evaluate(()=>document.fonts.ready)
for(const id of ids)await page.locator(`#${id}`).screenshot({path:path.join(out,`${id}.png`)})
await browser.close()

const tiles=await Promise.all(ids.map(async(id,index)=>({input:await sharp(path.join(out,`${id}.png`)).resize(270,338).png().toBuffer(),left:20+(index%4)*290,top:20+Math.floor(index/4)*358})))
await sharp({create:{width:1180,height:1094,channels:3,background:"#aaa59b"}}).composite(tiles).png().toFile(path.join(root,"campaign-contact-sheet.png"))
