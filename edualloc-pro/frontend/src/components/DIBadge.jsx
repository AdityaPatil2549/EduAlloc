// DIBadge — color-coded DI score badge component
// Number values always in JetBrains Mono even in Marathi mode
import { useTranslation } from 'react-i18next'
import { getDIClassName } from '../lib/di-colors'

const DIBadge = ({ diScore, showLabel = true, size = 'md' }) => {
  const { t } = useTranslation()
  const className = getDIClassName(diScore)
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'

  if (diScore == null) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full ${sizeClass} bg-gray-700 text-gray-400`}>
        <span className="di-number">—</span>
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${sizeClass} ${className}`}>
      <span className="di-number">{diScore.toFixed(1)}</span>
      {showLabel && (
        <span className="opacity-90 text-xs uppercase tracking-wide">
          {t(`di.${getDICategory(diScore)}`, { diScore })}
        </span>
      )}
    </span>
  )
}

function getDICategory(diScore) {
  if (diScore >= 80) return 'critical'
  if (diScore >= 60) return 'high'
  if (diScore >= 40) return 'moderate'
  return 'stable'
}

export default DIBadge
