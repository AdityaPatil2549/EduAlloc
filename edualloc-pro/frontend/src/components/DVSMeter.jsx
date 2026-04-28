// DVSMeter — animated DVS score breakdown bar (light-theme compatible)
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

const SEGMENTS = [
  { key: 'di',        color: '#ef4444', label: 'DI Weight' },
  { key: 'match',     color: '#2563eb', label: 'Match' },
  { key: 'retention', color: '#10b981', label: 'Retention' },
]

const DVSMeter = ({ dvs }) => {
  const { t } = useTranslation()
  if (!dvs) return null

  const { dvs: total, di_component, match_component, retention_component } = dvs
  const totalPct = total != null ? (total * 100).toFixed(1) : '—'

  const values = {
    di: di_component || 0,
    match: match_component || 0,
    retention: retention_component || 0,
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">DVS Breakdown</span>
        <span className="text-sm font-black text-slate-800 font-mono">{totalPct}%</span>
      </div>

      {/* Stacked progress bar */}
      <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100 gap-px">
        {SEGMENTS.map((seg) => (
          <motion.div
            key={seg.key}
            initial={{ width: 0 }}
            animate={{ width: `${values[seg.key] * 100}%` }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
            style={{ background: seg.color }}
            title={`${seg.label}: ${(values[seg.key] * 100).toFixed(1)}%`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap">
        {SEGMENTS.map((seg) => (
          <div key={seg.key} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: seg.color }} />
            <span className="text-[11px] text-slate-500 font-semibold">{seg.label}</span>
            <span className="text-[11px] font-black text-slate-700 font-mono">
              {(values[seg.key] * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DVSMeter
