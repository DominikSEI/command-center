import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, Zap } from 'lucide-react'

const TOOL_LABELS = {
  // Read
  get_dashboard_status:  'Dashboard-Status',
  get_tracker_projects:  'Tracker-Projekte',
  get_vps_metrics:       'VPS-Metriken',
  get_latest_briefing:   'Briefing',
  // Write
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

export default function Agent() {
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text) {
    const userMsg = (text ?? input).trim()
    if (!userMsg || loading) return
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
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
        buffer = lines.pop() // retain incomplete last line

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

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="px-6 py-5 border-b border-surface-border shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' }}
          >
            <Bot size={16} className="text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-[15px] text-white">Agent</h1>
            <p className="text-xs text-gray-500">claude-sonnet-4-6 · Zugriff auf Dashboard-Daten</p>
          </div>
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-16">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center opacity-30"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' }}
            >
              <Bot size={22} className="text-white" />
            </div>
            <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
              Frag mich nach Projekt-Status, offenen Tasks, VPS-Metriken oder dem letzten Briefing.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-1">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-surface-border text-gray-400
                             hover:text-white hover:border-accent/40 transition-all duration-150"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>

            {/* Avatar */}
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={msg.role === 'assistant'
                ? { background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' }
                : { background: 'var(--bg-raised)' }}
            >
              {msg.role === 'user'
                ? <User size={13} className="text-gray-400" />
                : <Bot  size={13} className="text-white" />}
            </div>

            <div className={`flex flex-col gap-1.5 max-w-[80%] ${msg.role === 'user' ? 'items-end' : ''}`}>

              {/* Tool call pills */}
              {msg.tools?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {msg.tools.map((tool, ti) => (
                    <span
                      key={ti}
                      className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md
                                 text-purple-400 border border-purple-500/20 bg-purple-500/5"
                    >
                      <Zap size={9} />
                      {TOOL_LABELS[tool] ?? tool}
                    </span>
                  ))}
                </div>
              )}

              {/* Bubble */}
              {(msg.content || msg.streaming) && (
                <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-surface-raised text-gray-200 rounded-tr-sm'
                    : msg.error
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20 rounded-tl-sm'
                    : 'bg-surface-card border border-surface-border text-gray-200 rounded-tl-sm'
                }`}>
                  {msg.content}
                  {msg.streaming && !msg.content && (
                    <Loader2 size={13} className="animate-spin text-gray-500 inline" />
                  )}
                  {msg.streaming && msg.content && (
                    <span className="inline-block w-0.5 h-4 bg-accent ml-0.5 animate-pulse align-text-bottom" />
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ──────────────────────────────────────── */}
      <div className="px-6 pb-6 pt-3 shrink-0 border-t border-surface-border">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            placeholder="Nachricht… (Enter senden, Shift+Enter Zeilenumbruch)"
            rows={1}
            disabled={loading}
            className="flex-1 resize-none input py-2.5 text-sm disabled:opacity-50"
            style={{ minHeight: '42px', maxHeight: '120px' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="btn-primary px-3 py-2.5 shrink-0
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
          >
            {loading
              ? <Loader2 size={16} className="animate-spin" />
              : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}
