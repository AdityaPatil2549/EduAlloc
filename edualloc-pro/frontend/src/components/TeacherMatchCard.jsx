// TeacherMatchCard — premium card with radial DVS gauge and animated approve flow
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import DVSMeter from './DVSMeter'

// Radial progress ring for DVS score
function RadialScore({ value, max = 100, size = 80, strokeWidth = 7, color = '#2563eb' }) {
  const radius = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (value / max) * circumference
  const scoreColor = value >= 75 ? '#16a34a' : value >= 50 ? '#d97706' : '#dc2626'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth}
      />
      <motion.circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke={scoreColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference}
        animate={{ strokeDashoffset: circumference - progress }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </svg>
  )
}

const TeacherMatchCard = ({ match, rank, approval, approving, onApprove, onReject, onUndo }) => {
  const { t } = useTranslation()

  const dvsPct = match.dvs?.dvs != null
    ? Math.round(match.dvs.dvs * 100)
    : (match.dvs_score != null ? Math.round(match.dvs_score * 100) : 0)

  const isApproved = approval?.status === 'APPROVED' || approval?.status === 'APPROVED_LOCAL'
  const isRejected = approval?.status === 'REJECTED'
  const isBqSaved  = approval?.status === 'APPROVED'
  const decided    = isApproved || isRejected

  const rankColors = {
    1: 'from-blue-600 to-blue-500',
    2: 'from-slate-500 to-slate-400',
    3: 'from-amber-600 to-amber-500',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (rank - 1) * 0.1, type: 'spring', damping: 25 }}
      className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
      id={`match-card-${match.teacher_id}`}
    >
      {/* Header row */}
      <div className="flex items-start gap-4">
        {/* Radial Score */}
        <div className="relative flex-shrink-0">
          <RadialScore value={dvsPct} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-black text-slate-900 leading-none">{dvsPct}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">DVS</span>
          </div>
        </div>

        {/* Teacher info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full text-white bg-gradient-to-r ${rankColors[rank] || 'from-slate-500 to-slate-400'} uppercase tracking-wider`}>
              #{rank}
            </span>
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">
              {match.vacancy_subject}
            </span>
          </div>

          <h3 className="text-base font-bold text-slate-900 leading-tight truncate">
            {match.teacher_name || 'Candidate ' + match.teacher_id.substring(0, 6)}
          </h3>

          <div className="flex flex-wrap gap-2 mt-2">
            {match.qualification && (
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {match.qualification}
              </span>
            )}
            {match.years_experience != null && (
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {match.years_experience} yrs exp
              </span>
            )}
            {match.distance_km != null && (
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">location_on</span>
                {match.distance_km.toFixed(1)} km
              </span>
            )}
          </div>
        </div>

        {/* Retention Badge */}
        {match.retention_score != null && (() => {
          const rs = match.retention_score
          const cfg = rs >= 70
            ? { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'High Retention' }
            : rs >= 50
            ? { cls: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Med Retention' }
            : { cls: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Low Retention' }
          return (
            <div className={`flex-shrink-0 text-center border rounded-lg p-2 ${cfg.cls}`}>
              <div className="text-base font-black">{rs.toFixed(0)}</div>
              <div className="text-[9px] font-bold uppercase tracking-wide">{cfg.label}</div>
            </div>
          )
        })()}
      </div>

      {/* DVS Breakdown meter */}
      {match.dvs && (
        <div className="mt-5 pt-4 border-t border-slate-100">
          <DVSMeter dvs={match.dvs} />
        </div>
      )}

      {/* Long distance consent */}
      {match.long_dist_consent && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
          <span className="material-symbols-outlined text-amber-600 text-[14px]">check_circle</span>
          <span className="text-xs font-bold text-amber-700">Long-distance relocation consent granted</span>
        </div>
      )}

      {/* Approval buttons */}
      {!decided ? (
        <div className="flex gap-3 mt-5">
          <button
            onClick={() => onApprove(match)}
            disabled={approving}
            className="flex-1 py-3 rounded-lg font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-60"
            id={`approve-${match.teacher_id}`}
          >
            {approving ? (
              <>
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Saving…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">check</span>
                Approve Deployment
              </>
            )}
          </button>
          <button
            onClick={() => onReject(match.teacher_id)}
            className="px-5 py-3 rounded-lg font-bold text-xs text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95 flex items-center gap-1"
            id={`reject-${match.teacher_id}`}
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
            Dismiss
          </button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`mt-5 py-3 px-4 rounded-lg border flex items-center justify-between gap-4 ${
            isApproved
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          <div>
            <div className="text-xs font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">
                {isApproved ? 'task_alt' : 'cancel'}
              </span>
              {isApproved ? 'Deployment Authorized' : 'Candidate Dismissed'}
            </div>
            {isApproved && (
              <div className="text-[10px] font-mono mt-1 opacity-70">
                {isBqSaved ? `ID: ${approval.deployment_id?.substring(0, 12).toUpperCase()}` : 'Saved locally'}
              </div>
            )}
          </div>
          <button
            onClick={() => onUndo(match.teacher_id)}
            className="text-[10px] underline decoration-dotted opacity-60 hover:opacity-100"
          >
            Undo
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}

export default TeacherMatchCard
