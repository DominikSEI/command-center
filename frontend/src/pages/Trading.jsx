import { ExternalLink, TrendingUp, Activity, Zap } from 'lucide-react'

const SIMBA_URL = 'http://207.180.244.172:8080/dashboard.html'

export default function Trading() {
  return (
    <div className="p-8 space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trading</h1>
        <p className="text-sm text-gray-500 mt-1">SIMBA Aktienbot Dashboard</p>
      </div>

      {/* Main Card */}
      <div
        className="rounded-2xl border border-surface-border p-6 space-y-6"
        style={{ background: 'linear-gradient(160deg, #0d0f1b 0%, #0a0c15 100%)' }}
      >
        {/* Bot Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' }}
            >
              <TrendingUp size={18} className="text-white" />
            </div>
            <div>
              <div className="font-semibold text-sm">SIMBA Bot</div>
              <div className="text-xs text-gray-500">Automatisierter Aktienbot</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" style={{ boxShadow: '0 0 6px rgba(16,185,129,0.6)' }} />
            <span className="text-xs font-medium text-emerald-400">Live</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-surface-border bg-surface p-3">
            <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1.5">
              <Activity size={11} />
              Status
            </div>
            <div className="text-sm font-medium text-emerald-400">Aktiv</div>
          </div>
          <div className="rounded-xl border border-surface-border bg-surface p-3">
            <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1.5">
              <Zap size={11} />
              Modus
            </div>
            <div className="text-sm font-medium text-accent">Auto</div>
          </div>
          <div className="rounded-xl border border-surface-border bg-surface p-3">
            <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1.5">
              <TrendingUp size={11} />
              Typ
            </div>
            <div className="text-sm font-medium text-blue-400">Swing</div>
          </div>
        </div>

        {/* Open button */}
        <a
          href={SIMBA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium text-sm text-white transition-all duration-200 hover:opacity-90 hover:shadow-glow"
          style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)' }}
        >
          <ExternalLink size={15} />
          Dashboard öffnen
        </a>

        <p className="text-xs text-gray-600 text-center -mt-2">
          Öffnet das SIMBA Dashboard in einem neuen Tab
        </p>
      </div>
    </div>
  )
}
