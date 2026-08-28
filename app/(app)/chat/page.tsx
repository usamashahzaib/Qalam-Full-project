"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { useWorkspace } from "@/components/providers/WorkspaceProvider"
import { usePosts } from "@/lib/hooks/usePosts"
import { LockedFeature } from "@/components/LockedFeature"

function renderMarkdown(text: string) {
  const lines = text.split("\n")
  const elements: React.ReactNode[] = []
  let key = 0

  const parseLine = (line: string): React.ReactNode => {
    // Replace **bold** and *italic*
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>
      if (part.startsWith("*") && part.endsWith("*")) return <em key={i}>{part.slice(1, -1)}</em>
      return part
    })
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) { elements.push(<br key={key++} />); continue }
    const numberedMatch = line.match(/^(\d+)\.\s(.+)/)
    const bulletMatch = line.match(/^[-•]\s(.+)/)
    if (numberedMatch) {
      elements.push(<div key={key++} className="flex gap-2"><span className="shrink-0 font-semibold text-zinc-500">{numberedMatch[1]}.</span><span>{parseLine(numberedMatch[2])}</span></div>)
    } else if (bulletMatch) {
      elements.push(<div key={key++} className="flex gap-2"><span className="shrink-0 text-teal">-</span><span>{parseLine(bulletMatch[1])}</span></div>)
    } else {
      elements.push(<p key={key++} className="leading-relaxed">{parseLine(line)}</p>)
    }
  }
  return <div className="space-y-1 text-sm">{elements}</div>
}

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
  const { activeClientId } = useWorkspace()
  const { saveDraft } = usePosts()
  const workspaceId = activeClientId || ""
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    const previousConversations = conversations
    const previousActiveId = activeConvId
    const previousMessages = messages
    const nextConversations = conversations.filter((item) => item.id !== conversationId)
    setConversations(nextConversations)
    if (activeConvId === conversationId) {
      setActiveConvId(nextConversations[0]?.id || null)
      setMessages([])
    }
    const res = await fetch(`/api/chat/conversations?conversationId=${encodeURIComponent(conversationId)}`, { method: "DELETE" })
    if (!res.ok) {
      setConversations(previousConversations)
      setActiveConvId(previousActiveId)
      setMessages(previousMessages)
    }
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isLoading) return

    const tempId = `temp-${Date.now()}`
    setMessages((prev) => [...prev, { id: tempId, role: "user", content: text, created_at: new Date().toISOString() }])
    setInput("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/strategist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId: activeConvId,
          workspaceKey: workspaceId || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not send message")

      if (data.conversationId && data.conversationId !== activeConvId) {
        setActiveConvId(data.conversationId)
        setConversations((prev) => [
          {
            id: data.conversationId,
            title: data.topicName || "New Conversation",
            updated_at: new Date().toISOString(),
          },
          ...prev.filter((item) => item.id !== data.conversationId),
        ])
      } else if (data.topicName) {
        setConversations((prev) =>
          prev.map((item) =>
            item.id === (data.conversationId || activeConvId)
              ? { ...item, title: data.topicName, updated_at: new Date().toISOString() }
              : item
          )
        )
      }

      if (data.message) {
        setMessages((prev) => [...prev, data.message])
      } else if (data.response) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: data.response,
            created_at: new Date().toISOString(),
          },
        ])
      }
    } catch {
      setMessages((prev) => prev.filter((item) => item.id !== tempId))
      setInput(text)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void sendMessage()
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

  const STARTER_PROMPTS = [
    "Write a thought leadership post for LinkedIn",
    "Give me 3 hook ideas for my next post",
    "Help me reframe this idea with more authority",
    "What should I post about this week?",
  ]

  const handleStarterPrompt = (prompt: string) => {
    setInput(prompt)
  }

  return (
    <LockedFeature feature="AI Strategist" requiredPlan="Pro">
    <div className="mx-auto flex h-[calc(100vh-80px)] max-w-7xl overflow-hidden px-4 py-6 sm:px-6">
      {/* Dark sidebar matches app shell */}
      <div className="flex w-72 flex-col rounded-l-2xl bg-zinc-900">
        <div className="border-b border-zinc-800 px-4 py-4">
          <p className="mb-3 px-1 t-eyebrowst text-zinc-500">AI Strategist</p>
          <button
            onClick={createConversation}
            disabled={isCreating}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal/90 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal disabled:opacity-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            {isCreating ? "Creating..." : "New Chat"}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {conversations.length === 0 ? (
            <div className="mt-6 px-2 text-center">
              <p className="text-xs text-zinc-400">No conversations yet.</p>
              <p className="mt-1 t-eyebrow text-zinc-500">Start a new chat above.</p>
            </div>
          ) : (
            conversations.map(conv => (
              <div key={conv.id} className={`group rounded-xl px-3 py-2.5 text-left text-sm transition-all ${activeConvId === conv.id ? "bg-teal/20 ring-1 ring-teal/30" : "hover:bg-zinc-800"}`}>
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
                        className="w-full rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-sm text-white outline-none focus:border-teal"
                      />
                    ) : (
                      <>
                        <div className={`truncate text-sm font-medium ${activeConvId === conv.id ? "text-white" : "text-zinc-300"}`}>{conv.title}</div>
                        <div className="t-eyebrow text-zinc-400 mt-0.5">{new Date(conv.updated_at).toLocaleDateString()}</div>
                      </>
                    )}
                  </button>
                  <div className="flex shrink-0 items-center gap-1.5 pt-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={() => startRename(conv)} className="cursor-pointer t-eyebrow font-semibold text-zinc-500 hover:text-zinc-300">Edit</button>
                    <button onClick={() => deleteConversation(conv.id)} className="cursor-pointer t-eyebrow font-semibold text-zinc-500 hover:text-red-400">Del</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col rounded-r-2xl border border-zinc-200 bg-white">
        {!activeConvId ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal/10">
              <svg className="h-7 w-7 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            </div>
            <h3 className="text-lg font-bold text-zinc-900">AI Strategist</h3>
            <p className="mt-2 max-w-sm text-sm text-zinc-500">Your content strategist for LinkedIn. Get post ideas, sharper angles, and campaign direction fast.</p>
            <button onClick={createConversation} disabled={isCreating} className="mt-5 rounded-xl bg-teal px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-600 disabled:opacity-50">
              {isCreating ? "Starting..." : "Start a conversation"}
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal/10">
                    <svg className="h-6 w-6 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                  </div>
                  <h3 className="font-bold text-zinc-900">What would you like to work on?</h3>
                  <p className="mt-1.5 text-sm text-zinc-500 max-w-sm">Try one of these or ask anything.</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {STARTER_PROMPTS.map((prompt) => (
                      <button key={prompt} onClick={() => handleStarterPrompt(prompt)} className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-700 shadow-sm transition-all hover:border-teal/30 hover:bg-teal/5 hover:text-teal">
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="mr-3 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal/10">
                        <svg className="h-3.5 w-3.5 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      </div>
                    )}
                    <div className={`max-w-[78%] rounded-2xl px-5 py-3.5 ${msg.role === 'user' ? 'bg-zinc-900 text-white shadow-sm' : 'border border-zinc-200 bg-white text-zinc-900 shadow-sm'}`}>
                      {msg.role === 'assistant' ? renderMarkdown(msg.content) : <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>}
                      {msg.role === 'assistant' && (
                        <div className="mt-3 flex items-center justify-end border-t border-zinc-100 pt-2">
                          <button onClick={() => convertToDraft(msg.content)} className="cursor-pointer t-eyebrowr text-teal transition-colors hover:text-teal-700">
                            Save to drafts
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex items-start justify-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal/10">
                    <svg className="h-3.5 w-3.5 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal/60" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal/60" style={{ animationDelay: '0.15s' }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal/60" style={{ animationDelay: '0.3s' }} />
                    </span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-zinc-100 p-4">
              <div className="flex items-end gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/60 p-2 shadow-sm transition-all focus-within:border-teal/40 focus-within:bg-white focus-within:ring-4 focus-within:ring-teal/8">
                <textarea
                  value={input}
                  onChange={e => {
                    setInput(e.target.value)
                    e.target.style.height = "auto"
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask for a post idea, sharper hook, or strategic angle..."
                  className="max-h-32 min-h-[44px] w-full resize-none bg-transparent py-3 pl-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
                  rows={1}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal text-white shadow-sm transition-all hover:bg-teal-600 disabled:opacity-40 disabled:shadow-none"
                >
                  <svg className="h-4 w-4 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between px-1">
                <p className="t-eyebrow text-zinc-400">Enter to send · Shift+Enter for newline</p>
                {draftStatus && (
                  <p className={`text-xs font-semibold ${
                    draftStatus.includes("Failed") ? "text-red-500" :
                    draftStatus.includes("Saved") ? "text-emerald-600" : "text-zinc-400"
                  }`}>{draftStatus}</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
    </LockedFeature>
  )
}
