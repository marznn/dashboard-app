import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../auth/AuthProvider.jsx'
import { ovrTier, isCategoryEnabled, STARTING_OVR } from '../lib/ovr.js'
import {
  PageHeader, Card, SectionTitle, Button, Field, Input, Empty,
} from '../components/ui.jsx'

// The seven OVR categories (must match the keys in lib/ovr.js).
const CATEGORIES = [
  { key: 'workout', label: 'Workout', icon: '🏋️', weight: 20 },
  { key: 'nutrition', label: 'Nutrition', icon: '🍎', weight: 20 },
  { key: 'sleep', label: 'Sleep', icon: '😴', weight: 15 },
  { key: 'finance', label: 'Finance', icon: '💵', weight: 15 },
  { key: 'water', label: 'Water', icon: '💧', weight: 10 },
  { key: 'goals', label: 'Goals', icon: '🎯', weight: 10 },
  { key: 'calendar', label: 'Calendar', icon: '📅', weight: 10 },
]

function Toggle({ on, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        on ? 'btn-brand' : 'bg-white/10 border border-white/15'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

export default function Settings() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [enabledMap, setEnabledMap] = useState({})
  const [ovr, setOvr] = useState(STARTING_OVR)

  const [name, setName] = useState(user?.user_metadata?.full_name || user?.user_metadata?.name || '')
  const [savingName, setSavingName] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('user_settings').select('ovr, ovr_categories').maybeSingle()
      setEnabledMap(data?.ovr_categories ?? {})
      setOvr(data?.ovr ?? STARTING_OVR)
      setLoading(false)
    })()
  }, [])

  async function saveName() {
    setSavingName(true)
    setNameSaved(false)
    await supabase.auth.updateUser({ data: { full_name: name.trim() } })
    setSavingName(false)
    setNameSaved(true)
  }

  async function toggleCategory(key, value) {
    const next = { ...enabledMap, [key]: value }
    setEnabledMap(next) // optimistic
    await supabase.from('user_settings').upsert(
      { ovr_categories: next, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
  }

  if (loading) return <Empty>Loading…</Empty>

  const tier = ovrTier(ovr)
  const enabledCount = CATEGORIES.filter((c) => isCategoryEnabled(enabledMap, c.key)).length

  return (
    <div>
      <PageHeader title="Settings" subtitle="Your name, your score, and what counts toward it." />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Profile / name */}
        <Card>
          <SectionTitle>Your name</SectionTitle>
          <p className="text-xs text-slate-500 mb-3">Used to greet you on the dashboard — e.g. “{(name.trim().split(/\s+/)[0] || 'Your')}’s Dashboard”.</p>
          <div className="flex items-end gap-2">
            <Field label="Display name">
              <Input value={name} onChange={(e) => { setName(e.target.value); setNameSaved(false) }} placeholder="Marston" />
            </Field>
            <Button onClick={saveName} disabled={savingName}>{savingName ? 'Saving…' : 'Save'}</Button>
          </div>
          {nameSaved && <p className="mt-2 text-xs text-emerald-400">Saved</p>}
        </Card>

        {/* Current OVR */}
        <Card>
          <SectionTitle>Overall (OVR)</SectionTitle>
          <div className="flex items-center gap-4">
            <div className={`grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-slate-950/50 ring-2 ${tier.ring}`}>
              <span className={`text-3xl font-extrabold leading-none ${tier.text}`}>{ovr}</span>
            </div>
            <div className="text-sm text-slate-400">
              <p><span className={`font-bold ${tier.text}`}>{tier.name}</span> tier</p>
              <p className="mt-1 text-xs">Everyone starts at 50. Good days nudge it up, bad days nudge it down — gradually, once per day.</p>
            </div>
          </div>
        </Card>

        {/* Category toggles */}
        <div className="lg:col-span-2">
          <Card>
            <SectionTitle right={<span className="text-xs text-slate-500">{enabledCount}/7 on</span>}>
              Categories that count
            </SectionTitle>
            <p className="text-xs text-slate-500 mb-3">
              Turn a category off and it won’t affect your OVR — the remaining ones are reweighted automatically.
            </p>
            <ul className="divide-y divide-white/5">
              {CATEGORIES.map((c) => {
                const on = isCategoryEnabled(enabledMap, c.key)
                return (
                  <li key={c.key} className="flex items-center justify-between py-3">
                    <span className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-lg glass-soft text-base" aria-hidden>{c.icon}</span>
                      <span>
                        <span className="block text-sm font-semibold text-white">{c.label}</span>
                        <span className="block text-xs text-slate-500">Weight {c.weight}%</span>
                      </span>
                    </span>
                    <Toggle on={on} onChange={(v) => toggleCategory(c.key, v)} />
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
