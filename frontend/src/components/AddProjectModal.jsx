import { useState } from 'react'
import { X } from 'lucide-react'
import api from '../api'

const CHECK_TYPES = ['http', 'ssl', 'heartbeat', 'custom_json']
const CLUSTERS = ['Webapps', 'Bots', 'APIs', 'Infrastruktur']

export default function AddProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '',
    cluster: 'Webapps',
    check_type: 'http',
    url: '',
    interval_minutes: 5,
    expected_interval_minutes: 10,
    alert_telegram: true,
  })
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
      if (form.check_type !== 'heartbeat') delete payload.expected_interval_minutes
      if (!payload.url) delete payload.url
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
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-surface-card border border-surface-border rounded-xl w-full max-w-md shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
            <h2 className="font-semibold">Projekt hinzufügen</h2>
            <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Cluster</label>
                <select
                  value={form.cluster}
                  onChange={(e) => set('cluster', e.target.value)}
                  className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                >
                  {CLUSTERS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Check-Typ</label>
                <select
                  value={form.check_type}
                  onChange={(e) => set('check_type', e.target.value)}
                  className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                >
                  {CHECK_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Interval (Min)</label>
                <input
                  type="number"
                  value={form.interval_minutes}
                  onChange={(e) => set('interval_minutes', parseInt(e.target.value))}
                  className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                  min={1}
                />
              </div>
            </div>

            {form.check_type !== 'heartbeat' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">URL</label>
                <input
                  value={form.url}
                  onChange={(e) => set('url', e.target.value)}
                  className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent font-mono"
                  placeholder="https://example.com"
                />
              </div>
            )}

            {form.check_type === 'heartbeat' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Erwartetes Interval (Min)</label>
                <input
                  type="number"
                  value={form.expected_interval_minutes}
                  onChange={(e) => set('expected_interval_minutes', parseInt(e.target.value))}
                  className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                  min={1}
                />
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.alert_telegram}
                onChange={(e) => set('alert_telegram', e.target.checked)}
                className="accent-accent"
              />
              <span className="text-sm text-gray-300">Telegram Alerts</span>
            </label>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 btn-ghost border border-surface-border py-2">
                Abbrechen
              </button>
              <button type="submit" disabled={loading} className="flex-1 btn-primary py-2 disabled:opacity-50">
                {loading ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
