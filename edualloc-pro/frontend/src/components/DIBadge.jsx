// DIBadge — premium color-coded DI score pill (light-theme compatible)
import { getDIClassName } from '../lib/di-colors'

const LEVELS = [
  { min: 80, label: 'Critical', bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },
  { min: 60, label: 'High',     bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  { min: 40, label: 'Moderate', bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-400' },
  { min: 0,  label: 'Stable',   bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
]

function getLevel(score) {
  return LEVELS.find(l => score >= l.min) || LEVELS[LEVELS.length - 1]
}

const DIBadge = ({ diScore, showLabel = true, size = 'md' }) => {
  if (diScore == null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-slate-100 text-slate-400 text-xs font-mono">
        —
      </span>
    )
  }

  const level = getLevel(diScore)
  const isCritical = diScore >= 80

  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-2 py-0.5'
    : size === 'lg'
    ? 'text-sm px-3 py-1'
    : 'text-xs px-2.5 py-1'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-bold ${sizeClasses} ${level.bg} ${level.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${level.dot} ${isCritical ? 'animate-pulse' : ''}`} />
      <span className="font-mono leading-none">{diScore.toFixed(1)}</span>
      {showLabel && (
        <span className="opacity-75 font-semibold">{level.label}</span>
      )}
    </span>
  )
}

export default DIBadge
