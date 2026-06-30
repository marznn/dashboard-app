import { Routes, Route } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider.jsx'
import Login from './auth/Login.jsx'
import { Sidebar, BottomNav } from './components/Nav.jsx'
import Placeholder from './pages/Placeholder.jsx'
import Workout from './pages/Workout.jsx'
import Nutrition from './pages/Nutrition.jsx'
import Sleep from './pages/Sleep.jsx'

export default function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-500 text-sm">Loading…</div>
    )
  }

  if (!session) {
    return <Login />
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="md:pl-60">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
          <Routes>
            <Route path="/" element={<Placeholder title="Home — OVR & Weekly Review" />} />
            <Route path="/workout" element={<Workout />} />
            <Route path="/nutrition" element={<Nutrition />} />
            <Route path="/sleep" element={<Sleep />} />
            <Route path="/water" element={<Placeholder title="Water Intake" />} />
            <Route path="/finance" element={<Placeholder title="Finance Tracker" />} />
            <Route path="/calendar" element={<Placeholder title="Calendar" />} />
            <Route path="/goals" element={<Placeholder title="Goals" />} />
            <Route path="*" element={<Placeholder title="Not found" />} />
          </Routes>
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
