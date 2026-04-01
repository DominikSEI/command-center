import { ExternalLink } from 'lucide-react'

const SIMBA_URL = 'http://207.180.244.172:8080/dashboard.html'

export default function Trading() {
  return (
    <div className="flex flex-col h-screen">
      {/* Status Bar */}
      <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-surface-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500" style={{ boxShadow: '0 0 6px rgba(16,185,129,0.6)' }} />
          <span className="font-semibold text-stone-800 text-sm">SIMBA Bot</span>
          <span className="badge bg-emerald-50 border-emerald-200 text-emerald-700">Live</span>
        </div>
        <a
          href={SIMBA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-accent transition-colors"
        >
          <ExternalLink size={13} />
          Öffnen
        </a>
      </div>

      {/* iframe */}
      <iframe
        src={SIMBA_URL}
        title="SIMBA Trading Dashboard"
        className="flex-1 w-full border-0"
        style={{ height: 'calc(100vh - 120px)' }}
      />
    </div>
  )
}
