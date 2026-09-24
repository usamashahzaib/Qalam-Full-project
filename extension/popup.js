/* global chrome */

const status = document.querySelector("#status")
// Kept in step with ERROR_MESSAGES in content-script.js. A person who cannot
// connect needs to know which of the two things went wrong: the code, or the
// network.
const DISCONNECTED_MESSAGES = {
  extension_auth_required: "Not connected. Generate a new connection code in Qalam and paste it below.",
  network_error: "Could not reach Qalam. Check your internet connection and try again.",
  connection_check_failed: "Qalam could not confirm this connection. Try again in a moment.",
}
const refreshStatus = () => {
  chrome.runtime.sendMessage({ type: "qalam:connection-status" }, (result) => {
    if (chrome.runtime.lastError) {
      status.textContent = "Could not check your Qalam connection. Try again."
      return
    }
    if (!result?.connected) {
      status.textContent = DISCONNECTED_MESSAGES[result?.error] || "Not connected. Generate a new connection code in Qalam."
      return
    }
    if (result.limit === "unlimited") {
      status.textContent = "Connected. Unlimited comment sets on your plan."
      return
    }
    if (result.remaining === 0) {
      status.textContent = `Connected. You have used all ${result.limit} comment sets this month. They reset at the start of next month.`
      return
    }
    status.textContent = `Connected. ${result.remaining} of ${result.limit} comment sets remaining.`
  })
}
refreshStatus()
document.querySelector("#connect").addEventListener("click", () => chrome.runtime.sendMessage({ type: "qalam:open-connect" }))
document.querySelector("#save").addEventListener("click", () => {
  const token = document.querySelector("#code").value.trim()
  if (!token || token.split(".").length !== 2) { status.textContent = "Paste the code from Qalam first."; return }
  chrome.storage.local.set({ qalam_extension_token: token }, () => { document.querySelector("#code").value = ""; refreshStatus() })
})
document.querySelector("#disconnect").addEventListener("click", () => {
  chrome.storage.local.remove("qalam_extension_token", () => { status.textContent = "Disconnected from this browser." })
})
