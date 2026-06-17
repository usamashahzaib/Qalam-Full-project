export const openLinkedInComposer = async (text: string) => {
  const url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`
  await navigator.clipboard.writeText(text).catch(() => undefined)
  window.open(url, "_blank", "noopener,noreferrer")
}
