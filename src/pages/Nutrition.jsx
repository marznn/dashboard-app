import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { computeTargets, deriveGoal, ACTIVITY_OPTIONS, GOAL_LABEL } from '../lib/nutrition.js'
import { searchFoods } from '../lib/foodSearch.js'
import {
  PageHeader, Card, SectionTitle, Button, Field, Input, Select, Empty, ProgressBar, todayStr,
} from '../components/ui.jsx'

export default function Nutrition() {
  const today = todayStr()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [meals, setMeals] = useState([])
  const [saved, setSaved] = useState([])

  async function loadAll() {
    const [p, m, s] = await Promise.all([
      supabase.from('nutrition_profile').select('*').maybeSingle(),
      supabase.from('meals').select('*').eq('date', today).order('created_at', { ascending: true }),
      supabase.from('saved_meals').select('*').order('created_at', { ascending: false }),
    ])
    setProfile(p.data ?? null)
    setMeals(m.data ?? [])
    setSaved(s.data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Add a saved preset to today's meals in one tap.
  async function quickAddMeal(preset) {
    await supabase.from('meals').insert({
      date: todayStr(),
      name: preset.name,
      calories: preset.calories,
      protein_g: Number(preset.protein_g) || 0,
      carbs_g: Number(preset.carbs_g) || 0,
      fat_g: Number(preset.fat_g) || 0,
    })
    loadAll()
  }

  if (loading) return <Empty>Loading…</Empty>

  const targets = computeTargets(profile)
  const totals = meals.reduce(
    (a, m) => ({
      calories: a.calories + m.calories,
      protein_g: a.protein_g + Number(m.protein_g),
      carbs_g: a.carbs_g + Number(m.carbs_g),
      fat_g: a.fat_g + Number(m.fat_g),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  )

  return (
    <div>
      <PageHeader title="Nutrition" subtitle="Your targets, today's meals, and how close you are." />
      <div className="grid gap-5 lg:grid-cols-2">
        <ProfileCard profile={profile} reload={loadAll} />
        <TargetsCard targets={targets} totals={totals} hasProfile={!!profile} />
        <div className="lg:col-span-2">
          <MealsCard meals={meals} saved={saved} reload={loadAll} onQuickAdd={quickAddMeal} />
        </div>
        <div className="lg:col-span-2">
          <SavedMealsCard saved={saved} reload={loadAll} onQuickAdd={quickAddMeal} />
        </div>
      </div>
    </div>
  )
}

function ProfileCard({ profile, reload }) {
  const [form, setForm] = useState({
    height_in: profile?.height_in ?? '',
    weight_lb: profile?.weight_lb ?? '',
    age: profile?.age ?? '',
    gender: profile?.gender ?? 'male',
    body_fat_pct: profile?.body_fat_pct ?? '',
    goal_weight_lb: profile?.goal_weight_lb ?? '',
    goal_bodyfat_pct: profile?.goal_bodyfat_pct ?? '',
    activity: profile?.activity ?? 'moderate',
  })
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const ft = Math.floor((Number(form.height_in) || 0) / 12)
  const inch = (Number(form.height_in) || 0) % 12

  function setHeight(feet, inches) {
    const total = (Number(feet) || 0) * 12 + (Number(inches) || 0)
    setForm((f) => ({ ...f, height_in: total }))
  }

  async function save() {
    setBusy(true)
    setSaved(false)
    await supabase.from('nutrition_profile').upsert(
      {
        height_in: Number(form.height_in),
        weight_lb: Number(form.weight_lb),
        age: Number(form.age),
        gender: form.gender,
        body_fat_pct: form.body_fat_pct === '' ? null : Number(form.body_fat_pct),
        goal_weight_lb: form.goal_weight_lb === '' ? null : Number(form.goal_weight_lb),
        goal_bodyfat_pct: form.goal_bodyfat_pct === '' ? null : Number(form.goal_bodyfat_pct),
        // keep the legacy goal column valid — derived from current vs goal weight
        goal: deriveGoal(form.weight_lb, form.goal_weight_lb),
        activity: form.activity,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    setBusy(false)
    setSaved(true)
    reload()
  }

  return (
    <Card>
      <SectionTitle>Your stats</SectionTitle>
      <p className="text-xs text-slate-500 mb-3">Current</p>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Height (ft)">
          <Input type="number" min="0" value={ft || ''} onChange={(e) => setHeight(e.target.value, inch)} placeholder="5" />
        </Field>
        <Field label="Height (in)">
          <Input type="number" min="0" max="11" value={inch || ''} onChange={(e) => setHeight(ft, e.target.value)} placeholder="10" />
        </Field>
        <Field label="Weight (lb)">
          <Input type="number" min="0" value={form.weight_lb} onChange={(e) => setForm({ ...form, weight_lb: e.target.value })} placeholder="170" />
        </Field>
        <Field label="Body fat %">
          <Input type="number" min="0" max="70" step="0.1" value={form.body_fat_pct} onChange={(e) => setForm({ ...form, body_fat_pct: e.target.value })} placeholder="18" />
        </Field>
        <Field label="Age">
          <Input type="number" min="0" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="25" />
        </Field>
        <Field label="Gender">
          <Select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </Select>
        </Field>
      </div>

      <p className="text-xs text-slate-500 mt-4 mb-2">Goal</p>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Goal weight (lb)">
          <Input type="number" min="0" value={form.goal_weight_lb} onChange={(e) => setForm({ ...form, goal_weight_lb: e.target.value })} placeholder="160" />
        </Field>
        <Field label="Goal body fat %">
          <Input type="number" min="0" max="70" step="0.1" value={form.goal_bodyfat_pct} onChange={(e) => setForm({ ...form, goal_bodyfat_pct: e.target.value })} placeholder="12" />
        </Field>
        <div className="col-span-2">
          <Field label="Activity level">
            <Select value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })}>
              {ACTIVITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Button onClick={save} disabled={busy}>Save stats</Button>
        {saved && <span className="text-xs text-emerald-400">Saved</span>}
      </div>
    </Card>
  )
}

function TargetsCard({ targets, totals, hasProfile }) {
  if (!hasProfile || !targets) {
    return (
      <Card>
        <SectionTitle>Daily targets</SectionTitle>
        <Empty>Enter your stats to calculate your calorie and macro targets.</Empty>
      </Card>
    )
  }
  return (
    <Card>
      <SectionTitle right={<span className="text-xs text-slate-500">Today</span>}>Targets vs. intake</SectionTitle>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-white/5 px-2.5 py-1 text-slate-300">{GOAL_LABEL[targets.goal]}</span>
        <span className="rounded-full bg-white/5 px-2.5 py-1 text-slate-400">
          Lean mass {targets.lbm} lb{targets.goalLbm ? ` → goal ${targets.goalLbm} lb` : ''}
        </span>
      </div>
      <div className="space-y-3">
        <ProgressBar label="Calories" unit="" value={totals.calories} max={targets.calories} color="bg-indigo-500" />
        <ProgressBar label="Protein" unit="g" value={totals.protein_g} max={targets.protein_g} color="bg-emerald-500" />
        <ProgressBar label="Carbs" unit="g" value={totals.carbs_g} max={targets.carbs_g} color="bg-amber-500" />
        <ProgressBar label="Fat" unit="g" value={totals.fat_g} max={targets.fat_g} color="bg-sky-500" />
      </div>
    </Card>
  )
}

function MealsCard({ meals, saved, reload, onQuickAdd }) {
  const [form, setForm] = useState({ name: '', calories: '', protein_g: '', carbs_g: '', fat_g: '' })
  const [busy, setBusy] = useState(false)

  async function add() {
    if (!form.name || form.calories === '') return
    setBusy(true)
    await supabase.from('meals').insert({
      date: todayStr(),
      name: form.name,
      calories: Number(form.calories),
      protein_g: Number(form.protein_g) || 0,
      carbs_g: Number(form.carbs_g) || 0,
      fat_g: Number(form.fat_g) || 0,
    })
    setForm({ name: '', calories: '', protein_g: '', carbs_g: '', fat_g: '' })
    setBusy(false)
    reload()
  }

  function applyResult(r) {
    setForm({
      name: r.name,
      calories: String(r.calories),
      protein_g: String(r.protein_g),
      carbs_g: String(r.carbs_g),
      fat_g: String(r.fat_g),
    })
  }

  return (
    <Card>
      <SectionTitle right={<span className="text-xs text-slate-500">Today</span>}>Log a meal</SectionTitle>

      <div className="mb-3">
        <p className="text-xs text-slate-500 mb-1.5">Search a food to autofill macros</p>
        <FoodSearchBox onPick={applyResult} />
      </div>

      {saved.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-slate-500 mb-1.5">Quick add</p>
          <div className="flex flex-wrap gap-1.5">
            {saved.map((s) => (
              <button
                key={s.id}
                onClick={() => onQuickAdd(s)}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200 transition-colors hover:bg-white/10 hover:border-brand/40"
                title={`${s.calories} cal · ${Number(s.protein_g)}p / ${Number(s.carbs_g)}c / ${Number(s.fat_g)}f`}
              >
                + {s.name} <span className="text-slate-500">{s.calories}cal</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end">
        <div className="col-span-2"><Field label="Meal"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Chicken & rice" /></Field></div>
        <Field label="Calories"><Input type="number" min="0" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} placeholder="600" /></Field>
        <Field label="Protein (g)"><Input type="number" min="0" value={form.protein_g} onChange={(e) => setForm({ ...form, protein_g: e.target.value })} placeholder="45" /></Field>
        <Field label="Carbs (g)"><Input type="number" min="0" value={form.carbs_g} onChange={(e) => setForm({ ...form, carbs_g: e.target.value })} placeholder="60" /></Field>
        <Field label="Fat (g)"><Input type="number" min="0" value={form.fat_g} onChange={(e) => setForm({ ...form, fat_g: e.target.value })} placeholder="15" /></Field>
      </div>
      <div className="mt-3"><Button onClick={add} disabled={busy}>Add meal</Button></div>

      <ul className="mt-4 space-y-1.5">
        {meals.length === 0 && <Empty>No meals logged today.</Empty>}
        {meals.map((m) => (
          <li key={m.id} className="flex items-center justify-between text-sm">
            <span className="text-slate-200">{m.name}</span>
            <span className="flex items-center gap-3">
              <span className="text-xs text-slate-400">
                {m.calories} cal · {Number(m.protein_g)}p / {Number(m.carbs_g)}c / {Number(m.fat_g)}f
              </span>
              <button onClick={async () => { await supabase.from('meals').delete().eq('id', m.id); reload() }}
                className="text-xs text-red-400 hover:underline">Delete</button>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

// Debounced live search against USDA FoodData Central; click a result to autofill the form above it.
function FoodSearchBox({ onPick }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [errorMsg, setErrorMsg] = useState('')
  const [open, setOpen] = useState(false)
  const abortRef = useRef(null)
  const debounceRef = useRef(null)

  function onChange(e) {
    const v = e.target.value
    setQuery(v)
    setOpen(true)
    clearTimeout(debounceRef.current)
    abortRef.current?.abort()

    if (v.trim().length < 2) {
      setResults([])
      setStatus('idle')
      return
    }

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller
      setStatus('loading')
      try {
        const found = await searchFoods(v, controller.signal)
        setResults(found)
        setStatus('done')
      } catch (err) {
        if (err.name !== 'AbortError') {
          setErrorMsg(err.message || 'Search failed — try again.')
          setStatus('error')
        }
      }
    }, 400)
  }

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={onChange}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="e.g. grilled chicken breast"
      />
      {open && query.trim().length >= 2 && (
        <div className="absolute z-10 mt-1.5 w-full max-h-64 overflow-y-auto rounded-xl glass p-1.5">
          {status === 'loading' && <p className="px-2.5 py-2 text-xs text-slate-500">Searching…</p>}
          {status === 'error' && <p className="px-2.5 py-2 text-xs text-red-400">{errorMsg}</p>}
          {status === 'done' && results.length === 0 && (
            <p className="px-2.5 py-2 text-xs text-slate-500">No matches. Try a simpler term.</p>
          )}
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onPick(r); setOpen(false) }}
              className="block w-full rounded-lg px-2.5 py-2 text-left text-sm text-slate-200 hover:bg-white/10"
            >
              <span className="block truncate">{r.name}</span>
              <span className="block text-xs text-slate-500">
                per {r.basis} · {r.calories} cal · {r.protein_g}p / {r.carbs_g}c / {r.fat_g}f
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SavedMealsCard({ saved, reload, onQuickAdd }) {
  const [form, setForm] = useState({ name: '', calories: '', protein_g: '', carbs_g: '', fat_g: '' })
  const [busy, setBusy] = useState(false)

  async function savePreset() {
    if (!form.name || form.calories === '') return
    setBusy(true)
    await supabase.from('saved_meals').insert({
      name: form.name,
      calories: Number(form.calories),
      protein_g: Number(form.protein_g) || 0,
      carbs_g: Number(form.carbs_g) || 0,
      fat_g: Number(form.fat_g) || 0,
    })
    setForm({ name: '', calories: '', protein_g: '', carbs_g: '', fat_g: '' })
    setBusy(false)
    reload()
  }

  return (
    <Card>
      <SectionTitle right={<span className="text-xs text-slate-500">Reusable presets</span>}>Saved meals</SectionTitle>
      <p className="text-xs text-slate-500 mb-3">
        Save a meal’s macros once, then add it to any day in a single tap (e.g. “Salmon — 500 cal, 50p / 0c / 10f”).
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end">
        <div className="col-span-2"><Field label="Meal"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Salmon" /></Field></div>
        <Field label="Calories"><Input type="number" min="0" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} placeholder="500" /></Field>
        <Field label="Protein (g)"><Input type="number" min="0" value={form.protein_g} onChange={(e) => setForm({ ...form, protein_g: e.target.value })} placeholder="50" /></Field>
        <Field label="Carbs (g)"><Input type="number" min="0" value={form.carbs_g} onChange={(e) => setForm({ ...form, carbs_g: e.target.value })} placeholder="0" /></Field>
        <Field label="Fat (g)"><Input type="number" min="0" value={form.fat_g} onChange={(e) => setForm({ ...form, fat_g: e.target.value })} placeholder="10" /></Field>
      </div>
      <div className="mt-3"><Button onClick={savePreset} disabled={busy}>Save preset</Button></div>

      <ul className="mt-4 space-y-1.5">
        {saved.length === 0 && <Empty>No saved meals yet.</Empty>}
        {saved.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0">
              <span className="text-slate-200">{s.name}</span>
              <span className="ml-2 text-xs text-slate-500">
                {s.calories} cal · {Number(s.protein_g)}p / {Number(s.carbs_g)}c / {Number(s.fat_g)}f
              </span>
            </span>
            <span className="flex items-center gap-3 shrink-0">
              <button onClick={() => onQuickAdd(s)} className="text-xs font-semibold text-brand-cyan hover:underline">+ Add to today</button>
              <button onClick={async () => { await supabase.from('saved_meals').delete().eq('id', s.id); reload() }}
                className="text-xs text-red-400 hover:underline">Delete</button>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
