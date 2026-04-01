import { useEffect, useState, useCallback } from 'react'
import { Plus, RefreshCw, CheckCircle2, Clock, DollarSign, Bot, Activity } from 'lucide-react'
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

/* ── Greeting ──────────────────────────────────────────────── */

function Greeting() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Hallo' : 'Guten Abend'
  const dateStr = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800">
        {greeting}, Dominik! 👋
      </h1>
      <p className="text-stone-400 text-sm mt-0.5">{dateStr} · {timeStr} Uhr</p>
    </div>
  )
}

/* ── Metric Card ───────────────────────────────────────────── */

function MetricCard({ icon: Icon, label, value, sub, iconBg, iconColor }) {
  return (
    <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)' }}>
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon size={17} className={iconColor} />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-stone-400 mb-1">{label}</div>
          <div className="text-2xl font-bold text-stone-800 leading-none">{value}</div>
          {sub && <div className="text-xs text-stone-400 mt-1.5">{sub}</div>}
        </div>
      </div>
    </div>
  )
}

/* ── Status Badge ──────────────────────────────────────────── */

function StatusBadge({ status }) {
  const map = {
    online:  { label: 'Online',  cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    warning: { label: 'Warning', cls: 'text-amber-700  bg-amber-50  border-amber-200'   },
    down:    { label: 'Down',    cls: 'text-red-700    bg-red-50    border-red-200'      },
  }[status] ?? { label: '–', cls: 'text-stone-500 bg-stone-100 border-stone-200' }

  return <span className={`badge ${map.cls}`}>{map.label}</span>
}

/* ── Project Card ──────────────────────────────────────────── */

function ProjectCard({ project, onClick }) {
  const uptimeColor =
    project.uptime_7d == null ? 'text-stone-400' :
    project.uptime_7d >= 99  ? 'text-emerald-600' :
    project.uptime_7d >= 80  ? 'text-amber-600'  : 'text-red-600'

  return (
    <button
      onClick={() => onClick(project)}
      className="group text-left w-full bg-white rounded-2xl p-4 transition-all duration-200 hover:shadow-card-md"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <StatusDot status={project.current_status} />
          <span className="font-semibold text-sm text-stone-800 truncate">{project.name}</span>
        </div>
        <StatusBadge status={project.current_status} />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-stone-400 font-mono bg-surface-raised px-1.5 py-0.5 rounded-lg border border-surface-border">
          {project.check_type}
        </span>
        <span className={uptimeColor}>
          {project.uptime_7d != null ? `${project.uptime_7d}% uptime` : 'Kein Check'}
        </span>
      </div>
    </button>
  )
}

/* ── Last Check helper ─────────────────────────────────────── */

function formatLastCheck(projects) {
  const dates = projects.map(p => p.last_checked).filter(Boolean).map(d => new Date(d))
  if (!dates.length) return '–'
  const latest = new Date(Math.max(...dates))
  const diff = Math.round((Date.now() - latest.getTime()) / 1000)
  if (diff < 60) return `vor ${diff}s`
  if (diff < 3600) return `vor ${Math.round(diff / 60)}min`
  return latest.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

/* ── Main Page ─────────────────────────────────────────────── */

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
      {/* Greeting + Actions */}
      <div className="flex items-start justify-between">
        <Greeting />
        <div className="flex items-center gap-2 mt-1">
          <button onClick={fetchProjects} className="btn-ghost p-2.5" title="Aktualisieren">
            <RefreshCw size={15} className={loading ? 'animate-spin text-accent' : 'text-stone-400'} />
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
          sub={down > 0 ? `${down} ausgefallen` : warning > 0 ? `${warning} mit Warnung` : 'Alles läuft'}
          iconBg={!loading && down === 0 && warning === 0 ? 'bg-emerald-100' : 'bg-stone-100'}
          iconColor={!loading && down === 0 && warning === 0 ? 'text-emerald-600' : 'text-stone-400'}
        />
        <MetricCard
          icon={DollarSign}
          label="API-Kosten heute"
          value="–"
          sub="Coming soon"
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
        <MetricCard
          icon={Bot}
          label="Bot-Status"
          value="–"
          sub="Coming soon"
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <MetricCard
          icon={Clock}
          label="Letzter Check"
          value={loading ? '–' : formatLastCheck(projects)}
          sub="Alle 30s"
          iconBg="bg-orange-100"
          iconColor="text-orange-500"
        />
      </div>

      {/* Project Grid */}
      {loading ? (
        <div className="text-stone-400 text-sm">Lade…</div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-2xl text-center py-16 text-stone-400" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <Activity size={36} className="mx-auto mb-3 text-stone-300" />
          <p className="mb-4 text-stone-500">Noch keine Projekte konfiguriert.</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">
            Erstes Projekt hinzufügen
          </button>
        </div>
      ) : (
        <div className="space-y-7">
          {CLUSTER_ORDER.filter(c => clusters[c]).map(cluster => (
            <section key={cluster}>
              <div className="flex items-center gap-3 mb-3">
                <span className="section-label">{cluster}</span>
                <div className="flex-1 h-px bg-surface-border" />
                <span className="text-[11px] text-stone-400">{clusters[cluster].length}</span>
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
        <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="section-label">Daily Briefing</span>
            <span className="badge bg-amber-50 border-amber-200 text-amber-600">Phase 3</span>
          </div>
          <p className="text-sm text-stone-400">KI-Zusammenfassung deiner YouTube-Kanäle, Aktiennews und Projekt-Updates erscheinen hier.</p>
        </div>
      )}

      {selected && (
        <ProjectDrawer
          project={selected}
          onClose={() => setSelected(null)}
          onUpdated={updated => {
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
