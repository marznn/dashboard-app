import { Routes, Route } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider.jsx'
import Login from './auth/Login.jsx'
import { Sidebar, MobileTopBar } from './components/Nav.jsx'
import Placeholder from './pages/Placeholder.jsx'
import Workout from './pages/Workout.jsx'
import Nutrition from './pages/Nutrition.jsx'
import Sleep from './pages/Sleep.jsx'
import Water from './pages/Water.jsx'
import Finance from './pages/Finance.jsx'
import Calendar from './pages/Calendar.jsx'
import Goals from './pages/Goals.jsx'
import Settings from './pages/Settings.jsx'
import Home from './pages/Home.jsx'

export default function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="flex flex-col items-center gap-3">
          <span className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-brand-cyan" />
          <span className="text-slate-400 text-sm">Loading…</span>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Login />
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <MobileTopBar />
      <main className="md:pl-72 pt-14 md:pt-0">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 pb-10">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/workout" element={<Workout />} />
            <Route path="/nutrition" element={<Nutrition />} />
            <Route path="/sleep" element={<Sleep />} />
            <Route path="/water" element={<Water />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Placeholder title="Not found" />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}
