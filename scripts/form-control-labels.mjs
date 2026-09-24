// Finds form controls in app/ and components/ that have no accessible name in
// source. A control is named when it carries aria-label or aria-labelledby,
// sits inside a <label> (or a wrapper component that renders one), or has an
// id that a htmlFor in the same file points at. Used by
// __tests__/form-control-labels.test.ts so unnamed controls fail CI instead of
// being patched at runtime.
import fs from "node:fs"
import path from "node:path"
import ts from "typescript"

// Components that render their children inside a <label>. Add one here only
// after confirming it does.
const LABEL_WRAPPER_COMPONENTS = new Set(["label", "Field"])

const CONTROL_TAGS = new Set(["input", "select", "textarea"])
const UNNAMED_EXEMPT_TYPES = new Set(["hidden", "submit", "button", "reset"])

const tagName = (node) => node.tagName.getText()

const attributeMap = (attributes) => {
  const map = new Map()
  let hasSpread = false
  for (const prop of attributes.properties) {
    if (ts.isJsxSpreadAttribute(prop)) { hasSpread = true; continue }
    const init = prop.initializer
    const value = !init ? true : ts.isStringLiteral(init) ? init.text : ts.isJsxExpression(init) && init.expression && ts.isStringLiteral(init.expression) ? init.expression.text : init.getText()
    map.set(prop.name.getText(), value)
  }
  return { map, hasSpread }
}

function scanFile(file, source) {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const htmlFor = new Set()
  const controls = []

  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const { map, hasSpread } = attributeMap(node.attributes)
      if (map.has("htmlFor")) htmlFor.add(String(map.get("htmlFor")))
      if (CONTROL_TAGS.has(tagName(node))) controls.push({ node, map, hasSpread })
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)

  const insideLabel = (node) => {
    for (let parent = node.parent; parent; parent = parent.parent) {
      if (ts.isJsxElement(parent) && LABEL_WRAPPER_COMPONENTS.has(tagName(parent.openingElement))) return true
    }
    return false
  }

  const unnamed = []
  for (const { node, map, hasSpread } of controls) {
    if (hasSpread) continue
    if (map.has("aria-label") || map.has("aria-labelledby")) continue
    if (UNNAMED_EXEMPT_TYPES.has(String(map.get("type")))) continue
    if (map.has("id") && htmlFor.has(String(map.get("id")))) continue
    if (insideLabel(node)) continue
    const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart())
    unnamed.push({ file, line: line + 1, column: character + 1, tag: tagName(node), start: node.getStart() })
  }
  return unnamed
}

export function findUnnamedFormControls(root = process.cwd(), dirs = ["app", "components"]) {
  const results = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (full.endsWith(".tsx")) {
        const rel = path.relative(root, full).split(path.sep).join("/")
        results.push(...scanFile(rel, fs.readFileSync(full, "utf8")))
      }
    }
  }
  for (const dir of dirs) walk(path.join(root, dir))
  return results
}

if (import.meta.url === `file://${process.argv[1].split(path.sep).join("/")}` || process.argv[1]?.endsWith("form-control-labels.mjs")) {
  const unnamed = findUnnamedFormControls()
  for (const item of unnamed) console.log(`${item.file}:${item.line}:${item.column} <${item.tag}>`)
  console.log(`${unnamed.length} unnamed form control(s)`)
  process.exitCode = unnamed.length ? 1 : 0
}
