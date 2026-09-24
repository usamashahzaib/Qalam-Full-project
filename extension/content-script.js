/* global chrome */

const cleanText = (value) => value.replace(/\s+/g, " ").trim()
const POST_CARD_SELECTORS = [
  "article",
  ".feed-shared-update-v2",
  '[data-view-name="feed-full-update"]',
  '[data-view-name="feed-update"]',
].join(", ")
// Matches the server budget in lib/prompts/builders/comment.ts. Sending more
// is rejected with a 400 the person cannot act on.
const POST_TEXT_BUDGET = 5000
const POST_TEXT_SELECTORS = [
  ".feed-shared-update-v2__description",
  ".update-components-text",
  ".feed-shared-inline-show-more-text",
  '[data-test-id="main-feed-activity-card__commentary"]',
].join(", ")
// Everything inside a post card that is not the post: the author header, the
// reaction bar, the comment thread, and our own injected UI. LinkedIn renames
// classes often, so the fallback below strips these rather than trusting that
// one commentary selector still matches.
const POST_NOISE_SELECTORS = [
  ".update-components-actor",
  ".feed-shared-actor",
  ".update-components-header",
  ".social-details-social-counts",
  ".feed-shared-social-actions",
  '[data-view-name="feed-actions"]',
  ".comments-comments-list",
  ".comments-comment-item",
  ".comments-comment-box",
  ".social-details-social-activity",
  ".qalam-li-panel",
  ".qalam-li-trigger",
  "button",
  '[role="button"]',
  // A detached clone is not rendered, so innerText degrades to textContent and
  // would otherwise pick up screen-reader-only and hidden strings.
  '[aria-hidden="true"]',
  ".visually-hidden",
  ".a11y-text",
  "script",
  "style",
].join(", ")
// LinkedIn appends its truncation affordance to the commentary text itself.
const ELLIPSIS = String.fromCharCode(0x2026)
const READ_MORE = new RegExp(`(?:${ELLIPSIS}|\\.\\.\\.)?\\s*see more\\s*$`, "i")
const stripReadMore = (value) => value.replace(READ_MORE, "").trim()
// Clone so the visible page is never mutated, drop the subtrees that are not
// the post, then read innerText. The clone is parked offscreen rather than
// hidden because innerText needs a rendered node: that keeps paragraph breaks
// as whitespace and keeps LinkedIn's own CSS hiding its screen-reader text.
const readCleanText = (node) => {
  if (!node) return ""
  const clone = node.cloneNode(true)
  clone.querySelectorAll(POST_NOISE_SELECTORS).forEach((child) => child.remove())
  clone.style.position = "fixed"
  clone.style.left = "-99999px"
  clone.style.top = "0"
  clone.setAttribute("aria-hidden", "true")
  // Without this the clone looks like a real post card to hydrate().
  clone.setAttribute("data-qalam-clone", "true")
  document.body.appendChild(clone)
  const text = cleanText(clone.innerText || "")
  clone.remove()
  return text
}
const readCommentary = (post) => readCleanText(post.querySelector(POST_TEXT_SELECTORS))
// Only reached when no commentary selector matches, after LinkedIn renames a
// class. Reading the whole card is what used to leak the author header, the
// reaction counts and every loaded comment into the prompt.
const readCardFallback = (post) => readCleanText(post)
const getPostText = (post) => {
  const commentary = stripReadMore(readCommentary(post))
  const text = commentary || stripReadMore(readCardFallback(post))
  return text.slice(0, POST_TEXT_BUDGET)
}
const getPostCards = () => Array.from(document.querySelectorAll(POST_CARD_SELECTORS))
  .filter((post) => !post.parentElement?.closest(POST_CARD_SELECTORS))
  .filter((post) => !post.closest("[data-qalam-clone]"))
// Every failure code the extension can receive, from the API route and from
// the service worker's own fetch handling. Without this table the panel told
// someone who had run out of comment sets to "please try again", which they
// did, repeatedly, to the same result.
const ERROR_MESSAGES = {
  plan_expired: "Your Qalam plan has ended. Renew it to keep drafting comments.",
  monthly_limit_reached: "You have used every comment set in your plan this month.",
  workspace_access_revoked: "This browser is connected to a Qalam account that no longer has workspace access. Ask your workspace owner, or reconnect.",
  comment_quota_unavailable: "Qalam could not read your comment allowance just now. Try again in a moment.",
  ai_unavailable: "Qalam could not reach the writing model. Try again in a moment.",
  extension_service_unavailable: "Qalam is not responding right now. Try again in a moment.",
  network_error: "Qalam could not be reached. Check your connection and try again.",
  connection_check_failed: "Qalam could not confirm this connection. Try again in a moment.",
}
const describeError = (result) => {
  if (result?.error === "monthly_limit_reached" && typeof result.limit === "number") {
    return `You have used all ${result.limit} comment sets in your plan this month.`
  }
  return result?.message || ERROR_MESSAGES[result?.error] || "Qalam could not generate comments. Please try again."
}
// A dead end with no way out is what makes a quota error feel punitive, so the
// codes a person can actually resolve carry the action that resolves them.
const ERROR_ACTIONS = {
  monthly_limit_reached: { label: "See plans", message: "qalam:open-upgrade" },
  plan_expired: { label: "Renew plan", message: "qalam:open-upgrade" },
  workspace_access_revoked: { label: "Reconnect Qalam", message: "qalam:open-connect" },
}
const showMessage = (panel, message, isError = false, action = null) => {
  panel.querySelector(".qalam-li-action")?.remove()
  const notice = panel.querySelector(".qalam-li-message") || document.createElement("p")
  notice.className = "qalam-li-message"
  notice.textContent = message
  notice.dataset.error = isError ? "true" : "false"
  notice.setAttribute("role", "status")
  panel.appendChild(notice)
  if (!action) return
  const button = document.createElement("button")
  button.type = "button"
  button.className = "qalam-li-action qalam-primary"
  button.textContent = action.label
  button.addEventListener("click", () => chrome.runtime.sendMessage({ type: action.message }))
  panel.appendChild(button)
}
// On most posts LinkedIn has not rendered a comment box yet, so inserting used
// to fall back to the clipboard and ask the reader to go find one. Open it for
// them first and the insert path works on the common case.
const COMMENT_BUTTON_SELECTORS = [
  'button[aria-label*="comment" i]',
  '[role="button"][aria-label*="comment" i]',
].join(", ")
const findComposer = (article) => article.querySelector('[contenteditable="true"][role="textbox"], [contenteditable="true"]')
const openComposer = (article) => {
  if (findComposer(article)) return Promise.resolve(true)
  const button = article.querySelector(COMMENT_BUTTON_SELECTORS)
  if (!button) return Promise.resolve(false)
  button.click()
  // LinkedIn mounts the box asynchronously. Give it a second, then give up
  // quietly and let the clipboard path take over.
  return new Promise((done) => {
    let tries = 0
    const poll = () => {
      if (findComposer(article)) return done(true)
      if (tries++ > 20) return done(false)
      setTimeout(poll, 50)
    }
    poll()
  })
}
const insertIntoComposer = (article, text) => {
  const composer = findComposer(article)
  if (!composer) return false
  composer.focus()
  // execCommand already fires a trusted input event. Dispatching a second,
  // synthetic one made rich editors such as Quill apply the same insertion
  // twice. Only fall back to the synthetic event if the command did not run.
  const inserted = document.execCommand("insertText", false, text)
  if (!inserted) {
    composer.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }))
  }
  return true
}
const showPanel = (article, postText) => {
  article.querySelector(".qalam-li-panel")?.remove()
  const panel = document.createElement("section")
  panel.className = "qalam-li-panel"
  panel.setAttribute("aria-live", "polite")
  panel.setAttribute("aria-label", "Qalam comment drafts")
  panel.innerHTML = "<strong>Draft a comment with Qalam</strong><p>Choose a style to get three drafts for this post. You review the text before anything is posted.</p>"
  const close = document.createElement("button")
  close.type = "button"
  close.className = "qalam-li-close"
  close.textContent = "Close"
  close.setAttribute("aria-label", "Close Qalam comment drafts")
  close.addEventListener("click", () => panel.remove())
  panel.appendChild(close)
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
          showMessage(panel, describeError(result), true, ERROR_ACTIONS[result.error] || null)
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
          choice.addEventListener("click", async () => {
            await openComposer(article)
            if (insertIntoComposer(article, comment.text)) {
              showMessage(panel, "Draft inserted. Edit it however you like, then post it yourself.")
              return
            }
            navigator.clipboard.writeText(comment.text)
              .then(() => { choice.textContent = "Copied. Paste it into a LinkedIn comment box." })
              .catch(() => { choice.textContent = "Select this text and copy it manually." })
          })
          panel.appendChild(choice)
        })
        showMessage(panel, "Choose a draft. Qalam opens the comment box and inserts it for you to edit.")
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
  // Ask up front. Otherwise someone who is not connected picks a style, waits
  // for a generation that was never going to happen, and only then finds out.
  chrome.runtime.sendMessage({ type: "qalam:connection-status" }, (status) => {
    if (chrome.runtime.lastError || status?.connected) return
    panel.querySelectorAll(".qalam-li-style").forEach((node) => { node.disabled = true })
    const unconfigured = !status?.error || status.error === "extension_auth_required"
    showMessage(
      panel,
      unconfigured ? "Connect this browser to Qalam to draft comments." : describeError(status),
      true,
      { label: "Connect Qalam", message: "qalam:open-connect" }
    )
  })
}
// The old dedupe flag lived on the card while the button lived in the actions
// bar, a different subtree. When LinkedIn re-rendered that bar the button was
// destroyed and the flag survived, so the card was skipped forever and the
// button never came back. Ask whether the button is actually there instead.
//
// Cards that are too short are remembered by their text length rather than a
// plain flag, so a post whose body loads late is re-evaluated, while a settled
// card costs one textContent read instead of a clone and a layout pass.
const alreadyHandled = (article) => {
  if (article.querySelector(".qalam-li-trigger")) return true
  return article.dataset.qalamSkip === String(article.textContent?.length || 0)
}
const hydrate = () => getPostCards().forEach((article) => {
  if (alreadyHandled(article)) return
  if (getPostText(article).length < 40) {
    article.dataset.qalamSkip = String(article.textContent?.length || 0)
    return
  }
  delete article.dataset.qalamSkip
  const trigger = document.createElement("button")
  trigger.className = "qalam-li-trigger"
  trigger.type = "button"
  trigger.textContent = "Draft a comment with Qalam"
  trigger.setAttribute("aria-label", "Draft a comment with Qalam")
  // Read the post at click time: by then the reader may have expanded a
  // truncated post, and that fuller text is what they expect a reply to.
  trigger.addEventListener("click", () => showPanel(article, getPostText(article)))
  const target = article.querySelector('.feed-shared-social-actions, [data-view-name="feed-actions"], .social-details-social-counts')
  if (target?.parentElement) target.parentElement.appendChild(trigger)
  else article.appendChild(trigger)
})
// LinkedIn rewrites its feed on almost every scroll frame. Running a
// full-document scan per mutation record made the page feel sticky, and the
// nodes hydrate() itself injects fed straight back into the observer. Coalesce
// each burst into a single pass that runs when the browser is idle, and ignore
// mutations that are only our own UI.
// Idle scheduling alone is not enough: between render commits the page is idle,
// so the callback fires almost immediately and the scan rate barely drops. The
// floor below is what actually throttles it. A card entering the viewport waits
// at most this long for its button, which is not perceptible.
const MIN_PASS_INTERVAL = 300
let scheduled = false
let lastPass = 0
const scheduleHydrate = () => {
  if (scheduled) return
  scheduled = true
  const run = () => { scheduled = false; lastPass = Date.now(); hydrate() }
  setTimeout(() => {
    if (typeof requestIdleCallback === "function") requestIdleCallback(run, { timeout: 600 })
    else run()
  }, Math.max(0, MIN_PASS_INTERVAL - (Date.now() - lastPass)))
}
const isOwnNode = (node) => node.nodeType === 1 && Boolean(
  node.closest?.("[data-qalam-clone], .qalam-li-panel") ||
  node.classList?.contains("qalam-li-trigger") ||
  node.classList?.contains("qalam-li-panel")
)
const onMutations = (records) => {
  for (const record of records) {
    if (!record.addedNodes.length) continue
    if (Array.from(record.addedNodes).every(isOwnNode)) continue
    scheduleHydrate()
    return
  }
}
// Observed at the document root rather than the feed container: LinkedIn swaps
// the whole main region on client-side navigation, and a scoped observer would
// silently die attached to the detached node. The debounce above is what makes
// the wide scope affordable.
new MutationObserver(onMutations).observe(document.documentElement, { childList: true, subtree: true })
hydrate()
