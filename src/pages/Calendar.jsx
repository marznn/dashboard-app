import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  PageHeader, Card, SectionTitle, Button, Field, Input, Select, Empty, todayStr, ymd,
} from '../components/ui.jsx'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const REMIND_OPTIONS = [
  { value: 10, label: '10 min before' },
  { value: 30, label: '30 min before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
]

const notifySupported = typeof window !== 'undefined' && 'Notification' in window

export default function Calendar() {
  const now = new Date()
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [events, setEvents] = useState([])
  const [selected, setSelected] = useState(todayStr())
  const [loading, setLoading] = useState(true)
  const [perm, setPerm] = useState(notifySupported ? Notification.permission : 'unsupported')

  const monthStart = ymd(view.y, view.m, 1)
  const monthEnd = ymd(view.y, view.m + 1, 1)

  async function loadEvents() {
    setLoading(true)
    const { data } = await supabase
      .from('events').select('*').gte('date', monthStart).lt('date', monthEnd)
      .order('time', { ascending: true })
    setEvents(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadEvents() }, [view.y, view.m]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reminder loop: check today's events every minute and fire due notifications.
  useReminders(perm)

  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  const startWeekday = new Date(view.y, view.m, 1).getDay()
  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const selectedEvents = events.filter((e) => e.date === selected)
    .sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99'))

  function shiftMonth(delta) {
    const d = new Date(view.y, view.m + delta, 1)
    setView({ y: d.getFullYear(), m: d.getMonth() })
  }

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle="Add events and get reminders ahead of time."
        right={
          notifySupported && perm !== 'granted' ? (
            <Button variant="ghost" onClick={async () => setPerm(await Notification.requestPermission())}>
              Enable reminders
            </Button>
          ) : null
        }
      />

      {notifySupported && perm === 'denied' && (
        <p className="mb-4 text-xs text-amber-400">
          Notifications are blocked in your browser settings — reminders won't show until you allow them for this site.
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => shiftMonth(-1)} className="px-2 py-1 text-slate-400 hover:text-white">‹</button>
              <h2 className="font-semibold text-white">{MONTHS[view.m]} {view.y}</h2>
              <button onClick={() => shiftMonth(1)} className="px-2 py-1 text-slate-400 hover:text-white">›</button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 mb-1">
              {WEEKDAYS.map((w) => <div key={w} className="py-1">{w}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((d, i) => {
                if (d === null) return <div key={`b${i}`} />
                const dateStr = ymd(view.y, view.m, d)
                const dayEvents = events.filter((e) => e.date === dateStr)
                const isToday = dateStr === todayStr()
                const isSelected = dateStr === selected
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelected(dateStr)}
                    className={`aspect-square rounded-lg border p-1 text-left transition-colors ${
                      isSelected ? 'border-indigo-500 bg-indigo-500/15'
                        : 'border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <span className={`text-xs ${isToday ? 'font-bold text-indigo-400' : 'text-slate-300'}`}>{d}</span>
                    <div className="mt-0.5 space-y-0.5">
                      {dayEvents.slice(0, 2).map((e) => (
                        <div key={e.id} className={`truncate rounded px-1 text-[10px] ${e.done ? 'bg-white/5 text-slate-500 line-through' : 'bg-indigo-500/25 text-indigo-200'}`}>
                          {e.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && <div className="text-[10px] text-slate-500">+{dayEvents.length - 2} more</div>}
                    </div>
                  </button>
                )
              })}
            </div>
            {loading && <p className="mt-3 text-xs text-slate-500">Loading…</p>}
          </Card>
        </div>

        <DayPanel selected={selected} events={selectedEvents} reload={loadEvents} />
      </div>
    </div>
  )
}

function DayPanel({ selected, events, reload }) {
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('09:00')
  const [remind, setRemind] = useState(30)
  const [busy, setBusy] = useState(false)

  async function add() {
    if (!title) return
    setBusy(true)
    await supabase.from('events').insert({
      date: selected, time: time || null, title, remind_min_before: Number(remind),
    })
    setTitle('')
    setBusy(false)
    reload()
  }

  async function toggleDone(e) {
    await supabase.from('events').update({ done: !e.done }).eq('id', e.id)
    reload()
  }

  const label = new Date(selected + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <Card>
      <SectionTitle>{label}</SectionTitle>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Dentist appointment" /></Field>
        </div>
        <Field label="Time"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        <Field label="Reminder">
          <Select value={remind} onChange={(e) => setRemind(e.target.value)}>
            {REMIND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </Field>
      </div>
      <div className="mt-3"><Button onClick={add} disabled={busy}>Add event</Button></div>

      <ul className="mt-4 space-y-1.5">
        {events.length === 0 && <Empty>No events this day.</Empty>}
        {events.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={e.done} onChange={() => toggleDone(e)} className="accent-indigo-500" />
              <span className={e.done ? 'text-slate-500 line-through' : 'text-slate-200'}>
                {e.time ? `${e.time} · ` : ''}{e.title}
              </span>
            </label>
            <button onClick={async () => { await supabase.from('events').delete().eq('id', e.id); reload() }}
              className="text-xs text-red-400 hover:underline shrink-0">Delete</button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

// Checks today's events every minute and fires a browser notification when one
// enters its reminder window. Marks notified so it only fires once. Reminders
// only fire while the app is open in a tab (no push server).
function useReminders(perm) {
  const firing = useRef(false)

  useEffect(() => {
    if (!notifySupported || perm !== 'granted') return

    async function check() {
      if (firing.current) return
      firing.current = true
      try {
        const { data } = await supabase
          .from('events').select('*')
          .eq('date', todayStr()).eq('notified', false).eq('done', false)
        const now = Date.now()
        for (const e of data ?? []) {
          if (!e.time) continue
          const eventTime = new Date(`${e.date}T${e.time}:00`).getTime()
          const remindAt = eventTime - e.remind_min_before * 60000
          if (now >= remindAt && now < eventTime) {
            new Notification(e.title, {
              body: e.time ? `At ${e.time}` : 'Today',
            })
            await supabase.from('events').update({ notified: true }).eq('id', e.id)
          }
        }
      } finally {
        firing.current = false
      }
    }

    check()
    const id = setInterval(check, 60000)
    return () => clearInterval(id)
  }, [perm])
}
