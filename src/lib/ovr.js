// Overall Life Rating (OVR) engine.
//
// Window: rolling last 7 days for the consistency categories.
// Weighting: only "active" sections (ones you've set up / logged) are counted;
// their weights are renormalized so OVR reflects what you actually use.

import { computeTargets } from './nutrition.js'

const clamp = (n) => Math.max(0, Math.min(1, n))
const norm = (s) => (s ?? '').trim().toLowerCase()

export const CATEGORY_WEIGHTS = {
  workout: 20,
  nutrition: 20,
  sleep: 15,
  finance: 15,
  water: 10,
  goals: 10,
  calendar: 10,
}

// Was a planned session fully completed (or any set logged if no routine)?
function sessionComplete(session, sets, routines) {
  const ssets = sets.filter((x) => x.session_id === session.id)
  const rt = session.routine_id ? routines.find((r) => r.id === session.routine_id) : null
  if (rt && (rt.exercises?.length ?? 0) > 0) {
    return rt.exercises.every((ex) => ssets.some((x) => norm(x.exercise) === norm(ex)))
  }
  return ssets.length > 0
}

function sumByDay(rows, field) {
  const map = {}
  for (const r of rows) map[r.date] = (map[r.date] || 0) + Number(r[field] || 0)
  return map
}

// bundle: { last7Dates, workoutSettings, routines, sessions, sets, cardio,
//   profile, meals, sleepLogs, userSettings, waterLogs, txns, goals, events }
export function computeOvr(b) {
  const days = b.last7Dates // array of 7 YYYY-MM-DD strings
  const cats = []

  // --- Workout (20) ---
  {
    const goal = b.workoutSettings?.workout_weekly_goal ?? 5
    const completed = b.sessions.filter((s) => sessionComplete(s, b.sets, b.routines)).length
    const workoutScore = clamp(goal > 0 ? completed / goal : 0)
    const cardioGoal = b.workoutSettings?.cardio_weekly_goal_min ?? 0
    const cardioMin = b.cardio.reduce((a, c) => a + (c.duration_min || 0), 0)
    const cardioScore = cardioGoal > 0 ? clamp(cardioMin / cardioGoal) : null
    const score = cardioScore != null ? 0.7 * workoutScore + 0.3 * cardioScore : workoutScore
    const active = b.routines.length > 0 || b.sessions.length > 0 || !!b.workoutSettings
    cats.push({
      key: 'workout', label: 'Workout', weight: 20, active, score,
      detail: `${completed}/${goal} workouts` + (cardioScore != null ? ` · ${cardioMin}/${cardioGoal}m cardio` : ''),
    })
  }

  // --- Nutrition (20) ---
  {
    const targets = computeTargets(b.profile)
    const byDay = sumByDay(b.meals, 'calories')
    let sum = 0
    for (const d of days) {
      const cal = byDay[d] || 0
      if (cal > 0 && targets) sum += clamp(1 - Math.abs(cal - targets.calories) / targets.calories)
    }
    const loggedDays = days.filter((d) => (byDay[d] || 0) > 0).length
    cats.push({
      key: 'nutrition', label: 'Nutrition', weight: 20,
      active: !!b.profile, score: sum / 7,
      detail: targets ? `${loggedDays}/7 days on target` : 'Set your stats',
    })
  }

  // --- Sleep (15) ---
  {
    const goalH = Number(b.userSettings?.sleep_goal_hours ?? 8)
    const totalMin = b.sleepLogs.reduce((a, l) => a + l.minutes, 0)
    const score = goalH > 0 ? clamp((totalMin / 7) / (goalH * 60)) : 0
    cats.push({
      key: 'sleep', label: 'Sleep', weight: 15,
      active: b.sleepLogs.length > 0, score,
      detail: `${b.sleepLogs.length} nights · ${goalH}h goal`,
    })
  }

  // --- Finance (15) --- (current month, budget adherence)
  {
    const budget = Number(b.userSettings?.monthly_budget ?? 0)
    const spent = b.txns.filter((t) => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)
    const score = budget > 0 ? (spent <= budget ? 1 : clamp(1 - (spent - budget) / budget)) : 0
    cats.push({
      key: 'finance', label: 'Finance', weight: 15,
      active: budget > 0, score,
      detail: budget > 0 ? `$${Math.round(spent)} / $${Math.round(budget)} budget` : 'Set a budget',
    })
  }

  // --- Water (10) ---
  {
    const goalOz = Number(b.userSettings?.water_goal_oz ?? 64)
    const byDay = sumByDay(b.waterLogs, 'oz')
    let sum = 0
    let metDays = 0
    for (const d of days) {
      const oz = byDay[d] || 0
      sum += goalOz > 0 ? clamp(oz / goalOz) : 0
      if (goalOz > 0 && oz >= goalOz) metDays++
    }
    cats.push({
      key: 'water', label: 'Water', weight: 10,
      active: b.waterLogs.length > 0, score: sum / 7,
      detail: `${metDays}/7 days hit goal`,
    })
  }

  // --- Goals (10) ---
  {
    const avg = b.goals.length ? b.goals.reduce((a, g) => a + g.progress, 0) / b.goals.length : 0
    cats.push({
      key: 'goals', label: 'Goals', weight: 10,
      active: b.goals.length > 0, score: avg / 100,
      detail: `${b.goals.length} goals · ${Math.round(avg)}% avg`,
    })
  }

  // --- Calendar / task completion (10) --- (last 7 days)
  {
    const total = b.events.length
    const done = b.events.filter((e) => e.done).length
    cats.push({
      key: 'calendar', label: 'Calendar', weight: 10,
      active: total > 0, score: total > 0 ? done / total : 0,
      detail: `${done}/${total} tasks done`,
    })
  }

  const active = cats.filter((c) => c.active)
  const totalW = active.reduce((a, c) => a + c.weight, 0)
  const ovr = totalW > 0
    ? Math.round((active.reduce((a, c) => a + c.weight * c.score, 0) / totalW) * 99)
    : 0

  return { ovr, cats, hasData: totalW > 0 }
}

// Color tiers: 0-59 bronze, 60-74 silver, 75-84 gold, 85-94 purple, 95-99 elite
export function ovrTier(ovr) {
  if (ovr >= 95) return { name: 'Elite', text: 'text-red-400', ring: 'ring-red-500/50', from: 'from-red-500/30', to: 'to-rose-600/10', bar: 'bg-red-500' }
  if (ovr >= 85) return { name: 'Diamond', text: 'text-violet-400', ring: 'ring-violet-500/50', from: 'from-violet-500/30', to: 'to-fuchsia-600/10', bar: 'bg-violet-500' }
  if (ovr >= 75) return { name: 'Gold', text: 'text-yellow-400', ring: 'ring-yellow-500/50', from: 'from-yellow-500/25', to: 'to-amber-600/10', bar: 'bg-yellow-400' }
  if (ovr >= 60) return { name: 'Silver', text: 'text-slate-200', ring: 'ring-slate-400/50', from: 'from-slate-400/25', to: 'to-slate-500/10', bar: 'bg-slate-300' }
  return { name: 'Bronze', text: 'text-amber-600', ring: 'ring-amber-700/50', from: 'from-amber-700/25', to: 'to-orange-800/10', bar: 'bg-amber-600' }
}
