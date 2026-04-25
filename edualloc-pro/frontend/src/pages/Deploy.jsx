// Deploy page — teacher match cards + DVS meter + optimizer trigger
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useDeployment } from '../hooks/useDeployment'
import DVSMeter from '../components/DVSMeter'
import SkeletonList from '../components/SkeletonCard'

const SUBJECTS = ['MATH', 'SCI', 'ENG', 'MAR', 'HIN', 'SST', 'PHY', 'CHM', 'BIO']

import TeacherMatchCard from '../components/TeacherMatchCard'

export default function Deploy() {
  const { t } = useTranslation()
  const [schoolId, setSchoolId] = useState('')
  const [subject, setSubject] = useState('MATH')
  const { matches, matchLoading, matchError, fetchMatches,
          optimizeResult, optimizing, optimizeError, runOptimizer } = useDeployment()

  const handleFetchMatches = () => {
    if (schoolId.trim()) fetchMatches(schoolId.trim(), subject)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-white">Teacher Deployment</h1>

      {/* Match lookup */}
      <div className="glass-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300">{t('deploy.top_matches')}</h2>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="School UDISE ID (e.g. 27031070001)"
            value={schoolId}
            onChange={e => setSchoolId(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:border-indigo-500"
            id="school-id-input"
          />
          <select
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 focus:outline-none"
            id="subject-select"
          >
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={handleFetchMatches}
            disabled={matchLoading}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all"
            style={{ background: 'var(--brand)' }}
            id="fetch-matches-btn"
          >
            {matchLoading ? 'Finding…' : 'Find Matches'}
          </button>
        </div>
      </div>

      {/* Match results */}
      {matchLoading && <SkeletonList count={3} />}
      {matchError && <p className="text-sm text-red-400">{matchError}</p>}
      {matches.length > 0 && (
        <div className="space-y-3">
          {matches.map(m => <TeacherMatchCard key={m.teacher_id} match={m} rank={m.rank} />)}
        </div>
      )}

      {/* District optimizer */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-300">{t('deploy.optimize')}</h2>
            <p className="text-xs text-gray-500 mt-1">OR-Tools CP-SAT · 20s limit · Returns partial result on timeout</p>
          </div>
          <button
            onClick={() => runOptimizer()}
            disabled={optimizing}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all"
            style={{ background: optimizing ? 'var(--surface-elevated)' : 'var(--brand)' }}
            id="run-optimizer-btn"
          >
            {optimizing ? t('deploy.optimizing') : t('deploy.optimize')}
          </button>
        </div>

        {optimizeResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <div className="flex gap-4 text-sm">
              <span className={`px-2 py-1 rounded text-xs font-mono ${optimizeResult.status === 'OPTIMAL' ? 'bg-green-900/30 text-green-400' : 'bg-amber-900/30 text-amber-400'}`}>
                {optimizeResult.status}
              </span>
              <span className="text-gray-400">{optimizeResult.total_assignments} assignments</span>
              <span className="text-gray-400 di-number">{optimizeResult.solver_time_s}s</span>
            </div>
            {optimizeResult.assignments.slice(0, 5).map(a => (
              <div key={a.deployment_id} className="flex items-center justify-between text-xs text-gray-300 py-1 border-b border-white/5">
                <span className="di-number text-gray-500">{a.teacher_id.substring(0,8)}…</span>
                <span>→ {a.school_id}</span>
                <span className="text-indigo-300">{a.vacancy_subject}</span>
                <span className="di-number">{(a.dvs * 100).toFixed(0)}%</span>
              </div>
            ))}
          </motion.div>
        )}
        {optimizeError && <p className="text-sm text-red-400">{optimizeError}</p>}
      </div>
    </div>
  )
}
