import { useState, useRef } from 'react'
import { X, Trash2, Check, Plus } from 'lucide-react'
import api from '../api'

const STATUS_OPTIONS = [
  { value: 'idea',        label: 'Idee',      cls: 'text-stone-500 bg-stone-100 border-stone-200' },
  { value: 'in_progress', label: 'In Arbeit', cls: 'text-blue-700 bg-blue-50 border-blue-200' },
  { value: 'review',      label: 'Review',    cls: 'text-amber-700 bg-amber-50 border-amber-200' },
  { value: 'live',        label: 'Live',      cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
]

function getProgressBg(value) {
  if (value >= 100) return 'linear-gradient(90deg, #10b981, #34d399)'
  if (value >= 60)  return 'linear-gradient(90deg, #E8630A, #F59E0B)'
  if (value >= 30)  return 'linear-gradient(90deg, #f59e0b, #fbbf24)'
  return 'linear-gradient(90deg, #d6d3d1, #e7e5e4)'
}

function ProgressBar({ value }) {
  return (
    <div className="progress-bar">
      <div
        className="progress-bar-fill"
        style={{ width: `${Math.min(value, 100)}%`, background: getProgressBg(value) }}
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
  const currentStatus = STATUS_OPTIONS.find(o => o.value === project.status) ?? STATUS_OPTIONS[0]

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

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white border-l border-surface-border z-50 flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="font-bold text-base text-stone-800 truncate">{project.name}</h2>
            {saving && <span className="text-[11px] text-stone-400">Speichern…</span>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={handleDelete} className="btn-ghost p-2 text-stone-400 hover:text-red-500" title="Löschen">
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
              <span className="text-xs font-medium text-stone-400 w-20 shrink-0">Status</span>
              <select
                value={project.status}
                onChange={e => patchProject({ status: e.target.value })}
                className={`badge cursor-pointer bg-transparent ${currentStatus.cls}`}
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value} className="bg-white text-stone-800">{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-stone-400">Fortschritt</span>
                <span className={`text-sm font-bold ${
                  progress >= 100 ? 'text-emerald-600' : progress >= 60 ? 'text-accent' : 'text-stone-500'
                }`}>
                  {progress}%
                </span>
              </div>
              <ProgressBar value={progress} />
              {hasTodos ? (
                <p className="text-[11px] text-stone-400 mt-1.5">{doneTodos}/{project.todos.length} Todos erledigt · automatisch berechnet</p>
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
            <label className="block text-xs font-semibold text-stone-400 mb-2 uppercase tracking-wide">Beschreibung</label>
            <textarea
              ref={descRef}
              defaultValue={project.description ?? ''}
              onBlur={() => handleBlurField('description', descRef)}
              rows={3}
              placeholder="Was soll dieses Projekt erreichen?"
              className="input resize-none text-stone-700"
            />
          </div>

          {/* Notizen */}
          <div className="px-6 py-5 border-b border-surface-border">
            <label className="block text-xs font-semibold text-stone-400 mb-2 uppercase tracking-wide">Notizen</label>
            <textarea
              ref={notesRef}
              defaultValue={project.notes ?? ''}
              onBlur={() => handleBlurField('notes', notesRef)}
              rows={4}
              placeholder="Offene Punkte, Ideen, nächste Schritte…"
              className="input resize-none text-stone-700"
            />
          </div>

          {/* Todos */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="section-label">To-dos</span>
              {hasTodos && <span className="text-[11px] text-stone-400">{doneTodos}/{project.todos.length}</span>}
            </div>

            <div className="space-y-1.5 mb-4">
              {project.todos.length === 0 && (
                <p className="text-xs text-stone-400 py-2">Noch keine Todos.</p>
              )}
              {project.todos.map(todo => (
                <div key={todo.id} className="flex items-center gap-3 group py-1">
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                      todo.done ? 'border-accent bg-accent' : 'border-surface-border hover:border-accent'
                    }`}
                  >
                    {todo.done && <Check size={9} className="text-white" />}
                  </button>
                  <span className={`text-sm flex-1 leading-relaxed ${todo.done ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                    {todo.title}
                  </span>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-500 transition-all p-0.5 rounded"
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
