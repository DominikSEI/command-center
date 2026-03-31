import { useEffect, useState, useCallback } from 'react'
import { Plus, ArrowRight, ArrowLeft, Trash2, Check, X, ChevronDown } from 'lucide-react'
import api from '../api'

/* ── Add Task Modal ──────────────────────────────────────── */

function AddTaskModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', tracker_project_id: '' })
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/tracker').then((r) => setProjects(r.data)).catch(() => {})
  }, [])

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

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
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-surface-card border border-surface-border rounded-xl w-full max-w-sm shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
            <h2 className="font-semibold">Neue Aufgabe</h2>
            <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Titel</label>
              <input
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Beschreibung</label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={2}
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent resize-none"
                placeholder="Optional..."
              />
            </div>
            {projects.length > 0 && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Projekt</label>
                <select
                  value={form.tracker_project_id}
                  onChange={(e) => set('tracker_project_id', e.target.value)}
                  className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                >
                  <option value="">— Kein Projekt —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 btn-ghost border border-surface-border py-2">
                Abbrechen
              </button>
              <button type="submit" disabled={loading} className="flex-1 btn-primary py-2 disabled:opacity-50">
                {loading ? 'Erstellen...' : 'Erstellen'}
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
    <div className="group rounded-lg border border-surface-border bg-surface-card px-3 py-2.5 transition-colors hover:border-accent/30">
      <div className="flex items-center gap-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-200 truncate">{task.title}</span>
            {task.project_name && (
              <span className="text-xs text-gray-600 bg-surface px-1.5 py-0.5 rounded shrink-0">
                {task.project_name}
              </span>
            )}
            {task.description && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-gray-600 hover:text-gray-400 transition-colors shrink-0"
              >
                <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
          {expanded && task.description && (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{task.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onMoveToToday(task.id)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-accent px-2 py-1 rounded transition-colors"
            title="Heute hinzufügen"
          >
            <ArrowRight size={13} />
            <span className="hidden sm:inline">Heute</span>
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="text-gray-600 hover:text-red-400 p-1 rounded transition-colors"
          >
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
    <div className={`group rounded-lg border px-3 py-2.5 transition-colors ${
      task.done
        ? 'border-surface-border bg-surface/40'
        : 'border-surface-border bg-surface-card hover:border-accent/30'
    }`}>
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => onToggle(task.id, !task.done)}
          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
            task.done ? 'bg-accent border-accent' : 'border-surface-border hover:border-accent'
          }`}
        >
          {task.done && <Check size={10} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm truncate ${task.done ? 'line-through text-gray-600' : 'text-gray-200'}`}>
              {task.title}
            </span>
            {task.project_name && (
              <span className="text-xs text-gray-600 bg-surface px-1.5 py-0.5 rounded shrink-0">
                {task.project_name}
              </span>
            )}
            {task.description && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-gray-600 hover:text-gray-400 transition-colors shrink-0"
              >
                <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
          {expanded && task.description && (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{task.description}</p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {!task.done && (
            <button
              onClick={() => onMoveToBacklog(task.id)}
              className="text-gray-600 hover:text-gray-300 p-1 rounded transition-colors"
              title="Zurück ins Backlog"
            >
              <ArrowLeft size={12} />
            </button>
          )}
          <button
            onClick={() => onDelete(task.id)}
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

export default function Tasks() {
  const [backlog, setBacklog] = useState([])
  const [today, setToday] = useState([])
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

  function handleCreated(task) {
    setBacklog((prev) => [...prev, task])
  }

  async function moveToToday(id) {
    const res = await api.patch(`/tasks/${id}`, { bucket: 'today' })
    setBacklog((prev) => prev.filter((t) => t.id !== id))
    setToday((prev) => [...prev, res.data])
  }

  async function moveToBacklog(id) {
    const res = await api.patch(`/tasks/${id}`, { bucket: 'backlog' })
    setToday((prev) => prev.filter((t) => t.id !== id))
    setBacklog((prev) => [...prev, res.data])
  }

  async function toggleDone(id, done) {
    const res = await api.patch(`/tasks/${id}`, { done })
    setToday((prev) => prev.map((t) => t.id === id ? res.data : t))
  }

  async function deleteTask(id, bucket) {
    await api.delete(`/tasks/${id}`)
    if (bucket === 'backlog') setBacklog((prev) => prev.filter((t) => t.id !== id))
    else setToday((prev) => prev.filter((t) => t.id !== id))
  }

  const doneCount = today.filter((t) => t.done).length

  return (
    <div className="p-6 h-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold">Tasks</h1>
          {!loading && (
            <p className="text-xs text-gray-500 mt-0.5">
              {backlog.length} im Backlog · {doneCount}/{today.length} heute erledigt
            </p>
          )}
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={15} />
          Aufgabe
        </button>
      </div>

      {loading ? (
        <div className="text-gray-500">Lade...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
          {/* ── Backlog ── */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Backlog
                <span className="ml-2 text-gray-600 font-normal normal-case tracking-normal">({backlog.length})</span>
              </h2>
            </div>

            {backlog.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-600 text-sm">Backlog ist leer.</p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto pr-1">
                {backlog.map((task) => (
                  <BacklogRow
                    key={task.id}
                    task={task}
                    onMoveToToday={moveToToday}
                    onDelete={(id) => deleteTask(id, 'backlog')}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Heute ── */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Heute
                <span className="ml-2 text-gray-600 font-normal normal-case tracking-normal">({today.length})</span>
              </h2>
              {doneCount > 0 && today.length > 0 && (
                <span className="text-xs text-gray-500">
                  {Math.round((doneCount / today.length) * 100)}% erledigt
                </span>
              )}
            </div>

            {today.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-600 text-sm text-center leading-relaxed">
                  Keine Aufgaben für heute.<br />
                  <span className="text-gray-700">Ziehe Aufgaben aus dem Backlog herüber.</span>
                </p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto pr-1">
                {/* Unerledigte zuerst */}
                {[...today.filter((t) => !t.done), ...today.filter((t) => t.done)].map((task) => (
                  <TodayRow
                    key={task.id}
                    task={task}
                    onToggle={toggleDone}
                    onMoveToBacklog={moveToBacklog}
                    onDelete={(id) => deleteTask(id, 'today')}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showAdd && (
        <AddTaskModal onClose={() => setShowAdd(false)} onCreated={handleCreated} />
      )}
    </div>
  )
}
