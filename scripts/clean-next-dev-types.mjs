import { existsSync, rmSync } from "fs"
import { resolve } from "path"
import { fileURLToPath } from "url"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
const devTypesDirectory = resolve(root, ".next", "dev", "types")

if (existsSync(devTypesDirectory)) {
  rmSync(devTypesDirectory, { recursive: true, force: true })
}
