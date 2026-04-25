// map-markers.js — Custom SVG marker builders for Google Maps
// Marker size and color reflect DI urgency

import { getDIColor, getDICategory } from './di-colors.js'

/**
 * Build a circle SVG marker icon for a school based on its DI score.
 * Returns a Google Maps Symbol definition.
 * @param {number|null} diScore - DI score 0-100
 * @param {boolean} isSelected - Whether this marker is currently selected
 * @returns {object} Google Maps marker icon definition
 */
export function buildSchoolMarkerIcon(diScore, isSelected = false) {
  const color = getDIColor(diScore)
  const category = getDICategory(diScore)

  // Scale marker size by urgency — critical schools are most visible
  const SCALE_MAP = {
    critical: 11,
    high:     9,
    moderate: 7,
    stable:   6,
    unknown:  5,
  }

  const scale = SCALE_MAP[category] ?? 6

  return {
    path: 'M 0,0 m -1,0 a 1,1 0 1,0 2,0 a 1,1 0 1,0 -2,0', // circle path
    fillColor: color,
    fillOpacity: isSelected ? 1.0 : 0.85,
    strokeColor: isSelected ? '#ffffff' : 'rgba(255,255,255,0.6)',
    strokeWeight: isSelected ? 2.5 : 1.5,
    scale,
    anchor: { x: 0, y: 0 },
  }
}

/**
 * Build a data-quality overlay SVG for schools with insufficient UDISE data.
 * Returns a Google Maps Symbol with a dashed border.
 */
export function buildStaleBorderIcon(diScore) {
  const color = getDIColor(diScore)
  return {
    path: 'M 0,0 m -1,0 a 1,1 0 1,0 2,0 a 1,1 0 1,0 -2,0',
    fillColor: color,
    fillOpacity: 0.4,
    strokeColor: color,
    strokeWeight: 1,
    strokeOpacity: 0.6,
    scale: 8,
  }
}
