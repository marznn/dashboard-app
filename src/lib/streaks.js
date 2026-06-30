// Streak math. A "streak" is a run of consecutive days on which a habit's
// condition was met. The *current* streak counts back from today; if today's
// condition isn't met yet, it counts back from yesterday instead, so a day
// that's still in progress never shows the streak as already broken.

// YYYY-MM-DD -> integer day number (so consecutive days differ by 1).
function toDayNum(ymdStr) {
  const [y, m, d] = ymdStr.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000)
}

// qualifyingDates: array of 'YYYY-MM-DD' strings the habit was satisfied on.
// today: 'YYYY-MM-DD' (the logical today). Returns { current, best }.
export function computeStreak(qualifyingDates, today) {
  if (!qualifyingDates || qualifyingDates.length === 0) return { current: 0, best: 0 }

  const nums = [...new Set(qualifyingDates)].map(toDayNum).sort((a, b) => a - b)
  const has = new Set(nums)

  // Longest consecutive run anywhere in the data.
  let best = 1
  let run = 1
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] === nums[i - 1] + 1) run += 1
    else run = 1
    if (run > best) best = run
  }

  // Current run ending today (or yesterday if today not done yet).
  const t = toDayNum(today)
  let cursor = has.has(t) ? t : has.has(t - 1) ? t - 1 : null
  let current = 0
  while (cursor !== null && has.has(cursor)) {
    current += 1
    cursor -= 1
  }

  return { current, best }
}

// Helpers to turn raw logs into qualifying-date lists.

// Days where the summed value for that date meets/exceeds a goal.
export function daysMeetingGoal(rows, dateField, valueField, goal) {
  if (!(goal > 0)) return []
  const byDay = {}
  for (const r of rows) byDay[r[dateField]] = (byDay[r[dateField]] || 0) + Number(r[valueField] || 0)
  return Object.keys(byDay).filter((d) => byDay[d] >= goal)
}

// Distinct dates present in rows (i.e. "you logged something that day").
export function daysPresent(rows, dateField = 'date') {
  return [...new Set(rows.map((r) => r[dateField]))]
}
