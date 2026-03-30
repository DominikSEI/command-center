import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Terminal } from 'lucide-react'
import api from '../api'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
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
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Terminal size={20} className="text-accent" />
          </div>
          <span className="text-xl font-semibold">Command Center</span>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <h1 className="text-lg font-semibold mb-1">Anmelden</h1>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Benutzername</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
              placeholder="admin"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5 disabled:opacity-50"
          >
            {loading ? 'Anmelden...' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  )
}
