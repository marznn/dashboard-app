import { useId } from 'react'

// The Pulse mark: a liquid-glass gradient tile with a glowing heartbeat
// waveform. A soft dot pulses along the line for a subtle "alive" feel.
const PULSE_PATH = 'M5 24 H16 L19.5 24 L23 12.5 L27 35.5 L30.5 21 L33.5 24 H43'

export function PulseMark({ size = 36, animate = true, className = '' }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Pulse"
    >
      <defs>
        <linearGradient id={`pg-${id}`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0075FF" />
          <stop offset="55%" stopColor="#582CFF" />
          <stop offset="100%" stopColor="#21D4FD" />
        </linearGradient>
        <linearGradient id={`ps-${id}`} x1="0" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="42%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter id={`pgl-${id}`} x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>

      {/* Gradient glass tile + top specular sheen + rim light */}
      <rect x="1" y="1" width="46" height="46" rx="13" fill={`url(#pg-${id})`} />
      <rect x="1" y="1" width="46" height="46" rx="13" fill={`url(#ps-${id})`} />
      <rect x="1.6" y="1.6" width="44.8" height="44.8" rx="12.4" fill="none" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="1" />

      {/* Heartbeat line: blurred glow underlay + crisp stroke */}
      <path d={PULSE_PATH} stroke="#ffffff" strokeOpacity="0.45" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" filter={`url(#pgl-${id})`} />
      <path d={PULSE_PATH} stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />

      {/* Glowing dot that travels along the pulse */}
      {animate && (
        <circle r="2.1" fill="#ffffff">
          <animateMotion dur="2.6s" repeatCount="indefinite" path={PULSE_PATH} keyPoints="0;1" keyTimes="0;1" calcMode="linear" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" dur="2.6s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  )
}

// Wordmark: the mark + "Pulse" in a gradient.
export function PulseWordmark({ size = 36, className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <PulseMark size={size} />
      <span className="text-[17px] font-extrabold tracking-tight text-gradient-brand">Pulse</span>
    </div>
  )
}
