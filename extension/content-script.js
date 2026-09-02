/* global chrome */

const cleanText = (value) => value.replace(/\s+/g, " ").trim()
const POST_CARD_SELECTORS = [
  "article",
  ".feed-shared-update-v2",
  '[data-view-name="feed-full-update"]',
  '[data-view-name="feed-update"]',
].join(", ")
const POST_TEXT_SELECTORS = [
  ".feed-shared-update-v2__description",
  ".update-components-text",
  '[data-test-id="main-feed-activity-card__commentary"]',
].join(", ")
const getPostText = (post) => cleanText(post.querySelector(POST_TEXT_SELECTORS)?.innerText || post.innerText || "")
const getPostCards = () => Array.from(document.querySelectorAll(POST_CARD_SELECTORS))
  .filter((post) => !post.parentElement?.closest(POST_CARD_SELECTORS))
const showMessage = (panel, message, isError = false) => {
  const notice = panel.querySelector(".qalam-li-message") || document.createElement("p")
  notice.className = "qalam-li-message"
  notice.textContent = message
  notice.dataset.error = isError ? "true" : "false"
  notice.setAttribute("role", "status")
  panel.appendChild(notice)
}
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
  panel.setAttribute("aria-live", "polite")
  panel.setAttribute("aria-label", "Qalam comment drafts")
  panel.innerHTML = "<strong>Draft a comment with Qalam</strong><p>Choose a style to get three drafts for this post. You review the text before anything is posted.</p>"
  ;["insightful", "supportive", "engaging"].forEach((style) => {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "qalam-li-style"
    button.textContent = style[0].toUpperCase() + style.slice(1)
    button.addEventListener("click", () => {
      panel.querySelectorAll(".qalam-li-style").forEach((node) => { node.disabled = true })
      button.textContent = "Generating..."
      chrome.runtime.sendMessage({ type: "qalam:generate", postText, style }, (result) => {
        panel.querySelectorAll(".qalam-li-style").forEach((node) => { node.disabled = false })
        button.textContent = style[0].toUpperCase() + style.slice(1)
        if (chrome.runtime.lastError) {
          showMessage(panel, "Qalam could not reach the extension. Reload LinkedIn and try again.", true)
          return
        }
        if (result?.error === "extension_auth_required") {
          showMessage(panel, "Your connection code expired. Opening Qalam to reconnect.", true)
          chrome.runtime.sendMessage({ type: "qalam:open-connect" })
          return
        }
        if (result?.error) {
          showMessage(panel, result.message || "Qalam could not generate comments. Please try again.", true)
          return
        }
        if (!Array.isArray(result?.comments) || !result.comments.length) {
          showMessage(panel, "Qalam did not return any comments. Please try again.", true)
          return
        }
        panel.querySelectorAll(".qalam-result").forEach((node) => node.remove())
        result.comments.forEach((comment) => {
          const choice = document.createElement("button")
          choice.type = "button"
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
        showMessage(panel, "Choose a comment to insert it into the open LinkedIn comment box.")
      })
    })
    panel.appendChild(button)
  })
  const writer = document.createElement("button")
  writer.className = "qalam-primary"
  writer.type = "button"
  writer.textContent = "Open in Qalam Writer"
  writer.addEventListener("click", () => chrome.runtime.sendMessage({ type: "qalam:open-writer", postText }))
  panel.appendChild(writer)
  article.appendChild(panel)
}
const hydrate = () => getPostCards().forEach((article) => {
  if (article.dataset.qalamReady) return
  const postText = getPostText(article)
  if (postText.length < 40) return
  article.dataset.qalamReady = "true"
  const trigger = document.createElement("button")
  trigger.className = "qalam-li-trigger"
  trigger.type = "button"
  trigger.textContent = "Draft a comment with Qalam"
  trigger.setAttribute("aria-label", "Draft a comment with Qalam")
  trigger.addEventListener("click", () => showPanel(article, postText.slice(0, 5000)))
  const target = article.querySelector('.feed-shared-social-actions, [data-view-name="feed-actions"], .social-details-social-counts')
  if (target?.parentElement) target.parentElement.appendChild(trigger)
  else article.appendChild(trigger)
})
new MutationObserver(hydrate).observe(document.documentElement, { childList: true, subtree: true })
hydrate()
