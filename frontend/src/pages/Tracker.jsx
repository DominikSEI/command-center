import { useEffect, useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import api from '../api'
import TrackerDrawer from '../components/TrackerDrawer'
import AddTrackerModal from '../components/AddTrackerModal'

const STATUS_META = {
  idea:        { label: 'Idee',      cls: 'text-gray-400 bg-surface border-surface-border' },
  in_progress: { label: 'In Arbeit', cls: 'text-blue-400 bg-blue-950/30 border-blue-900/40' },
  review:      { label: 'Review',    cls: 'text-amber-400 bg-amber-950/30 border-amber-900/40' },
  live:        { label: 'Live',      cls: 'text-emerald-400 bg-emerald-950/30 border-emerald-900/40' },
}

const STATUS_ORDER = ['in_progress', 'review', 'idea', 'live']

function ProgressBar({ value }) {
  const color = value >= 100 ? 'bg-emerald-500' : value >= 60 ? 'bg-accent' : value >= 30 ? 'bg-amber-400' : 'bg-surface-border'
  return (
    <div className="w-full bg-surface rounded-full h-1.5">
      <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
    </div>
  )
}

function TrackerCard({ project, onClick }) {
  const meta = STATUS_META[project.status] ?? STATUS_META.idea
  const hasTodos = project.todos.length > 0
  const doneTodos = project.todos.filter((t) => t.done).length
  const progress = hasTodos ? Math.round((doneTodos / project.todos.length) * 100) : project.progress_percent

  return (
    <button
      onClick={() => onClick(project)}
      className="card text-left w-full hover:border-accent/40 hover:bg-surface-hover transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-medium text-sm leading-snug">{project.name}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${meta.cls}`}>
          {meta.label}
        </span>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">{project.description}</p>
      )}

      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
        <span>Fortschritt</span>
        <span className={progress >= 100 ? 'text-emerald-400' : progress > 0 ? 'text-gray-400' : ''}>
          {progress}%
        </span>
      </div>
      <ProgressBar value={progress} />

      {/* Todo count */}
      {hasTodos && (
        <p className="text-xs text-gray-600 mt-2">
          {doneTodos}/{project.todos.length} Todos erledigt
        </p>
      )}
    </button>
  )
}

function SummaryBar({ projects }) {
  const counts = Object.fromEntries(
    Object.keys(STATUS_META).map((s) => [s, projects.filter((p) => p.status === s).length])
  )
  return (
    <div className="flex items-center gap-4 text-sm flex-wrap">
      {STATUS_ORDER.map((s) => counts[s] > 0 && (
        <span key={s} className={`flex items-center gap-1.5 text-xs ${STATUS_META[s].cls.split(' ')[0]}`}>
          {counts[s]} {STATUS_META[s].label}
        </span>
      ))}
      <span className="text-gray-500 text-xs">{projects.length} Gesamt</span>
    </div>
  )
}

export default function Tracker() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)

  const fetchProjects = useCallback(async () => {
    try {
      const res = await api.get('/tracker')
      setProjects(res.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  function handleCreated(newProject) {
    setProjects((prev) => [newProject, ...prev])
  }

  function handleUpdated(updated) {
    setProjects((prev) => prev.map((p) => p.id === updated.id ? updated : p))
    setSelected((prev) => prev?.id === updated.id ? updated : prev)
  }

  function handleDeleted(id) {
    setProjects((prev) => prev.filter((p) => p.id !== id))
    setSelected(null)
  }

  const byStatus = (s) => projects.filter((p) => p.status === s)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Tracker</h1>
          {!loading && projects.length > 0 && (
            <div className="mt-1"><SummaryBar projects={projects} /></div>
          )}
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={15} />
          Projekt
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-gray-500">Lade...</div>
      ) : projects.length === 0 ? (
        <div className="card text-center py-16 text-gray-500">
          <p className="mb-3">Noch keine Projekte angelegt.</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">
            Erstes Projekt erstellen
          </button>
        </div>
      ) : (
        STATUS_ORDER.map((status) => {
          const ps = byStatus(status)
          if (ps.length === 0) return null
          const meta = STATUS_META[status]
          return (
            <section key={status}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
                {meta.label}
                <span className="ml-2 text-gray-600 font-normal normal-case tracking-normal">({ps.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {ps.map((p) => (
                  <TrackerCard key={p.id} project={p} onClick={setSelected} />
                ))}
              </div>
            </section>
          )
        })
      )}

      {/* Drawer */}
      {selected && (
        <TrackerDrawer
          project={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}

      {/* Add Modal */}
      {showAdd && (
        <AddTrackerModal
          onClose={() => setShowAdd(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
