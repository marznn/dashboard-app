import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { PulseMark } from './Logo.jsx'

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

const settingsItem = { to: '/settings', label: 'Settings', icon: '⚙️' }

// Brand wordmark with the liquid-glass Pulse mark.
function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <PulseMark size={36} />
      <span className="text-[17px] font-extrabold tracking-tight text-gradient-brand">Pulse</span>
    </div>
  )
}

// One sidebar / drawer row. Active rows get a glass pill + gradient icon tile.
function NavRow({ section, onClick }) {
  return (
    <NavLink
      to={section.to}
      end={section.end}
      onClick={onClick}
      className={({ isActive }) =>
        [
          'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all',
          isActive ? 'glass text-white' : 'text-slate-400 hover:text-white',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={[
              'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-base transition-all',
              isActive ? 'text-white shadow-glow' : 'glass-soft text-slate-300 group-hover:text-white',
            ].join(' ')}
            style={isActive ? { backgroundImage: 'linear-gradient(135deg, #0075FF 0%, #582CFF 100%)' } : undefined}
            aria-hidden
          >
            {section.icon}
          </span>
          {section.label}
        </>
      )}
    </NavLink>
  )
}

function SignOutRow() {
  return (
    <button
      onClick={() => supabase.auth.signOut()}
      className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-400 hover:text-white transition-colors text-left w-full"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg glass-soft" aria-hidden>↪</span>
      Sign out
    </button>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:my-4 md:ml-4 rounded-2xl glass px-4 py-6 z-20">
      <div className="mb-8"><Brand /></div>
      <nav className="flex-1 space-y-1.5">
        {sections.map((s) => <NavRow key={s.to} section={s} />)}
      </nav>
      <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5">
        <NavRow section={settingsItem} />
        <SignOutRow />
      </div>
    </aside>
  )
}

// Mobile top bar with a hamburger that opens a full-section drawer.
// (The bottom tab bar was removed — the drawer covers all sections.)
export function MobileTopBar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <header className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center gap-3 h-14 px-4 glass border-b border-white/10">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="-ml-1 p-1 text-slate-300 hover:text-white"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <Brand />
      </header>

      {open && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[80%] glass border-r border-white/10 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <Brand />
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-1 text-slate-400 hover:text-white">✕</button>
            </div>
            <nav className="flex-1 space-y-1.5 overflow-y-auto">
              {sections.map((s) => <NavRow key={s.to} section={s} onClick={() => setOpen(false)} />)}
            </nav>
            <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5">
              <NavRow section={settingsItem} onClick={() => setOpen(false)} />
              <button
                onClick={() => { setOpen(false); supabase.auth.signOut() }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-400 hover:text-white transition-colors text-left w-full"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg glass-soft" aria-hidden>↪</span>
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
