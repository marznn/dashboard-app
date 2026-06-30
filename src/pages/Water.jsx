import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  PageHeader, Card, SectionTitle, Button, Field, Input, Empty, ProgressBar, todayStr,
} from '../components/ui.jsx'

const QUICK_ADDS = [8, 12, 16, 24]

export default function Water() {
  const today = todayStr()
  const [loading, setLoading] = useState(true)
  const [oz, setOz] = useState(0)
  const [goal, setGoal] = useState(64)

  async function loadAll() {
    setLoading(true)
    const [w, s] = await Promise.all([
      supabase.from('water_logs').select('oz').eq('date', today).maybeSingle(),
      supabase.from('user_settings').select('water_goal_oz').maybeSingle(),
    ])
    setOz(w.data?.oz ?? 0)
    setGoal(Number(s.data?.water_goal_oz ?? 64))
    setLoading(false)
  }

  useEffect(() => { loadAll() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function setWater(next) {
    const value = Math.max(0, next)
    setOz(value) // optimistic
    await supabase.from('water_logs').upsert(
      { date: today, oz: value, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,date' },
    )
  }

  async function saveGoal(next) {
    setGoal(next)
    await supabase.from('user_settings').upsert(
      { water_goal_oz: next, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
  }

  if (loading) return <Empty>Loading…</Empty>

  const pct = goal > 0 ? Math.min(100, Math.round((oz / goal) * 100)) : 0

  return (
    <div>
      <PageHeader title="Water" subtitle="Tap to add water and hit your daily goal." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle right={<span className="text-xs text-slate-500">Today</span>}>Intake</SectionTitle>
          <div className="flex items-end gap-2 mb-1">
            <span className="text-4xl font-extrabold text-gradient-brand">{oz}</span>
            <span className="text-slate-400 mb-1">/ {goal} oz</span>
            <span className="ml-auto text-sm text-brand-cyan font-semibold">{pct}%</span>
          </div>
          <ProgressBar label="Progress" unit=" oz" value={oz} max={goal} color="bg-sky-500" />

          <div className="mt-4 flex flex-wrap gap-2">
            {QUICK_ADDS.map((amt) => (
              <Button key={amt} onClick={() => setWater(oz + amt)}>+{amt} oz</Button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setWater(oz - 8)}>−8 oz</Button>
            <Button variant="ghost" onClick={() => setWater(0)}>Reset</Button>
          </div>
        </Card>

        <Card>
          <SectionTitle>Daily goal</SectionTitle>
          <GoalEditor goal={goal} onSave={saveGoal} />
          <p className="mt-3 text-xs text-slate-500">
            Tip: a common target is about half your body weight (lb) in ounces.
          </p>
        </Card>
      </div>
    </div>
  )
}

function GoalEditor({ goal, onSave }) {
  const [input, setInput] = useState(String(goal))
  const [busy, setBusy] = useState(false)
  return (
    <div className="flex items-end gap-2">
      <Field label="Goal (oz)">
        <Input type="number" min="0" value={input} onChange={(e) => setInput(e.target.value)} className="w-32" />
      </Field>
      <Button variant="ghost" disabled={busy}
        onClick={async () => { setBusy(true); await onSave(Number(input) || 0); setBusy(false) }}>
        Save goal
      </Button>
    </div>
  )
}
