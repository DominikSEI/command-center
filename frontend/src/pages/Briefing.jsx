import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Loader2, Sparkles, Youtube, CalendarDays, AlertCircle, ExternalLink, Bot, TrendingUp, History } from 'lucide-react'
import api from '../api'

/* ── Markdown-like summary renderer ─────────────────────────────────────── */

function SummaryRenderer({ text }) {
  if (!text) return null

  const lines = text.split('\n')
  const elements = []
  let key = 0

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      elements.push(<div key={key++} className="h-2" />)
      continue
    }

    if (/^#{1,3}\s/.test(line) || /^\*\*[^*]+\*\*$/.test(line)) {
      const label = line.replace(/^#{1,3}\s/, '').replace(/\*\*/g, '')
      elements.push(
        <h3 key={key++} className="text-xs font-semibold tracking-widest uppercase text-accent mt-5 mb-2 first:mt-0">
          {label}
        </h3>
      )
      continue
    }

    const isBullet = /^[-•*]\s/.test(line)
    const content  = line.replace(/^[-•*]\s/, '')
    const parts = content.split(/(\*\*[^*]+\*\*)/)
    const rendered = parts.map((p, i) =>
      p.startsWith('**')
        ? <strong key={i} className="text-gray-200 font-medium">{p.replace(/\*\*/g, '')}</strong>
        : p
    )

    if (isBullet) {
      elements.push(
        <div key={key++} className="flex gap-2 text-sm text-gray-400 leading-relaxed mb-1.5">
          <span className="text-accent mt-[3px] shrink-0">•</span>
          <span>{rendered}</span>
        </div>
      )
    } else {
      elements.push(
        <p key={key++} className="text-sm text-gray-400 leading-relaxed mb-1">{rendered}</p>
      )
    }
  }

  return <div>{elements}</div>
}

/* ── Section card ────────────────────────────────────────────────────────── */

function SectionCard({ icon: Icon, label, color, text, fallback }) {
  return (
    <div
      className="rounded-2xl border border-surface-border p-6"
      style={{ background: 'var(--bg-gradient-card)' }}
    >
      <div className="flex items-center gap-2 mb-5">
        <Icon size={13} className={color} />
        <span className={`text-[11px] font-semibold tracking-widest uppercase ${color}`}>{label}</span>
      </div>
      {text
        ? <SummaryRenderer text={text} />
        : <p className="text-sm text-gray-600 italic">{fallback}</p>
      }
    </div>
  )
}

/* ── Video Card ──────────────────────────────────────────────────────────── */

function VideoCard({ video }) {
  const date = new Date(video.published_at).toLocaleDateString('de-DE', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })

  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 rounded-xl border border-surface-border p-3 hover:border-accent/30 transition-all duration-150"
      style={{ background: 'var(--bg-gradient-card)' }}
    >
      {video.thumbnail ? (
        <img src={video.thumbnail} alt="" className="w-24 h-14 object-cover rounded-lg shrink-0 bg-surface-raised" />
      ) : (
        <div className="w-24 h-14 rounded-lg bg-surface-raised shrink-0 flex items-center justify-center">
          <Youtube size={20} className="text-gray-700" />
        </div>
      )}
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <p className="text-xs font-medium leading-snug line-clamp-2 group-hover:text-accent transition-colors">
          {video.title}
        </p>
        <p className="text-[11px] text-gray-600 mt-auto">{video.channel} · {date}</p>
      </div>
      <ExternalLink size={12} className="text-gray-700 group-hover:text-accent shrink-0 mt-0.5 transition-colors" />
    </a>
  )
}

/* ── Briefing content ────────────────────────────────────────────────────── */

function BriefingContent({ item, showVideos }) {
  const hasNewSections = item.summary_agent || item.summary_ai || item.summary_stocks

  return (
    <div className="space-y-4">
      {/* Agent section — full width, violet */}
      <SectionCard
        icon={Bot}
        label="Persönliche Tagesvorschau"
        color="text-violet-400"
        text={item.summary_agent}
        fallback="Tagesvorschau konnte nicht generiert werden."
      />

      {/* KI & Stocks — 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard
          icon={Sparkles}
          label="KI &amp; Tech"
          color="text-purple-400"
          text={item.summary_ai}
          fallback="Keine KI & Tech Videos in den letzten 24h."
        />
        <SectionCard
          icon={TrendingUp}
          label="Aktien &amp; Märkte"
          color="text-emerald-400"
          text={item.summary_stocks}
          fallback="Keine Aktien & Märkte Videos in den letzten 24h."
        />
      </div>

      {/* Fallback for old briefings without split sections */}
      {!hasNewSections && item.summary && (
        <SectionCard
          icon={Sparkles}
          label="KI-Zusammenfassung"
          color="text-accent"
          text={item.summary}
          fallback=""
        />
      )}

      {/* Videos — only for latest (full data) */}
      {showVideos && item.videos?.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Youtube size={14} className="text-red-500" />
            <span className="section-label">Analysierte Videos</span>
            <span className="text-[11px] text-gray-600 font-normal normal-case tracking-normal">
              ({item.videos.length})
            </span>
            <div className="flex-1 h-px bg-surface-border" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {item.videos.map(v => <VideoCard key={v.id} video={v} />)}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Main Page ───────────────────────────────────────────────────────────── */

export default function Briefing() {
  const [briefing, setBriefing]     = useState(null)   // full latest (with videos)
  const [history, setHistory]       = useState([])     // 14 history items
  const [selectedId, setSelectedId] = useState(null)   // null = latest
  const [loading, setLoading]       = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError]           = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [latestRes, historyRes] = await Promise.allSettled([
        api.get('/briefing/latest'),
        api.get('/briefing/history'),
      ])
      if (latestRes.status === 'fulfilled') setBriefing(latestRes.value.data)
      else if (latestRes.reason?.response?.status !== 404) setError('Briefing konnte nicht geladen werden.')
      if (historyRes.status === 'fulfilled') setHistory(historyRes.value.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    try {
      const res = await api.post('/briefing/generate')
      setBriefing(res.data)
      setSelectedId(null)
      // Refresh history list
      const h = await api.get('/briefing/history')
      setHistory(h.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Generierung fehlgeschlagen.')
    } finally {
      setGenerating(false)
    }
  }

  // What we're currently showing
  const viewing = selectedId
    ? history.find(h => h.id === selectedId) ?? briefing
    : briefing

  const isLatest = !selectedId || (briefing && selectedId === briefing.id)

  const genDate = viewing
    ? new Date(viewing.generated_at).toLocaleDateString('de-DE', {
        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="px-6 py-5 border-b border-surface-border shrink-0 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[15px] font-semibold text-white">Daily Briefing</h1>
          {genDate && !loading && (
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
              <CalendarDays size={11} />
              {genDate}
              {viewing?.video_count > 0 && (
                <span className="text-gray-600">· {viewing.video_count} Videos</span>
              )}
            </p>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="btn-primary flex items-center gap-2 text-sm shrink-0 disabled:opacity-60"
        >
          {generating
            ? <><Loader2 size={14} className="animate-spin" />Generiere…</>
            : <><RefreshCw size={14} />Jetzt generieren</>
          }
        </button>
      </div>

      {/* ── Body: sidebar + content ───────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* History sidebar (desktop) */}
        {history.length > 0 && (
          <aside className="hidden md:flex flex-col w-48 shrink-0 border-r border-surface-border overflow-y-auto py-3 px-2 gap-0.5">
            <div className="flex items-center gap-1.5 px-2 pb-2 mb-1 border-b border-surface-border">
              <History size={11} className="text-gray-600" />
              <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-600">Verlauf</span>
            </div>
            {history.map(h => {
              const isSelected = selectedId === h.id || (!selectedId && briefing && h.id === briefing.id)
              const d = new Date(h.generated_at)
              return (
                <button
                  key={h.id}
                  onClick={() => setSelectedId(h.id === briefing?.id ? null : h.id)}
                  className={`text-left px-2 py-2 rounded-lg text-xs transition-all duration-150 ${
                    isSelected
                      ? 'bg-accent/10 text-accent'
                      : 'text-gray-500 hover:text-gray-200 hover:bg-surface-hover'
                  }`}
                >
                  <div className="font-medium">{d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}</div>
                  <div className="text-[10px] text-gray-600 mt-0.5">{d.toLocaleDateString('de-DE', { weekday: 'short' })}</div>
                </button>
              )
            })}
          </aside>
        )}

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Mobile: history dropdown */}
          {history.length > 1 && (
            <div className="md:hidden">
              <select
                value={selectedId ?? (briefing?.id ?? '')}
                onChange={e => setSelectedId(briefing && Number(e.target.value) === briefing.id ? null : Number(e.target.value))}
                className="input text-sm w-full"
              >
                {history.map(h => (
                  <option key={h.id} value={h.id}>
                    {new Date(h.generated_at).toLocaleDateString('de-DE', {
                      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-400">
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Loading / generating */}
          {(loading || generating) && (
            <div
              className="rounded-2xl border border-surface-border p-12 flex flex-col items-center justify-center gap-4"
              style={{ background: 'var(--bg-gradient-card)' }}
            >
              <Loader2 size={32} className="animate-spin text-accent" />
              <p className="text-sm text-gray-500 text-center max-w-xs">
                {generating
                  ? 'YouTube-Videos werden geladen, Transkripte geholt und per KI zusammengefasst…'
                  : 'Lade Briefing…'}
              </p>
            </div>
          )}

          {/* Empty state */}
          {!loading && !generating && !viewing && !error && (
            <div
              className="rounded-2xl border border-surface-border text-center py-20 text-gray-500"
              style={{ background: 'var(--bg-gradient-card)' }}
            >
              <Sparkles size={36} className="mx-auto mb-3 text-gray-700" />
              <p className="mb-4">Noch kein Briefing vorhanden.</p>
              <button onClick={handleGenerate} disabled={generating} className="btn-primary text-sm disabled:opacity-60">
                Erstes Briefing erstellen
              </button>
            </div>
          )}

          {/* Content */}
          {!loading && !generating && viewing && (
            <BriefingContent item={viewing} showVideos={isLatest} />
          )}
        </div>
      </div>
    </div>
  )
}
