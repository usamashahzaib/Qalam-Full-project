"use client"

import { useMemo, useState } from "react"

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: string
}

export type ChatConversation = {
  id: string
  name: string
  messages: ChatMessage[]
  createdAt: string
}

type Props = {
  topic: string
  conversationName: string
  conversations: ChatConversation[]
  onConversationsChange: (conversations: ChatConversation[]) => void
}

const now = () => new Date().toISOString()
const uid = () => crypto.randomUUID()
const md = (text: string) => text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1")

export function ChatPanel({ topic, conversationName, conversations, onConversationsChange }: Props) {
  const [activeId, setActiveId] = useState(conversations[0]?.id || "")
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)

  const active = useMemo(() => conversations.find((c) => c.id === activeId) || conversations[0], [activeId, conversations])

  const updateConversation = (conversation: ChatConversation) => {
    const exists = conversations.some((c) => c.id === conversation.id)
    onConversationsChange(exists ? conversations.map((c) => (c.id === conversation.id ? conversation : c)) : [conversation, ...conversations])
    setActiveId(conversation.id)
  }

  const newConversation = () => {
    const name = (topic || conversationName || "New conversation").slice(0, 30)
    updateConversation({ id: uid(), name, messages: [], createdAt: now() })
    setInput("")
  }

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput("")
    setLoading(true)

    const base = active || { id: uid(), name: (topic || conversationName || "Conversation").slice(0, 30), messages: [], createdAt: now() }
    const userMessage: ChatMessage = { id: uid(), role: "user", content: text, createdAt: now() }
    const pending = { ...base, messages: [...base.messages, userMessage] }
    updateConversation(pending)

    try {
      const res = await fetch("/api/strategist/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, topic, history: pending.messages }),
      })
      const data = await res.json().catch(() => ({}))
      const reply = data.reply || data.message || "I could not generate a response."
      updateConversation({
        ...pending,
        messages: [...pending.messages, { id: uid(), role: "assistant", content: String(reply), createdAt: now() }],
      })
    } catch {
      updateConversation({
        ...pending,
        messages: [...pending.messages, { id: uid(), role: "assistant", content: "Chat failed. Try again.", createdAt: now() }],
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-[560px] gap-4 lg:grid-cols-[260px_1fr]">
      <aside className="rounded-2xl border border-zinc-200 bg-white p-3">
        <button onClick={newConversation} className="mb-3 w-full rounded-xl bg-zinc-950 px-3 py-2 text-sm font-semibold text-white">
          New conversation
        </button>
        <div className="space-y-2">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`w-full rounded-xl border px-3 py-2 text-left ${active?.id === c.id ? "border-zinc-950 bg-zinc-50" : "border-zinc-200"}`}
            >
              <div className="truncate text-sm font-semibold">{c.name}</div>
              <div className="text-xs text-zinc-500">{new Date(c.createdAt).toLocaleDateString()} - {c.messages.length} messages</div>
            </button>
          ))}
        </div>
      </aside>

      <section className="flex rounded-2xl border border-zinc-200 bg-white">
        <div className="flex flex-1 flex-col">
          <div className="border-b border-zinc-200 px-5 py-3">
            <div className="text-sm font-semibold">{active?.name || (topic || "Conversation").slice(0, 30)}</div>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {(active?.messages || []).map((m) => (
              <div key={m.id} className={`group flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm ${m.role === "user" ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-900"}`}>
                  <p className="whitespace-pre-wrap">{md(m.content)}</p>
                  <div className="mt-2 flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
                    <span className="text-[11px] opacity-70">{new Date(m.createdAt).toLocaleTimeString()}</span>
                    <button onClick={() => navigator.clipboard.writeText(m.content)} className="text-[11px] underline">Copy</button>
                  </div>
                </div>
              </div>
            ))}
            {loading ? <div className="text-sm text-zinc-500">Thinking...</div> : null}
          </div>
          <div className="border-t border-zinc-200 p-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  void send()
                }
              }}
              rows={3}
              placeholder="Ask for a rewrite, angle, hook, or critique..."
              className="w-full resize-none rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-950"
            />
            <div className="mt-2 flex justify-end">
              <button onClick={send} disabled={loading || !input.trim()} className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
                Send
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
