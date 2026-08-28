/* global chrome */

const QALAM_ORIGIN = "https://www.byqalam.com"

const readConnectionStatus = async () => {
  const { qalam_extension_token: token } = await chrome.storage.local.get(["qalam_extension_token"])
  if (!token) return { connected: false, error: "extension_auth_required" }

  try {
    const response = await fetch(`${QALAM_ORIGIN}/api/extension/comments`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (response.status === 401) {
      await chrome.storage.local.remove("qalam_extension_token")
      return { connected: false, error: "extension_auth_required" }
    }
    const data = await response.json().catch(() => ({}))
    if (!response.ok) return { connected: false, error: data.error || "connection_check_failed" }
    return { connected: true, plan: data.plan, remaining: data.remaining, limit: data.limit }
  } catch {
    return { connected: false, error: "network_error" }
  }
}

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
  if (message.type === "qalam:connection-status") {
    readConnectionStatus().then(respond)
    return true
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
      const data = await response.json().catch(() => ({ error: "extension_service_unavailable" }))
      if (response.status === 401) await chrome.storage.local.remove("qalam_extension_token")
      respond(data)
    } catch {
      respond({ error: "network_error" })
    }
  })
  return true
})
