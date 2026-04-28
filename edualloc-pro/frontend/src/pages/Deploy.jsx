// Deploy page — premium AI matching flow with animated scanning effect
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useDeployment } from '../hooks/useDeployment'
import TeacherMatchCard from '../components/TeacherMatchCard'

const SUBJECTS = ['MATH', 'SCI', 'ENG', 'MAR', 'HIN', 'SST', 'PHY', 'CHM', 'BIO']

// Animated scanning radar for AI matching
function ScanningEffect() {
  return (
    <div className="relative w-full h-[300px] flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-[#0A0F1E] border border-blue-900/50">
      <div className="scan-line" />
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 rounded-full border-2 border-blue-500 border-t-transparent"
        />
        <div className="text-blue-400 text-xs font-black uppercase tracking-widest animate-pulse">
          Scanning Vertex AI Embeddings…
        </div>
        <div className="flex gap-2">
          {['Loading profiles', 'Computing DVS', 'Ranking matches'].map((step, i) => (
            <motion.span
              key={step}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.5 }}
              className="text-[10px] font-bold text-blue-700 bg-blue-900/50 px-2 py-1 rounded-full border border-blue-800"
            >
              {step}
            </motion.span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Deploy() {
  const { t } = useTranslation()
  const [schoolId, setSchoolId] = useState('')
  const [subject, setSubject] = useState('MATH')
  const {
    matches, matchLoading, matchError, fetchMatches,
    approvals, approving, approveMatch, rejectMatch, undoDecision,
    optimizeResult, optimizing, optimizeError, runOptimizer
  } = useDeployment()

  const handleFetchMatches = () => {
    if (schoolId.trim()) fetchMatches(schoolId.trim(), subject)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleFetchMatches()
  }

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Sidebar: Match Controls ────────────────────────────── */}
      <aside className="w-[300px] flex-shrink-0 flex flex-col border-r border-slate-200 bg-white">
        <div className="px-5 py-5 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Staffing Pool</h2>
          <p className="text-xs text-slate-500 mt-0.5">Find best-fit teachers via Vertex AI</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Manual lookup */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">School UDISE Code</label>
            <input
              type="text"
              placeholder="e.g. 27031070001"
              value={schoolId}
              onChange={e => setSchoolId(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-mono bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Vacancy Subject</label>
              <div className="flex flex-wrap gap-1.5">
                {SUBJECTS.map(s => (
                  <button
                    key={s}
                    onClick={() => setSubject(s)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                      subject === s
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleFetchMatches}
              disabled={matchLoading || !schoolId.trim()}
              className="w-full py-3 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-blue-200"
            >
              <span className="material-symbols-outlined text-[16px]">manage_search</span>
              {matchLoading ? 'Searching…' : 'Find Best Matches'}
            </button>
          </div>

          {/* Priority vacancies preview */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-2">Priority Vacancies</p>
            <div className="space-y-2 opacity-40 pointer-events-none">
              {[
                { name: 'PS Nandurbar #2', subject: 'MATH', urgency: 'rose' },
                { name: 'UPS Taloda #1', subject: 'SCI', urgency: 'blue' },
                { name: 'ZP School Akrani', subject: 'ENG', urgency: 'amber' },
              ].map((v, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                  <div>
                    <p className="text-xs font-bold text-slate-700">{v.name}</p>
                    <p className="text-[10px] text-slate-400">Nandurbar Block</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full bg-${v.urgency}-100 text-${v.urgency}-700`}>
                    {v.subject}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Optimizer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={() => runOptimizer()}
            disabled={optimizing}
            className="w-full py-3 rounded-xl border-2 border-blue-600 text-blue-600 text-xs font-bold hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">psychology</span>
            {optimizing ? 'Running CP-SAT…' : 'Run District Optimizer'}
          </button>
          <p className="text-[10px] text-slate-400 text-center mt-2">OR-Tools CP-SAT · District-wide matching</p>
        </div>
      </aside>

      {/* ── Main: Candidate Cards ──────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-8 bg-slate-50">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Deployment Intelligence</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {matches.length > 0 
                  ? <>Top <span className="font-bold text-slate-700">{matches.length}</span> candidates for <span className="font-bold text-blue-600">{subject}</span> at <span className="font-mono text-xs bg-slate-200 px-1.5 py-0.5 rounded">{schoolId}</span></>
                  : 'Enter a school UDISE code to begin matching'
                }
              </p>
            </div>
            {matches.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-center shadow-sm">
                <div className="text-2xl font-black text-slate-900">{matches.length}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Candidates</div>
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {/* Loading: scanning animation */}
            {matchLoading && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ScanningEffect />
              </motion.div>
            )}

            {/* Error */}
            {!matchLoading && matchError && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start gap-3 p-5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700"
              >
                <span className="material-symbols-outlined flex-shrink-0">error</span>
                <div>
                  <div className="font-bold text-sm">Match failed</div>
                  <div className="text-xs mt-1 opacity-80">{matchError}</div>
                </div>
              </motion.div>
            )}

            {/* Match cards */}
            {!matchLoading && !matchError && matches.length > 0 && (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4 pb-20"
              >
                {matches.map(m => (
                  <TeacherMatchCard
                    key={m.teacher_id}
                    match={m}
                    rank={m.rank}
                    approval={approvals[m.teacher_id]}
                    approving={!!approving[m.teacher_id]}
                    onApprove={approveMatch}
                    onReject={rejectMatch}
                    onUndo={undoDecision}
                  />
                ))}
              </motion.div>
            )}

            {/* Empty state */}
            {!matchLoading && !matchError && matches.length === 0 && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-[420px] flex flex-col items-center justify-center text-center"
              >
                <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
                  <span className="material-symbols-outlined text-slate-400 text-[40px]">manage_search</span>
                </div>
                <h3 className="text-lg font-bold text-slate-700">No candidates yet</h3>
                <p className="text-sm text-slate-400 mt-2 max-w-xs">
                  Enter a school UDISE code in the panel on the left and select a subject to find the best teacher matches.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Optimizer result */}
          {optimizeResult && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 p-6 bg-white border border-emerald-200 rounded-xl shadow-sm"
            >
              <div className="flex items-center gap-2 mb-5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-sm font-bold text-emerald-700 uppercase tracking-widest">Optimization Complete</h2>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Assignments', value: optimizeResult.total_assignments },
                  { label: 'Solver Status', value: optimizeResult.status },
                  { label: 'Compute Time', value: `${optimizeResult.solver_time_s}s` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-lg p-4 text-center border border-slate-100">
                    <div className="text-2xl font-black text-slate-900">{value}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  )
}
