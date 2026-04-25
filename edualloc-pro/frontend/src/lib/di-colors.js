/**
 * getDIColor — returns CSS variable name for a given DI score.
 * Number values always rendered in JetBrains Mono even in Marathi mode.
 */
export const DI_CONFIG = {
  critical: { min: 80, max: 100, color: 'var(--di-critical)', label: 'critical' },
  high:     { min: 60, max: 79,  color: 'var(--di-high)',     label: 'high' },
  moderate: { min: 40, max: 59,  color: 'var(--di-moderate)', label: 'moderate' },
  stable:   { min: 0,  max: 39,  color: 'var(--di-stable)',   label: 'stable' },
}

export function getDIColor(diScore) {
  if (diScore == null) return 'var(--text-muted)'
  if (diScore >= 80) return 'var(--di-critical)'
  if (diScore >= 60) return 'var(--di-high)'
  if (diScore >= 40) return 'var(--di-moderate)'
  return 'var(--di-stable)'
}

export function getDICategory(diScore) {
  if (diScore == null) return null
  if (diScore >= 80) return 'critical'
  if (diScore >= 60) return 'high'
  if (diScore >= 40) return 'moderate'
  return 'stable'
}

export function getDIClassName(diScore) {
  const cat = getDICategory(diScore)
  return cat ? `di-${cat}` : ''
}
