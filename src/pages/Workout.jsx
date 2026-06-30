import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  PageHeader, Card, SectionTitle, Button, Field, Input, Select, Empty, todayStr,
} from '../components/ui.jsx'

export default function Workout() {
  const today = todayStr()
  const [loading, setLoading] = useState(true)
  const [routines, setRoutines] = useState([])
  const [session, setSession] = useState(null)
  const [sets, setSets] = useState([])
  const [cardio, setCardio] = useState([])
  const [steps, setSteps] = useState('')

  async function loadAll() {
    setLoading(true)
    const [r, ss, st] = await Promise.all([
      supabase.from('routines').select('*').order('created_at', { ascending: false }),
      supabase.from('workout_sessions').select('id').eq('date', today).maybeSingle(),
      supabase.from('step_logs').select('steps').eq('date', today).maybeSingle(),
    ])
    setRoutines(r.data ?? [])
    setSession(ss.data ?? null)
    setSteps(st.data ? String(st.data.steps) : '')

    if (ss.data) {
      const { data: setRows } = await supabase
        .from('workout_sets').select('*').eq('session_id', ss.data.id)
        .order('created_at', { ascending: true })
      setSets(setRows ?? [])
    } else {
      setSets([])
    }

    const { data: cardioRows } = await supabase
      .from('cardio_logs').select('*').order('date', { ascending: false }).limit(10)
    setCardio(cardioRows ?? [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function ensureSession() {
    if (session) return session.id
    const { data } = await supabase
      .from('workout_sessions').insert({ date: today }).select('id').single()
    setSession(data)
    return data.id
  }

  if (loading) return <Empty>Loading…</Empty>

  return (
    <div>
      <PageHeader title="Workout" subtitle="Routines, sets & reps, cardio, and daily steps." />

      <div className="grid gap-5 lg:grid-cols-2">
        <StepsCard today={today} steps={steps} setSteps={setSteps} />
        <CardioCard cardio={cardio} reload={loadAll} />
        <div className="lg:col-span-2">
          <LogCard routines={routines} sets={sets} ensureSession={ensureSession} reload={loadAll} />
        </div>
        <div className="lg:col-span-2">
          <RoutinesCard routines={routines} reload={loadAll} />
        </div>
      </div>
    </div>
  )
}

function StepsCard({ steps, setSteps }) {
  const [busy, setBusy] = useState(false)
  async function save() {
    setBusy(true)
    await supabase.from('step_logs').upsert(
      { date: todayStr(), steps: Number(steps) || 0 },
      { onConflict: 'user_id,date' },
    )
    setBusy(false)
  }
  return (
    <Card>
      <SectionTitle>Steps today</SectionTitle>
      <div className="flex items-end gap-2">
        <Field label="Step count">
          <Input
            type="number" min="0" inputMode="numeric" value={steps}
            onChange={(e) => setSteps(e.target.value)} placeholder="e.g. 8000"
          />
        </Field>
        <Button onClick={save} disabled={busy}>Save</Button>
      </div>
    </Card>
  )
}

function CardioCard({ cardio, reload }) {
  const [activity, setActivity] = useState('')
  const [duration, setDuration] = useState('')
  const [distance, setDistance] = useState('')
  const [busy, setBusy] = useState(false)

  async function add() {
    if (!activity || !duration) return
    setBusy(true)
    await supabase.from('cardio_logs').insert({
      activity,
      duration_min: Number(duration),
      distance_mi: distance ? Number(distance) : null,
    })
    setActivity(''); setDuration(''); setDistance('')
    setBusy(false)
    reload()
  }

  return (
    <Card>
      <SectionTitle>Cardio</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Activity"><Input value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="Run" /></Field>
        <Field label="Minutes"><Input type="number" min="0" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="30" /></Field>
        <Field label="Distance (mi, optional)"><Input type="number" min="0" step="0.1" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="3.1" /></Field>
        <div className="flex items-end"><Button onClick={add} disabled={busy} className="w-full">Add cardio</Button></div>
      </div>
      <ul className="mt-4 space-y-1.5">
        {cardio.length === 0 && <Empty>No cardio logged yet.</Empty>}
        {cardio.map((c) => (
          <li key={c.id} className="flex items-center justify-between text-sm">
            <span className="text-slate-200">
              {c.activity} · {c.duration_min} min{c.distance_mi ? ` · ${c.distance_mi} mi` : ''}
            </span>
            <span className="flex items-center gap-3">
              <span className="text-xs text-slate-500">{c.date}</span>
              <button onClick={async () => { await supabase.from('cardio_logs').delete().eq('id', c.id); reload() }}
                className="text-xs text-red-400 hover:underline">Delete</button>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function LogCard({ routines, sets, ensureSession, reload }) {
  const [exercise, setExercise] = useState('')
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')
  const [routineId, setRoutineId] = useState('')
  const [busy, setBusy] = useState(false)

  const selectedRoutine = routines.find((r) => r.id === routineId)
  const chips = selectedRoutine?.exercises ?? []

  async function addSet() {
    if (!exercise || reps === '') return
    setBusy(true)
    const sessionId = await ensureSession()
    await supabase.from('workout_sets').insert({
      session_id: sessionId,
      exercise,
      reps: Number(reps),
      weight: weight ? Number(weight) : null,
    })
    setReps(''); setWeight('')
    setBusy(false)
    reload()
  }

  // Group today's sets by exercise
  const grouped = sets.reduce((acc, s) => {
    (acc[s.exercise] ??= []).push(s)
    return acc
  }, {})

  return (
    <Card>
      <SectionTitle right={<span className="text-xs text-slate-500">Today</span>}>Log sets & reps</SectionTitle>

      {routines.length > 0 && (
        <div className="mb-3">
          <Field label="Load exercises from routine">
            <Select value={routineId} onChange={(e) => setRoutineId(e.target.value)}>
              <option value="">— none —</option>
              {routines.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
          </Field>
          {chips.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {chips.map((name) => (
                <button key={name} onClick={() => setExercise(name)}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10">
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
        <Field label="Exercise"><Input value={exercise} onChange={(e) => setExercise(e.target.value)} placeholder="Bench press" /></Field>
        <Field label="Reps"><Input type="number" min="0" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="10" /></Field>
        <Field label="Weight (optional)"><Input type="number" min="0" step="0.5" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="135" /></Field>
        <Button onClick={addSet} disabled={busy}>Add set</Button>
      </div>

      <div className="mt-4 space-y-3">
        {Object.keys(grouped).length === 0 && <Empty>No sets logged today.</Empty>}
        {Object.entries(grouped).map(([name, rows]) => (
          <div key={name}>
            <p className="text-sm font-medium text-white mb-1">{name}</p>
            <ul className="space-y-1">
              {rows.map((s, i) => (
                <li key={s.id} className="flex items-center justify-between text-sm text-slate-300">
                  <span>Set {i + 1}: {s.reps} reps{s.weight != null ? ` × ${s.weight}` : ''}</span>
                  <button onClick={async () => { await supabase.from('workout_sets').delete().eq('id', s.id); reload() }}
                    className="text-xs text-red-400 hover:underline">Delete</button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  )
}

function RoutinesCard({ routines, reload }) {
  const [name, setName] = useState('')
  const [exercises, setExercises] = useState([])
  const [exInput, setExInput] = useState('')
  const [busy, setBusy] = useState(false)

  function addExercise() {
    const v = exInput.trim()
    if (!v) return
    setExercises([...exercises, v])
    setExInput('')
  }

  async function saveRoutine() {
    if (!name || exercises.length === 0) return
    setBusy(true)
    await supabase.from('routines').insert({ name, exercises })
    setName(''); setExercises([])
    setBusy(false)
    reload()
  }

  return (
    <Card>
      <SectionTitle>Saved routines</SectionTitle>

      <div className="rounded-xl border border-white/10 p-3 mb-4">
        <Field label="Routine name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Push day" /></Field>
        <div className="mt-2 flex items-end gap-2">
          <Field label="Add exercise">
            <Input value={exInput} onChange={(e) => setExInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExercise() } }}
              placeholder="Bench press" />
          </Field>
          <Button variant="ghost" onClick={addExercise}>Add</Button>
        </div>
        {exercises.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {exercises.map((ex, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-2.5 py-1 text-xs text-indigo-300">
                {ex}
                <button onClick={() => setExercises(exercises.filter((_, j) => j !== i))} className="text-indigo-300/70 hover:text-white">×</button>
              </span>
            ))}
          </div>
        )}
        <div className="mt-3">
          <Button onClick={saveRoutine} disabled={busy}>Save routine</Button>
        </div>
      </div>

      <ul className="space-y-2">
        {routines.length === 0 && <Empty>No routines saved yet.</Empty>}
        {routines.map((r) => (
          <li key={r.id} className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-white">{r.name}</p>
              <p className="text-xs text-slate-400">{(r.exercises ?? []).join(' · ') || '—'}</p>
            </div>
            <button onClick={async () => { await supabase.from('routines').delete().eq('id', r.id); reload() }}
              className="text-xs text-red-400 hover:underline shrink-0">Delete</button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
