/* global chrome */

const cleanText = (value) => value.replace(/\s+/g, " ").trim()
const insertIntoComposer = (article, text) => {
  const composer = article.querySelector('[contenteditable="true"][role="textbox"], [contenteditable="true"]')
  if (!composer) return false
  composer.focus()
  document.execCommand("insertText", false, text)
  composer.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }))
  return true
}
const showPanel = (article, postText) => {
  article.querySelector(".qalam-li-panel")?.remove()
  const panel = document.createElement("section")
  panel.className = "qalam-li-panel"
  panel.innerHTML = "<strong>Qalam comment assistant</strong><p>Choose a style. Qalam creates three options. Nothing posts automatically.</p>"
  ;["insightful", "supportive", "engaging"].forEach((style) => {
    const button = document.createElement("button")
    button.textContent = style[0].toUpperCase() + style.slice(1)
    button.addEventListener("click", () => {
      button.textContent = "Generating..."
      chrome.runtime.sendMessage({ type: "qalam:generate", postText, style }, (result) => {
        if (result?.error === "extension_auth_required") { chrome.runtime.sendMessage({ type: "qalam:open-connect" }); return }
        if (result?.error) { panel.insertAdjacentHTML("beforeend", `<p>Qalam could not generate this comment. ${result.error}</p>`); return }
        panel.querySelectorAll(".qalam-result").forEach((node) => node.remove())
        result.comments.forEach((comment) => {
          const choice = document.createElement("button")
          choice.className = "qalam-result"
          choice.textContent = comment.text
          choice.addEventListener("click", () => {
            if (!insertIntoComposer(article, comment.text)) {
              navigator.clipboard.writeText(comment.text)
                .then(() => { choice.textContent = "Copied. Open a LinkedIn comment box to paste." })
                .catch(() => { choice.textContent = "Open a LinkedIn comment box, then copy this text manually." })
            }
          })
          panel.appendChild(choice)
        })
        button.textContent = style[0].toUpperCase() + style.slice(1)
      })
    })
    panel.appendChild(button)
  })
  const writer = document.createElement("button")
  writer.className = "qalam-primary"
  writer.textContent = "Open in Qalam Writer"
  writer.addEventListener("click", () => chrome.runtime.sendMessage({ type: "qalam:open-writer", postText }))
  panel.appendChild(writer)
  article.appendChild(panel)
}
const hydrate = () => document.querySelectorAll("article").forEach((article) => {
  if (article.dataset.qalamReady) return
  const postText = cleanText(article.innerText || "")
  if (postText.length < 40) return
  article.dataset.qalamReady = "true"
  const trigger = document.createElement("button")
  trigger.className = "qalam-li-trigger"
  trigger.type = "button"
  trigger.textContent = "Generate with Qalam"
  trigger.addEventListener("click", () => showPanel(article, postText.slice(0, 5000)))
  article.appendChild(trigger)
})
new MutationObserver(hydrate).observe(document.documentElement, { childList: true, subtree: true })
hydrate()
