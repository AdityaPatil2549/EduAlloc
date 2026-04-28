// SchoolCard — premium list card with severity borders and animated hover
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

const SchoolCard = ({ school, onClick, isSelected = false }) => {
  const { t } = useTranslation()

  const isCritical = school.di_score >= 80
  const isHigh = school.di_score >= 60 && school.di_score < 80
  
  const severity = isCritical
    ? { border: 'border-rose-400', bg: 'bg-rose-500', badge: 'bg-rose-100 text-rose-700', label: 'Critical' }
    : isHigh
    ? { border: 'border-amber-400', bg: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700', label: 'High Need' }
    : { border: 'border-emerald-400', bg: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700', label: 'Stable' }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15 }}
      onClick={() => onClick?.(school)}
      className={`relative bg-white rounded-xl border overflow-hidden cursor-pointer transition-all ${
        isSelected
          ? 'border-blue-400 shadow-md shadow-blue-100 ring-2 ring-blue-100'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
      }`}
      id={`school-card-${school.school_id}`}
      role="button"
    >
      {/* Severity bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${severity.bg}`} />

      <div className="px-4 py-3 pl-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-900 leading-snug truncate group-hover:text-blue-700">
              {school.school_name}
            </h3>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5 truncate">
              {school.block_name} · {school.village_name}
            </p>
          </div>
          <div className={`flex-shrink-0 px-2 py-1 rounded-lg text-xs font-black ${severity.badge} flex items-center gap-1`}>
            {isCritical && <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>}
            {school.di_score.toFixed(0)}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-slate-100">
          <span className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold">
            <span className="material-symbols-outlined text-[13px] text-slate-400">people</span>
            {school.total_enrollment ?? '—'}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold">
            <span className="material-symbols-outlined text-[13px] text-slate-400">school</span>
            {school.total_teachers ?? '—'} teachers
          </span>
          {school.subject_vacancies > 0 && (
            <span className="ml-auto flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              <span className="material-symbols-outlined text-[12px]">work_off</span>
              {school.subject_vacancies} vacant
            </span>
          )}
        </div>

        {/* Stale data */}
        {school.is_data_stale && (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-600 font-bold">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            DATA STALE
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default SchoolCard
