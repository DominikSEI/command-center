import { useEffect, useState, useCallback } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import api from '../api'
import StatusDot from '../components/StatusDot'
import ProjectDrawer from '../components/ProjectDrawer'
import AddProjectModal from '../components/AddProjectModal'

const CLUSTER_ORDER = ['Webapps', 'Bots', 'APIs', 'Infrastruktur']

function groupByCluster(projects) {
  const map = {}
  for (const p of projects) {
    if (!map[p.cluster]) map[p.cluster] = []
    map[p.cluster].push(p)
  }
  return map
}

function StatusBadge({ status }) {
  const map = {
    online: { label: 'Online', cls: 'text-emerald-400 bg-emerald-950/40 border-emerald-900/40' },
    warning: { label: 'Warning', cls: 'text-amber-400 bg-amber-950/40 border-amber-900/40' },
    down: { label: 'Down', cls: 'text-red-400 bg-red-950/40 border-red-900/40' },
  }[status] ?? { label: 'Unbekannt', cls: 'text-gray-400 bg-surface border-surface-border' }

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${map.cls}`}>
      {map.label}
    </span>
  )
}

function ProjectCard({ project, onClick }) {
  return (
    <button
      onClick={() => onClick(project)}
      className="card text-left w-full hover:border-accent/40 hover:bg-surface-hover transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <StatusDot status={project.current_status} />
          <span className="font-medium text-sm">{project.name}</span>
        </div>
        <StatusBadge status={project.current_status} />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="font-mono bg-surface px-1.5 py-0.5 rounded">{project.check_type}</span>
        {project.uptime_7d != null ? (
          <span className={project.uptime_7d >= 99 ? 'text-emerald-500' : project.uptime_7d >= 80 ? 'text-amber-500' : 'text-red-500'}>
            {project.uptime_7d}% Uptime
          </span>
        ) : (
          <span>Noch kein Check</span>
        )}
      </div>
    </button>
  )
}

function SummaryBar({ projects }) {
  const online = projects.filter((p) => p.current_status === 'online').length
  const warning = projects.filter((p) => p.current_status === 'warning').length
  const down = projects.filter((p) => p.current_status === 'down').length

  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="flex items-center gap-1.5 text-emerald-400">
        <span className="status-dot status-online" />
        {online} Online
      </span>
      <span className="flex items-center gap-1.5 text-amber-400">
        <span className="status-dot status-warning" />
        {warning} Warning
      </span>
      <span className="flex items-center gap-1.5 text-red-400">
        <span className="status-dot status-down" />
        {down} Down
      </span>
      <span className="text-gray-500">{projects.length} Gesamt</span>
    </div>
  )
}

export default function Dashboard() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)

  const fetchProjects = useCallback(async () => {
    try {
      const res = await api.get('/projects')
      setProjects(res.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
    const id = setInterval(fetchProjects, 30_000)
    return () => clearInterval(id)
  }, [fetchProjects])

  const clusters = groupByCluster(projects)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Monitor</h1>
          <div className="mt-1">
            {!loading && <SummaryBar projects={projects} />}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchProjects} className="btn-ghost p-2">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-1.5 text-sm">
            <Plus size={15} />
            Projekt
          </button>
        </div>
      </div>

      {/* Cluster-Gruppen */}
      {loading ? (
        <div className="text-gray-500">Lade...</div>
      ) : projects.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <p className="mb-3">Noch keine Projekte konfiguriert.</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">
            Erstes Projekt hinzufügen
          </button>
        </div>
      ) : (
        CLUSTER_ORDER.filter((c) => clusters[c]).map((cluster) => (
          <section key={cluster}>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
              {cluster}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {clusters[cluster].map((p) => (
                <ProjectCard key={p.id} project={p} onClick={setSelected} />
              ))}
            </div>
          </section>
        ))
      )}

      {/* Detail Drawer */}
      {selected && (
        <ProjectDrawer project={selected} onClose={() => setSelected(null)} />
      )}

      {/* Add Modal */}
      {showAdd && (
        <AddProjectModal onClose={() => setShowAdd(false)} onCreated={fetchProjects} />
      )}
    </div>
  )
}
