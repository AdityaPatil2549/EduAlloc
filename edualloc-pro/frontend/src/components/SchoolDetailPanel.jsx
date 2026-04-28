// SchoolDetailPanel — premium slide panel with glassmorphism
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import DIBadge from './DIBadge'

const InfoRow = ({ icon, label, value, mono = false }) => (
  <div className="flex items-center justify-between py-3 border-b border-slate-100">
    <span className="flex items-center gap-2 text-sm text-slate-500">
      {icon && <span className="material-symbols-outlined text-[16px] text-slate-400">{icon}</span>}
      {label}
    </span>
    <span className={`text-sm font-bold text-slate-800 ${mono ? 'font-mono' : ''}`}>
      {value ?? '—'}
    </span>
  </div>
)

const StatusBadge = ({ value }) => (
  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
    value 
      ? 'bg-emerald-100 text-emerald-700' 
      : 'bg-rose-100 text-rose-700'
  }`}>
    {value ? '✓ Yes' : '✗ No'}
  </span>
)

const SignalBar = ({ label, score }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500 capitalize">{label.replace(/_/g, ' ')}</span>
      <span className={`font-bold font-mono ${
        score > 70 ? 'text-rose-600' : score > 40 ? 'text-amber-600' : 'text-emerald-600'
      }`}>{score?.toFixed(0)}</span>
    </div>
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="h-full rounded-full"
        style={{
          background: score > 70 
            ? 'linear-gradient(90deg, #f97316, #ef4444)' 
            : score > 40 
            ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
            : 'linear-gradient(90deg, #34d399, #10b981)'
        }}
      />
    </div>
  </div>
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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Slide panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 280 }}
            className="fixed top-0 right-0 h-full w-[480px] z-[100] overflow-y-auto bg-white shadow-2xl"
            id="school-detail-panel"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                    {school.block_name} · {school.district_code}
                  </p>
                  <h2 className="text-lg font-bold text-slate-900 leading-snug">{school.school_name}</h2>
                  <p className="text-xs text-slate-500 font-mono mt-1">UDISE: {school.school_id}</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              <div className="mt-4">
                <DIBadge diScore={school.di_score} size="md" />
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Stale data warning */}
              {school.is_data_stale && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
                  <span className="material-symbols-outlined text-[16px]">warning</span>
                  {t('di.stale_warning')}
                </div>
              )}

              {/* Quick stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Students', value: school.total_enrollment, icon: 'people', color: 'blue' },
                  { label: 'Teachers', value: school.total_teachers, icon: 'school', color: 'emerald' },
                  { label: 'Vacancies', value: school.subject_vacancies, icon: 'work_off', color: 'rose' },
                ].map(({ label, value, icon, color }) => (
                  <div key={label} className={`bg-${color}-50 border border-${color}-100 rounded-lg p-3 text-center`}>
                    <span className={`material-symbols-outlined text-${color}-500 text-[20px]`}>{icon}</span>
                    <div className={`text-xl font-black text-${color}-700 mt-1`}>{value ?? '—'}</div>
                    <div className="text-xs text-slate-500 font-semibold">{label}</div>
                  </div>
                ))}
              </div>

              {/* School details */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-0">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">School Info</h3>
                <InfoRow icon="ruler" label="PTR" value={school.pupil_teacher_ratio?.toFixed(1)} mono />
                <InfoRow icon="straighten" label="Distance from urban" value={school.urban_distance_km ? `${school.urban_distance_km} km` : null} />
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <span className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="material-symbols-outlined text-[16px] text-slate-400">wc</span>
                    Toilet Facility
                  </span>
                  <StatusBadge value={school.has_toilet} />
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <span className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="material-symbols-outlined text-[16px] text-slate-400">bolt</span>
                    Electricity
                  </span>
                  <StatusBadge value={school.has_electricity} />
                </div>
                {school.rte_compliant !== null && (
                  <div className="flex items-center justify-between py-3">
                    <span className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="material-symbols-outlined text-[16px] text-slate-400">verified</span>
                      RTE Compliant
                    </span>
                    <StatusBadge value={school.rte_compliant} />
                  </div>
                )}
              </div>

              {/* DI Breakdown Bars */}
              {school.di_breakdown && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                    Deprivation Index Breakdown
                  </h3>
                  <div className="bg-slate-50 rounded-xl p-4 space-y-4">
                    {Object.entries(school.di_breakdown)
                      .filter(([k]) => !['data_quality', 'missing_signals'].includes(k))
                      .map(([signal, score]) => (
                        <SignalBar key={signal} label={signal} score={score} />
                      ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={() => {
                    // Navigate to deploy page with pre-filled school ID
                    if (window._navigateToDeploy) window._navigateToDeploy(school.school_id)
                  }}
                  className="w-full py-3 rounded-lg bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-200"
                >
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  Find Teacher Matches
                </button>
                <button className="w-full py-3 rounded-lg border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">description</span>
                  View Full Report
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default SchoolDetailPanel
