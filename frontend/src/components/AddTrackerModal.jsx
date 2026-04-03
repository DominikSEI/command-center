import { useState } from 'react'
import { X } from 'lucide-react'
import api from '../api'

const STATUS_OPTIONS = [
  { value: 'idea',        label: 'Idee'      },
  { value: 'in_progress', label: 'In Arbeit' },
  { value: 'review',      label: 'Review'    },
  { value: 'live',        label: 'Live'      },
]

const PRIORITY_OPTIONS = [
  { value: 1, label: 'P1 – Hoch',     cls: 'text-red-400'    },
  { value: 2, label: 'P2 – Mittel',   cls: 'text-amber-400'  },
  { value: 3, label: 'P3 – Niedrig',  cls: 'text-emerald-400' },
]

export default function AddTrackerModal({ onClose, onCreated }) {
  const [form, setForm]       = useState({ name: '', description: '', status: 'idea', priority: 2 })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  function set(key, value) { setForm(f => ({ ...f, [key]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = { ...form }
      if (!payload.description) delete payload.description
      const res = await api.post('/tracker', payload)
      onCreated(res.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Fehler beim Erstellen')
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
            <h2 className="font-semibold text-sm">Neues Projekt</h2>
            <button onClick={onClose} className="btn-ghost p-1.5"><X size={15} /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Name</label>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className="input"
                required
                autoFocus
                placeholder="Projektname…"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={e => set('status', e.target.value)}
                className="input"
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Priorität</label>
              <div className="flex gap-2">
                {PRIORITY_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => set('priority', o.value)}
                    className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-all ${
                      form.priority === o.value
                        ? `${o.cls} border-current bg-current/10`
                        : 'text-gray-500 border-surface-border hover:border-gray-600'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Beschreibung</label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={3}
                className="input resize-none"
                placeholder="Was soll dieses Projekt erreichen?"
              />
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 btn-outline text-sm py-2.5">
                Abbrechen
              </button>
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
