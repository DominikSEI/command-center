import { useEffect, useState } from 'react'
import { X, RefreshCw, Pencil } from 'lucide-react'
import api from '../api'
import StatusDot from './StatusDot'
import EditProjectModal from './EditProjectModal'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })
}

export default function ProjectDrawer({ project: initialProject, onClose, onUpdated }) {
  const [project, setProject] = useState(initialProject)
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)

  async function fetchLogs() {
    setLoading(true)
    try {
      const res = await api.get(`/projects/${project.id}/logs?limit=50`)
      setLogs(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLogs() }, [project.id])

  function handleUpdated(updated) {
    setProject(updated)
    if (onUpdated) onUpdated(updated)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white border-l border-surface-border z-50 flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-border">
          <div className="flex items-center gap-3 min-w-0">
            <StatusDot status={project.current_status} />
            <h2 className="font-bold text-base text-stone-800 truncate">{project.name}</h2>
            <span className="badge border-surface-border text-stone-500 bg-surface-raised text-[11px] shrink-0">
              {project.cluster}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setShowEdit(true)} className="btn-ghost p-2" title="Bearbeiten">
              <Pencil size={14} />
            </button>
            <button onClick={onClose} className="btn-ghost p-2">
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Meta */}
        <div className="px-6 py-5 grid grid-cols-2 gap-4 border-b border-surface-border">
          <div>
            <span className="text-[11px] text-stone-400 font-medium block mb-1">Typ</span>
            <span className="font-mono text-xs bg-surface-raised px-2 py-0.5 rounded-lg border border-surface-border text-stone-600">
              {project.check_type}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-stone-400 font-medium block mb-1">Uptime 7 Tage</span>
            <span className={`text-sm font-bold ${
              project.uptime_7d == null ? 'text-stone-400' :
              project.uptime_7d >= 99  ? 'text-emerald-600' :
              project.uptime_7d >= 80  ? 'text-amber-600'  : 'text-red-600'
            }`}>
              {project.uptime_7d != null ? `${project.uptime_7d}%` : '—'}
            </span>
          </div>
          {project.url && (
            <div className="col-span-2">
              <span className="text-[11px] text-stone-400 font-medium block mb-1">URL</span>
              <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-accent text-xs hover:underline truncate block">
                {project.url}
              </a>
            </div>
          )}
          {project.description && (
            <div className="col-span-2">
              <span className="text-[11px] text-stone-400 font-medium block mb-1">Beschreibung</span>
              <p className="text-sm text-stone-600 leading-relaxed">{project.description}</p>
            </div>
          )}
          {project.notes && (
            <div className="col-span-2">
              <span className="text-[11px] text-stone-400 font-medium block mb-1">Notizen</span>
              <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">{project.notes}</p>
            </div>
          )}
        </div>

        {/* Logs */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <span className="section-label">Check-Log (letzte 50)</span>
            <button onClick={fetchLogs} className="btn-ghost p-1.5">
              <RefreshCw size={13} className={loading ? 'animate-spin text-accent' : 'text-stone-400'} />
            </button>
          </div>

          {loading ? (
            <div className="text-stone-400 text-sm">Lade…</div>
          ) : logs.length === 0 ? (
            <div className="text-stone-400 text-sm">Keine Einträge</div>
          ) : (
            <div className="space-y-1.5">
              {logs.map(log => (
                <div
                  key={log.id}
                  className={`rounded-xl px-3 py-2.5 text-xs border ${
                    log.status === 'online'
                      ? 'border-emerald-200 bg-emerald-50'
                      : log.status === 'warning'
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <StatusDot status={log.status} />
                      <span className={`font-semibold capitalize ${
                        log.status === 'online' ? 'text-emerald-700' :
                        log.status === 'warning' ? 'text-amber-700' : 'text-red-700'
                      }`}>{log.status}</span>
                      {log.status_code && <span className="text-stone-400">HTTP {log.status_code}</span>}
                      {log.response_time_ms && <span className="text-stone-400">{Math.round(log.response_time_ms)}ms</span>}
                    </div>
                    <span className="text-stone-400 shrink-0">{formatDate(log.checked_at)}</span>
                  </div>
                  {log.error_message && (
                    <p className="mt-1 text-stone-500 font-mono text-[11px]">{log.error_message}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showEdit && (
        <EditProjectModal
          project={project}
          onClose={() => setShowEdit(false)}
          onUpdated={handleUpdated}
        />
      )}
    </>
  )
}
