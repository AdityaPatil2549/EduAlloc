// TeacherMatchCard — shows teacher-school match with DVS meter and approval UI
// Uses optimistic update pattern for approve/reject actions
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import DVSMeter from './DVSMeter'

const TeacherMatchCard = ({ match, rank }) => {
  const { t } = useTranslation()
  const [approved, setApproved] = useState(null) // null | true | false

  const dvsPct = match.dvs?.dvs != null
    ? (match.dvs.dvs * 100).toFixed(0)
    : (match.dvs_score != null ? (match.dvs_score * 100).toFixed(0) : '—')

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (rank - 1) * 0.08 }}
      className="glass-card p-5"
      id={`match-card-${match.teacher_id}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="di-number text-xs px-2 py-0.5 rounded-full bg-indigo-900/50 text-indigo-300">
              #{rank}
            </span>
            <span className="text-xs font-medium text-gray-300">
              {match.vacancy_subject}
            </span>
            {match.qualification && (
              <span className="text-xs text-gray-500">{match.qualification}</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1 di-number">
            {match.teacher_id.substring(0, 12)}…
          </p>
          {match.years_experience != null && (
            <p className="text-xs text-gray-500 mt-0.5">
              {match.years_experience}yr experience
              {match.years_rural != null && ` · ${match.years_rural}yr rural`}
            </p>
          )}
        </div>

        {/* DVS Score */}
        <div className="text-right flex-shrink-0">
          <div className="di-number text-2xl font-bold text-white">
            {dvsPct}
            <span className="text-xs text-gray-400 ml-0.5">%</span>
          </div>
          <div className="text-xs text-gray-500">DVS</div>
        </div>
      </div>

      {/* DVS Meter breakdown */}
      {match.dvs && (
        <div className="mt-4">
          <DVSMeter dvs={match.dvs} />
        </div>
      )}

      {/* Distance */}
      {match.distance_km != null && (
        <p className="mt-2 text-xs text-gray-500">
          📍 {t('deploy.distance_km', { km: match.distance_km.toFixed(0) })}
        </p>
      )}

      {/* Commute warning for long-distance consent */}
      {match.long_dist_consent && (
        <p className="mt-1 text-xs text-amber-500/80">
          ⚠ Long-distance consent granted
        </p>
      )}

      {/* Optimistic approval UI */}
      {approved === null ? (
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setApproved(true)}
            className="flex-1 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'var(--di-stable)' }}
            id={`approve-${match.teacher_id}`}
          >
            ✓ {t('deploy.approve')}
          </button>
          <button
            onClick={() => setApproved(false)}
            className="flex-1 py-2 rounded-lg text-xs font-semibold text-gray-300 bg-gray-700 hover:bg-gray-600 transition-all active:scale-95"
            id={`reject-${match.teacher_id}`}
          >
            ✗ {t('deploy.reject')}
          </button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`mt-4 py-2 rounded-lg text-center text-xs font-semibold ${
            approved
              ? 'bg-green-900/30 text-green-400 border border-green-500/20'
              : 'bg-red-900/30 text-red-400 border border-red-500/20'
          }`}
        >
          {approved ? '✓ Approved' : '✗ Rejected'}
          <button
            onClick={() => setApproved(null)}
            className="ml-2 text-gray-500 hover:text-gray-300 text-xs"
          >
            (undo)
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}

export default TeacherMatchCard
