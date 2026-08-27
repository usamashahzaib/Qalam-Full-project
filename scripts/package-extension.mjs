import { readdir, readFile, writeFile, mkdir } from "node:fs/promises"
import { join, relative } from "node:path"
import JSZip from "jszip"

const root = process.cwd()
const source = join(root, "extension")
const outputDir = join(root, "public", "downloads")
const output = join(outputDir, "qalam-linkedin-extension.zip")
const zip = new JSZip()

const addDirectory = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  await Promise.all(entries.map(async (entry) => {
    const fullPath = join(directory, entry.name)
    if (entry.isDirectory()) return addDirectory(fullPath)
    const archivePath = join("qalam-linkedin-extension", relative(source, fullPath)).replaceAll("\\", "/")
    zip.file(archivePath, await readFile(fullPath))
  }))
}

await addDirectory(source)
await mkdir(outputDir, { recursive: true })
await writeFile(output, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }))
console.log(`Created ${relative(root, output)}`)
