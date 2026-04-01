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
  { to: '/monitor',  icon: LayoutDashboard, label: 'Dashboard', color: 'text-orange-500' },
  { to: '/tracker',  icon: Kanban,          label: 'Projekte',  color: 'text-blue-500'   },
  { to: '/tasks',    icon: CheckSquare,     label: 'Tasks',     color: 'text-emerald-500'},
  { to: '/ideas',    icon: Lightbulb,       label: 'Ideen',     color: 'text-amber-500'  },
  { to: '/vps',      icon: Server,          label: 'VPS',       color: 'text-stone-400'  },
  { to: '/trading',  icon: TrendingUp,      label: 'Trading',   color: 'text-stone-400'  },
  { to: '/briefing', icon: Newspaper,       label: 'Briefing',  color: 'text-stone-400'  },
  { to: '/content',  icon: Image,           label: 'Content',   color: 'text-stone-400'  },
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
      <aside className="w-60 flex-shrink-0 flex flex-col bg-white border-r border-surface-border">
        {/* Logo */}
        <div className="px-5 py-6 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #E8630A, #F59E0B)', boxShadow: '0 2px 8px rgba(232,99,10,0.25)' }}
            >
              <Zap size={17} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-[15px] leading-tight text-stone-800">Command</div>
              <div className="font-bold text-[15px] leading-tight text-accent">Center</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {nav.map(({ to, icon: Icon, label, color }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? 'bg-accent/8 text-stone-800'
                    : 'text-stone-500 hover:text-stone-800 hover:bg-surface-hover'
                }`
              }
              style={({ isActive }) => isActive ? {
                background: 'rgba(232,99,10,0.07)',
              } : {}}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={16}
                    className={isActive ? color : 'text-stone-400 group-hover:text-stone-500'}
                  />
                  <span>{label}</span>
                  {COMING_SOON.includes(to) && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md bg-surface-hover text-stone-400 font-normal">
                      bald
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-surface-border">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-stone-400 hover:text-stone-700 hover:bg-surface-hover transition-all duration-150"
          >
            <LogOut size={15} />
            Abmelden
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-surface">
        <Outlet />
      </main>
    </div>
  )
}
