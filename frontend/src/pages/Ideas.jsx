import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, X, Lightbulb, ArrowRight } from 'lucide-react'
import api from '../api'

const STATUS_META = {
  new:       { label: 'Neu',         cls: 'text-gray-400 bg-surface border-surface-border' },
  reviewing: { label: 'In Prüfung',  cls: 'text-amber-400 bg-amber-950/30 border-amber-900/40' },
  done:      { label: 'Umgesetzt',   cls: 'text-emerald-400 bg-emerald-950/30 border-emerald-900/40' },
  rejected:  { label: 'Verworfen',   cls: 'text-red-400 bg-red-950/30 border-red-900/40' },
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

/* ── Add Idea Modal ──────────────────────────────────────── */

function AddIdeaModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', body: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-surface-card border border-surface-border rounded-xl w-full max-w-sm shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
            <h2 className="font-semibold">Neue Idee</h2>
            <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Titel</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Beschreibung</label>
              <textarea
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                rows={4}
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent resize-none"
                placeholder="Was steckt hinter der Idee?"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 btn-ghost border border-surface-border py-2">
                Abbrechen
              </button>
              <button type="submit" disabled={loading} className="flex-1 btn-primary py-2 disabled:opacity-50">
                {loading ? 'Speichern...' : 'Speichern'}
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
  const meta = STATUS_META[idea.status] ?? STATUS_META.new
  const isConverted = !!idea.converted_to_project_id

  async function handleConvert() {
    if (!confirm(`"${idea.title}" in ein Tracker-Projekt umwandeln?`)) return
    setConverting(true)
    try {
      await onConvert(idea.id)
    } finally {
      setConverting(false)
    }
  }

  return (
    <div className={`card flex flex-col gap-3 ${idea.status === 'rejected' ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className={`font-medium text-sm leading-snug flex-1 ${idea.status === 'rejected' ? 'line-through text-gray-500' : ''}`}>
          {idea.title}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0">
          <select
            value={idea.status}
            onChange={(e) => onStatusChange(idea.id, e.target.value)}
            className={`text-xs px-2 py-0.5 rounded-full border cursor-pointer bg-transparent ${meta.cls}`}
          >
            {Object.entries(STATUS_META).map(([v, { label }]) => (
              <option key={v} value={v} className="bg-surface-card text-white">{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Body */}
      {idea.body && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{idea.body}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-surface-border mt-auto">
        <span className="text-xs text-gray-600">{formatDate(idea.created_at)}</span>

        <div className="flex items-center gap-1">
          {isConverted ? (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <Lightbulb size={11} />
              {idea.converted_project_name ?? 'Im Tracker'}
            </span>
          ) : idea.status !== 'rejected' && (
            <button
              onClick={handleConvert}
              disabled={converting}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-accent px-2 py-1 rounded transition-colors disabled:opacity-40"
              title="In Tracker-Projekt umwandeln"
            >
              <ArrowRight size={12} />
              Tracker
            </button>
          )}
          <button
            onClick={() => onDelete(idea.id)}
            className="text-gray-600 hover:text-red-400 p-1 rounded transition-colors"
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
  const [ideas, setIdeas] = useState([])
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

  function handleCreated(idea) {
    setIdeas((prev) => [idea, ...prev])
  }

  async function handleStatusChange(id, status) {
    const res = await api.patch(`/ideas/${id}`, { status })
    setIdeas((prev) => prev.map((i) => i.id === id ? res.data : i))
  }

  async function handleConvert(id) {
    const res = await api.post(`/ideas/${id}/convert`)
    setIdeas((prev) => prev.map((i) => i.id === id ? res.data : i))
  }

  async function handleDelete(id) {
    if (!confirm('Idee löschen?')) return
    await api.delete(`/ideas/${id}`)
    setIdeas((prev) => prev.filter((i) => i.id !== id))
  }

  const filtered = filter === 'all' ? ideas : ideas.filter((i) => i.status === filter)
  const counts = Object.fromEntries(Object.keys(STATUS_META).map((s) => [s, ideas.filter((i) => i.status === s).length]))

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Ideen</h1>
          {!loading && (
            <p className="text-xs text-gray-500 mt-0.5">
              {ideas.length} gesamt · {counts.new} neu · {counts.done} umgesetzt
            </p>
          )}
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={15} />
          Idee
        </button>
      </div>

      {/* Filter Tabs */}
      {!loading && ideas.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              filter === 'all' ? 'border-accent/50 text-accent bg-accent/10' : 'border-surface-border text-gray-500 hover:text-white'
            }`}
          >
            Alle ({ideas.length})
          </button>
          {Object.entries(STATUS_META).map(([key, { label }]) => counts[key] > 0 && (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                filter === key ? 'border-accent/50 text-accent bg-accent/10' : 'border-surface-border text-gray-500 hover:text-white'
              }`}
            >
              {label} ({counts[key]})
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-gray-500">Lade...</div>
      ) : ideas.length === 0 ? (
        <div className="card text-center py-16 text-gray-500">
          <Lightbulb size={32} className="mx-auto mb-3 text-gray-700" />
          <p className="mb-3">Noch keine Ideen erfasst.</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">
            Erste Idee aufschreiben
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-gray-600 text-sm">Keine Ideen mit diesem Filter.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((idea) => (
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
        <AddIdeaModal onClose={() => setShowAdd(false)} onCreated={handleCreated} />
      )}
    </div>
  )
}
