import { useEffect, useState, useCallback } from 'react'
import { Plus, ArrowRight, ArrowLeft, Trash2, Check, X, ChevronDown } from 'lucide-react'
import api from '../api'

/* ── Add Task Modal ──────────────────────────────────────── */

function AddTaskModal({ onClose, onCreated }) {
  const [form, setForm]       = useState({ title: '', description: '', tracker_project_id: '' })
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    api.get('/tracker').then(r => setProjects(r.data)).catch(() => {})
  }, [])

  function set(key, value) { setForm(f => ({ ...f, [key]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = { title: form.title }
      if (form.description.trim()) payload.description = form.description
      if (form.tracker_project_id) payload.tracker_project_id = parseInt(form.tracker_project_id)
      const res = await api.post('/tasks', payload)
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
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl border border-surface-border">
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
            <h2 className="font-semibold text-stone-800">Neue Aufgabe</h2>
            <button onClick={onClose} className="btn-ghost p-1.5"><X size={15} /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wide">Titel</label>
              <input value={form.title} onChange={e => set('title', e.target.value)} className="input" required autoFocus placeholder="Aufgabentitel…" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wide">Beschreibung</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} className="input resize-none" placeholder="Optional…" />
            </div>
            {projects.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wide">Projekt</label>
                <select value={form.tracker_project_id} onChange={e => set('tracker_project_id', e.target.value)} className="input">
                  <option value="">— Kein Projekt —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            {error && <p className="text-red-600 text-xs">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 btn-outline text-sm py-2.5">Abbrechen</button>
              <button type="submit" disabled={loading} className="flex-1 btn-primary text-sm py-2.5 disabled:opacity-60">
                {loading ? 'Erstellen…' : 'Erstellen'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

/* ── Backlog Task Row ────────────────────────────────────── */

function BacklogRow({ task, onMoveToToday, onDelete }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="group bg-white rounded-xl border border-surface-border px-4 py-3 transition-all hover:shadow-card-md hover:border-accent/20">
      <div className="flex items-center gap-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-stone-700 font-medium truncate">{task.title}</span>
            {task.project_name && (
              <span className="text-xs text-stone-400 bg-surface-raised border border-surface-border px-1.5 py-0.5 rounded-lg shrink-0">
                {task.project_name}
              </span>
            )}
            {task.description && (
              <button onClick={() => setExpanded(v => !v)} className="text-stone-300 hover:text-stone-500 shrink-0">
                <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
          {expanded && task.description && (
            <p className="text-xs text-stone-400 mt-1 leading-relaxed">{task.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onMoveToToday(task.id)}
            className="flex items-center gap-1 text-xs text-stone-400 hover:text-accent px-2 py-1 rounded-lg transition-colors bg-surface-hover"
          >
            <ArrowRight size={12} />
            <span className="hidden sm:inline">Heute</span>
          </button>
          <button onClick={() => onDelete(task.id)} className="text-stone-300 hover:text-red-500 p-1.5 rounded-lg transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Today Task Row ──────────────────────────────────────── */

function TodayRow({ task, onToggle, onMoveToBacklog, onDelete }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`group bg-white rounded-xl border px-4 py-3 transition-all ${
      task.done
        ? 'border-surface-border opacity-60'
        : 'border-surface-border hover:shadow-card-md hover:border-accent/20'
    }`}>
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => onToggle(task.id, !task.done)}
          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
            task.done
              ? 'border-accent bg-accent'
              : 'border-surface-border hover:border-accent'
          }`}
        >
          {task.done && <Check size={9} className="text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium truncate ${task.done ? 'line-through text-stone-400' : 'text-stone-700'}`}>
              {task.title}
            </span>
            {task.project_name && (
              <span className="text-xs text-stone-400 bg-surface-raised border border-surface-border px-1.5 py-0.5 rounded-lg shrink-0">
                {task.project_name}
              </span>
            )}
            {task.description && (
              <button onClick={() => setExpanded(v => !v)} className="text-stone-300 hover:text-stone-500 shrink-0">
                <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
          {expanded && task.description && (
            <p className="text-xs text-stone-400 mt-1 leading-relaxed">{task.description}</p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {!task.done && (
            <button onClick={() => onMoveToBacklog(task.id)} className="text-stone-300 hover:text-stone-500 p-1.5 rounded-lg transition-colors" title="Zurück ins Backlog">
              <ArrowLeft size={12} />
            </button>
          )}
          <button onClick={() => onDelete(task.id)} className="text-stone-300 hover:text-red-500 p-1.5 rounded-lg transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ───────────────────────────────────────────── */

export default function Tasks() {
  const [backlog, setBacklog] = useState([])
  const [today, setToday]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get('/tasks')
      setBacklog(res.data.backlog)
      setToday(res.data.today)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  async function moveToToday(id) {
    const res = await api.patch(`/tasks/${id}`, { bucket: 'today' })
    setBacklog(prev => prev.filter(t => t.id !== id))
    setToday(prev => [...prev, res.data])
  }

  async function moveToBacklog(id) {
    const res = await api.patch(`/tasks/${id}`, { bucket: 'backlog' })
    setToday(prev => prev.filter(t => t.id !== id))
    setBacklog(prev => [...prev, res.data])
  }

  async function toggleDone(id, done) {
    const res = await api.patch(`/tasks/${id}`, { done })
    setToday(prev => prev.map(t => t.id === id ? res.data : t))
  }

  async function deleteTask(id, bucket) {
    await api.delete(`/tasks/${id}`)
    if (bucket === 'backlog') setBacklog(prev => prev.filter(t => t.id !== id))
    else setToday(prev => prev.filter(t => t.id !== id))
  }

  const doneCount = today.filter(t => t.done).length

  return (
    <div className="p-8 h-full flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">Tasks</h1>
          {!loading && (
            <p className="text-sm text-stone-400 mt-1">
              {backlog.length} im Backlog · {doneCount}/{today.length} heute erledigt
            </p>
          )}
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} />
          Aufgabe
        </button>
      </div>

      {loading ? (
        <div className="text-stone-400 text-sm">Lade…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
          {/* Backlog */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center gap-3 mb-4 shrink-0">
              <span className="section-label">Backlog</span>
              <span className="text-[11px] text-stone-400">({backlog.length})</span>
              <div className="flex-1 h-px bg-surface-border" />
            </div>
            {backlog.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-stone-400 text-sm">Backlog ist leer 🎉</p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto pr-1">
                {backlog.map(task => (
                  <BacklogRow key={task.id} task={task} onMoveToToday={moveToToday} onDelete={id => deleteTask(id, 'backlog')} />
                ))}
              </div>
            )}
          </div>

          {/* Heute */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center gap-3 mb-4 shrink-0">
              <span className="section-label">Heute</span>
              <span className="text-[11px] text-stone-400">({today.length})</span>
              {doneCount > 0 && today.length > 0 && (
                <span className="text-[11px] text-emerald-600 font-medium ml-auto">
                  {Math.round((doneCount / today.length) * 100)}% erledigt
                </span>
              )}
              {!(doneCount > 0 && today.length > 0) && <div className="flex-1 h-px bg-surface-border" />}
            </div>
            {today.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-stone-400 text-sm text-center leading-relaxed">
                  Keine Aufgaben für heute.<br />
                  <span className="text-stone-300">Aufgaben aus dem Backlog hinzufügen.</span>
                </p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto pr-1">
                {[...today.filter(t => !t.done), ...today.filter(t => t.done)].map(task => (
                  <TodayRow
                    key={task.id}
                    task={task}
                    onToggle={toggleDone}
                    onMoveToBacklog={moveToBacklog}
                    onDelete={id => deleteTask(id, 'today')}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showAdd && <AddTaskModal onClose={() => setShowAdd(false)} onCreated={task => setBacklog(prev => [...prev, task])} />}
    </div>
  )
}
