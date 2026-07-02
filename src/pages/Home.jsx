import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../auth/AuthProvider.jsx'
import {
  computeCategories, computePerformance, driftOvr, ovrTier, isCategoryEnabled, STARTING_OVR,
} from '../lib/ovr.js'
import { computeTargets } from '../lib/nutrition.js'
import { computeStreak, daysMeetingGoal } from '../lib/streaks.js'
import {
  PageHeader, Card, SectionTitle, Empty, ProgressBar,
  todayStr, recentDates, logicalNow, monthRange, monthLabel, fmtMoney, fmtHm,
} from '../components/ui.jsx'

export default function Home() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [bundle, setBundle] = useState(null)
  const [upcoming, setUpcoming] = useState([])
  const [ovr, setOvr] = useState(STARTING_OVR)

  const firstName = (user?.user_metadata?.full_name || user?.user_metadata?.name || '').trim().split(/\s+/)[0]
  const dashTitle = firstName ? `${firstName}'s Dashboard` : 'Your Dashboard'

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true)
    const today = todayStr()
    const last7Dates = recentDates(7)
    const last7Start = last7Dates[last7Dates.length - 1]
    const { start: monthStart, end: monthEnd } = monthRange()

    const [
      workoutSettings, routines, sessions, cardio, profile, meals,
      sleepLogs, userSettings, waterLogs, txns, goals, events, upcomingEvents,
      ovrHistoryWeek,
    ] = await Promise.all([
      supabase.from('workout_settings').select('*').maybeSingle(),
      supabase.from('routines').select('id, exercises'),
      supabase.from('workout_sessions').select('id, date, routine_id').gte('date', last7Start),
      supabase.from('cardio_logs').select('date, duration_min').gte('date', last7Start),
      supabase.from('nutrition_profile').select('*').maybeSingle(),
      supabase.from('meals').select('date, calories').gte('date', last7Start),
      supabase.from('sleep_logs').select('date, minutes').gte('date', last7Start),
      supabase.from('user_settings').select('*').maybeSingle(),
      supabase.from('water_logs').select('date, oz').gte('date', last7Start),
      supabase.from('transactions').select('type, amount').gte('date', monthStart).lt('date', monthEnd),
      supabase.from('goals').select('progress'),
      supabase.from('events').select('done').gte('date', last7Start),
      supabase.from('events').select('*').gte('date', today).order('date', { ascending: true }).order('time', { ascending: true }).limit(5),
      supabase.from('ovr_history').select('date, ovr').gte('date', last7Start).order('date', { ascending: true }),
    ])

    // sets for the week's sessions (dependent on sessions)
    const sess = sessions.data ?? []
    let sets = []
    if (sess.length) {
      const { data } = await supabase.from('workout_sets').select('session_id, exercise').in('session_id', sess.map((s) => s.id))
      sets = data ?? []
    }

    const bundleObj = {
      last7Dates,
      workoutSettings: workoutSettings.data,
      routines: routines.data ?? [],
      sessions: sess,
      sets,
      cardio: cardio.data ?? [],
      profile: profile.data,
      meals: meals.data ?? [],
      sleepLogs: sleepLogs.data ?? [],
      userSettings: userSettings.data,
      waterLogs: waterLogs.data ?? [],
      txns: txns.data ?? [],
      goals: goals.data ?? [],
      events: events.data ?? [],
      ovrHistoryWeek: ovrHistoryWeek.data ?? [],
    }

    // Persistent OVR: start at 50, drift once per day toward today's performance.
    const settings = userSettings.data
    const enabledMap = settings?.ovr_categories ?? {}
    const storedOvr = settings?.ovr ?? STARTING_OVR
    const cats = computeCategories(bundleObj)
    const { perf99, contributing } = computePerformance(cats, enabledMap)
    let displayOvr = storedOvr
    if (contributing > 0 && settings?.ovr_date !== today) {
      displayOvr = driftOvr(storedOvr, perf99)
      await supabase.from('user_settings').upsert(
        { ovr: displayOvr, ovr_date: today, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
      // Snapshot today's OVR for the Progress chart (ignored if phase9 not run).
      await supabase.from('ovr_history').upsert(
        { date: today, ovr: displayOvr },
        { onConflict: 'user_id,date' },
      )
    }

    setOvr(displayOvr)
    setBundle(bundleObj)
    setUpcoming(upcomingEvents.data ?? [])
    setLoading(false)
  }

  if (loading) return <Empty>Loading your dashboard…</Empty>

  const cats = computeCategories(bundle)
  const enabledMap = bundle.userSettings?.ovr_categories ?? {}

  return (
    <div>
      <PageHeader
        title={dashTitle}
        subtitle={logicalNow().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      />

      <div className="mb-6">
        <TodayNudgesCard bundle={bundle} enabledMap={enabledMap} />
      </div>

      <OvrCard ovr={ovr} cats={cats} enabledMap={enabledMap} />

      <div className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-3">This week at a glance</h2>
        <WeeklyReview bundle={bundle} />
      </div>

      <div className="mt-6">
        <WeeklyRecapCard bundle={bundle} cats={cats} enabledMap={enabledMap} ovr={ovr} />
      </div>

      <div className="mt-6">
        <UpcomingCard events={upcoming} />
      </div>
    </div>
  )
}

// Gentle "did you log this yet" nudges for today, scoped to whichever
// categories are enabled in Settings. This is the in-app reminder layer —
// it only nudges while the app is open (no push notifications).
function TodayNudgesCard({ bundle, enabledMap }) {
  const today = todayStr()

  const workoutDone = bundle.sessions.some((s) => s.date === today)
    || bundle.cardio.some((c) => c.date === today)
  const mealsDone = bundle.meals.some((m) => m.date === today)
  const waterDone = bundle.waterLogs.some((w) => w.date === today && w.oz > 0)

  const items = [
    { key: 'workout', to: '/workout', icon: '🏋️', label: 'Log a workout or cardio', done: workoutDone },
    { key: 'nutrition', to: '/nutrition', icon: '🍎', label: 'Log a meal', done: mealsDone },
    { key: 'water', to: '/water', icon: '💧', label: 'Log some water', done: waterDone },
  ].filter((it) => isCategoryEnabled(enabledMap, it.key))

  const remaining = items.filter((it) => !it.done)
  if (items.length === 0) return null

  return (
    <Card>
      <SectionTitle right={<span className="text-xs text-slate-500">{items.length - remaining.length}/{items.length} done</span>}>
        Today
      </SectionTitle>
      {remaining.length === 0 ? (
        <p className="text-sm text-emerald-400">All caught up for today — nice work.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it) => (
            <li key={it.key} className="flex items-center justify-between text-sm">
              <span className={`flex items-center gap-2 ${it.done ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                <span aria-hidden>{it.done ? '✅' : it.icon}</span>
                {it.label}
              </span>
              {!it.done && <Link to={it.to} className="text-xs font-semibold text-brand-cyan hover:underline">Log now</Link>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function OvrCard({ ovr, cats, enabledMap }) {
  const tier = ovrTier(ovr)
  const anyContributing = cats.some((c) => c.active && isCategoryEnabled(enabledMap, c.key))
  return (
    <div className={`relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${tier.from} ${tier.to} p-5 sm:p-6 backdrop-blur-xl shadow-card`}>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),transparent_30%)]" />
      <div className="relative grid gap-6 md:grid-cols-[auto,1fr] items-center">
        {/* Athlete-card style score */}
        <div className={`relative grid place-items-center rounded-2xl bg-slate-950/50 backdrop-blur-md ring-2 ${tier.ring} px-8 py-6 text-center`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">OVR</p>
          <p className={`font-extrabold leading-none ${tier.text}`} style={{ fontSize: '4.5rem' }}>
            {ovr}
          </p>
          <p className={`mt-1 text-sm font-bold uppercase tracking-wider ${tier.text}`}>{tier.name}</p>
          <p className="mt-1 text-[11px] text-slate-500">Overall Life Rating</p>
        </div>

        {/* Category breakdown */}
        <div className="space-y-2.5">
          {!anyContributing && (
            <p className="text-sm text-slate-300">
              Everyone starts at 50. Start logging in your enabled sections and your OVR will climb — slack off and it slides.
              Pick which categories count in <Link to="/settings" className="text-brand-cyan hover:underline">Settings</Link>.
            </p>
          )}
          {cats.map((c) => {
            const enabled = isCategoryEnabled(enabledMap, c.key)
            const contributing = enabled && c.active
            return (
              <div key={c.key} className={contributing ? '' : 'opacity-40'}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-300">
                    {c.label} <span className="text-slate-600">· {c.weight}%</span>
                  </span>
                  <span className="text-slate-400">
                    {!enabled ? 'off' : c.active ? `${Math.round(c.score * 99)} · ${c.detail}` : 'not started'}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className={`h-full rounded-full ${tier.bar}`} style={{ width: `${contributing ? Math.round(c.score * 100) : 0}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function WeeklyReview({ bundle }) {
  const { last7Dates } = bundle

  // Workouts completed
  const norm = (s) => (s ?? '').trim().toLowerCase()
  const workouts = bundle.sessions.filter((s) => {
    const ssets = bundle.sets.filter((x) => x.session_id === s.id)
    const rt = s.routine_id ? bundle.routines.find((r) => r.id === s.routine_id) : null
    if (rt && (rt.exercises?.length ?? 0) > 0) return rt.exercises.every((ex) => ssets.some((x) => norm(x.exercise) === norm(ex)))
    return ssets.length > 0
  }).length

  // Calories hit (within 10% of target)
  const targets = computeTargets(bundle.profile)
  const calByDay = {}
  bundle.meals.forEach((m) => { calByDay[m.date] = (calByDay[m.date] || 0) + m.calories })
  const calHit = targets ? last7Dates.filter((d) => calByDay[d] && Math.abs(calByDay[d] - targets.calories) <= targets.calories * 0.1).length : 0

  // Water goals met
  const goalOz = Number(bundle.userSettings?.water_goal_oz ?? 64)
  const ozByDay = {}
  bundle.waterLogs.forEach((w) => { ozByDay[w.date] = (ozByDay[w.date] || 0) + w.oz })
  const waterMet = last7Dates.filter((d) => (ozByDay[d] || 0) >= goalOz).length

  // Sleep average (over logged nights)
  const totalSleep = bundle.sleepLogs.reduce((a, l) => a + l.minutes, 0)
  const sleepAvg = bundle.sleepLogs.length ? totalSleep / bundle.sleepLogs.length : 0

  // Money spent vs budget (month)
  const budget = Number(bundle.userSettings?.monthly_budget ?? 0)
  const spent = bundle.txns.filter((t) => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)

  const items = [
    { to: '/workout', label: 'Workouts', value: `${workouts}`, sub: 'completed (7d)' },
    { to: '/nutrition', label: 'Calories hit', value: targets ? `${calHit}/7` : '—', sub: 'days on target' },
    { to: '/water', label: 'Water goals', value: `${waterMet}/7`, sub: 'days met' },
    { to: '/sleep', label: 'Sleep avg', value: sleepAvg ? fmtHm(sleepAvg) : '—', sub: 'per night' },
    { to: '/finance', label: 'Spent', value: fmtMoney(spent), sub: budget > 0 ? `of ${fmtMoney(budget)}` : monthLabel() },
    { to: '/goals', label: 'Goals', value: `${bundle.goals.length}`, sub: bundle.goals.length ? `${Math.round(bundle.goals.reduce((a, g) => a + g.progress, 0) / bundle.goals.length)}% avg` : 'none yet' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {items.map((it) => (
        <Link key={it.label} to={it.to} className="block h-full">
          <Card className="glass-hover h-full">
            <p className="text-xs font-medium text-slate-400">{it.label}</p>
            <p className="mt-1 text-xl font-extrabold text-white">{it.value}</p>
            <p className="text-[11px] text-slate-500">{it.sub}</p>
          </Card>
        </Link>
      ))}
    </div>
  )
}

// A rolling weekly summary: how the OVR moved, what went well, what to focus
// on next, and any streaks currently running. Always reflects the trailing
// 7 days, with a slightly different heading on (logical) Sundays.
function WeeklyRecapCard({ bundle, cats, enabledMap, ovr }) {
  const today = todayStr()
  const isSunday = logicalNow().getDay() === 0

  // OVR change over the window (needs ovr_history / phase9 — degrades gracefully).
  const oldestEntry = bundle.ovrHistoryWeek[0] // query is ascending by date
  const ovrDelta = oldestEntry ? Math.round(ovr - Number(oldestEntry.ovr)) : null

  // Streaks (reuse the same engine as the Progress page).
  const goalOz = Number(bundle.userSettings?.water_goal_oz ?? 64)
  const goalH = Number(bundle.userSettings?.sleep_goal_hours ?? 8)
  const targets = computeTargets(bundle.profile)
  const calByDay = {}
  bundle.meals.forEach((m) => { calByDay[m.date] = (calByDay[m.date] || 0) + m.calories })
  const calDates = targets
    ? Object.keys(calByDay).filter((d) => Math.abs(calByDay[d] - targets.calories) <= targets.calories * 0.1)
    : []
  const activityDays = [...new Set([
    ...bundle.cardio.map((c) => c.date),
    ...bundle.sessions.map((s) => s.date),
  ])]
  const streaks = [
    { label: 'Water', icon: '💧', streak: computeStreak(daysMeetingGoal(bundle.waterLogs, 'date', 'oz', goalOz), today) },
    { label: 'Sleep', icon: '😴', streak: computeStreak(daysMeetingGoal(bundle.sleepLogs, 'date', 'minutes', goalH * 60), today) },
    { label: 'Calories', icon: '🍎', streak: computeStreak(calDates, today) },
    { label: 'Active days', icon: '🔥', streak: computeStreak(activityDays, today) },
  ].filter((s) => s.streak.current >= 3) // only surface streaks worth bragging about

  // Wins: enabled + active categories doing well this week.
  const wins = cats
    .filter((c) => isCategoryEnabled(enabledMap, c.key) && c.active && c.score >= 0.75)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)

  // Focus: an enabled category you haven't started yet, else your weakest active one.
  const notStarted = cats.find((c) => isCategoryEnabled(enabledMap, c.key) && !c.active)
  const weakest = cats
    .filter((c) => isCategoryEnabled(enabledMap, c.key) && c.active)
    .sort((a, b) => a.score - b.score)[0]
  const focus = notStarted ?? (weakest && weakest.score < 0.75 ? weakest : null)

  return (
    <Card>
      <SectionTitle right={<Link to="/progress" className="text-xs text-brand-cyan hover:underline">Full history</Link>}>
        {isSunday ? "This week's recap" : 'Weekly recap'}
      </SectionTitle>

      <div className="grid gap-5 sm:grid-cols-3">
        {/* OVR movement */}
        <div>
          <p className="text-xs text-slate-500 mb-1">OVR this week</p>
          {ovrDelta == null ? (
            <p className="text-sm text-slate-400">Building history — check back in a few days.</p>
          ) : (
            <p className={`text-2xl font-extrabold ${ovrDelta > 0 ? 'text-emerald-400' : ovrDelta < 0 ? 'text-red-400' : 'text-white'}`}>
              {ovrDelta > 0 ? '+' : ''}{ovrDelta}
              <span className="ml-1 text-xs font-medium text-slate-500">
                {ovrDelta > 0 ? 'up' : ovrDelta < 0 ? 'down' : 'holding steady'}
              </span>
            </p>
          )}
        </div>

        {/* Wins */}
        <div>
          <p className="text-xs text-slate-500 mb-1">Going well</p>
          {wins.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing standing out yet — small steps count.</p>
          ) : (
            <ul className="space-y-0.5">
              {wins.map((w) => (
                <li key={w.key} className="text-sm text-slate-200">
                  <span className="text-emerald-400">●</span> {w.label} <span className="text-slate-500">· {w.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Focus for next week */}
        <div>
          <p className="text-xs text-slate-500 mb-1">Focus next</p>
          {focus ? (
            <p className="text-sm text-slate-200">
              <span className="text-amber-400">●</span> {focus.label}
              <span className="text-slate-500"> · {focus.active ? focus.detail : 'not started yet'}</span>
            </p>
          ) : (
            <p className="text-sm text-slate-400">You're solid across the board — keep it up.</p>
          )}
        </div>
      </div>

      {streaks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-2">
          {streaks.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-300">
              {s.icon} {s.label} <span className="font-semibold text-white">{s.streak.current}d</span>
            </span>
          ))}
        </div>
      )}
    </Card>
  )
}

function UpcomingCard({ events }) {
  return (
    <Card>
      <SectionTitle right={<Link to="/calendar" className="text-xs text-brand-cyan hover:underline">Calendar</Link>}>
        Upcoming events
      </SectionTitle>
      <ul className="space-y-1.5">
        {events.length === 0 && <Empty>No upcoming events.</Empty>}
        {events.map((e) => (
          <li key={e.id} className="flex items-center justify-between text-sm">
            <span className={e.done ? 'text-slate-500 line-through' : 'text-slate-200'}>{e.title}</span>
            <span className="text-xs text-slate-500">{e.date}{e.time ? ` · ${e.time}` : ''}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
