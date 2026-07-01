import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  PageHeader, Card, SectionTitle, Button, Field, Input, Empty, ProgressBar, todayStr,
} from '../components/ui.jsx'

export default function Goals() {
  const [loading, setLoading] = useState(true)
  const [goals, setGoals] = useState([])

  async function loadAll() {
    const { data } = await supabase.from('goals').select('*').order('created_at', { ascending: false })
    setGoals(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Empty>Loading…</Empty>

  const avg = goals.length ? Math.round(goals.reduce((a, g) => a + g.progress, 0) / goals.length) : 0

  return (
    <div>
      <PageHeader
        title="Goals"
        subtitle="Set targets and track your progress."
        right={goals.length > 0 ? (
          <span className="text-sm text-slate-400">Avg progress <span className="font-semibold text-white">{avg}%</span></span>
        ) : null}
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <AddGoalCard reload={loadAll} />
        <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2">
          {goals.length === 0 && <Empty>No goals yet — add your first one.</Empty>}
          {goals.map((g) => <GoalCard key={g.id} goal={g} reload={loadAll} />)}
        </div>
      </div>
    </div>
  )
}

function AddGoalCard({ reload }) {
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [target, setTarget] = useState('')
  const [busy, setBusy] = useState(false)

  async function add() {
    if (!title) return
    setBusy(true)
    await supabase.from('goals').insert({
      title, detail: detail || null, target_date: target || null,
    })
    setTitle(''); setDetail(''); setTarget('')
    setBusy(false)
    reload()
  }

  return (
    <Card>
      <SectionTitle>New goal</SectionTitle>
      <div className="space-y-2">
        <Field label="Goal"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Run a half marathon" /></Field>
        <Field label="Details (optional)"><Input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Build up to 13.1 miles" /></Field>
        <Field label="Target date (optional)"><Input type="date" min={todayStr()} value={target} onChange={(e) => setTarget(e.target.value)} /></Field>
      </div>
      <div className="mt-3"><Button onClick={add} disabled={busy}>Add goal</Button></div>
    </Card>
  )
}

function GoalCard({ goal, reload }) {
  const [progress, setProgress] = useState(goal.progress)

  function daysLeft() {
    if (!goal.target_date) return null
    const diff = Math.ceil((new Date(goal.target_date + 'T00:00:00') - new Date(todayStr() + 'T00:00:00')) / 86400000)
    return diff
  }
  const dl = daysLeft()

  async function save(val) {
    setProgress(val)
    await supabase.from('goals').update({ progress: val }).eq('id', goal.id)
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-white">{goal.title}</p>
          {goal.detail && <p className="text-xs text-slate-400 mt-0.5">{goal.detail}</p>}
        </div>
        <button onClick={async () => { await supabase.from('goals').delete().eq('id', goal.id); reload() }}
          className="text-xs text-red-400 hover:underline shrink-0">Delete</button>
      </div>

      {goal.target_date && (
        <p className={`mt-2 text-xs ${dl < 0 ? 'text-red-400' : 'text-slate-500'}`}>
          Target {goal.target_date}
          {dl != null && (dl < 0 ? ` · ${Math.abs(dl)}d overdue` : dl === 0 ? ' · due today' : ` · ${dl}d left`)}
        </p>
      )}

      <div className="mt-3">
        <ProgressBar label="Progress" unit="%" value={progress} max={100}
          color={progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'} />
        <input
          type="range" min="0" max="100" step="5" value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          onPointerUp={(e) => save(Number(e.target.value))}
          onKeyUp={(e) => save(Number(e.target.value))}
          className="mt-2 w-full accent-brand"
        />
        <div className="flex gap-2 mt-1">
          <Button variant="ghost" onClick={() => save(Math.max(0, progress - 10))}>−10%</Button>
          <Button variant="ghost" onClick={() => save(Math.min(100, progress + 10))}>+10%</Button>
          {progress < 100 && <Button variant="ghost" onClick={() => save(100)}>Mark done</Button>}
        </div>
      </div>
    </Card>
  )
}
