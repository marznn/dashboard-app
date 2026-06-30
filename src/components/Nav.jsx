import { NavLink } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export const sections = [
  { to: '/', label: 'Home', icon: '🏠', end: true },
  { to: '/workout', label: 'Workout', icon: '🏋️' },
  { to: '/nutrition', label: 'Nutrition', icon: '🍎' },
  { to: '/sleep', label: 'Sleep', icon: '😴' },
  { to: '/water', label: 'Water', icon: '💧' },
  { to: '/finance', label: 'Finance', icon: '💵' },
  { to: '/calendar', label: 'Calendar', icon: '📅' },
  { to: '/goals', label: 'Goals', icon: '🎯' },
]

function linkClass({ isActive }) {
  return [
    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
    isActive ? 'bg-indigo-500/15 text-indigo-400' : 'text-slate-300 hover:bg-white/5 hover:text-white',
  ].join(' ')
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 border-r border-white/10 bg-slate-900/40 px-4 py-6">
      <div className="px-2 mb-6 text-lg font-extrabold tracking-tight">Life Tracker</div>
      <nav className="flex-1 space-y-1">
        {sections.map((s) => (
          <NavLink key={s.to} to={s.to} end={s.end} className={linkClass}>
            <span aria-hidden>{s.icon}</span>
            {s.label}
          </NavLink>
        ))}
      </nav>
      <button
        onClick={() => supabase.auth.signOut()}
        className="mt-4 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white text-left"
      >
        ↪ Sign out
      </button>
    </aside>
  )
}

export function BottomNav() {
  // Most-used sections on mobile; Home + first 4 trackers
  const items = sections.slice(0, 5)
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 border-t border-white/10 bg-slate-950/90 backdrop-blur px-2 pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5">
        {items.map((s) => (
          <NavLink
            key={s.to}
            to={s.to}
            end={s.end}
            className={({ isActive }) =>
              [
                'flex flex-col items-center gap-1 py-2 text-[11px] font-medium',
                isActive ? 'text-indigo-400' : 'text-slate-400',
              ].join(' ')
            }
          >
            <span className="text-lg" aria-hidden>{s.icon}</span>
            {s.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
