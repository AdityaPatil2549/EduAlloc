import { useState, useCallback } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useSchools } from '../hooks/useSchools'
import { useAnalytics } from '../hooks/useAnalytics'
import SchoolCard from '../components/SchoolCard'
import SchoolDetailPanel from '../components/SchoolDetailPanel'
import SkeletonList from '../components/SkeletonCard'
import { getDIColor } from '../lib/di-colors'

const DEFAULT_CENTER = {
  lat: parseFloat(import.meta.env.VITE_MAPS_DEFAULT_LAT || '21.3661'),
  lng: parseFloat(import.meta.env.VITE_MAPS_DEFAULT_LNG || '74.2167'),
}

function MapPanner({ center }) {
  const map = useMap()
  if (center) map.flyTo(center, map.getZoom())
  return null
}

export default function Dashboard() {
  const { t } = useTranslation()
  const districtId = import.meta.env.VITE_DEFAULT_DISTRICT_ID || 'NDB01'
  const { schools, loading: schoolsLoading, error, refetch } = useSchools(districtId, 50)
  const { data: analytics } = useAnalytics(districtId)
  
  const [selectedId, setSelectedId] = useState(null)
  const [detailSchool, setDetailSchool] = useState(null)
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER)
  const [filterMode, setFilterMode] = useState('all')

  const handleSchoolClick = useCallback((school) => {
    setSelectedId(school.school_id)
    setDetailSchool(school)
    if (school.lat && school.lng) {
      setMapCenter([school.lat, school.lng])
    }
  }, [])

  // Derived metrics for stat cards (fallback to defaults if analytics not loaded)
  const criticalCount = analytics?.critical_schools || 0
  const vacanciesCount = analytics?.total_vacancies || 0
  const totalSchools = analytics?.total_schools || 0
  const avgDiScore = analytics?.avg_di_score || 0

  // Filtered schools list
  const filteredSchools = schools.filter(s => {
    if (filterMode === 'critical') return s.di_score >= 80
    if (filterMode === 'high') return s.di_score >= 60 && s.di_score < 80
    return true
  })

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* ── Top Stat Cards ─────────────────────────────────────────────── */}
      <div className="px-6 py-4 flex-shrink-0 border-b border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-4 gap-4">
          {/* Critical Schools */}
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Critical Schools</p>
                <p className="text-3xl font-black text-rose-700 mt-1 leading-none">{criticalCount}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-rose-500 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              </div>
            </div>
            <p className="text-xs text-rose-400 mt-2 font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">trending_up</span>+12% this month
            </p>
          </div>

          {/* Total Vacancies */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Subject Vacancies</p>
                <p className="text-3xl font-black text-amber-700 mt-1 leading-none">{vacanciesCount}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-amber-500 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>work_off</span>
              </div>
            </div>
            <p className="text-xs text-amber-400 mt-2 font-semibold">Across all blocks</p>
          </div>

          {/* Total Schools */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Total Schools</p>
                <p className="text-3xl font-black text-blue-700 mt-1 leading-none">{totalSchools}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-blue-500 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
              </div>
            </div>
            <p className="text-xs text-blue-400 mt-2 font-semibold">Nandurbar district</p>
          </div>

          {/* Avg DI Score */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Avg DI Score</p>
                <p className="text-3xl font-black text-slate-800 mt-1 leading-none">{avgDiScore}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-slate-500 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>bar_chart</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2 font-semibold">District average</p>
          </div>
        </div>
      </div>

      {/* ── Split Layout Area ───────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left 60%: Map */}
        <div className="w-[60%] relative bg-slate-200 border-r border-slate-200 overflow-hidden">
          <MapContainer
            center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
            zoom={parseInt(import.meta.env.VITE_MAPS_DEFAULT_ZOOM || '9')}
            style={{ width: '100%', height: '100%', zIndex: 10 }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
              attribution='&copy; CartoDB'
            />
            <MapPanner center={mapCenter} />

            {schools.filter(s => s.lat && s.lng).map(school => (
              <CircleMarker
                key={school.school_id}
                center={[school.lat, school.lng]}
                radius={school.di_score >= 80 ? 10 : school.di_score >= 60 ? 8 : 6}
                pathOptions={{
                  color: getDIColor(school.di_score),
                  fillColor: getDIColor(school.di_score),
                  fillOpacity: 0.9,
                  weight: 1.5,
                }}
                eventHandlers={{ click: () => handleSchoolClick(school) }}
              >
                <Popup>
                  <strong className="text-sm">{school.school_name}</strong><br/>
                  <span className="text-xs text-gray-500">DI: {school.di_score.toFixed(1)} · {school.village_name}</span>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>

          {/* Map Overlay Controls */}
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur border border-slate-200 rounded p-2 shadow-sm flex flex-col gap-2 z-20">
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="w-3 h-3 rounded-full bg-rose-500 pulse-critical relative z-10 border border-white"></div>
              <span className="font-body-sm text-body-sm text-slate-700">Critical (DI {'>'} 80)</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="w-3 h-3 rounded-full bg-amber-500 border border-white"></div>
              <span className="font-body-sm text-body-sm text-slate-700">High (DI 60-80)</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="w-3 h-3 rounded-full bg-emerald-500 border border-white"></div>
              <span className="font-body-sm text-body-sm text-slate-700">Stable (DI {'<'} 60)</span>
            </div>
          </div>
        </div>

        {/* Right 40%: Priority Schools List */}
        <div className="w-[40%] bg-slate-50 flex flex-col overflow-hidden relative">
          <div className="px-6 py-4 border-b border-slate-200 bg-white flex justify-between items-center z-10 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <h2 className="font-h2 text-h2 text-slate-900">Priority Schools</h2>
            <div className="flex gap-2">
              <select 
                className="text-xs border border-slate-200 rounded px-2 py-1 bg-slate-50 text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
                onChange={(e) => setFilterMode(e.target.value)}
                value={filterMode}
              >
                <option value="all">All Schools</option>
                <option value="critical">Critical (DI &gt; 80)</option>
                <option value="high">High Need (DI 60-80)</option>
              </select>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {schoolsLoading && <SkeletonList count={6} />}
            {error && (
              <div className="p-4 rounded border border-red-200 bg-red-50 text-red-600 text-sm">
                <p>{error}</p>
                <button onClick={refetch} className="mt-2 font-bold underline">Retry</button>
              </div>
            )}
            {!schoolsLoading && !error && filteredSchools.map(school => (
              <SchoolCard
                key={school.school_id}
                school={school}
                onClick={handleSchoolClick}
                isSelected={selectedId === school.school_id}
              />
            ))}
            {!schoolsLoading && !error && filteredSchools.length === 0 && (
              <div className="text-center py-10 text-slate-500 text-sm">
                No schools found for the selected filter.
              </div>
            )}
          </div>
        </div>
      </div>

      <SchoolDetailPanel
        school={detailSchool}
        onClose={() => { setDetailSchool(null); setSelectedId(null) }}
      />
    </div>
  )
}
