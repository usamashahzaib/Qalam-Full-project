/* global chrome */

const status = document.querySelector("#status")
chrome.storage.local.get(["qalam_extension_token"], ({ qalam_extension_token: token }) => { if (token) status.textContent = "Connected. Open LinkedIn to use Qalam." })
document.querySelector("#connect").addEventListener("click", () => chrome.runtime.sendMessage({ type: "qalam:open-connect" }))
document.querySelector("#save").addEventListener("click", () => {
  const token = document.querySelector("#code").value.trim()
  if (!token || token.split(".").length !== 2) { status.textContent = "Paste the code from Qalam first."; return }
  chrome.storage.local.set({ qalam_extension_token: token }, () => { status.textContent = "Connected. Open LinkedIn to use Qalam."; document.querySelector("#code").value = "" })
})
document.querySelector("#disconnect").addEventListener("click", () => {
  chrome.storage.local.remove("qalam_extension_token", () => { status.textContent = "Disconnected from this browser." })
})
