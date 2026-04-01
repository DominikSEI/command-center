import { useEffect, useState, useCallback } from 'react'
import { Plus, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Clock, Activity, DollarSign, Bot } from 'lucide-react'
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

function MetricCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div
      className="rounded-2xl border border-surface-border p-5 flex items-start gap-4"
      style={{
        background: 'linear-gradient(160deg, #0d0f1b 0%, #0a0c15 100%)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: accent ? 'linear-gradient(135deg, #8b5cf6, #3b82f6)' : 'rgba(255,255,255,0.05)' }}
      >
        <Icon size={17} className={accent ? 'text-white' : 'text-gray-400'} />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500 font-medium mb-1">{label}</div>
        <div className="text-2xl font-semibold leading-none">{value}</div>
        {sub && <div className="text-xs text-gray-600 mt-1.5">{sub}</div>}
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    online:  { label: 'Online',  cls: 'text-emerald-400 bg-emerald-950/40 border-emerald-900/40' },
    warning: { label: 'Warning', cls: 'text-amber-400  bg-amber-950/40  border-amber-900/40'  },
    down:    { label: 'Down',    cls: 'text-red-400    bg-red-950/40    border-red-900/40'    },
  }[status] ?? { label: '–', cls: 'text-gray-500 bg-surface-raised border-surface-border' }

  return (
    <span className={`badge ${map.cls}`}>{map.label}</span>
  )
}

function ProjectCard({ project, onClick }) {
  const uptimeColor =
    project.uptime_7d == null ? 'text-gray-600' :
    project.uptime_7d >= 99  ? 'text-emerald-400' :
    project.uptime_7d >= 80  ? 'text-amber-400'  : 'text-red-400'

  return (
    <button
      onClick={() => onClick(project)}
      className="group text-left w-full rounded-2xl border border-surface-border p-4 transition-all duration-200 hover:border-accent/30 hover:shadow-glow-sm"
      style={{ background: 'linear-gradient(160deg, #0d0f1b 0%, #0a0c15 100%)' }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <StatusDot status={project.current_status} />
          <span className="font-medium text-sm truncate">{project.name}</span>
        </div>
        <StatusBadge status={project.current_status} />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600 font-mono bg-surface-raised px-1.5 py-0.5 rounded-lg">{project.check_type}</span>
        <span className={uptimeColor}>
          {project.uptime_7d != null ? `${project.uptime_7d}% uptime` : 'Kein Check'}
        </span>
      </div>
    </button>
  )
}

function formatLastCheck(projects) {
  const dates = projects
    .map(p => p.last_checked)
    .filter(Boolean)
    .map(d => new Date(d))
  if (!dates.length) return '–'
  const latest = new Date(Math.max(...dates))
  const diff = Math.round((Date.now() - latest.getTime()) / 1000)
  if (diff < 60) return `vor ${diff}s`
  if (diff < 3600) return `vor ${Math.round(diff / 60)}min`
  return latest.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

export default function Dashboard() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd]   = useState(false)

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

  const online  = projects.filter(p => p.current_status === 'online').length
  const warning = projects.filter(p => p.current_status === 'warning').length
  const down    = projects.filter(p => p.current_status === 'down').length
  const clusters = groupByCluster(projects)

  return (
    <div className="p-8 space-y-8 max-w-7xl">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">System-Übersicht und Service-Status</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchProjects} className="btn-ghost p-2.5" title="Aktualisieren">
            <RefreshCw size={15} className={loading ? 'animate-spin text-accent' : ''} />
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={15} />
            Projekt
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={CheckCircle2}
          label="Projekte Online"
          value={loading ? '–' : `${online}/${projects.length}`}
          sub={down > 0 ? `${down} down` : warning > 0 ? `${warning} warning` : 'Alles läuft'}
          accent={!loading && down === 0 && warning === 0}
        />
        <MetricCard
          icon={DollarSign}
          label="API-Kosten heute"
          value="–"
          sub="Coming soon"
        />
        <MetricCard
          icon={Bot}
          label="Bot-Status"
          value="–"
          sub="Coming soon"
        />
        <MetricCard
          icon={Clock}
          label="Letzter Check"
          value={loading ? '–' : formatLastCheck(projects)}
          sub="Alle 30s"
        />
      </div>

      {/* Project Grid */}
      {loading ? (
        <div className="text-gray-600 text-sm">Lade…</div>
      ) : projects.length === 0 ? (
        <div
          className="rounded-2xl border border-surface-border text-center py-16 text-gray-500"
          style={{ background: 'linear-gradient(160deg, #0d0f1b 0%, #0a0c15 100%)' }}
        >
          <Activity size={36} className="mx-auto mb-3 text-gray-700" />
          <p className="mb-4">Noch keine Projekte konfiguriert.</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">
            Erstes Projekt hinzufügen
          </button>
        </div>
      ) : (
        <div className="space-y-7">
          {CLUSTER_ORDER.filter(c => clusters[c]).map((cluster) => (
            <section key={cluster}>
              <div className="flex items-center gap-3 mb-3">
                <span className="section-label">{cluster}</span>
                <div className="flex-1 h-px bg-surface-border" />
                <span className="text-[11px] text-gray-600">{clusters[cluster].length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {clusters[cluster].map(p => (
                  <ProjectCard key={p.id} project={p} onClick={setSelected} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Briefing Placeholder */}
      {!loading && projects.length > 0 && (
        <div
          className="rounded-2xl border border-surface-border p-5"
          style={{ background: 'linear-gradient(160deg, #0d0f1b 0%, #0a0c15 100%)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="section-label">Daily Briefing</span>
            <span className="badge border-surface-border text-gray-600 bg-surface-raised">Coming Phase 3</span>
          </div>
          <p className="text-sm text-gray-600">KI-Zusammenfassung deiner YouTube-Kanäle, Aktiennews und Projekt-Updates erscheinen hier.</p>
        </div>
      )}

      {selected && (
        <ProjectDrawer
          project={selected}
          onClose={() => setSelected(null)}
          onUpdated={(updated) => {
            setProjects(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))
            setSelected(prev => ({ ...prev, ...updated }))
          }}
        />
      )}

      {showAdd && (
        <AddProjectModal onClose={() => setShowAdd(false)} onCreated={fetchProjects} />
      )}
    </div>
  )
}
