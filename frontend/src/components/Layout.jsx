import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Kanban, CheckSquare, Lightbulb,
  TrendingUp, Newspaper, Image, Server, LogOut, StickyNote, Menu, X,
  Sun, Moon, KeyRound, Bot,
} from 'lucide-react'
import GlobalSearch from './GlobalSearch'
import AgentFAB from './AgentFAB'
import api from '../api'

/* ── >_ Logo SVG ─────────────────────────────────────────── */
function TerminalLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 6l5 4-5 4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11 14h6" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  )
}

/* ── Nav items ───────────────────────────────────────────── */
const nav = [
  { to: '/monitor',  icon: LayoutDashboard, label: 'Dashboard', color: 'text-orange-500' },
  { to: '/tracker',  icon: Kanban,          label: 'Projekte',  color: 'text-blue-500'   },
  { to: '/tasks',    icon: CheckSquare,     label: 'Tasks',     color: 'text-emerald-500'},
  { to: '/ideas',    icon: Lightbulb,       label: 'Ideen',     color: 'text-amber-500'  },
  { to: '/notes',    icon: StickyNote,      label: 'Notizen',   color: 'text-sky-400'    },
  { to: '/vps',      icon: Server,          label: 'VPS',       color: 'text-stone-400'  },
  { to: '/trading',  icon: TrendingUp,      label: 'Trading',   color: 'text-green-600'  },
  { to: '/briefing', icon: Newspaper,       label: 'Briefing',  color: 'text-purple-400' },
  { to: '/agent',    icon: Bot,             label: 'Agent',     color: 'text-violet-400' },
  { to: '/content',  icon: Image,           label: 'Content',   color: 'text-stone-400', soon: true },
]

/* ── Build info ──────────────────────────────────────────── */
function useStartedAt() {
  const [startedAt, setStartedAt] = useState(null)
  useEffect(() => {
    fetch('/api/version')
      .then(r => r.json())
      .then(d => setStartedAt(new Date(d.started_at)))
      .catch(() => {})
  }, [])
  return startedAt
}

/* ── Theme ───────────────────────────────────────────────── */
function useTheme() {
  const [light, setLight] = useState(() => localStorage.getItem('theme') === 'light')
  useEffect(() => {
    document.documentElement.classList.toggle('light', light)
    localStorage.setItem('theme', light ? 'light' : 'dark')
  }, [light])
  return [light, setLight]
}

/* ── Change Password Modal ───────────────────────────────── */
function ChangePasswordModal({ onClose }) {
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.patch('/auth/change-password', { old_password: oldPw, new_password: newPw })
      setSuccess(true)
      setTimeout(onClose, 1500)
    } catch (err) {
      setError(err.response?.data?.detail || 'Fehler beim Ändern des Passworts')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <div
          className="animate-modal w-full max-w-sm rounded-2xl border border-surface-border p-6 shadow-2xl"
          style={{ background: 'var(--bg-card)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-base">Passwort ändern</h2>
            <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
          </div>

          {success ? (
            <p className="text-emerald-400 text-sm text-center py-4">Passwort erfolgreich geändert ✓</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Aktuelles Passwort</label>
                <input
                  type="password"
                  value={oldPw}
                  onChange={e => setOldPw(e.target.value)}
                  className="input"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Neues Passwort</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  className="input"
                  required
                  minLength={6}
                />
              </div>
              {error && (
                <p className="text-red-400 text-xs">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full text-sm mt-2 disabled:opacity-60"
              >
                {loading ? 'Speichert…' : 'Passwort ändern'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  )
}

/* ── Sidebar content (shared between desktop + mobile) ───── */
function SidebarContent({ onNavigate, onLogout, light, onToggleTheme, onChangePassword }) {
  const startedAt = useStartedAt()
  return (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-surface-border shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', boxShadow: '0 0 16px rgba(139,92,246,0.35)' }}
          >
            <TerminalLogo />
          </div>
          <div>
            <div className="font-bold text-[15px] leading-tight text-white">Command</div>
            <div className="font-bold text-[15px] leading-tight text-accent">Center</div>
          </div>
        </div>
      </div>

      {/* Global Search */}
      <div className="border-b border-surface-border shrink-0">
        <GlobalSearch onNavigate={onNavigate} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label, color, soon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'text-white'
                  : 'text-gray-500 hover:text-gray-200 hover:bg-surface-hover'
              }`
            }
            style={({ isActive }) => isActive ? { background: 'rgba(139,92,246,0.12)' } : {}}
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={16}
                  className={isActive ? color : 'text-gray-600 group-hover:text-gray-400 transition-colors duration-200'}
                />
                <span>{label}</span>
                {soon && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md bg-surface-raised text-gray-600 font-normal">
                    bald
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-surface-border shrink-0 space-y-1">
        <button
          onClick={onToggleTheme}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-gray-600 hover:text-white hover:bg-surface-hover transition-all duration-200"
        >
          {light ? <Moon size={15} /> : <Sun size={15} />}
          {light ? 'Dark Mode' : 'Light Mode'}
        </button>
        <button
          onClick={onChangePassword}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-gray-600 hover:text-white hover:bg-surface-hover transition-all duration-200"
        >
          <KeyRound size={15} />
          Passwort ändern
        </button>
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-gray-600 hover:text-white hover:bg-surface-hover transition-all duration-200"
        >
          <LogOut size={15} />
          Abmelden
        </button>
        {startedAt && (
          <p className="text-[10px] text-gray-700 px-3 pb-1">
            deployed {startedAt.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} {startedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </>
  )
}

/* ── Layout ──────────────────────────────────────────────── */
export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showPwModal, setShowPwModal] = useState(false)
  const [light, setLight] = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  function logout() {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface">

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40 w-60 flex-shrink-0 flex flex-col border-r border-surface-border
          transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ background: 'var(--bg-sidebar)' }}
      >
        {/* Mobile close button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 lg:hidden text-gray-600 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        <SidebarContent
          onNavigate={() => setSidebarOpen(false)}
          onLogout={logout}
          light={light}
          onToggleTheme={() => setLight(l => !l)}
          onChangePassword={() => setShowPwModal(true)}
        />
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-surface flex flex-col min-w-0">

        {/* Mobile top bar */}
        <div
          className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-surface-border shrink-0 sticky top-0 z-20"
          style={{ background: 'var(--bg-sidebar)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' }}
            >
              <TerminalLogo />
            </div>
            <span className="font-bold text-sm">
              <span className="text-white">Command </span>
              <span className="text-accent">Center</span>
            </span>
          </div>
        </div>

        <div key={location.pathname} className="animate-page flex-1">
          <Outlet />
        </div>
      </main>

      {showPwModal && <ChangePasswordModal onClose={() => setShowPwModal(false)} />}
      <AgentFAB />
    </div>
  )
}
