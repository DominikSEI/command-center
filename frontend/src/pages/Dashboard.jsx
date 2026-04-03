import { useEffect, useState, useCallback } from 'react'
import { Plus, RefreshCw, CheckCircle2, Activity, Cloud, Kanban, CalendarDays, ListTodo, ExternalLink, Bot, Newspaper } from 'lucide-react'
import api from '../api'
import StatusDot from '../components/StatusDot'
import ProjectDrawer from '../components/ProjectDrawer'
import AddProjectModal from '../components/AddProjectModal'

/* ── Greeting ────────────────────────────────────────────── */

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Guten Morgen'
  if (h < 18) return 'Guten Tag'
  return 'Guten Abend'
}

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function useWeather() {
  const [weather, setWeather] = useState(null)
  useEffect(() => {
    fetch('https://wttr.in/Fuerth+Bayern?format=j1')
      .then(r => r.json())
      .then(d => {
        const c = d.current_condition?.[0]
        if (c) setWeather({
          temp: c.temp_C,
          desc: c.weatherDesc?.[0]?.value ?? '',
          humidity: c.humidity,
        })
      })
      .catch(() => {})
  }, [])
  return weather
}

function useQuickStats() {
  const [stats, setStats] = useState({ todayTasks: 0, inProgress: 0, lastBriefing: null })
  useEffect(() => {
    Promise.all([
      api.get('/tasks').catch(() => null),
      api.get('/tracker').catch(() => null),
      api.get('/briefing/latest').catch(() => null),
    ]).then(([tasks, tracker, briefing]) => {
      setStats({
        todayTasks:  tasks?.data?.today?.filter(t => !t.done).length ?? 0,
        inProgress:  tracker?.data?.filter(p => p.status === 'in_progress').length ?? 0,
        lastBriefing: briefing?.data?.generated_at ?? null,
      })
    })
  }, [])
  return stats
}

function useNews() {
  const [news, setNews] = useState(null)
  const fetch_ = useCallback(async () => {
    try {
      const res = await api.get('/news')
      setNews(res.data)
    } catch {
      setNews({ ki: [], finance: [] })
    }
  }, [])
  useEffect(() => {
    fetch_()
    const id = setInterval(fetch_, 30 * 60 * 1000)
    return () => clearInterval(id)
  }, [fetch_])
  return news
}

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
        background: 'var(--bg-gradient-card)',
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
      style={{ background: 'var(--bg-gradient-card)' }}
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

function NewsWidget({ title, icon: Icon, iconClass, items }) {
  if (!items) return (
    <div className="rounded-2xl border border-surface-border p-5" style={{ background: 'var(--bg-gradient-card)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={14} className={iconClass} />
        <span className="section-label">{title}</span>
      </div>
      <div className="text-xs text-gray-600">Lädt…</div>
    </div>
  )
  return (
    <div className="rounded-2xl border border-surface-border p-5" style={{ background: 'var(--bg-gradient-card)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={14} className={iconClass} />
        <span className="section-label">{title}</span>
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-gray-600">Keine News verfügbar</div>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 4).map((item, i) => (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 group hover:bg-surface-hover rounded-lg p-1.5 -mx-1.5 transition-colors"
            >
              <span className="text-xs text-gray-400 leading-snug flex-1 group-hover:text-white transition-colors line-clamp-2">
                {item.title}
              </span>
              <ExternalLink size={10} className="text-gray-700 group-hover:text-accent shrink-0 mt-0.5 transition-colors" />
            </a>
          ))}
        </div>
      )}
    </div>
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

  const now     = useClock()
  const weather = useWeather()
  const stats   = useQuickStats()
  const news    = useNews()

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

  const online   = projects.filter(p => p.current_status === 'online').length
  const down     = projects.filter(p => p.current_status === 'down').length
  const warning  = projects.filter(p => p.current_status === 'warning').length
  const clusters = groupByCluster(projects)

  const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
  const lastBriefingStr = stats.lastBriefing
    ? new Date(stats.lastBriefing).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '–'

  return (
    <div className="p-8 space-y-8 max-w-7xl">

      {/* ── Greeting ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {getGreeting()}, Dominik! 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">{dateStr} · {timeStr} Uhr</p>
        </div>

        {/* Weather */}
        <div
          className="flex items-center gap-3 rounded-2xl border border-surface-border px-5 py-3"
          style={{ background: 'var(--bg-gradient-card)' }}
        >
          <Cloud size={20} className="text-sky-400" />
          {weather ? (
            <div>
              <div className="text-lg font-semibold leading-none">{weather.temp}°C</div>
              <div className="text-[11px] text-gray-500 mt-0.5">{weather.desc} · Fürth</div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">Wetter lädt…</div>
          )}
        </div>
      </div>

      {/* ── Quick Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={CheckCircle2}
          label="Services Online"
          value={loading ? '–' : `${online}/${projects.length}`}
          sub={down > 0 ? `${down} down` : warning > 0 ? `${warning} warning` : 'Alles läuft'}
          accent={!loading && down === 0 && warning === 0}
        />
        <MetricCard
          icon={ListTodo}
          label="Offene Tasks heute"
          value={stats.todayTasks}
          sub="In der Heute-Liste"
        />
        <MetricCard
          icon={Kanban}
          label="Projekte in Arbeit"
          value={stats.inProgress}
          sub="Status: In Arbeit"
        />
        <MetricCard
          icon={CalendarDays}
          label="Letztes Briefing"
          value={lastBriefingStr === '–' ? '–' : lastBriefingStr.split(',')[0]}
          sub={lastBriefingStr !== '–' ? lastBriefingStr : 'Noch keins generiert'}
        />
      </div>

      {/* Project Grid */}
      {loading ? (
        <div className="text-gray-600 text-sm">Lade…</div>
      ) : projects.length === 0 ? (
        <div
          className="rounded-2xl border border-surface-border text-center py-16 text-gray-500"
          style={{ background: 'var(--bg-gradient-card)' }}
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


      {/* ── News ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NewsWidget
          title="KI & Tech News"
          icon={Bot}
          iconClass="text-purple-400"
          items={news?.ki}
        />
        <NewsWidget
          title="Finanz-News"
          icon={Newspaper}
          iconClass="text-emerald-400"
          items={news?.finance}
        />
      </div>

      {selected && (
        <ProjectDrawer
          project={selected}
          onClose={() => setSelected(null)}
          onUpdated={(updated) => {
            setProjects(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))
            setSelected(prev => ({ ...prev, ...updated }))
          }}
          onDeleted={(id) => {
            setProjects(prev => prev.filter(p => p.id !== id))
            setSelected(null)
          }}
        />
      )}

      {showAdd && (
        <AddProjectModal onClose={() => setShowAdd(false)} onCreated={fetchProjects} />
      )}
    </div>
  )
}
