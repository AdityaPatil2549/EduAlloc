// DVSMeter — animated breakdown bar showing DI/Match/Retention components
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

const DVS_COLORS = {
  di:        'var(--di-critical)',
  match:     'var(--brand)',
  retention: 'var(--di-stable)',
}

const DVSMeter = ({ dvs }) => {
  const { t } = useTranslation()
  if (!dvs) return null

  const { dvs: total, di_component, match_component, retention_component } = dvs
  const totalPct = (total * 100).toFixed(1)

  const segments = [
    { key: 'di',        value: di_component,        label: t('dvs.di_weight'),        color: DVS_COLORS.di },
    { key: 'match',     value: match_component,      label: t('dvs.match_weight'),     color: DVS_COLORS.match },
    { key: 'retention', value: retention_component,  label: t('dvs.retention_weight'), color: DVS_COLORS.retention },
  ]

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{t('dvs.title')}</span>
        <span className="di-number text-sm font-bold text-white">{totalPct}%</span>
      </div>

      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-gray-700 gap-0.5">
        {segments.map((seg) => (
          <motion.div
            key={seg.key}
            initial={{ width: 0 }}
            animate={{ width: `${seg.value * 100}%` }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
            style={{ background: seg.color }}
            title={`${seg.label}: ${(seg.value * 100).toFixed(1)}%`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap">
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: seg.color }} />
            <span className="text-xs text-gray-400">{seg.label}</span>
            <span className="di-number text-xs text-white">{(seg.value * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DVSMeter
