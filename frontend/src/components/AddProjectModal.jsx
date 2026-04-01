import { useState } from 'react'
import { X } from 'lucide-react'
import api from '../api'

const CHECK_TYPES = ['http', 'ssl', 'heartbeat', 'custom_json']
const CLUSTERS    = ['Webapps', 'Bots', 'APIs', 'Infrastruktur']

export default function AddProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '',
    cluster: 'Webapps',
    check_type: 'http',
    url: '',
    interval_minutes: 5,
    expected_interval_minutes: 10,
    alert_telegram: true,
    description: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  function set(key, value) { setForm(f => ({ ...f, [key]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = { ...form }
      if (form.check_type !== 'heartbeat') delete payload.expected_interval_minutes
      if (!payload.url) delete payload.url
      if (!payload.description) delete payload.description
      if (!payload.notes) delete payload.notes
      await api.post('/projects', payload)
      onCreated()
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
          className="w-full max-w-md rounded-2xl border border-surface-border shadow-2xl"
          style={{ background: 'linear-gradient(160deg, #0d0f1b 0%, #0a0c15 100%)' }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
            <h2 className="font-semibold text-sm">Projekt hinzufügen</h2>
            <button onClick={onClose} className="btn-ghost p-1.5"><X size={15} /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Name</label>
                <input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  className="input"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Cluster</label>
                <select value={form.cluster} onChange={e => set('cluster', e.target.value)} className="input">
                  {CLUSTERS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Check-Typ</label>
                <select value={form.check_type} onChange={e => set('check_type', e.target.value)} className="input">
                  {CHECK_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Interval (Min)</label>
                <input
                  type="number"
                  value={form.interval_minutes}
                  onChange={e => set('interval_minutes', parseInt(e.target.value))}
                  className="input"
                  min={1}
                />
              </div>
            </div>

            {form.check_type !== 'heartbeat' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">URL</label>
                <input
                  value={form.url}
                  onChange={e => set('url', e.target.value)}
                  className="input font-mono text-xs"
                  placeholder="https://example.com"
                />
              </div>
            )}

            {form.check_type === 'heartbeat' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Erwartetes Interval (Min)</label>
                <input
                  type="number"
                  value={form.expected_interval_minutes}
                  onChange={e => set('expected_interval_minutes', parseInt(e.target.value))}
                  className="input"
                  min={1}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Beschreibung</label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={2}
                className="input resize-none"
                placeholder="Was macht dieses Projekt?"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Notizen</label>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                rows={2}
                className="input resize-none"
                placeholder="Offene Punkte, To-dos…"
              />
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={form.alert_telegram}
                onChange={e => set('alert_telegram', e.target.checked)}
                className="w-4 h-4 accent-accent rounded"
              />
              <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">Telegram Alerts</span>
            </label>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 btn-outline text-sm py-2.5">
                Abbrechen
              </button>
              <button type="submit" disabled={loading} className="flex-1 btn-primary text-sm py-2.5 disabled:opacity-60">
                {loading ? 'Speichern…' : 'Speichern'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
