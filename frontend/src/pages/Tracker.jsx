import { useEffect, useState, useCallback } from 'react'
import { Plus, ChevronDown, ChevronUp, Trash2, Check } from 'lucide-react'
import api from '../api'

const STATUS_LABELS = {
  idea: { label: 'Idee', cls: 'text-gray-400 bg-surface border-surface-border' },
  in_progress: { label: 'In Arbeit', cls: 'text-blue-400 bg-blue-950/30 border-blue-900/40' },
  review: { label: 'Review', cls: 'text-amber-400 bg-amber-950/30 border-amber-900/40' },
  live: { label: 'Live', cls: 'text-emerald-400 bg-emerald-950/30 border-emerald-900/40' },
}

function ProgressBar({ value }) {
  return (
    <div className="w-full bg-surface rounded-full h-1.5 mt-3">
      <div
        className="h-1.5 rounded-full bg-accent transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

function TrackerCard({ project, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false)
  const [newTodo, setNewTodo] = useState('')
  const s = STATUS_LABELS[project.status] ?? STATUS_LABELS.idea

  async function addTodo(e) {
    e.preventDefault()
    if (!newTodo.trim()) return
    await api.post(`/tracker/${project.id}/todos`, { title: newTodo })
    setNewTodo('')
    onUpdate()
  }

  async function toggleTodo(todoId) {
    await api.patch(`/tracker/${project.id}/todos/${todoId}`)
    onUpdate()
  }

  async function deleteTodo(todoId) {
    await api.delete(`/tracker/${project.id}/todos/${todoId}`)
    onUpdate()
  }

  async function updateStatus(status) {
    await api.patch(`/tracker/${project.id}`, { status })
    onUpdate()
  }

  async function updateProgress(value) {
    await api.patch(`/tracker/${project.id}`, { progress_percent: parseInt(value) })
    onUpdate()
  }

  const done = project.todos.filter((t) => t.done).length

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <h3 className="font-medium text-sm">{project.name}</h3>
          {project.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <select
            value={project.status}
            onChange={(e) => updateStatus(e.target.value)}
            className={`text-xs px-2 py-0.5 rounded-full border cursor-pointer bg-transparent ${s.cls}`}
          >
            {Object.entries(STATUS_LABELS).map(([v, { label }]) => (
              <option key={v} value={v} className="bg-surface-card text-white">{label}</option>
            ))}
          </select>
          <button onClick={() => onDelete(project.id)} className="text-gray-600 hover:text-red-400 transition-colors p-0.5">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mt-3">
        <input
          type="range"
          min={0}
          max={100}
          value={project.progress_percent}
          onChange={(e) => updateProgress(e.target.value)}
          className="flex-1 accent-accent h-1.5"
        />
        <span className="text-xs text-gray-400 w-8 text-right">{project.progress_percent}%</span>
      </div>
      <ProgressBar value={project.progress_percent} />

      {/* Todos toggle */}
      {project.todos.length > 0 && (
        <div className="mt-3 text-xs text-gray-500">
          {done}/{project.todos.length} Todos erledigt
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="mt-2 flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
      >
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        Todos
      </button>

      {open && (
        <div className="mt-3 space-y-1.5">
          {project.todos.map((todo) => (
            <div key={todo.id} className="flex items-center gap-2 group">
              <button
                onClick={() => toggleTodo(todo.id)}
                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  todo.done ? 'bg-accent border-accent' : 'border-surface-border hover:border-accent'
                }`}
              >
                {todo.done && <Check size={10} />}
              </button>
              <span className={`text-xs flex-1 ${todo.done ? 'line-through text-gray-600' : 'text-gray-300'}`}>
                {todo.title}
              </span>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}

          <form onSubmit={addTodo} className="flex gap-2 pt-1">
            <input
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder="Todo hinzufügen..."
              className="flex-1 bg-surface border border-surface-border rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent"
            />
            <button type="submit" className="btn-primary px-3 py-1.5 text-xs">
              +
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default function Tracker() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')

  const fetchProjects = useCallback(async () => {
    try {
      const res = await api.get('/tracker')
      setProjects(res.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  async function createProject(e) {
    e.preventDefault()
    if (!newName.trim()) return
    await api.post('/tracker', { name: newName, description: newDesc })
    setNewName('')
    setNewDesc('')
    setShowAdd(false)
    fetchProjects()
  }

  async function deleteProject(id) {
    if (!confirm('Projekt löschen?')) return
    await api.delete(`/tracker/${id}`)
    fetchProjects()
  }

  const byStatus = (s) => projects.filter((p) => p.status === s)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tracker</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={15} />
          Projekt
        </button>
      </div>

      {showAdd && (
        <form onSubmit={createProject} className="card flex gap-3">
          <div className="flex-1 space-y-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Projektname"
              className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
              required
              autoFocus
            />
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Beschreibung (optional)"
              className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex flex-col gap-2">
            <button type="submit" className="btn-primary px-4 py-2 text-sm">Erstellen</button>
            <button type="button" onClick={() => setShowAdd(false)} className="btn-ghost border border-surface-border px-4 py-2 text-sm">Abbrechen</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-gray-500">Lade...</div>
      ) : projects.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">Noch keine Projekte.</div>
      ) : (
        ['in_progress', 'review', 'idea', 'live'].map((status) => {
          const ps = byStatus(status)
          if (ps.length === 0) return null
          return (
            <section key={status}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
                {STATUS_LABELS[status].label}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {ps.map((p) => (
                  <TrackerCard key={p.id} project={p} onUpdate={fetchProjects} onDelete={deleteProject} />
                ))}
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}
