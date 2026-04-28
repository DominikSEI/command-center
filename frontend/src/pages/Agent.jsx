import { Bot } from 'lucide-react'
import AgentChat from '../components/AgentChat'

export default function Agent() {
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

      <AgentChat />
    </div>
  )
}
