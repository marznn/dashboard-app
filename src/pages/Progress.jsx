import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { computeTargets } from '../lib/nutrition.js'
import { computeStreak, daysMeetingGoal } from '../lib/streaks.js'
import { LineChart, BarChart } from '../components/Chart.jsx'
import {
  PageHeader, Card, SectionTitle, Empty, recentDates, todayStr,
} from '../components/ui.jsx'

const sumByDay = (rows, dateField, valueField) => {
  const m = {}
  for (const r of rows) m[r[dateField]] = (m[r[dateField]] || 0) + Number(r[valueField] || 0)
  return m
}
const shortLabel = (ymd) => {
  const [, m, d] = ymd.split('-')
  return `${Number(m)}/${Number(d)}`
}

export default function Progress() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true)
    const hist = recentDates(180)
    const startStr = hist[hist.length - 1]

    const [
      water, sleep, meals, steps, cardio, sessions, settings, profile, ovrHist,
    ] = await Promise.all([
      supabase.from('water_logs').select('date, oz').gte('date', startStr),
      supabase.from('sleep_logs').select('date, minutes').gte('date', startStr),
      supabase.from('meals').select('date, calories').gte('date', startStr),
      supabase.from('step_logs').select('date, steps').gte('date', startStr),
      supabase.from('cardio_logs').select('date').gte('date', startStr),
      supabase.from('workout_sessions').select('date').gte('date', startStr),
      supabase.from('user_settings').select('water_goal_oz, sleep_goal_hours').maybeSingle(),
      supabase.from('nutrition_profile').select('*').maybeSingle(),
      supabase.from('ovr_history').select('date, ovr').gte('date', startStr).order('date', { ascending: true }),
    ])

    setData({
      water: water.data ?? [],
      sleep: sleep.data ?? [],
      meals: meals.data ?? [],
      steps: steps.data ?? [],
      cardio: cardio.data ?? [],
      sessions: sessions.data ?? [],
      settings: settings.data,
      profile: profile.data,
      ovrHist: ovrHist.data ?? [],
    })
    setLoading(false)
  }

  if (loading) return <Empty>Loading your progress…</Empty>

  const today = todayStr()
  const axis = [...recentDates(30)].reverse() // oldest -> newest

  const goalOz = Number(data.settings?.water_goal_oz ?? 64)
  const goalH = Number(data.settings?.sleep_goal_hours ?? 8)
  const targets = computeTargets(data.profile)

  // --- per-day maps ---
  const ozByDay = sumByDay(data.water, 'date', 'oz')
  const minByDay = sumByDay(data.sleep, 'date', 'minutes')
  const calByDay = sumByDay(data.meals, 'date', 'calories')
  const stepsByDay = sumByDay(data.steps, 'date', 'steps')
  const ovrByDay = Object.fromEntries(data.ovrHist.map((r) => [r.date, Number(r.ovr)]))

  // --- streaks ---
  const waterStreak = computeStreak(daysMeetingGoal(data.water, 'date', 'oz', goalOz), today)
  const sleepStreak = computeStreak(daysMeetingGoal(data.sleep, 'date', 'minutes', goalH * 60), today)
  const calDates = targets
    ? Object.keys(calByDay).filter((d) => Math.abs(calByDay[d] - targets.calories) <= targets.calories * 0.1)
    : []
  const calStreak = computeStreak(calDates, today)
  const activityDays = [...new Set([
    ...Object.keys(stepsByDay).filter((d) => stepsByDay[d] > 0),
    ...data.cardio.map((r) => r.date),
    ...data.sessions.map((r) => r.date),
  ])]
  const activityStreak = computeStreak(activityDays, today)

  // --- chart series ---
  const ovrSeries = axis.map((d) => ({ label: shortLabel(d), value: ovrByDay[d] ?? null }))
  const calSeries = axis.map((d) => ({ label: shortLabel(d), value: calByDay[d] || null }))
  const waterSeries = axis.map((d) => ({ label: shortLabel(d), value: ozByDay[d] || null }))
  const sleepSeries = axis.map((d) => ({ label: shortLabel(d), value: minByDay[d] ? minByDay[d] / 60 : null }))
  const stepsSeries = axis.map((d) => ({ label: shortLabel(d), value: stepsByDay[d] || null }))

  const hasOvr = data.ovrHist.length > 0

  return (
    <div>
      <PageHeader title="Progress" subtitle="Streaks and trends across the last 30 days." />

      {/* Streaks */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StreakCard icon="💧" label="Water goal" streak={waterStreak} />
        <StreakCard icon="😴" label="Sleep goal" streak={sleepStreak} />
        <StreakCard icon="🍎" label="Calories on target" streak={calStreak} />
        <StreakCard icon="🔥" label="Active day" streak={activityStreak} />
      </div>

      {/* OVR over time */}
      <div className="mb-5">
        <Card>
          <SectionTitle right={<span className="text-xs text-slate-500">Last 30 days</span>}>OVR over time</SectionTitle>
          {hasOvr ? (
            <LineChart data={ovrSeries} height={180} />
          ) : (
            <div className="grid place-items-center text-xs text-slate-500" style={{ height: 180 }}>
              Your OVR history starts filling in from today — check back in a few days.
            </div>
          )}
        </Card>
      </div>

      {/* Category trends */}
      <div className="grid gap-5 lg:grid-cols-2">
        <TrendCard title="Calories / day" series={calSeries} type="bar" goal={targets?.calories ?? null} unit="" />
        <TrendCard title="Water / day" series={waterSeries} type="bar" goal={goalOz} unit=" oz" />
        <TrendCard title="Sleep / night" series={sleepSeries} type="line" goal={goalH} unit="h" format={(v) => v.toFixed(1)} />
        <TrendCard title="Steps / day" series={stepsSeries} type="bar" goal={null} unit="" />
      </div>
    </div>
  )
}

function StreakCard({ icon, label, streak }) {
  const active = streak.current > 0
  return (
    <Card className="glass-hover">
      <div className="flex items-center gap-2">
        <span className={`grid h-9 w-9 place-items-center rounded-lg text-base ${active ? 'shadow-glow' : 'glass-soft'}`}
          style={active ? { backgroundImage: 'linear-gradient(135deg, #0075FF 0%, #582CFF 100%)' } : undefined} aria-hidden>
          {icon}
        </span>
        <p className="text-xs font-medium text-slate-400">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-extrabold text-white">
        {streak.current}<span className="text-sm font-semibold text-slate-500"> day{streak.current === 1 ? '' : 's'}</span>
      </p>
      <p className="text-[11px] text-slate-500">best {streak.best}</p>
    </Card>
  )
}

function TrendCard({ title, series, type, goal, unit, format }) {
  return (
    <Card>
      <SectionTitle>{title}</SectionTitle>
      {type === 'bar'
        ? <BarChart data={series} goal={goal} unit={unit} format={format} />
        : <LineChart data={series} goal={goal} unit={unit} format={format} />}
    </Card>
  )
}
