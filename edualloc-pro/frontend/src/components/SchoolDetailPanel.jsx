// SchoolDetailPanel — slide panel over the map — NEVER navigate away from map
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import DIBadge from './DIBadge'
import DVSMeter from './DVSMeter'

const InfoRow = ({ label, value, mono = false }) => (
  <div className="flex items-center justify-between py-2 border-b border-white/5">
    <span className="text-xs text-gray-400">{label}</span>
    <span className={`text-sm font-medium text-white ${mono ? 'di-number' : ''}`}>
      {value ?? '—'}
    </span>
  </div>
)

const BoolBadge = ({ value }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full ${value ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
    {value ? '✓ Yes' : '✗ No'}
  </span>
)

const SchoolDetailPanel = ({ school, onClose }) => {
  const { t } = useTranslation()

  return (
    <AnimatePresence>
      {school && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-50"
            onClick={onClose}
          />

          {/* Slide panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-[420px] z-[100] overflow-y-auto"
            style={{ background: 'var(--surface-card)', borderLeft: '1px solid var(--surface-border)' }}
            id="school-detail-panel"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 p-5 border-b border-white/5"
                 style={{ background: 'var(--surface-card)' }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-white leading-snug">{school.school_name}</h2>
                  <p className="text-xs text-gray-400 mt-1">{school.block_name} · {school.district_code}</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  aria-label="Close panel"
                >
                  ✕
                </button>
              </div>
              <div className="mt-3">
                <DIBadge diScore={school.di_score} size="md" />
              </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-6">
              {/* Stale data banner */}
              {school.is_data_stale && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-500/20">
                  <span className="text-amber-400 text-xs">{t('di.stale_warning')}</span>
                </div>
              )}

              {/* School stats */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">School Info</h3>
                <InfoRow label={t('school.enrollment')} value={school.total_enrollment} mono />
                <InfoRow label={t('school.teachers')} value={school.total_teachers} mono />
                <InfoRow label={t('school.vacancies')} value={school.subject_vacancies} mono />
                <InfoRow label={t('school.ptr')} value={school.pupil_teacher_ratio?.toFixed(1)} mono />
                <InfoRow label={t('school.distance')} value={school.urban_distance_km ? `${school.urban_distance_km} km` : null} />
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-xs text-gray-400">{t('school.toilet')}</span>
                  <BoolBadge value={school.has_toilet} />
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-xs text-gray-400">{t('school.electricity')}</span>
                  <BoolBadge value={school.has_electricity} />
                </div>
                {school.rte_compliant !== null && (
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-xs text-gray-400">RTE Status</span>
                    <BoolBadge value={school.rte_compliant} />
                  </div>
                )}
              </div>

              {/* DI Breakdown */}
              {school.di_breakdown && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">DI Breakdown</h3>
                  <div className="space-y-2">
                    {Object.entries(school.di_breakdown).filter(([k]) => !['data_quality','missing_signals'].includes(k)).map(([signal, score]) => (
                      <div key={signal} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-32">{signal.replace(/_/g,' ')}</span>
                        <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${score}%` }}
                            transition={{ duration: 0.5 }}
                            className="h-full rounded-full"
                            style={{ background: score > 70 ? 'var(--di-critical)' : score > 40 ? 'var(--di-high)' : 'var(--di-stable)' }}
                          />
                        </div>
                        <span className="di-number text-xs text-white w-8 text-right">{score?.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* UDISE code */}
              <div className="text-xs text-gray-600 di-number">UDISE: {school.school_id}</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default SchoolDetailPanel
