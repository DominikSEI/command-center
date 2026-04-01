import { useState } from 'react'
import { X } from 'lucide-react'
import api from '../api'

const STATUS_OPTIONS = [
  { value: 'idea',        label: 'Idee'      },
  { value: 'in_progress', label: 'In Arbeit' },
  { value: 'review',      label: 'Review'    },
  { value: 'live',        label: 'Live'      },
]

export default function AddTrackerModal({ onClose, onCreated }) {
  const [form, setForm]       = useState({ name: '', description: '', status: 'idea' })
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
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl border border-surface-border">
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
            <h2 className="font-semibold text-stone-800">Neues Projekt</h2>
            <button onClick={onClose} className="btn-ghost p-1.5"><X size={15} /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wide">Name</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} className="input" required autoFocus placeholder="Projektname…" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wide">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className="input">
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wide">Beschreibung</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} className="input resize-none" placeholder="Was soll dieses Projekt erreichen?" />
            </div>
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
