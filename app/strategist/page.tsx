"use client"

import { useEffect, useRef, useState } from "react"

type Conversation = {
  id: string
  title: string
  role_context?: string | null
  updated_at?: string | null
}

type Message = {
  id?: string
  role: "user" | "assistant"
  content: string
  created_at?: string
}

const ROLES = [
  ["general", "General"],
  ["founder", "Founder"],
  ["ceo", "CEO"],
  ["ai_engineer", "AI Engineer"],
  ["hr", "HR"],
  ["sales", "Sales"],
  ["designer", "Designer"],
  ["consultant", "Consultant"],
] as const

export default function StrategistPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [role, setRole] = useState("general")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [status, setStatus] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })

  const loadConversations = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/strategist/chat")
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to load conversations")
      setConversations(Array.isArray(data.conversations) ? data.conversations : [])
    } catch (error) {
      setStatus((error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const loadConversation = async (id: string) => {
    setActiveId(id)
    setStatus("")
    try {
      const res = await fetch(`/api/strategist/chat?conversationId=${encodeURIComponent(id)}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to load conversation")
      setMessages(Array.isArray(data.messages) ? data.messages : [])
      if (data.conversation?.role_context) setRole(data.conversation.role_context)
      setTimeout(scrollToBottom, 0)
    } catch (error) {
      setStatus((error as Error).message)
    }
  }

  useEffect(() => {
    void loadConversations()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isSending])

  const startNewChat = () => {
    setActiveId(null)
    setMessages([])
    setInput("")
    setStatus("New chat ready.")
  }

  const sendMessage = async () => {
    const message = input.trim()
    if (!message || isSending) return

    const optimistic: Message = { role: "user", content: message, created_at: new Date().toISOString() }
    setMessages((prev) => [...prev, optimistic])
    setInput("")
    setIsSending(true)
    setStatus("")

    try {
      const res = await fetch("/api/strategist/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId: activeId, role }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to send message")

      const nextId = data.conversationId as string
      setActiveId(nextId)
      setMessages((prev) => [...prev, data.assistantMessage || { role: "assistant", content: data.message }])
      setConversations((prev) => {
        const existing = prev.find((conv) => conv.id === nextId)
        const next = { id: nextId, title: data.title || existing?.title || "New Chat", role_context: role, updated_at: new Date().toISOString() }
        return [next, ...prev.filter((conv) => conv.id !== nextId)]
      })
    } catch (error) {
      setMessages((prev) => prev.filter((item) => item !== optimistic))
      setInput(message)
      setStatus((error as Error).message)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return
    event.preventDefault()
    void sendMessage()
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid h-[calc(100vh-3rem)] max-w-7xl overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-zinc-200 bg-zinc-50 lg:border-b-0 lg:border-r">
          <div className="border-b border-zinc-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-teal">Strategist</p>
                <h1 className="text-xl font-bold">Qalam Chat</h1>
              </div>
              <button onClick={startNewChat} className="rounded-lg bg-zinc-950 px-3 py-2 text-xs font-bold text-white hover:bg-zinc-800">
                New Chat
              </button>
            </div>
            <label className="mt-4 block">
              <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">Role context</span>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal">
                {ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {isLoading ? (
              <p className="px-3 py-4 text-sm text-zinc-400">Loading conversations...</p>
            ) : conversations.length ? (
              <div className="space-y-1.5">
                {conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => void loadConversation(conversation.id)}
                    className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${activeId === conversation.id ? "border-teal/40 bg-teal/10" : "border-transparent hover:bg-white"}`}
                  >
                    <p className="truncate text-sm font-bold text-zinc-900">{conversation.title || "New Chat"}</p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">{conversation.role_context || "general"}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-zinc-200 bg-white px-3 py-8 text-center text-sm text-zinc-400">No conversations yet.</p>
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col">
          <div className="border-b border-zinc-200 px-5 py-4">
            <h2 className="text-lg font-bold">{activeId ? conversations.find((c) => c.id === activeId)?.title || "Conversation" : "New Chat"}</h2>
            <p className="mt-1 text-sm text-zinc-500">Enter sends. Shift+Enter creates a newline.</p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
            {messages.length ? (
              <div className="mx-auto max-w-3xl space-y-4">
                {messages.map((message, index) => (
                  <div key={message.id || `${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm ${message.role === "user" ? "bg-zinc-950 text-white" : "border border-zinc-200 bg-white text-zinc-800"}`}>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
                {isSending ? (
                  <div className="flex justify-start">
                    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500 shadow-sm">
                      Qalam is typing...
                    </div>
                  </div>
                ) : null}
                <div ref={bottomRef} />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="max-w-md rounded-lg border border-dashed border-zinc-200 px-5 py-10 text-center">
                  <p className="text-lg font-bold text-zinc-800">Ask for strategy, positioning, or post ideas.</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">Your first message creates a titled conversation automatically.</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-zinc-200 bg-white p-4">
            <div className="mx-auto max-w-3xl">
              {status ? <p className="mb-2 rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-700">{status}</p> : null}
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={3}
                  className="min-h-20 flex-1 resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm leading-6 outline-none focus:border-teal"
                />
                <button onClick={() => void sendMessage()} disabled={isSending || !input.trim()} className="rounded-lg bg-teal px-4 py-3 text-sm font-bold text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50">
                  Send
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
