import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  PageHeader, Card, SectionTitle, Button, Field, Input, Empty, ProgressBar,
  todayStr, weekStartStr, sleepMinutes, fmtHm,
} from '../components/ui.jsx'

export default function Sleep() {
  const weekStart = weekStartStr()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState([])
  const [settings, setSettings] = useState(null)

  async function loadAll() {
    const [l, s] = await Promise.all([
      supabase.from('sleep_logs').select('*').gte('date', weekStart).order('date', { ascending: false }),
      supabase.from('user_settings').select('*').maybeSingle(),
    ])
    setLogs(l.data ?? [])
    setSettings(s.data ?? { sleep_goal_hours: 8 })
    setLoading(false)
  }

  useEffect(() => { loadAll() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Empty>Loading…</Empty>

  const goalHours = Number(settings?.sleep_goal_hours ?? 8)
  const totalMin = logs.reduce((a, l) => a + l.minutes, 0)
  const avgMin = logs.length ? totalMin / logs.length : 0

  return (
    <div>
      <PageHeader title="Sleep" subtitle="Log each night; see your weekly average." />
      <div className="grid gap-5 lg:grid-cols-2">
        <LogCard logs={logs} reload={loadAll} />
        <WeekCard
          avgMin={avgMin}
          nights={logs.length}
          goalHours={goalHours}
          onSaveGoal={async (hours) => {
            await supabase.from('user_settings').upsert(
              { sleep_goal_hours: hours, updated_at: new Date().toISOString() },
              { onConflict: 'user_id' },
            )
            setSettings((s) => ({ ...s, sleep_goal_hours: hours }))
          }}
        />
        <div className="lg:col-span-2">
          <NightsCard logs={logs} reload={loadAll} />
        </div>
      </div>
    </div>
  )
}

function LogCard({ logs, reload }) {
  const [date, setDate] = useState(todayStr())
  const [bedtime, setBedtime] = useState('23:00')
  const [wake, setWake] = useState('07:00')
  const [busy, setBusy] = useState(false)

  const preview = sleepMinutes(bedtime, wake)
  const existing = logs.find((l) => l.date === date)

  async function save() {
    setBusy(true)
    await supabase.from('sleep_logs').upsert(
      { date, bedtime, wake_time: wake, minutes: sleepMinutes(bedtime, wake) },
      { onConflict: 'user_id,date' },
    )
    setBusy(false)
    reload()
  }

  return (
    <Card>
      <SectionTitle>Log a night</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="sm:col-span-2">
          <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
        <Field label="Bedtime"><Input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} /></Field>
        <Field label="Wake time"><Input type="time" value={wake} onChange={(e) => setWake(e.target.value)} /></Field>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button onClick={save} disabled={busy}>{existing ? 'Update night' : 'Save night'}</Button>
        <span className="text-sm text-slate-400">{fmtHm(preview)} of sleep</span>
      </div>
    </Card>
  )
}

function WeekCard({ avgMin, nights, goalHours, onSaveGoal }) {
  const [goalInput, setGoalInput] = useState(String(goalHours))
  const [busy, setBusy] = useState(false)

  return (
    <Card>
      <SectionTitle right={<span className="text-xs text-slate-500">This week</span>}>Average sleep</SectionTitle>
      <p className="text-3xl font-extrabold text-gradient-brand">{fmtHm(avgMin)}</p>
      <p className="text-xs text-slate-400 mb-4">over {nights} night{nights === 1 ? '' : 's'} logged</p>

      <ProgressBar label="vs. goal" unit="h" value={avgMin / 60} max={goalHours} color="bg-violet-500" />

      <div className="mt-3 flex items-end gap-2">
        <Field label="Sleep goal (hours)">
          <Input type="number" min="0" step="0.5" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} className="w-32" />
        </Field>
        <Button variant="ghost" disabled={busy}
          onClick={async () => { setBusy(true); await onSaveGoal(Number(goalInput) || 0); setBusy(false) }}>
          Save goal
        </Button>
      </div>
    </Card>
  )
}

function NightsCard({ logs, reload }) {
  return (
    <Card>
      <SectionTitle>This week's nights</SectionTitle>
      <ul className="space-y-1.5">
        {logs.length === 0 && <Empty>No nights logged this week.</Empty>}
        {logs.map((l) => (
          <li key={l.id} className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="text-slate-200">{l.date}</span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-xs text-slate-400">{l.bedtime} → {l.wake_time} · {fmtHm(l.minutes)}</span>
              <button onClick={async () => { await supabase.from('sleep_logs').delete().eq('id', l.id); reload() }}
                className="text-xs text-red-400 hover:underline">Delete</button>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
