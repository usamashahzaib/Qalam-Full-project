"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"

type Conversation = {
  id: string
  title: string
  updated_at: string
}

type Message = {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  created_at: string
}

export default function ChatWorkspace() {
  const { state, saveDraft } = useWorkspace()
  const workspaceId = (state as { agency?: { activeClientId?: string | null } })?.agency?.activeClientId || ""
  const workspaceQuery = useMemo(
    () => (workspaceId ? `?workspaceKey=${encodeURIComponent(workspaceId)}` : ""),
    [workspaceId]
  )
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [draftStatus, setDraftStatus] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")

  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    setActiveConvId(null)
    setMessages([])

    fetch(`/api/chat/conversations${workspaceQuery}`)
      .then(res => res.json())
      .then(data => {
        if (!active) return
        const nextConversations = Array.isArray(data.conversations) ? data.conversations : []
        setConversations(nextConversations)
        setActiveConvId(nextConversations[0]?.id ?? null)
      })
      .catch(() => {
        if (!active) return
        setConversations([])
      })

    return () => {
      active = false
    }
  }, [workspaceQuery])

  useEffect(() => {
    if (!activeConvId) {
      setMessages([])
      return
    }
    fetch(`/api/chat/messages?conversationId=${activeConvId}`)
      .then(res => res.json())
      .then(data => {
        if (data.messages) {
          setMessages(data.messages)
        }
      })
  }, [activeConvId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const createConversation = async () => {
    setIsCreating(true)
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Conversation", workspaceKey: workspaceId || undefined })
      })
      const data = await res.json()
      if (data.conversation) {
        setConversations(prev => [data.conversation, ...prev])
        setActiveConvId(data.conversation.id)
        setMessages([])
      }
    } finally {
      setIsCreating(false)
    }
  }

  const startRename = (conversation: Conversation) => {
    setRenamingId(conversation.id)
    setRenameValue(conversation.title)
  }

  const saveRename = async () => {
    const title = renameValue.trim()
    if (!renamingId || !title) {
      setRenamingId(null)
      return
    }
    const res = await fetch("/api/chat/conversations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: renamingId, title }),
    })
    const data = await res.json()
    if (data.conversation) {
      setConversations((prev) => prev.map((item) => item.id === renamingId ? data.conversation : item))
    }
    setRenamingId(null)
    setRenameValue("")
  }

  const deleteConversation = async (conversationId: string) => {
    if (!window.confirm("Delete this conversation?")) return
    await fetch(`/api/chat/conversations?conversationId=${encodeURIComponent(conversationId)}`, { method: "DELETE" })
    const nextConversations = conversations.filter((item) => item.id !== conversationId)
    setConversations(nextConversations)
    if (activeConvId === conversationId) {
      setActiveConvId(nextConversations[0]?.id || null)
      setMessages([])
    }
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || !activeConvId) return

    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, { id: tempId, role: "user", content: text, created_at: new Date().toISOString() }])
    setInput("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeConvId, content: text })
      })
      const data = await res.json()
      if (data.message) {
        setMessages(prev => [...prev, data.message])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const convertToDraft = useCallback(async (content: string) => {
    setDraftStatus("Saving...")
    try {
      const id = await saveDraft({ title: "From AI Chat", content, type: "LinkedIn - Text post" })
      setDraftStatus(id ? "Saved to drafts" : "Saved")
    } catch {
      setDraftStatus("Failed to save draft")
    } finally {
      setTimeout(() => setDraftStatus(null), 3000)
    }
  }, [saveDraft])

  return (
    <div className="mx-auto flex h-[calc(100vh-80px)] max-w-7xl overflow-hidden px-4 py-6 sm:px-6">
      <div className="flex w-72 flex-col rounded-l-2xl border-y border-l border-zinc-200 bg-zinc-50">
        <div className="border-b border-zinc-200 p-4">
          <button
            onClick={createConversation}
            disabled={isCreating}
            className="w-full rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-600 disabled:opacity-50"
          >
            {isCreating ? "Creating..." : "+ New Chat"}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {conversations.length === 0 ? (
            <p className="text-center text-xs text-zinc-500 mt-10">No conversations yet.</p>
          ) : (
            conversations.map(conv => (
              <div key={conv.id} className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${activeConvId === conv.id ? "border-zinc-200 bg-white shadow-sm" : "border-transparent text-zinc-600 hover:border-zinc-200 hover:bg-zinc-200/30"}`}>
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => setActiveConvId(conv.id)} className="min-w-0 flex-1 text-left">
                    {renamingId === conv.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={saveRename}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRename()
                          if (e.key === "Escape") setRenamingId(null)
                        }}
                        className="w-full rounded border border-zinc-200 px-2 py-1 text-sm text-zinc-900 outline-none focus:border-teal"
                      />
                    ) : (
                      <>
                        <div className="truncate font-medium text-zinc-900">{conv.title}</div>
                        <div className="text-[10px] text-zinc-400 mt-1">{new Date(conv.updated_at).toLocaleDateString()}</div>
                      </>
                    )}
                  </button>
                  <div className="flex shrink-0 items-center gap-2 pt-0.5">
                    <button onClick={() => startRename(conv)} className="cursor-pointer text-[10px] font-semibold text-zinc-400 hover:text-zinc-700">Edit</button>
                    <button onClick={() => deleteConversation(conv.id)} className="cursor-pointer text-[10px] font-semibold text-zinc-400 hover:text-red-500">Delete</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col rounded-r-2xl border border-zinc-200 bg-white">
        {!activeConvId ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-zinc-500">Select or create a conversation to start chatting.</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-4 rounded-full bg-teal/10 p-4 text-teal">
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                  </div>
                  <h3 className="font-semibold text-zinc-900">AI Strategist</h3>
                  <p className="mt-1 text-sm text-zinc-500 max-w-sm">Ask for a post, a sharper angle, or the next action. Replies stay short.</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-5 py-3.5 shadow-sm ${msg.role === 'user' ? 'bg-zinc-900 text-white' : 'border border-zinc-200 bg-zinc-50 text-zinc-900'}`}>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                      {msg.role === 'assistant' && (
                        <div className="mt-3 flex items-center justify-end border-t border-zinc-200/80 pt-2">
                          <button onClick={() => convertToDraft(msg.content)} className="cursor-pointer text-[10px] font-bold uppercase tracking-wider text-teal hover:text-teal-700 transition-colors">
                            Convert to Draft {"->"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-zinc-500 shadow-sm">
                    <span className="flex gap-1.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: '0.15s' }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: '0.3s' }} />
                    </span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-zinc-200 p-4">
              <div className="relative flex items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm focus-within:border-teal/50 focus-within:ring-4 focus-within:ring-teal/10">
                <textarea
                  value={input}
                  onChange={e => {
                    setInput(e.target.value)
                    e.target.style.height = "auto"
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`
                  }}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !isLoading) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder="Ask the AI for a post idea..."
                  className="max-h-32 min-h-[44px] w-full resize-none bg-transparent py-3 pl-3 text-sm text-zinc-900 outline-none"
                  rows={1}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal text-white transition-all hover:bg-teal-600 disabled:opacity-50"
                >
                  <svg className="h-4 w-4 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] text-zinc-400">Enter = new line. Ctrl+Enter (or ⌘+Enter) to send.</p>
              {draftStatus && (
                <p className={`mt-1 text-center text-[10px] font-semibold ${
                  draftStatus.includes("Failed") ? "text-red-500" :
                  draftStatus.includes("Saved") ? "text-emerald-600" : "text-zinc-400"
                }`}>{draftStatus}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
