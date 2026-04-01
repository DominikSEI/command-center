import { useEffect, useState, useCallback } from 'react'
import { Plus, Kanban } from 'lucide-react'
import api from '../api'
import TrackerDrawer from '../components/TrackerDrawer'
import AddTrackerModal from '../components/AddTrackerModal'

const STATUS_META = {
  in_progress: { label: 'In Arbeit',  dot: '#3b82f6', badge: 'text-blue-700 bg-blue-50 border-blue-200' },
  review:      { label: 'Review',     dot: '#f59e0b', badge: 'text-amber-700 bg-amber-50 border-amber-200' },
  idea:        { label: 'Idee',       dot: '#a8a29e', badge: 'text-stone-500 bg-stone-100 border-stone-200' },
  live:        { label: 'Live',       dot: '#10b981', badge: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
}

const STATUS_ORDER = ['in_progress', 'review', 'live', 'idea']

function getProgressBg(value) {
  if (value >= 100) return 'linear-gradient(90deg, #10b981, #34d399)'
  if (value >= 60)  return 'linear-gradient(90deg, #E8630A, #F59E0B)'
  if (value >= 30)  return 'linear-gradient(90deg, #f59e0b, #fbbf24)'
  return 'linear-gradient(90deg, #d6d3d1, #e7e5e4)'
}

function ProgressBar({ value }) {
  return (
    <div className="progress-bar">
      <div
        className="progress-bar-fill"
        style={{ width: `${Math.min(value, 100)}%`, background: getProgressBg(value) }}
      />
    </div>
  )
}

function TrackerCard({ project, onClick }) {
  const meta      = STATUS_META[project.status] ?? STATUS_META.idea
  const hasTodos  = project.todos.length > 0
  const doneTodos = project.todos.filter(t => t.done).length
  const progress  = hasTodos ? Math.round((doneTodos / project.todos.length) * 100) : project.progress_percent

  return (
    <button
      onClick={() => onClick(project)}
      className="group text-left w-full bg-white rounded-2xl p-5 transition-all duration-200 hover:shadow-card-md"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <h3 className="font-semibold text-sm leading-snug text-stone-800 flex-1 text-left">{project.name}</h3>
        <span className={`badge shrink-0 ${meta.badge}`}>{meta.label}</span>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-xs text-stone-400 mb-4 line-clamp-2 leading-relaxed text-left">{project.description}</p>
      )}

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-stone-400">Fortschritt</span>
          <span className={
            progress >= 100 ? 'text-emerald-600 font-semibold' :
            progress >= 60  ? 'text-accent font-semibold' :
            'text-stone-400'
          }>
            {progress}%
          </span>
        </div>
        <ProgressBar value={progress} />
      </div>

      {/* Todo dots */}
      {hasTodos && (
        <div className="flex items-center gap-1.5 mt-3 text-xs text-stone-400">
          <div className="flex gap-0.5">
            {project.todos.slice(0, 8).map((t, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: t.done ? '#E8630A' : '#E5DDD0' }}
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

  const byStatus = s => projects.filter(p => p.status === s)
  const activeStatuses = STATUS_ORDER.filter(s => byStatus(s).length > 0)
  const inProgress = byStatus('in_progress').length
  const live       = byStatus('live').length

  return (
    <div className="p-8 space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">Projekte</h1>
          {!loading && (
            <p className="text-sm text-stone-400 mt-1">
              {projects.length} Projekte · {inProgress} in Arbeit{live > 0 ? ` · ${live} live` : ''}
            </p>
          )}
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} />
          Projekt
        </button>
      </div>

      {loading ? (
        <div className="text-stone-400 text-sm">Lade…</div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-2xl text-center py-20 text-stone-400" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <Kanban size={36} className="mx-auto mb-3 text-stone-300" />
          <p className="mb-4 text-stone-500">Noch keine Projekte angelegt.</p>
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
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: meta.dot }} />
                  <span className="section-label">{meta.label}</span>
                  <span className="text-[11px] text-stone-400">({ps.length})</span>
                  <div className="flex-1 h-px bg-surface-border" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
