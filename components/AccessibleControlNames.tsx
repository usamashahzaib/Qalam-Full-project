"use client"

import { useLayoutEffect } from "react"

const selectNames: Record<string, string> = {
  "All types": "Filter by type",
  "All statuses": "Filter by status",
  "Newest first": "Sort results",
  "Recruitment agency": "Organization type",
}

const fallbackName = (control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string => {
  const placeholder = control.getAttribute("placeholder")?.trim()
  if (placeholder) return placeholder

  if (control instanceof HTMLSelectElement) {
    const selected = control.selectedOptions[0]?.text.trim()
    return selectNames[selected || ""] || "Choose an option"
  }

  if (control instanceof HTMLInputElement) {
    if (control.type === "search") return "Search"
    if (control.type === "password") return "Password"
    if (control.type === "email") return "Email address"
    if (control.type === "date") return "Date"
    if (control.type === "number") return "Number"
  }

  return control instanceof HTMLTextAreaElement ? "Text input" : "Input"
}

const labelControl = (control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) => {
  if (control.hasAttribute("aria-label") || control.hasAttribute("aria-labelledby") || control.labels?.length) return
  control.setAttribute("aria-label", fallbackName(control))
}

const labelUnnamedControls = (root: ParentNode) => {
  if (root instanceof HTMLInputElement || root instanceof HTMLTextAreaElement || root instanceof HTMLSelectElement) labelControl(root)
  root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select").forEach(labelControl)
}

// This is a runtime backstop for older forms. New and dense forms should still
// use visible labels or explicit aria-label props in their own source.
export function AccessibleControlNames() {
  useLayoutEffect(() => {
    labelUnnamedControls(document)
    const observer = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (node instanceof Element) labelUnnamedControls(node)
      }))
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  return null
}
