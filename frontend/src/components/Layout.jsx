import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Kanban,
  CheckSquare,
  Lightbulb,
  TrendingUp,
  Newspaper,
  Image,
  Server,
  LogOut,
  Terminal,
} from 'lucide-react'

const nav = [
  { to: '/monitor', icon: LayoutDashboard, label: 'Monitor' },
  { to: '/tracker', icon: Kanban, label: 'Tracker' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/ideas', icon: Lightbulb, label: 'Ideen' },
  { to: '/trading', icon: TrendingUp, label: 'Trading' },
  { to: '/briefing', icon: Newspaper, label: 'Briefing' },
  { to: '/content', icon: Image, label: 'Content' },
  { to: '/vps', icon: Server, label: 'VPS' },
]

export default function Layout() {
  const navigate = useNavigate()

  function logout() {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-surface-card border-r border-surface-border flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-surface-border">
          <Terminal size={20} className="text-accent" />
          <span className="font-semibold text-white tracking-wide">Command Center</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-gray-400 hover:text-white hover:bg-surface-hover'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-surface-border">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-gray-400 hover:text-white hover:bg-surface-hover transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-surface">
        <Outlet />
      </main>
    </div>
  )
}
