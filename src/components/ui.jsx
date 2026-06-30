// Shared UI primitives reused across every section.

export function PageHeader({ title, subtitle, right }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-slate-900/60 p-5 ${className}`}>
      {children}
    </div>
  )
}

export function SectionTitle({ children, right }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{children}</h2>
      {right}
    </div>
  )
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const variants = {
    primary: 'bg-indigo-500 text-white hover:bg-indigo-600',
    ghost: 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10',
    danger: 'text-red-400 hover:bg-red-500/10',
  }
  return (
    <button
      className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Field({ label, children }) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-medium text-slate-400 mb-1.5">{label}</span>}
      {children}
    </label>
  )
}

export function Input(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500 ${props.className ?? ''}`}
    />
  )
}

export function Select(props) {
  return (
    <select
      {...props}
      className={`w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500 ${props.className ?? ''}`}
    />
  )
}

export function Empty({ children }) {
  return <p className="text-sm text-slate-500 py-2">{children}</p>
}

export function ProgressBar({ value, max, label, unit = '', color = 'bg-indigo-500' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-400">
          {Math.round(value)}{unit} <span className="text-slate-600">/ {Math.round(max)}{unit}</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// Local YYYY-MM-DD (avoids UTC off-by-one from toISOString)
function localDateStr(d) {
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

export function todayStr() {
  return localDateStr(new Date())
}

// YYYY-MM-DD for a given local year/month(0-based)/day
export function ymd(year, month, day) {
  return localDateStr(new Date(year, month, day))
}

// Monday of the current week, as YYYY-MM-DD
export function weekStartStr() {
  const d = new Date()
  const offsetToMonday = (d.getDay() + 6) % 7 // Sun=0 -> 6, Mon=1 -> 0
  d.setDate(d.getDate() - offsetToMonday)
  return localDateStr(d)
}

// Current month as { start, end } YYYY-MM-DD (end = first of next month, exclusive)
export function monthRange() {
  const d = new Date()
  const start = localDateStr(new Date(d.getFullYear(), d.getMonth(), 1))
  const end = localDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 1))
  return { start, end }
}

export function monthLabel() {
  return new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function fmtMoney(n) {
  return (Number(n) || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

// Minutes between two "HH:MM" times, wrapping past midnight (e.g. 23:00→07:00 = 8h)
export function sleepMinutes(bedtime, wake) {
  if (!bedtime || !wake) return 0
  const [bh, bm] = bedtime.split(':').map(Number)
  const [wh, wm] = wake.split(':').map(Number)
  let mins = wh * 60 + wm - (bh * 60 + bm)
  if (mins <= 0) mins += 24 * 60
  return mins
}

export function fmtHm(minutes) {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return `${h}h ${m}m`
}
