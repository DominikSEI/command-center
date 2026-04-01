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
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(232,99,10,0.08) 0%, #F4EFE6 60%)',
      }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: 'linear-gradient(135deg, #E8630A, #F59E0B)', boxShadow: '0 4px 16px rgba(232,99,10,0.3)' }}
          >
            <Zap size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">Command Center</h1>
          <p className="text-sm text-stone-500 mt-1">Persönliches Produktivitäts-Dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-7 space-y-5" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)' }}>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-2 uppercase tracking-wide">Benutzername</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="input"
              placeholder="admin"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-2 uppercase tracking-wide">Passwort</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary w-full py-3 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Anmelden…' : 'Anmelden →'}
          </button>
        </div>
      </div>
    </div>
  )
}
