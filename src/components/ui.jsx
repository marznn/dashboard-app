// Shared UI primitives reused across every section.

export function PageHeader({ title, subtitle, right }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-gradient-brand">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function Card({ children, className = '' }) {
  return (
    <div className={`glass rounded-2xl p-5 ${className}`}>
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
    primary: 'btn-brand text-white',
    ghost: 'glass-soft text-slate-200',
    danger: 'text-red-400 hover:bg-red-500/10',
  }
  return (
    <button
      className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Field({ label, children }) {
  return (
    // min-w-0 lets this shrink inside grid/flex rows — without it, a native
    // input/select's intrinsic width can push past its column and overlap
    // the next field (e.g. Calendar's Time + Reminder row).
    <label className="block min-w-0">
      {label && <span className="block text-xs font-medium text-slate-400 mb-1.5">{label}</span>}
      {children}
    </label>
  )
}

export function Input(props) {
  return (
    <input
      {...props}
      className={`glass-input w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 ${props.className ?? ''}`}
    />
  )
}

export function Select(props) {
  return (
    <select
      {...props}
      className={`glass-input w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none ${props.className ?? ''}`}
    />
  )
}

export function Empty({ children }) {
  return <p className="text-sm text-slate-500 py-2">{children}</p>
}

// Map the legacy semantic bg-* colors to Vision UI gradient fills.
const GRADIENT_FILL = {
  'bg-indigo-500': 'grad-blue',
  'bg-emerald-500': 'grad-green',
  'bg-amber-500': 'grad-amber',
  'bg-sky-500': 'grad-sky',
  'bg-violet-500': 'grad-violet',
  'bg-red-500': 'grad-red',
}

export function ProgressBar({ value, max, label, unit = '', color = 'bg-indigo-500' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const fill = GRADIENT_FILL[color] ?? 'grad-blue'
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-400">
          {Math.round(value)}{unit} <span className="text-slate-600">/ {Math.round(max)}{unit}</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden ring-1 ring-inset ring-white/5">
        <div
          className={`h-full rounded-full ${fill} transition-[width] duration-500 ease-out`}
          style={{ width: `${pct}%`, boxShadow: pct > 0 ? '0 0 12px rgba(33,150,255,0.45)' : 'none' }}
        />
      </div>
    </div>
  )
}

// Local YYYY-MM-DD (avoids UTC off-by-one from toISOString)
function localDateStr(d) {
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

// The app's "day" rolls over at this local hour instead of midnight. Anything
// happening before it (e.g. a 1am post-midnight meal) still counts toward the
// previous calendar day; the new day's blank slate begins at DAY_RESET_HOUR.
// 3am handles typical late-night logging.
export const DAY_RESET_HOUR = 3

// "Now", shifted back by the reset hour, so its LOCAL date is the current
// *logical* day. Every "today / this week / this month" helper below is anchored
// on this, so all daily trackers reset together at the 3am boundary.
export function logicalNow() {
  return new Date(Date.now() - DAY_RESET_HOUR * 3600 * 1000)
}

export function todayStr() {
  return localDateStr(logicalNow())
}

// YYYY-MM-DD for a given local year/month(0-based)/day
export function ymd(year, month, day) {
  return localDateStr(new Date(year, month, day))
}

// The last `n` logical dates, most recent first, as YYYY-MM-DD.
export function recentDates(n) {
  const d = logicalNow()
  return Array.from({ length: n }, (_, i) => ymd(d.getFullYear(), d.getMonth(), d.getDate() - i))
}

// Monday of the current (logical) week, as YYYY-MM-DD
export function weekStartStr() {
  const d = logicalNow()
  const offsetToMonday = (d.getDay() + 6) % 7 // Sun=0 -> 6, Mon=1 -> 0
  d.setDate(d.getDate() - offsetToMonday)
  return localDateStr(d)
}

// Current (logical) month as { start, end } YYYY-MM-DD (end = first of next month, exclusive)
export function monthRange() {
  const d = logicalNow()
  const start = localDateStr(new Date(d.getFullYear(), d.getMonth(), 1))
  const end = localDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 1))
  return { start, end }
}

export function monthLabel() {
  return logicalNow().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
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
