import { useEffect, useState, useCallback } from 'react'
import { Plus, Kanban } from 'lucide-react'
import api from '../api'
import TrackerDrawer from '../components/TrackerDrawer'
import AddTrackerModal from '../components/AddTrackerModal'

const STATUS_META = {
  in_progress: { label: 'In Arbeit',  dot: '#3b82f6', badge: 'text-blue-400 bg-blue-950/30 border-blue-900/40' },
  review:      { label: 'Review',     dot: '#f59e0b', badge: 'text-amber-400 bg-amber-950/30 border-amber-900/40' },
  idea:        { label: 'Idee',       dot: '#6b7280', badge: 'text-gray-400 bg-surface-raised border-surface-border' },
  live:        { label: 'Live',       dot: '#10b981', badge: 'text-emerald-400 bg-emerald-950/30 border-emerald-900/40' },
}

const STATUS_ORDER = ['in_progress', 'review', 'live', 'idea']

const PRIORITY_META = {
  1: { label: 'P1', cls: 'text-red-400 bg-red-950/30 border-red-900/40' },
  2: { label: 'P2', cls: 'text-amber-400 bg-amber-950/30 border-amber-900/40' },
  3: { label: 'P3', cls: 'text-emerald-400 bg-emerald-950/30 border-emerald-900/40' },
}

function getProgressStyle(value) {
  if (value > 90)  return 'linear-gradient(90deg, #10b981, #34d399)'
  if (value > 60)  return 'linear-gradient(90deg, #3b82f6, #60a5fa)'
  if (value > 30)  return 'linear-gradient(90deg, #f59e0b, #fbbf24)'
  return 'linear-gradient(90deg, #ef4444, #f87171)'
}

function ProgressBar({ value }) {
  return (
    <div className="progress-bar">
      <div
        className="progress-bar-fill"
        style={{ width: `${Math.min(value, 100)}%`, background: getProgressStyle(value) }}
      />
    </div>
  )
}

function TrackerCard({ project, onClick }) {
  const meta      = STATUS_META[project.status] ?? STATUS_META.idea
  const pMeta     = PRIORITY_META[project.priority] ?? PRIORITY_META[2]
  const hasTodos  = project.todos.length > 0
  const doneTodos = project.todos.filter(t => t.done).length
  const progress  = hasTodos ? Math.round((doneTodos / project.todos.length) * 100) : project.progress_percent

  return (
    <button
      onClick={() => onClick(project)}
      className="group text-left w-full rounded-2xl border border-surface-border p-5 transition-all duration-200 hover:border-accent/30 hover:shadow-glow-sm"
      style={{ background: 'linear-gradient(160deg, #0d0f1b 0%, #0a0c15 100%)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <h3 className="font-semibold text-sm leading-snug flex-1 text-left">{project.name}</h3>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`badge shrink-0 ${pMeta.cls}`}>{pMeta.label}</span>
          <span className={`badge shrink-0 ${meta.badge}`}>{meta.label}</span>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-xs text-gray-500 mb-4 line-clamp-2 leading-relaxed text-left">{project.description}</p>
      )}

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Fortschritt</span>
          <span className={
            progress > 90 ? 'text-emerald-400 font-medium' :
            progress > 60 ? 'text-blue-400 font-medium' :
            progress > 30 ? 'text-amber-400 font-medium' :
            'text-red-400 font-medium'
          }>
            {progress}%
          </span>
        </div>
        <ProgressBar value={progress} />
      </div>

      {/* Todo count */}
      {hasTodos && (
        <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-600">
          <div className="flex gap-0.5">
            {project.todos.slice(0, 8).map((t, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: t.done ? '#8b5cf6' : '#1b1e2e' }}
              />
            ))}
          </div>
          <span>{doneTodos}/{project.todos.length} erledigt</span>
        </div>
      )}
    </button>
  )
}

export default function Tracker() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd]   = useState(false)

  const fetchProjects = useCallback(async () => {
    try {
      const res = await api.get('/tracker')
      setProjects(res.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  function handleUpdated(updated) {
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))
    setSelected(prev => prev?.id === updated.id ? updated : prev)
  }

  function handleDeleted(id) {
    setProjects(prev => prev.filter(p => p.id !== id))
    setSelected(null)
  }

  const byStatus = s => projects.filter(p => p.status === s).sort((a, b) => (a.priority ?? 2) - (b.priority ?? 2))
  const activeStatuses = STATUS_ORDER.filter(s => byStatus(s).length > 0)

  // Summary counts
  const inProgress = byStatus('in_progress').length
  const live       = byStatus('live').length

  return (
    <div className="p-8 space-y-8 max-w-7xl">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projekte</h1>
          {!loading && (
            <p className="text-sm text-gray-500 mt-1">
              {projects.length} Projekte · {inProgress} in Arbeit{live > 0 ? ` · ${live} live` : ''}
            </p>
          )}
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} />
          Projekt
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-gray-600 text-sm">Lade…</div>
      ) : projects.length === 0 ? (
        <div
          className="rounded-2xl border border-surface-border text-center py-20 text-gray-500"
          style={{ background: 'linear-gradient(160deg, #0d0f1b 0%, #0a0c15 100%)' }}
        >
          <Kanban size={36} className="mx-auto mb-3 text-gray-700" />
          <p className="mb-4">Noch keine Projekte angelegt.</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">
            Erstes Projekt erstellen
          </button>
        </div>
      ) : (
        <div className="space-y-9">
          {activeStatuses.map(status => {
            const ps   = byStatus(status)
            const meta = STATUS_META[status]
            return (
              <section key={status}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: meta.dot, boxShadow: `0 0 6px ${meta.dot}99` }} />
                  <span className="section-label">{meta.label}</span>
                  <span className="text-[11px] text-gray-600 font-normal">({ps.length})</span>
                  <div className="flex-1 h-px bg-surface-border" />
                </div>
                <div className="stagger-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ps.map(p => (
                    <TrackerCard key={p.id} project={p} onClick={setSelected} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {selected && (
        <TrackerDrawer
          project={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}

      {showAdd && (
        <AddTrackerModal
          onClose={() => setShowAdd(false)}
          onCreated={p => setProjects(prev => [p, ...prev])}
        />
      )}
    </div>
  )
}
