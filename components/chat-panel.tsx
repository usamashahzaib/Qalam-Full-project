"use client"

import { useState, useEffect, useRef, useCallback } from "react"

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ChatPanelProps {
  initialTopic: string
  onUpdatePost: (newContent: string) => void
}

// ─── Internal types ───────────────────────────────────────────────────────────

type Message = {
  id: string
  role: "user" | "ai"
  content: string
  timestamp: Date
}

type Conversation = {
  id: string
  name: string
  date: string
  messageCount: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

async function copyToClipboard(text: string) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text)
    return
  }
  const el = document.createElement("textarea")
  el.value = text
  document.body.appendChild(el)
  el.select()
  document.execCommand("copy")
  document.body.removeChild(el)
}

const STARTERS = [
  "Give me 3 hook ideas for this topic",
  "Write a LinkedIn post from this topic",
  "What angle would resonate most?",
  "How do I structure this post?",
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-start gap-3">
      <AvatarIcon />
      <div className="rounded-2xl rounded-tl-sm border border-zinc-200 bg-white px-4 py-3.5 shadow-sm">
        <span className="flex items-center gap-1.5">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal/60"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  )
}

function AvatarIcon() {
  return (
    <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal/10">
      <svg className="h-3.5 w-3.5 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    </div>
  )
}

function MessageBubble({
  msg,
  onCopy,
  onUseAsPost,
}: {
  msg: Message
  onCopy: (content: string) => void
  onUseAsPost: (content: string) => void
}) {
  const isUser = msg.role === "user"
  const time = msg.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="group relative mb-7 max-w-[78%]">
          <div className="rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-3 text-sm leading-relaxed text-white shadow-sm">
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
          <span className="pointer-events-none absolute -bottom-5 right-0 text-[10px] text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100">
            {time}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3">
      <AvatarIcon />
      <div className="group relative mb-7 flex-1">
        <div className="rounded-2xl rounded-tl-sm border border-zinc-200 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-900 shadow-sm">
          <p className="whitespace-pre-wrap">{msg.content}</p>
          <div className="mt-2.5 flex items-center gap-3 border-t border-zinc-100 pt-2">
            <button
              onClick={() => onCopy(msg.content)}
              className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 transition-colors hover:text-zinc-700"
            >
              Copy
            </button>
            <button
              onClick={() => onUseAsPost(msg.content)}
              className="text-[10px] font-bold uppercase tracking-wider text-teal transition-colors hover:text-teal-700"
            >
              Use as post
            </button>
          </div>
        </div>
        <span className="pointer-events-none absolute -bottom-5 left-0 text-[10px] text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100">
          {time}
        </span>
      </div>
    </div>
  )
}

// ─── ChatPanel ────────────────────────────────────────────────────────────────

export default function ChatPanel({ initialTopic, onUpdatePost }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [conversationName, setConversationName] = useState("")
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [copiedFlash, setCopiedFlash] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-name from initialTopic when name is empty
  useEffect(() => {
    if (initialTopic && !conversationName) {
      setConversationName(initialTopic.slice(0, 30))
    }
  }, [initialTopic, conversationName])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  // Load conversation list on mount
  useEffect(() => {
    fetch("/api/strategist/chat")
      .then((r) => r.json())
      .then((data) => {
        const raw = Array.isArray(data.conversations) ? data.conversations : []
        setConversations(
          raw.map((c: { id: string; title?: string; updated_at?: string }) => ({
            id: c.id,
            name: c.title || "Untitled",
            date: c.updated_at || new Date().toISOString(),
            messageCount: 0,
          }))
        )
      })
      .catch(() => {})
  }, [])

  const loadConversation = useCallback(async (convId: string, convName: string) => {
    setConversationId(convId)
    setConversationName(convName)
    setMessages([])
    try {
      const res = await fetch(`/api/strategist/chat?conversationId=${encodeURIComponent(convId)}`)
      const data = await res.json()
      const raw = Array.isArray(data.messages) ? data.messages : []
      setMessages(
        raw.map((m: { id?: string; role: string; content: string; created_at?: string }) => ({
          id: m.id || uid(),
          role: m.role === "user" ? "user" : "ai",
          content: m.content,
          timestamp: new Date(m.created_at || Date.now()),
        }))
      )
    } catch {}
  }, [])

  const startNewConversation = useCallback(() => {
    setMessages([])
    setInput("")
    setConversationId(null)
    setConversationName(initialTopic ? initialTopic.slice(0, 30) : "")
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [initialTopic])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return

    const userMsg: Message = { id: uid(), role: "user", content: text, timestamp: new Date() }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsLoading(true)

    if (textareaRef.current) textareaRef.current.style.height = "auto"

    try {
      const res = await fetch("/api/strategist/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId: conversationId || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Chat failed")

      // Persist conversation ID returned from the server
      if (data.conversationId) {
        const newName = data.title || conversationName || text.slice(0, 30)
        if (data.conversationId !== conversationId) {
          setConversationId(data.conversationId)
          setConversationName(newName)
          setConversations((prev) => [
            { id: data.conversationId, name: newName, date: new Date().toISOString(), messageCount: 2 },
            ...prev.filter((c) => c.id !== data.conversationId),
          ])
        } else if (data.title) {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === conversationId ? { ...c, name: data.title, date: new Date().toISOString() } : c
            )
          )
        }
      }

      const aiText = String(data.message || data.reply || "")
      if (aiText) {
        setMessages((prev) => [
          ...prev,
          { id: uid(), role: "ai", content: aiText, timestamp: new Date() },
        ])
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "ai",
          content: (err as Error).message || "Something went wrong. Please try again.",
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [input, isLoading, conversationId, conversationName])

  // Enter sends; Shift+Enter inserts newline (browser default — no override needed)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const handleCopy = useCallback(async (content: string) => {
    await copyToClipboard(content)
    setCopiedFlash(true)
    setTimeout(() => setCopiedFlash(false), 1500)
  }, [])

  const handleUseAsPost = useCallback(
    (content: string) => {
      onUpdatePost(content)
    },
    [onUpdatePost]
  )

  return (
    <div className="flex h-[600px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <aside className="flex w-52 shrink-0 flex-col border-r border-zinc-100 bg-zinc-50">
          <div className="border-b border-zinc-100 px-3 py-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Chats</p>
              <button
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
                className="rounded p-0.5 text-zinc-400 transition-colors hover:text-zinc-600"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
            <button
              onClick={startNewConversation}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal/10 py-2 text-xs font-bold text-teal transition-colors hover:bg-teal/20"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              New conversation
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-1.5 px-2 space-y-0.5">
            {conversations.length === 0 ? (
              <p className="mt-6 text-center text-xs text-zinc-400">No history yet.</p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => void loadConversation(conv.id, conv.name)}
                  className={`w-full rounded-xl px-3 py-2.5 text-left text-xs transition-colors ${
                    conversationId === conv.id
                      ? "bg-teal/10 text-teal"
                      : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  <p className="truncate font-semibold">{conv.name}</p>
                  <p className="mt-0.5 text-[10px] text-zinc-400">
                    {new Date(conv.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {conv.messageCount > 0 && ` · ${conv.messageCount} msgs`}
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>
      )}

      {/* ── Main chat ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              className="rounded p-0.5 text-zinc-400 transition-colors hover:text-zinc-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7" />
              </svg>
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-bold text-zinc-900">
              {conversationName || "AI Strategist"}
            </h2>
            <p className="text-[10px] text-zinc-400">Enter to send · Shift+Enter for new line</p>
          </div>
          {copiedFlash && (
            <span className="text-[10px] font-semibold text-teal">Copied!</span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-1">
          {messages.length === 0 && !isLoading ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal/10">
                <svg className="h-6 w-6 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-zinc-900">
                {initialTopic ? `Strategize about "${initialTopic.slice(0, 35)}"` : "Start a conversation"}
              </p>
              <p className="mt-1 text-xs text-zinc-400">Get post ideas, rewrites, angles, or critiques</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setInput(s)
                      textareaRef.current?.focus()
                    }}
                    className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 shadow-sm transition-colors hover:border-teal/30 hover:bg-teal/5 hover:text-teal"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  onCopy={handleCopy}
                  onUseAsPost={handleUseAsPost}
                />
              ))}
              {isLoading && <TypingDots />}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-zinc-100 p-3">
          <div className="flex items-end gap-2 rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-2 shadow-sm transition-all focus-within:border-teal/40 focus-within:bg-white focus-within:ring-4 focus-within:ring-teal/8">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                e.target.style.height = "auto"
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
              }}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={
                initialTopic
                  ? `Ask about "${initialTopic.slice(0, 30)}…"`
                  : "Ask for a rewrite, angle, hook, or critique…"
              }
              className="max-h-[120px] min-h-[40px] flex-1 resize-none bg-transparent py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
            />
            <button
              onClick={() => void handleSend()}
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal text-white shadow-sm transition-all hover:bg-teal-600 disabled:opacity-40"
            >
              <svg className="ml-0.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
