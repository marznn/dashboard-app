// Tiny dependency-free SVG charts tuned for the Vision UI glass look.
// Each takes data as [{ label, value }] (value may be null for "no data").

const BRAND = '#21D4FD'
const BRAND2 = '#582CFF'

function niceMax(max) {
  if (max <= 0) return 1
  const pow = Math.pow(10, Math.floor(Math.log10(max)))
  const n = max / pow
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return step * pow
}

// Line chart with a soft gradient fill. `goal` draws a dashed reference line.
export function LineChart({ data, height = 160, unit = '', goal = null, format = (v) => Math.round(v) }) {
  const W = 600
  const H = height
  const padL = 8, padR = 8, padT = 12, padB = 22
  const pts = data.filter((d) => d.value != null)
  if (pts.length === 0) return <ChartEmpty height={height} />

  const values = data.map((d) => d.value).filter((v) => v != null)
  const rawMax = Math.max(...values, goal ?? 0)
  const max = niceMax(rawMax)
  const n = data.length
  const x = (i) => padL + (n === 1 ? (W - padL - padR) / 2 : (i * (W - padL - padR)) / (n - 1))
  const y = (v) => padT + (H - padT - padB) * (1 - v / max)

  // Build a continuous path across the points that exist (keeping x by index).
  let dPath = ''
  let started = false
  data.forEach((d, i) => {
    if (d.value == null) return
    dPath += `${started ? 'L' : 'M'} ${x(i)} ${y(d.value)} `
    started = true
  })
  const firstI = data.findIndex((d) => d.value != null)
  const lastI = data.length - 1 - [...data].reverse().findIndex((d) => d.value != null)
  const fillPath = `${dPath} L ${x(lastI)} ${H - padB} L ${x(firstI)} ${H - padB} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} preserveAspectRatio="none" role="img">
      <defs>
        <linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BRAND} stopOpacity="0.28" />
          <stop offset="100%" stopColor={BRAND} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lc-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={BRAND2} />
          <stop offset="100%" stopColor={BRAND} />
        </linearGradient>
      </defs>
      {goal != null && goal > 0 && (
        <g>
          <line x1={padL} x2={W - padR} y1={y(goal)} y2={y(goal)} stroke="#ffffff" strokeOpacity="0.22" strokeDasharray="4 4" />
          <text x={W - padR} y={y(goal) - 4} textAnchor="end" fontSize="10" fill="#94a3b8">goal {format(goal)}{unit}</text>
        </g>
      )}
      <path d={fillPath} fill="url(#lc-fill)" />
      <path d={dPath} fill="none" stroke="url(#lc-stroke)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) =>
        d.value == null ? null : (
          <circle key={i} cx={x(i)} cy={y(d.value)} r={n > 40 ? 0 : 2.5} fill="#fff" />
        ),
      )}
      <XLabels data={data} x={x} H={H} padB={padB} />
    </svg>
  )
}

// Vertical bar chart. `goal` draws a dashed reference line.
export function BarChart({ data, height = 160, unit = '', goal = null, format = (v) => Math.round(v) }) {
  const W = 600
  const H = height
  const padL = 8, padR = 8, padT = 12, padB = 22
  const values = data.map((d) => d.value || 0)
  if (values.every((v) => v === 0)) return <ChartEmpty height={height} />
  const max = niceMax(Math.max(...values, goal ?? 0))
  const n = data.length
  const slot = (W - padL - padR) / n
  const bw = Math.min(slot * 0.6, 26)
  const y = (v) => padT + (H - padT - padB) * (1 - v / max)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} preserveAspectRatio="none" role="img">
      <defs>
        <linearGradient id="bc-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BRAND} />
          <stop offset="100%" stopColor={BRAND2} />
        </linearGradient>
      </defs>
      {goal != null && goal > 0 && (
        <line x1={padL} x2={W - padR} y1={y(goal)} y2={y(goal)} stroke="#ffffff" strokeOpacity="0.22" strokeDasharray="4 4" />
      )}
      {data.map((d, i) => {
        const cx = padL + slot * i + slot / 2
        const v = d.value || 0
        const hgt = Math.max(0, (H - padT - padB) - (y(v) - padT))
        return <rect key={i} x={cx - bw / 2} y={y(v)} width={bw} height={hgt} rx={Math.min(4, bw / 2)} fill="url(#bc-fill)" opacity={v ? 1 : 0.15} />
      })}
      <XLabels data={data} x={(i) => padL + slot * i + slot / 2} H={H} padB={padB} />
    </svg>
  )
}

// Sparse x-axis labels (first, middle-ish, last) to avoid clutter.
function XLabels({ data, x, H, padB }) {
  const n = data.length
  const idxs = n <= 1 ? [0] : [0, Math.floor((n - 1) / 2), n - 1]
  return (
    <g>
      {[...new Set(idxs)].map((i) => (
        <text key={i} x={x(i)} y={H - padB + 14} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} fontSize="10" fill="#64748b">
          {data[i]?.label}
        </text>
      ))}
    </g>
  )
}

function ChartEmpty({ height }) {
  return (
    <div className="grid place-items-center text-xs text-slate-500" style={{ height }}>
      Not enough data yet — keep logging.
    </div>
  )
}
