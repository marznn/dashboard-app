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

// Local YYYY-MM-DD (avoids UTC off-by-one from toISOString)
export function todayStr() {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}
