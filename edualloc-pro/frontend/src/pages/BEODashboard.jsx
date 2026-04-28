// BEODashboard — Block Education Officer view (premium upgrade)
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSchools } from '../hooks/useSchools'
import DIBadge from '../components/DIBadge'
import SkeletonList from '../components/SkeletonCard'

export default function BEODashboard() {
  const { t, i18n } = useTranslation()
  const districtId = import.meta.env.VITE_DEFAULT_DISTRICT_ID || 'NDB01'
  const { schools, loading, error, refetch } = useSchools(districtId, 100)
  const [filterBlock, setFilterBlock] = useState('All')
  const [filterLevel, setFilterLevel] = useState('critical') // critical | high | all

  // Derive block list from real data
  const blocks = ['All', ...new Set(schools.map(s => s.block_name).filter(Boolean))]

  // Apply filters
  const filteredSchools = schools.filter(s => {
    const blockMatch = filterBlock === 'All' || s.block_name === filterBlock
    const levelMatch =
      filterLevel === 'critical' ? s.di_score >= 80 :
      filterLevel === 'high'     ? s.di_score >= 60 :
      true
    return blockMatch && levelMatch
  })

  // Summary stats per filter
  const critCount  = filteredSchools.filter(s => s.di_score >= 80).length
  const totalVac   = filteredSchools.reduce((a, s) => a + (s.subject_vacancies || 0), 0)
  const avgPTR     = filteredSchools.length
    ? (filteredSchools.reduce((a, s) => a + (s.pupil_teacher_ratio || 0), 0) / filteredSchools.length).toFixed(1)
    : '—'

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="px-8 py-5 border-b border-slate-200 bg-white shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>supervisor_account</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Block Education Officer Panel</h1>
              <p className="text-xs text-slate-500 font-semibold">
                {i18n.language === 'mr' ? 'गट शिक्षण अधिकारी · नंदुरबार जिल्हा' : 'Nandurbar District · Field View'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Block filter */}
            <select
              value={filterBlock}
              onChange={e => setFilterBlock(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
            >
              {blocks.map(b => <option key={b} value={b}>{b}</option>)}
            </select>

            {/* Level filter pills */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              {[
                { id: 'critical', label: 'Critical', activeClass: 'bg-white text-rose-600 shadow-sm' },
                { id: 'high',     label: 'High Need', activeClass: 'bg-white text-amber-600 shadow-sm' },
                { id: 'all',      label: 'All',       activeClass: 'bg-white text-blue-600 shadow-sm' },
              ].map(({ id, label, activeClass }) => (
                <button
                  key={id}
                  onClick={() => setFilterLevel(id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    filterLevel === id
                      ? activeClass
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary chips */}
        <div className="flex gap-4 mt-4">
          {[
            { label: 'Showing', value: filteredSchools.length, icon: 'school', colorMap: { bg: 'bg-slate-50', border: 'border-slate-100', textLight: 'text-slate-500', textDark: 'text-slate-700' } },
            { label: 'Critical', value: critCount, icon: 'warning', colorMap: { bg: 'bg-rose-50', border: 'border-rose-100', textLight: 'text-rose-500', textDark: 'text-rose-700' } },
            { label: 'Total Vacancies', value: totalVac, icon: 'work_off', colorMap: { bg: 'bg-amber-50', border: 'border-amber-100', textLight: 'text-amber-500', textDark: 'text-amber-700' } },
            { label: 'Avg PTR', value: avgPTR, icon: 'people', colorMap: { bg: 'bg-blue-50', border: 'border-blue-100', textLight: 'text-blue-500', textDark: 'text-blue-700' } },
          ].map(({ label, value, icon, colorMap }) => (
            <div key={label} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${colorMap.bg} border ${colorMap.border}`}>
              <span className={`material-symbols-outlined ${colorMap.textLight} text-[16px]`}>{icon}</span>
              <span className={`text-base font-black ${colorMap.textDark}`}>{value}</span>
              <span className="text-xs text-slate-500 font-semibold">{label}</span>
            </div>
          ))}
        </div>
      </header>

      {/* Main grid */}
      <main className="flex-1 overflow-y-auto p-6">
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 bg-slate-200 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 p-5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
            <span className="material-symbols-outlined flex-shrink-0">error</span>
            <div>
              <div className="font-bold text-sm">Failed to load schools</div>
              <div className="text-xs mt-1 opacity-80">{error}</div>
              <button onClick={refetch} className="mt-2 text-xs font-bold underline">Retry</button>
            </div>
          </div>
        )}

        {!loading && !error && filteredSchools.length === 0 && (
          <div className="h-64 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-slate-300 text-[48px]">search_off</span>
            <p className="text-slate-500 font-semibold mt-3">No schools match this filter.</p>
            <button onClick={() => { setFilterLevel('all'); setFilterBlock('All') }} className="mt-2 text-xs text-indigo-600 font-bold hover:underline">
              Clear filters
            </button>
          </div>
        )}

        <AnimatePresence>
          {!loading && !error && filteredSchools.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredSchools.map((school, idx) => {
                const isCritical = school.di_score >= 80
                const isHigh = school.di_score >= 60

                return (
                  <motion.div
                    key={school.school_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className={`bg-white rounded-xl border overflow-hidden hover:shadow-md transition-shadow ${
                      isCritical ? 'border-rose-200' : isHigh ? 'border-amber-200' : 'border-slate-200'
                    }`}
                  >
                    {/* Top accent bar */}
                    <div className={`h-1 w-full ${
                      isCritical ? 'bg-rose-500' : isHigh ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 truncate">{school.school_name}</h3>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5 truncate">
                            {school.block_name} · {school.village_name}
                          </p>
                        </div>
                        <DIBadge diScore={school.di_score} />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <div className={`text-lg font-black ${school.subject_vacancies > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                            {school.subject_vacancies || 0}
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold">Vacancies</div>
                        </div>
                        <div className="text-center p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="text-lg font-black text-slate-700">{school.pupil_teacher_ratio?.toFixed(1) || '—'}</div>
                          <div className="text-[10px] text-slate-400 font-semibold">PTR</div>
                        </div>
                        <div className="text-center p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="text-lg font-black text-slate-700">{school.total_enrollment || '—'}</div>
                          <div className="text-[10px] text-slate-400 font-semibold">Students</div>
                        </div>
                      </div>

                      <button className="mt-3 w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">person_add</span>
                        Request Teacher
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
