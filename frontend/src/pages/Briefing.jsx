import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Loader2, Sparkles, Youtube, CalendarDays, AlertCircle, ExternalLink } from 'lucide-react'
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

    // Section headers: **KI-News** or ### KI-News
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

    // Inline bold
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
        <img
          src={video.thumbnail}
          alt=""
          className="w-24 h-14 object-cover rounded-lg shrink-0 bg-surface-raised"
        />
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

/* ── Main Page ───────────────────────────────────────────────────────────── */

export default function Briefing() {
  const [briefing, setBriefing]       = useState(null)
  const [loading, setLoading]         = useState(true)
  const [generating, setGenerating]   = useState(false)
  const [error, setError]             = useState('')

  const fetchLatest = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/briefing/latest')
      setBriefing(res.data)
    } catch (err) {
      if (err.response?.status !== 404) setError('Briefing konnte nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLatest() }, [fetchLatest])

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    try {
      const res = await api.post('/briefing/generate')
      setBriefing(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Generierung fehlgeschlagen.')
    } finally {
      setGenerating(false)
    }
  }

  const genDate = briefing
    ? new Date(briefing.generated_at).toLocaleDateString('de-DE', {
        weekday: 'long', day: '2-digit', month: 'long',
        year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <div className="p-8 space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Daily Briefing</h1>
          {genDate && !loading && (
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
              <CalendarDays size={13} />
              {genDate}
              {briefing.video_count > 0 && (
                <span className="text-gray-600">· {briefing.video_count} Videos analysiert</span>
              )}
            </p>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60"
        >
          {generating
            ? <><Loader2 size={14} className="animate-spin" />Generiere…</>
            : <><RefreshCw size={14} />Jetzt generieren</>
          }
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-400">
          <AlertCircle size={15} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Loading / generating state */}
      {(loading || generating) && (
        <div
          className="rounded-2xl border border-surface-border p-12 flex flex-col items-center justify-center gap-4"
          style={{ background: 'var(--bg-gradient-card)' }}
        >
          <Loader2 size={32} className="animate-spin text-accent" />
          <p className="text-sm text-gray-500 text-center max-w-xs">
            {generating
              ? 'YouTube-Videos werden geladen, Transkripte geholt und per KI zusammengefasst…'
              : 'Lade letztes Briefing…'}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !generating && !briefing && !error && (
        <div
          className="rounded-2xl border border-surface-border text-center py-20 text-gray-500"
          style={{ background: 'var(--bg-gradient-card)' }}
        >
          <Sparkles size={36} className="mx-auto mb-3 text-gray-700" />
          <p className="mb-4">Noch kein Briefing vorhanden.</p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary text-sm disabled:opacity-60"
          >
            Erstes Briefing erstellen
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !generating && briefing && (
        <div className="space-y-6">
          {/* Split summaries */}
          {(briefing.summary_ai || briefing.summary_stocks) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                className="rounded-2xl border border-surface-border p-6"
                style={{ background: 'var(--bg-gradient-card)' }}
              >
                <div className="flex items-center gap-2 mb-5">
                  <Sparkles size={13} className="text-purple-400" />
                  <span className="text-[11px] font-semibold tracking-widest uppercase text-purple-400">
                    KI &amp; Tech
                  </span>
                </div>
                <SummaryRenderer text={briefing.summary_ai} />
              </div>
              <div
                className="rounded-2xl border border-surface-border p-6"
                style={{ background: 'var(--bg-gradient-card)' }}
              >
                <div className="flex items-center gap-2 mb-5">
                  <Sparkles size={13} className="text-emerald-400" />
                  <span className="text-[11px] font-semibold tracking-widest uppercase text-emerald-400">
                    Aktien &amp; Märkte
                  </span>
                </div>
                <SummaryRenderer text={briefing.summary_stocks} />
              </div>
            </div>
          ) : (
            /* Fallback: combined summary for older briefings */
            <div
              className="rounded-2xl border border-surface-border p-6"
              style={{ background: 'var(--bg-gradient-card)' }}
            >
              <div className="flex items-center gap-2 mb-5">
                <Sparkles size={13} className="text-accent" />
                <span className="text-[11px] font-semibold tracking-widest uppercase text-accent">
                  KI-Zusammenfassung
                </span>
              </div>
              <SummaryRenderer text={briefing.summary} />
            </div>
          )}

          {/* Analysed videos */}
          {briefing.videos?.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Youtube size={14} className="text-red-500" />
                <span className="section-label">Analysierte Videos</span>
                <span className="text-[11px] text-gray-600 font-normal normal-case tracking-normal">
                  ({briefing.videos.length})
                </span>
                <div className="flex-1 h-px bg-surface-border" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {briefing.videos.map(v => (
                  <VideoCard key={v.id} video={v} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
