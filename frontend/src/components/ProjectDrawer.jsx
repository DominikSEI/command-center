import { useEffect, useState } from 'react'
import { X, RefreshCw } from 'lucide-react'
import api from '../api'
import StatusDot from './StatusDot'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })
}

export default function ProjectDrawer({ project, onClose }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchLogs() {
    setLoading(true)
    try {
      const res = await api.get(`/projects/${project.id}/logs?limit=50`)
      setLogs(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [project.id])

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-surface-card border-l border-surface-border z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <StatusDot status={project.current_status} />
            <h2 className="font-semibold text-lg">{project.name}</h2>
            <span className="text-xs bg-surface px-2 py-0.5 rounded-full text-gray-400 border border-surface-border">
              {project.cluster}
            </span>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X size={18} />
          </button>
        </div>

        {/* Meta */}
        <div className="px-6 py-4 grid grid-cols-2 gap-4 text-sm border-b border-surface-border">
          <div>
            <span className="text-gray-500 block mb-0.5">Typ</span>
            <span className="font-mono text-xs bg-surface px-2 py-0.5 rounded">{project.check_type}</span>
          </div>
          <div>
            <span className="text-gray-500 block mb-0.5">Uptime 7 Tage</span>
            <span className={project.uptime_7d >= 99 ? 'text-emerald-400' : project.uptime_7d >= 80 ? 'text-amber-400' : 'text-red-400'}>
              {project.uptime_7d != null ? `${project.uptime_7d}%` : '—'}
            </span>
          </div>
          {project.url && (
            <div className="col-span-2">
              <span className="text-gray-500 block mb-0.5">URL</span>
              <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-accent text-xs hover:underline truncate block">
                {project.url}
              </a>
            </div>
          )}
        </div>

        {/* Logs */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-300">Fehlerlog (letzte 50)</h3>
            <button onClick={fetchLogs} className="btn-ghost p-1.5">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {loading ? (
            <div className="text-gray-500 text-sm">Lade...</div>
          ) : logs.length === 0 ? (
            <div className="text-gray-500 text-sm">Keine Einträge</div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`rounded-lg px-3 py-2.5 text-xs border ${
                    log.status === 'online'
                      ? 'border-emerald-900/40 bg-emerald-950/20'
                      : log.status === 'warning'
                      ? 'border-amber-900/40 bg-amber-950/20'
                      : 'border-red-900/40 bg-red-950/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <StatusDot status={log.status} />
                      <span className="font-medium capitalize">{log.status}</span>
                      {log.status_code && (
                        <span className="text-gray-500">HTTP {log.status_code}</span>
                      )}
                      {log.response_time_ms && (
                        <span className="text-gray-500">{Math.round(log.response_time_ms)}ms</span>
                      )}
                    </div>
                    <span className="text-gray-500 shrink-0">{formatDate(log.checked_at)}</span>
                  </div>
                  {log.error_message && (
                    <p className="mt-1 text-gray-400 font-mono">{log.error_message}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
