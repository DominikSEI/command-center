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
  Zap,
} from 'lucide-react'

const nav = [
  { to: '/monitor',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tracker',  icon: Kanban,          label: 'Projekte'  },
  { to: '/tasks',    icon: CheckSquare,     label: 'Tasks'     },
  { to: '/ideas',    icon: Lightbulb,       label: 'Ideen'     },
  { to: '/vps',      icon: Server,          label: 'VPS'       },
  { to: '/trading',  icon: TrendingUp,      label: 'Trading'   },
  { to: '/briefing', icon: Newspaper,       label: 'Briefing'  },
  { to: '/content',  icon: Image,           label: 'Content'   },
]

const COMING_SOON = ['/trading', '/briefing', '/content']

export default function Layout() {
  const navigate = useNavigate()

  function logout() {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Sidebar */}
      <aside
        className="w-60 flex-shrink-0 flex flex-col border-r border-surface-border"
        style={{ background: '#090b14' }}
      >
        {/* Logo */}
        <div className="px-5 py-6 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', boxShadow: '0 0 16px rgba(139,92,246,0.35)' }}
            >
              <Zap size={17} className="text-white" />
            </div>
            <div>
              <div className="font-semibold text-[15px] leading-tight text-white">Command</div>
              <div className="font-semibold text-[15px] leading-tight" style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Center</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? 'text-white'
                    : 'text-gray-500 hover:text-gray-200 hover:bg-surface-hover'
                }`
              }
              style={({ isActive }) => isActive ? {
                background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.08))',
                boxShadow: 'inset 0 0 0 1px rgba(139,92,246,0.2)',
              } : {}}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={16}
                    className={isActive ? 'text-accent' : 'text-gray-600 group-hover:text-gray-400'}
                  />
                  <span>{label}</span>
                  {COMING_SOON.includes(to) && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md border border-surface-border text-gray-600 font-normal">
                      Soon
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-surface-border space-y-1">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-gray-600 hover:text-gray-200 hover:bg-surface-hover transition-all duration-150"
          >
            <LogOut size={15} />
            Abmelden
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
