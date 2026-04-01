import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, X, Lightbulb, ArrowRight } from 'lucide-react'
import api from '../api'

const STATUS_META = {
  new:       { label: 'Neu',         badge: 'text-gray-400 bg-surface-raised border-surface-border' },
  reviewing: { label: 'In Prüfung',  badge: 'text-amber-400 bg-amber-950/30 border-amber-900/40' },
  done:      { label: 'Umgesetzt',   badge: 'text-emerald-400 bg-emerald-950/30 border-emerald-900/40' },
  rejected:  { label: 'Verworfen',   badge: 'text-red-400 bg-red-950/30 border-red-900/40' },
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

/* ── Add Modal ───────────────────────────────────────────── */

function AddIdeaModal({ onClose, onCreated }) {
  const [form, setForm]     = useState({ title: '', body: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = { title: form.title }
      if (form.body.trim()) payload.body = form.body
      const res = await api.post('/ideas', payload)
      onCreated(res.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Fehler')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="animate-modal w-full max-w-sm rounded-2xl border border-surface-border shadow-2xl"
          style={{ background: 'linear-gradient(160deg, #0d0f1b 0%, #0a0c15 100%)' }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
            <h2 className="font-semibold text-sm">Neue Idee</h2>
            <button onClick={onClose} className="btn-ghost p-1.5"><X size={15} /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Titel</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="input"
                required
                autoFocus
                placeholder="Ideen-Titel…"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Beschreibung</label>
              <textarea
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                rows={4}
                className="input resize-none"
                placeholder="Was steckt hinter der Idee?"
              />
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 btn-outline text-sm py-2.5">
                Abbrechen
              </button>
              <button type="submit" disabled={loading} className="flex-1 btn-primary text-sm py-2.5 disabled:opacity-60">
                {loading ? 'Speichern…' : 'Speichern'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

/* ── Idea Card ───────────────────────────────────────────── */

function IdeaCard({ idea, onStatusChange, onConvert, onDelete }) {
  const [converting, setConverting] = useState(false)
  const meta        = STATUS_META[idea.status] ?? STATUS_META.new
  const isConverted = !!idea.converted_to_project_id
  const isRejected  = idea.status === 'rejected'

  async function handleConvert() {
    if (!confirm(`"${idea.title}" in ein Tracker-Projekt umwandeln?`)) return
    setConverting(true)
    try { await onConvert(idea.id) } finally { setConverting(false) }
  }

  return (
    <div
      className={`rounded-2xl border border-surface-border p-5 flex flex-col gap-3 transition-all duration-200 hover:border-accent/20 ${isRejected ? 'opacity-50' : ''}`}
      style={{ background: 'linear-gradient(160deg, #0d0f1b 0%, #0a0c15 100%)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className={`font-medium text-sm leading-snug flex-1 ${isRejected ? 'line-through text-gray-500' : ''}`}>
          {idea.title}
        </h3>
        <select
          value={idea.status}
          onChange={e => onStatusChange(idea.id, e.target.value)}
          className={`badge cursor-pointer bg-transparent shrink-0 ${meta.badge}`}
        >
          {Object.entries(STATUS_META).map(([v, { label }]) => (
            <option key={v} value={v} className="bg-surface-card text-white">{label}</option>
          ))}
        </select>
      </div>

      {/* Body */}
      {idea.body && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{idea.body}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-surface-border mt-auto">
        <span className="text-[11px] text-gray-600">{formatDate(idea.created_at)}</span>
        <div className="flex items-center gap-1">
          {isConverted ? (
            <span className="text-[11px] text-emerald-600 flex items-center gap-1">
              <Lightbulb size={11} />
              {idea.converted_project_name ?? 'Im Tracker'}
            </span>
          ) : !isRejected && (
            <button
              onClick={handleConvert}
              disabled={converting}
              className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-accent px-2 py-1 rounded-lg transition-colors disabled:opacity-40"
            >
              <ArrowRight size={11} />
              Tracker
            </button>
          )}
          <button
            onClick={() => onDelete(idea.id)}
            className="text-gray-700 hover:text-red-400 p-1.5 rounded-lg transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ───────────────────────────────────────────── */

export default function Ideas() {
  const [ideas, setIdeas]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState('all')

  const fetchIdeas = useCallback(async () => {
    try {
      const res = await api.get('/ideas')
      setIdeas(res.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchIdeas() }, [fetchIdeas])

  async function handleStatusChange(id, status) {
    const res = await api.patch(`/ideas/${id}`, { status })
    setIdeas(prev => prev.map(i => i.id === id ? res.data : i))
  }

  async function handleConvert(id) {
    const res = await api.post(`/ideas/${id}/convert`)
    setIdeas(prev => prev.map(i => i.id === id ? res.data : i))
  }

  async function handleDelete(id) {
    if (!confirm('Idee löschen?')) return
    await api.delete(`/ideas/${id}`)
    setIdeas(prev => prev.filter(i => i.id !== id))
  }

  const counts   = Object.fromEntries(Object.keys(STATUS_META).map(s => [s, ideas.filter(i => i.status === s).length]))
  const filtered = filter === 'all' ? ideas : ideas.filter(i => i.status === filter)

  const filterTabs = [
    { key: 'all', label: 'Alle', count: ideas.length },
    ...Object.entries(STATUS_META).map(([key, { label }]) => ({ key, label, count: counts[key] })).filter(t => t.count > 0),
  ]

  return (
    <div className="p-8 space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ideen</h1>
          {!loading && (
            <p className="text-sm text-gray-500 mt-1">
              {ideas.length} gesamt · {counts.new} neu · {counts.done} umgesetzt
            </p>
          )}
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} />
          Idee
        </button>
      </div>

      {/* Filter Tabs */}
      {!loading && ideas.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`text-xs px-3 py-1.5 rounded-xl border transition-all duration-150 ${
                filter === tab.key
                  ? 'border-accent/40 text-accent bg-accent/10'
                  : 'border-surface-border text-gray-500 hover:text-gray-200 hover:bg-surface-raised'
              }`}
            >
              {tab.label} <span className="opacity-60 ml-1">{tab.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-gray-600 text-sm">Lade…</div>
      ) : ideas.length === 0 ? (
        <div
          className="rounded-2xl border border-surface-border text-center py-20 text-gray-500"
          style={{ background: 'linear-gradient(160deg, #0d0f1b 0%, #0a0c15 100%)' }}
        >
          <Lightbulb size={36} className="mx-auto mb-3 text-gray-700" />
          <p className="mb-4">Noch keine Ideen erfasst.</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">
            Erste Idee aufschreiben
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-gray-600 text-sm">Keine Ideen mit diesem Filter.</div>
      ) : (
        <div className="stagger-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(idea => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onStatusChange={handleStatusChange}
              onConvert={handleConvert}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddIdeaModal onClose={() => setShowAdd(false)} onCreated={idea => setIdeas(prev => [idea, ...prev])} />
      )}
    </div>
  )
}
