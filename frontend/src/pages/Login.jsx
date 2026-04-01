import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap } from 'lucide-react'
import api from '../api'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { username, password })
      localStorage.setItem('token', res.data.access_token)
      navigate('/monitor')
    } catch {
      setError('Ungültige Zugangsdaten')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(139,92,246,0.12) 0%, #07080f 60%)',
      }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
              boxShadow: '0 0 32px rgba(139,92,246,0.4)',
            }}
          >
            <Zap size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Command Center</h1>
          <p className="text-sm text-gray-500 mt-1">Persönliches KI-Dashboard</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border border-surface-border p-6 space-y-5"
          style={{
            background: 'linear-gradient(160deg, #0d0f1b 0%, #0a0c15 100%)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 24px 48px rgba(0,0,0,0.5)',
          }}
        >
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Benutzername</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input"
              placeholder="admin"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/20 border border-red-900/30 rounded-xl px-3 py-2.5">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary w-full py-3 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Anmelden…' : 'Anmelden'}
          </button>
        </div>
      </div>
    </div>
  )
}
