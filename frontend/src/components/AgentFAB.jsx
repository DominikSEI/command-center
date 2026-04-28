import { useState, useEffect } from 'react'
import { Bot, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import AgentChat from './AgentChat'

export default function AgentFAB() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  // Esc closes panel — hook must be before conditional return
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // No FAB on the full Agent page — would be two chats at once
  if (location.pathname === '/agent') return null

  return (
    <>
      {/* ── Panel ────────────────────────────────────────────────
          Always mounted so AgentChat state (conversation) persists
          across route changes. Hidden via CSS, not unmounted.     */}
      <div
        className={`
          fixed z-40 flex flex-col overflow-hidden
          border border-surface-border
          transition-all duration-300 ease-out
          bottom-0 left-0 right-0 h-[75vh] rounded-t-2xl
          sm:bottom-24 sm:right-6 sm:left-auto sm:w-[420px] sm:h-[600px] sm:rounded-2xl
          ${open
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-6 pointer-events-none'}
        `}
        style={{
          background: 'var(--bg-card)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
        }}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' }}
            >
              <Bot size={14} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-none">Agent</p>
              <p className="text-[10px] text-gray-500 mt-0.5">claude-sonnet-4-6</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-surface-hover"
            aria-label="Panel schließen"
          >
            <X size={16} />
          </button>
        </div>

        <AgentChat compact />
      </div>

      {/* ── FAB button ─────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed z-50 bottom-6 right-6 w-14 h-14 rounded-full
                   flex items-center justify-center
                   transition-all duration-200 hover:scale-110 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
          boxShadow: '0 4px 20px rgba(139,92,246,0.5)',
        }}
        aria-label={open ? 'Agent schließen' : 'Agent öffnen'}
      >
        {open
          ? <X   size={22} className="text-white" />
          : <Bot size={22} className="text-white" />}
      </button>
    </>
  )
}
