// SchoolCard — list item with DI badge + stale data indicator
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import DIBadge from './DIBadge'

const SchoolCard = ({ school, onClick, isSelected = false }) => {
  const { t } = useTranslation()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01, y: -2 }}
      transition={{ duration: 0.2 }}
      onClick={() => onClick?.(school)}
      className={`glass-card p-4 cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-indigo-500' : 'hover:border-indigo-500/40'
      }`}
      id={`school-card-${school.school_id}`}
      role="button"
      aria-label={`School: ${school.school_name}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{school.school_name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{school.block_name} · {school.village_name}</p>
        </div>
        <DIBadge diScore={school.di_score} />
      </div>

      {/* Stats row */}
      <div className="flex gap-4 mt-3 text-xs text-gray-400">
        <span>
          <span className="di-number text-white font-medium">{school.total_enrollment ?? '—'}</span>{' '}
          {t('school.enrollment')}
        </span>
        <span>
          <span className="di-number text-white font-medium">{school.total_teachers ?? '—'}</span>{' '}
          {t('school.teachers')}
        </span>
        {school.subject_vacancies > 0 && (
          <span className="text-amber-400">
            <span className="di-number font-medium">{school.subject_vacancies}</span>{' '}
            {t('school.vacancies')}
          </span>
        )}
      </div>

      {/* Stale data warning — always visible per CLAUDE.md rule */}
      {school.is_data_stale && (
        <div className="mt-2 flex items-center gap-1 text-xs text-amber-500/70">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92z" clipRule="evenodd"/>
            <path d="M11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"/>
          </svg>
          {t('di.stale_warning')}
        </div>
      )}
    </motion.div>
  )
}

export default SchoolCard
