import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, Zap } from 'lucide-react'

const TOOL_LABELS = {
  get_dashboard_status:  'Dashboard-Status',
  get_tracker_projects:  'Tracker-Projekte',
  get_vps_metrics:       'VPS-Metriken',
  get_latest_briefing:   'Briefing',
  tracker_todo_set_done: 'Todo abhaken',
  task_create:           'Task erstellen',
  task_update:           'Task aktualisieren',
  idea_create:           'Idee speichern',
  note_create:           'Notiz speichern',
}

const SUGGESTIONS = [
  'Wie laufen meine Projekte?',
  'VPS-Auslastung?',
  'Was sind meine offenen Tasks?',
  'Zeig mir das letzte Briefing.',
]

const STORAGE_KEY = 'agent_chat_messages'

function loadMessages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    // Normalize: clear any interrupted streaming state from previous session
    return JSON.parse(raw).map(m => ({ ...m, streaming: false }))
  } catch {
    return []
  }
}

// compact=false  →  full-page mode (Agent.jsx)
// compact=true   →  FAB panel mode (AgentFAB.jsx)
export default function AgentChat({ compact = false }) {
  const [messages, setMessages] = useState(loadMessages)
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bottomRef   = useRef(null)
  const textareaRef = useRef(null)

  // Persist messages to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    } catch {}
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text) {
    const userMsg = (text ?? input).trim()
    if (!userMsg || loading) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setLoading(true)

    setMessages(prev => [
      ...prev,
      { role: 'user', content: userMsg },
      { role: 'assistant', content: '', tools: [], streaming: true, error: false },
    ])

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ message: userMsg }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          let data
          try { data = JSON.parse(line.slice(6)) } catch { continue }

          if (data.type === 'tool_call') {
            setMessages(prev => {
              const msgs = [...prev]
              const last = { ...msgs.at(-1) }
              last.tools = [...(last.tools ?? []), data.tool]
              msgs[msgs.length - 1] = last
              return msgs
            })
          } else if (data.type === 'text') {
            setMessages(prev => {
              const msgs = [...prev]
              const last = { ...msgs.at(-1) }
              last.content += data.delta
              msgs[msgs.length - 1] = last
              return msgs
            })
          } else if (data.type === 'done') {
            setMessages(prev => {
              const msgs = [...prev]
              const last = { ...msgs.at(-1), streaming: false }
              msgs[msgs.length - 1] = last
              return msgs
            })
          }
        }
      }
    } catch {
      setMessages(prev => {
        const msgs = [...prev]
        const last = { ...msgs.at(-1), content: 'Verbindungsfehler zum Agent.', streaming: false, error: true }
        msgs[msgs.length - 1] = last
        return msgs
      })
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const px = compact ? 'px-4' : 'px-6'

  return (
    <div className="flex flex-col h-full">

      {/* ── Messages ─────────────────────────────────────────── */}
      <div className={`flex-1 overflow-y-auto ${px} py-3 space-y-4`}>

        {messages.length === 0 && (
          <div className={`flex flex-col items-center justify-center h-full text-center gap-3 ${compact ? 'py-8' : 'py-16'}`}>
            <div
              className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} rounded-2xl flex items-center justify-center opacity-30`}
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' }}
            >
              <Bot size={compact ? 18 : 22} className="text-white" />
            </div>
            <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
              Frag mich nach Projekt-Status, offenen Tasks, VPS-Metriken oder dem letzten Briefing.
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center mt-1">
              {(compact ? SUGGESTIONS.slice(0, 2) : SUGGESTIONS).map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-surface-border text-gray-400
                             hover:text-white hover:border-accent/40 transition-all duration-150"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>

            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={msg.role === 'assistant'
                ? { background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' }
                : { background: 'var(--bg-raised)' }}
            >
              {msg.role === 'user'
                ? <User size={11} className="text-gray-400" />
                : <Bot  size={11} className="text-white" />}
            </div>

            <div className={`flex flex-col gap-1.5 max-w-[85%] ${msg.role === 'user' ? 'items-end' : ''}`}>
              {msg.tools?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {msg.tools.map((tool, ti) => (
                    <span
                      key={ti}
                      className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md
                                 text-purple-400 border border-purple-500/20 bg-purple-500/5"
                    >
                      <Zap size={8} />
                      {TOOL_LABELS[tool] ?? tool}
                    </span>
                  ))}
                </div>
              )}

              {(msg.content || msg.streaming) && (
                <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-surface-raised text-gray-200 rounded-tr-sm'
                    : msg.error
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20 rounded-tl-sm'
                    : 'bg-surface-card border border-surface-border text-gray-200 rounded-tl-sm'
                }`}>
                  {msg.content}
                  {msg.streaming && !msg.content && (
                    <Loader2 size={12} className="animate-spin text-gray-500 inline" />
                  )}
                  {msg.streaming && msg.content && (
                    <span className="inline-block w-0.5 h-3.5 bg-accent ml-0.5 animate-pulse align-text-bottom" />
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ────────────────────────────────────────────── */}
      <div className={`${px} pb-4 pt-2 shrink-0 border-t border-surface-border`}>
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
            }}
            placeholder="Nachricht… (Enter senden)"
            rows={1}
            disabled={loading}
            className="flex-1 resize-none input py-2 text-sm disabled:opacity-50"
            style={{ minHeight: '38px', maxHeight: '100px' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="btn-primary px-3 py-2 shrink-0
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
          >
            {loading
              ? <Loader2 size={15} className="animate-spin" />
              : <Send size={15} />}
          </button>
        </div>
      </div>
    </div>
  )
}
