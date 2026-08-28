/* global chrome */

const status = document.querySelector("#status")
const refreshStatus = () => {
  chrome.runtime.sendMessage({ type: "qalam:connection-status" }, (result) => {
    if (chrome.runtime.lastError) {
      status.textContent = "Could not check your Qalam connection. Try again."
      return
    }
    if (!result?.connected) {
      status.textContent = result?.error === "network_error" ? "Connection check failed. Check your internet and try again." : "Not connected. Generate a new connection code in Qalam."
      return
    }
    const allowance = result.limit === "unlimited" ? "Unlimited comments available." : `${result.remaining} of ${result.limit} comment sets remaining.`
    status.textContent = `Connected. ${allowance}`
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
