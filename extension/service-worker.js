/* global chrome */

const QALAM_ORIGIN = "https://www.byqalam.com"

chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message.type === "qalam:open-connect") {
    chrome.tabs.create({ url: `${QALAM_ORIGIN}/extension/connect` })
    respond({ ok: true })
    return
  }
  if (message.type === "qalam:open-writer") {
    chrome.tabs.create({ url: `${QALAM_ORIGIN}/writer?topic=${encodeURIComponent(String(message.postText || "").slice(0, 3000))}` })
    respond({ ok: true })
    return
  }
  if (message.type !== "qalam:generate") return
  chrome.storage.local.get(["qalam_extension_token"], async ({ qalam_extension_token: token }) => {
    if (!token) return respond({ error: "extension_auth_required" })
    try {
      const response = await fetch(`${QALAM_ORIGIN}/api/extension/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ postText: message.postText, style: message.style }),
      })
      respond(await response.json())
    } catch {
      respond({ error: "network_error" })
    }
  })
  return true
})
