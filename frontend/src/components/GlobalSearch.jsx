import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, Kanban, Lightbulb, StickyNote, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

const CATEGORY_META = {
  projekt: { label: 'Projekte', icon: Kanban,    color: 'text-blue-400',  to: '/tracker' },
  idee:    { label: 'Ideen',    icon: Lightbulb, color: 'text-amber-400', to: '/ideas'   },
  notiz:   { label: 'Notizen',  icon: StickyNote, color: 'text-sky-400',  to: '/notes'   },
}

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function GlobalSearch({ onNavigate }) {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [open, setOpen]         = useState(false)
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const navigate = useNavigate()
  const debounced = useDebounce(query, 250)

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (!containerRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const [tracker, ideas, notes] = await Promise.all([
        api.get('/tracker').catch(() => ({ data: [] })),
        api.get('/ideas').catch(() => ({ data: [] })),
        api.get('/notes').catch(() => ({ data: [] })),
      ])
      const ql = q.toLowerCase()
      const hits = [
        ...tracker.data
          .filter(p => p.name.toLowerCase().includes(ql) || (p.description ?? '').toLowerCase().includes(ql))
          .map(p => ({ type: 'projekt', id: p.id, title: p.name, sub: p.status })),
        ...ideas.data
          .filter(i => i.title.toLowerCase().includes(ql) || (i.body ?? '').toLowerCase().includes(ql))
          .map(i => ({ type: 'idee', id: i.id, title: i.title, sub: i.status })),
        ...notes.data
          .filter(n => n.title.toLowerCase().includes(ql) || (n.body ?? '').toLowerCase().includes(ql))
          .map(n => ({ type: 'notiz', id: n.id, title: n.title, sub: n.category })),
      ].slice(0, 12)
      setResults(hits)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { search(debounced) }, [debounced, search])

  function handleSelect(hit) {
    navigate(CATEGORY_META[hit.type].to)
    setQuery('')
    setOpen(false)
    onNavigate?.()
  }

  const grouped = Object.keys(CATEGORY_META).reduce((acc, type) => {
    const items = results.filter(r => r.type === type)
    if (items.length) acc[type] = items
    return acc
  }, {})

  return (
    <div ref={containerRef} className="relative px-3 py-2">
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Suchen…"
          className="w-full bg-surface-raised border border-surface-border rounded-xl pl-8 pr-7 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-accent/40 transition-colors"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]) }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
          >
            <X size={11} />
          </button>
        )}
      </div>

      {open && query && (
        <div
          className="absolute left-3 right-3 top-full mt-1 rounded-xl border border-surface-border shadow-2xl z-50 overflow-hidden"
          style={{ background: '#0d0f1b' }}
        >
          {loading && (
            <div className="px-4 py-3 text-xs text-gray-600">Suche…</div>
          )}

          {!loading && results.length === 0 && (
            <div className="px-4 py-3 text-xs text-gray-600">Keine Treffer für „{query}"</div>
          )}

          {!loading && Object.entries(grouped).map(([type, items]) => {
            const meta = CATEGORY_META[type]
            const Icon = meta.icon
            return (
              <div key={type}>
                <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
                  <Icon size={11} className={meta.color} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">{meta.label}</span>
                </div>
                {items.map(hit => (
                  <button
                    key={hit.id}
                    onClick={() => handleSelect(hit)}
                    className="w-full text-left px-3 py-2 hover:bg-surface-raised transition-colors flex items-center gap-2"
                  >
                    <span className="text-xs text-gray-300 flex-1 truncate">{hit.title}</span>
                    <span className="text-[10px] text-gray-600 shrink-0">{hit.sub}</span>
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
