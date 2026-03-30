import { useState } from 'react'
import { X } from 'lucide-react'
import api from '../api'

const STATUS_OPTIONS = [
  { value: 'idea', label: 'Idee' },
  { value: 'in_progress', label: 'In Arbeit' },
  { value: 'review', label: 'Review' },
  { value: 'live', label: 'Live' },
]

export default function AddTrackerModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', status: 'idea' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

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
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-surface-card border border-surface-border rounded-xl w-full max-w-sm shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
            <h2 className="font-semibold">Neues Projekt</h2>
            <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Name</label>
              <input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Beschreibung</label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={3}
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent resize-none"
                placeholder="Was soll dieses Projekt erreichen?"
              />
            </div>

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
