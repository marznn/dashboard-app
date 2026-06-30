// Temporary stub for sections not yet built. Each will be replaced by a
// real, fully-functional tracker in its own phase.
export default function Placeholder({ title }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-8 text-center">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">Coming next — this section is being built.</p>
    </div>
  )
}
