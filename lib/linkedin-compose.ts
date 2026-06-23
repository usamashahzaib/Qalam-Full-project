export const openLinkedInComposer = async (text: string) => {
  // Copy full text to clipboard first — the URL param gets truncated for long posts
  await navigator.clipboard.writeText(text).catch(() => undefined)
  // Open LinkedIn composer without text in URL so the full post can be pasted
  window.open("https://www.linkedin.com/feed/?shareActive=true", "_blank", "noopener,noreferrer")
}
