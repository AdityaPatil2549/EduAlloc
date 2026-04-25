// BEODashboard — specific view for Block Education Officers
// Defaults to Marathi as per requirements
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSchools } from '../hooks/useSchools'
import SchoolCard from '../components/SchoolCard'
import DIBadge from '../components/DIBadge'

export default function BEODashboard() {
  const { t, i18n } = useTranslation()
  const districtId = import.meta.env.VITE_DEFAULT_DISTRICT_ID || 'NDB01'
  const { schools, loading, error } = useSchools(districtId, 100)
  const [filterBlock, setFilterBlock] = useState('All')

  // BEOs need to focus on critical schools in their block
  const blocks = ['All', ...new Set(schools.map(s => s.block_name).filter(Boolean))]

  const filteredSchools = schools.filter(s => 
    (filterBlock === 'All' || s.block_name === filterBlock) &&
    s.di_score >= 40 // Focus on Moderate, High, Critical
  )

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('nav.beo')}</h1>
          <p className="text-gray-400 mt-1">Focus: High Deprivation Schools</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={filterBlock}
            onChange={e => setFilterBlock(e.target.value)}
            className="px-3 py-2 rounded-lg bg-gray-800 text-white border border-gray-700"
          >
            {blocks.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>

      {loading && <div className="text-center py-10"><div className="skeleton h-32 w-full"></div></div>}
      {error && <div className="p-4 bg-red-900/20 text-red-400 rounded-lg">{error}</div>}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSchools.map(school => (
            <motion.div 
              key={school.school_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-4 relative overflow-hidden"
            >
              {/* Highlight critical schools */}
              {school.di_score >= 80 && (
                <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
              )}
              
              <div className="flex justify-between items-start mb-3">
                <div className="pr-2">
                  <h3 className="font-bold text-white truncate">{school.school_name}</h3>
                  <p className="text-xs text-gray-400">{school.village_name}</p>
                </div>
                <DIBadge diScore={school.di_score} />
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                <div className="bg-gray-800/50 p-2 rounded">
                  <div className="text-gray-500 text-xs">Vacancies</div>
                  <div className="text-white font-bold di-number text-lg text-amber-400">{school.subject_vacancies || 0}</div>
                </div>
                <div className="bg-gray-800/50 p-2 rounded">
                  <div className="text-gray-500 text-xs">PTR</div>
                  <div className="text-white font-bold di-number text-lg">{school.pupil_teacher_ratio?.toFixed(1) || '—'}</div>
                </div>
              </div>
              
              <div className="mt-4 flex gap-2">
                <button className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold transition-colors">
                  Request Teacher
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      
      {!loading && filteredSchools.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          No high deprivation schools found in this block.
        </div>
      )}
    </div>
  )
}
