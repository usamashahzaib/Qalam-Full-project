import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { findUnnamedFormControls } from "../scripts/form-control-labels.mjs"

type UnnamedControl = { file: string; line: number; column: number; tag: string }

describe("form control accessible names", () => {
  it("gives every input, select and textarea an accessible name in source", () => {
    const unnamed = (findUnnamedFormControls() as UnnamedControl[]).map(
      (control) => `${control.file}:${control.line}:${control.column} <${control.tag}>`
    )
    // Add a visible <label>, wrap the control in one, or set aria-label. The
    // old runtime backstop that guessed names from placeholders is gone.
    expect(unnamed).toEqual([])
  })

  it("flags unnamed controls and accepts every supported way of naming one", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "qalam-labels-"))
    try {
      fs.mkdirSync(path.join(root, "components"))
      fs.writeFileSync(path.join(root, "components", "Form.tsx"), [
        "export function Form({ rest }: { rest: object }) {",
        "  return <form>",
        "    <input placeholder=\"Unnamed\" />",
        "    <textarea />",
        "    <input aria-label=\"Named\" />",
        "    <label>Wrapped <select><option>a</option></select></label>",
        "    <Field label=\"Wrapped\"><input /></Field>",
        "    <label htmlFor=\"linked\">Linked</label><input id=\"linked\" />",
        "    <input type=\"hidden\" />",
        "    <input {...rest} />",
        "  </form>",
        "}",
      ].join("\n"))
      const unnamed = (findUnnamedFormControls(root, ["components"]) as UnnamedControl[]).map((c) => `${c.line}:${c.tag}`)
      expect(unnamed).toEqual(["3:input", "4:textarea"])
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })
})
