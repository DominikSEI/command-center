import { useState, useRef } from 'react'
import { X, Trash2, Check, Plus } from 'lucide-react'
import api from '../api'

const STATUS_OPTIONS = [
  { value: 'idea',        label: 'Idee',      cls: 'text-gray-400 bg-surface-raised border-surface-border' },
  { value: 'in_progress', label: 'In Arbeit', cls: 'text-blue-400 bg-blue-950/30 border-blue-900/40' },
  { value: 'review',      label: 'Review',    cls: 'text-amber-400 bg-amber-950/30 border-amber-900/40' },
  { value: 'live',        label: 'Live',      cls: 'text-emerald-400 bg-emerald-950/30 border-emerald-900/40' },
]

function getProgressBg(value) {
  if (value >= 100) return 'linear-gradient(90deg, #10b981, #34d399)'
  if (value >= 60)  return 'linear-gradient(90deg, #8b5cf6, #3b82f6)'
  if (value >= 30)  return 'linear-gradient(90deg, #f59e0b, #fbbf24)'
  return 'linear-gradient(90deg, #374151, #4b5563)'
}

function ProgressBar({ value }) {
  return (
    <div className="w-full bg-surface-raised rounded-full overflow-hidden" style={{ height: 5 }}>
      <div
        className="rounded-full transition-all duration-300"
        style={{ width: `${Math.min(value, 100)}%`, height: 5, background: getProgressBg(value) }}
      />
    </div>
  )
}

export default function TrackerDrawer({ project: initialProject, onClose, onUpdated, onDeleted }) {
  const [project, setProject] = useState(initialProject)
  const [newTodo, setNewTodo] = useState('')
  const [addingTodo, setAddingTodo] = useState(false)
  const [saving, setSaving]   = useState(false)
  const descRef  = useRef(null)
  const notesRef = useRef(null)

  const hasTodos  = project.todos.length > 0
  const doneTodos = project.todos.filter(t => t.done).length
  const progress  = hasTodos ? Math.round((doneTodos / project.todos.length) * 100) : project.progress_percent

  async function patchProject(data) {
    setSaving(true)
    try {
      const res = await api.patch(`/tracker/${project.id}`, data)
      setProject(res.data)
      onUpdated(res.data)
    } finally {
      setSaving(false)
    }
  }

  async function handleBlurField(field, ref) {
    const value = ref.current?.value ?? ''
    if (value === (project[field] ?? '')) return
    await patchProject({ [field]: value || null })
  }

  async function addTodo(e) {
    e.preventDefault()
    if (!newTodo.trim()) return
    setAddingTodo(true)
    try {
      const res = await api.post(`/tracker/${project.id}/todos`, { title: newTodo })
      setProject(res.data)
      onUpdated(res.data)
      setNewTodo('')
    } finally {
      setAddingTodo(false)
    }
  }

  async function toggleTodo(todoId) {
    const res = await api.patch(`/tracker/${project.id}/todos/${todoId}`)
    setProject(res.data)
    onUpdated(res.data)
  }

  async function deleteTodo(todoId) {
    const res = await api.delete(`/tracker/${project.id}/todos/${todoId}`)
    setProject(res.data)
    onUpdated(res.data)
  }

  async function handleDelete() {
    if (!confirm(`Projekt "${project.name}" wirklich löschen?`)) return
    await api.delete(`/tracker/${project.id}`)
    onDeleted(project.id)
    onClose()
  }

  const currentStatus = STATUS_OPTIONS.find(o => o.value === project.status) ?? STATUS_OPTIONS[0]

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />

      <div
        className="fixed right-0 top-0 h-full w-full max-w-lg border-l border-surface-border z-50 flex flex-col shadow-2xl"
        style={{ background: 'linear-gradient(180deg, #0c0e17 0%, #090b13 100%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="font-semibold text-base truncate">{project.name}</h2>
            {saving && <span className="text-[11px] text-gray-600">Speichern…</span>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={handleDelete} className="btn-ghost p-2 text-gray-600 hover:text-red-400" title="Löschen">
              <Trash2 size={15} />
            </button>
            <button onClick={onClose} className="btn-ghost p-2">
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Status + Progress */}
          <div className="px-6 py-5 border-b border-surface-border space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-20 shrink-0">Status</span>
              <select
                value={project.status}
                onChange={e => patchProject({ status: e.target.value })}
                className={`badge cursor-pointer bg-transparent ${currentStatus.cls}`}
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value} className="bg-surface-card text-white">{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">Fortschritt</span>
                <span className={`text-sm font-semibold ${
                  progress >= 100 ? 'text-emerald-400' : progress >= 60 ? 'text-accent' : 'text-gray-400'
                }`}>
                  {progress}%
                </span>
              </div>
              <ProgressBar value={progress} />
              {hasTodos ? (
                <p className="text-[11px] text-gray-600 mt-1.5">{doneTodos}/{project.todos.length} Todos erledigt · wird automatisch berechnet</p>
              ) : (
                <input
                  type="range"
                  min={0}
                  max={100}
                  defaultValue={project.progress_percent}
                  onMouseUp={e => patchProject({ progress_percent: parseInt(e.target.value) })}
                  onTouchEnd={e => patchProject({ progress_percent: parseInt(e.target.value) })}
                  className="w-full accent-accent mt-2"
                  style={{ height: '4px' }}
                />
              )}
            </div>
          </div>

          {/* Beschreibung */}
          <div className="px-6 py-5 border-b border-surface-border">
            <label className="block text-xs font-medium text-gray-500 mb-2">Beschreibung</label>
            <textarea
              ref={descRef}
              defaultValue={project.description ?? ''}
              onBlur={() => handleBlurField('description', descRef)}
              rows={3}
              placeholder="Was soll dieses Projekt erreichen?"
              className="input resize-none text-gray-300"
            />
          </div>

          {/* Notizen */}
          <div className="px-6 py-5 border-b border-surface-border">
            <label className="block text-xs font-medium text-gray-500 mb-2">Notizen</label>
            <textarea
              ref={notesRef}
              defaultValue={project.notes ?? ''}
              onBlur={() => handleBlurField('notes', notesRef)}
              rows={4}
              placeholder="Offene Punkte, Ideen, nächste Schritte…"
              className="input resize-none text-gray-300"
            />
          </div>

          {/* Todos */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="section-label">To-dos</span>
              {hasTodos && (
                <span className="text-[11px] text-gray-600 normal-case font-normal tracking-normal">
                  {doneTodos}/{project.todos.length}
                </span>
              )}
            </div>

            <div className="space-y-1 mb-4">
              {project.todos.length === 0 && (
                <p className="text-xs text-gray-600 py-2">Noch keine Todos.</p>
              )}
              {project.todos.map(todo => (
                <div key={todo.id} className="flex items-center gap-3 group py-1">
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                      todo.done
                        ? 'border-accent/60 bg-accent/20'
                        : 'border-surface-border hover:border-accent/50'
                    }`}
                  >
                    {todo.done && <Check size={9} className="text-accent" />}
                  </button>
                  <span className={`text-sm flex-1 leading-relaxed ${todo.done ? 'line-through text-gray-600' : 'text-gray-300'}`}>
                    {todo.title}
                  </span>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-0.5 rounded"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={addTodo} className="flex gap-2">
              <input
                value={newTodo}
                onChange={e => setNewTodo(e.target.value)}
                placeholder="Todo hinzufügen…"
                className="input flex-1"
              />
              <button
                type="submit"
                disabled={addingTodo || !newTodo.trim()}
                className="btn-primary px-3 py-2 disabled:opacity-40"
              >
                <Plus size={15} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
