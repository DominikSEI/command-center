import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, ExternalLink, Trash2, X, StickyNote } from 'lucide-react'
import api from '../api'

const CATEGORIES = [
  { value: 'alle',      label: 'Alle' },
  { value: 'ki_news',   label: 'KI-News' },
  { value: 'idee',      label: 'Idee' },
  { value: 'tool',      label: 'Tool' },
  { value: 'sonstiges', label: 'Sonstiges' },
]

const CAT_META = {
  ki_news:   { label: 'KI-News',   badge: 'text-purple-400 bg-purple-950/30 border-purple-900/40' },
  idee:      { label: 'Idee',      badge: 'text-amber-400 bg-amber-950/30 border-amber-900/40' },
  tool:      { label: 'Tool',      badge: 'text-blue-400 bg-blue-950/30 border-blue-900/40' },
  sonstiges: { label: 'Sonstiges', badge: 'text-gray-400 bg-surface-raised border-surface-border' },
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

/* ── Add Note Modal ────────────────────────────────────── */

function AddNoteModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', body: '', category: 'sonstiges', link: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(key, value) { setForm(f => ({ ...f, [key]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = { title: form.title, category: form.category }
      if (form.body.trim())  payload.body = form.body
      if (form.link.trim())  payload.link = form.link
      const res = await api.post('/notes', payload)
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
        <div className="bg-surface-card border border-surface-border rounded-xl w-full max-w-md shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
            <h2 className="font-semibold">Neue Notiz</h2>
            <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Titel</label>
              <input
                value={form.title}
                onChange={e => set('title', e.target.value)}
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Inhalt</label>
              <textarea
                value={form.body}
                onChange={e => set('body', e.target.value)}
                rows={4}
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent resize-none"
                placeholder="Optional..."
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Kategorie</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.filter(c => c.value !== 'alle').map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => set('category', c.value)}
                    className={`px-3 py-1 rounded-lg text-xs border transition-colors ${
                      form.category === c.value
                        ? 'border-accent text-accent bg-accent/10'
                        : 'border-surface-border text-gray-500 hover:border-accent/40'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Link <span className="text-gray-600">(optional)</span></label>
              <input
                value={form.link}
                onChange={e => set('link', e.target.value)}
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                placeholder="https://..."
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

/* ── Note Card ─────────────────────────────────────────── */

function NoteCard({ note, onDelete }) {
  const meta = CAT_META[note.category] ?? CAT_META.sonstiges

  return (
    <div
      className="rounded-2xl border border-surface-border p-5 flex flex-col gap-3 group"
      style={{ background: 'linear-gradient(160deg, #0d0f1b 0%, #0a0c15 100%)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm leading-snug flex-1">{note.title}</h3>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`badge ${meta.badge}`}>{meta.label}</span>
          <button
            onClick={() => onDelete(note.id)}
            className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 p-1 rounded transition-all"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {note.body && (
        <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap">{note.body}</p>
      )}

      <div className="flex items-center justify-between mt-auto pt-1">
        <span className="text-[11px] text-gray-700">{formatDate(note.created_at)}</span>
        {note.link && (
          <a
            href={note.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-accent hover:text-accent/80 transition-colors"
          >
            <ExternalLink size={11} />
            Link öffnen
          </a>
        )}
      </div>
    </div>
  )
}

/* ── Main Page ─────────────────────────────────────────── */

export default function Notes() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('alle')

  const fetchNotes = useCallback(async () => {
    try {
      const res = await api.get('/notes')
      setNotes(res.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  async function deleteNote(id) {
    await api.delete(`/notes/${id}`)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  const filtered = notes.filter(n => {
    const matchCat = activeCategory === 'alle' || n.category === activeCategory
    const q = search.toLowerCase()
    const matchSearch = !q || n.title.toLowerCase().includes(q) || (n.body ?? '').toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notizen</h1>
          {!loading && (
            <p className="text-sm text-gray-500 mt-1">
              {notes.length} Notizen gespeichert
            </p>
          )}
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} />
          Notiz
        </button>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Suchen..."
            className="w-full bg-surface-card border border-surface-border rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => setActiveCategory(c.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                activeCategory === c.value
                  ? 'border-accent text-accent bg-accent/10'
                  : 'border-surface-border text-gray-500 hover:border-accent/40'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-gray-600 text-sm">Lade…</div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-2xl border border-surface-border text-center py-20 text-gray-500"
          style={{ background: 'linear-gradient(160deg, #0d0f1b 0%, #0a0c15 100%)' }}
        >
          <StickyNote size={36} className="mx-auto mb-3 text-gray-700" />
          <p className="mb-4">
            {search || activeCategory !== 'alle' ? 'Keine Treffer.' : 'Noch keine Notizen.'}
          </p>
          {!search && activeCategory === 'alle' && (
            <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">
              Erste Notiz erstellen
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(n => (
            <NoteCard key={n.id} note={n} onDelete={deleteNote} />
          ))}
        </div>
      )}

      {showAdd && (
        <AddNoteModal
          onClose={() => setShowAdd(false)}
          onCreated={n => setNotes(prev => [n, ...prev])}
        />
      )}
    </div>
  )
}
