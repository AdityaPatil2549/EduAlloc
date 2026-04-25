// Dashboard — Google Maps heatmap + school list sorted by DI
// Map ALWAYS stays visible — school detail opens as slide panel OVER the map
import { useState, useCallback } from 'react'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useSchools } from '../hooks/useSchools'
import SchoolCard from '../components/SchoolCard'
import SchoolDetailPanel from '../components/SchoolDetailPanel'
import SkeletonList from '../components/SkeletonCard'
import DIBadge from '../components/DIBadge'
import { getDIColor } from '../lib/di-colors'

const MAP_OPTIONS = {
  disableDefaultUI: true,
  clickableIcons: false,
  gestureHandling: 'greedy',
  styles: [
    { featureType: 'all', stylers: [{ saturation: -80 }] },
    { elementType: 'geometry', stylers: [{ color: '#1a2332' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
    { featureType: 'road', stylers: [{ visibility: 'simplified' }] },
  ],
}

const DEFAULT_CENTER = {
  lat: parseFloat(import.meta.env.VITE_MAPS_DEFAULT_LAT || '21.3661'),
  lng: parseFloat(import.meta.env.VITE_MAPS_DEFAULT_LNG || '74.2167'),
}

export default function Dashboard() {
  const { t } = useTranslation()
  const districtId = import.meta.env.VITE_DEFAULT_DISTRICT_ID || 'NDB01'
  const { schools, loading, error, refetch } = useSchools(districtId, 50)
  const [selectedId, setSelectedId] = useState(null)
  const [detailSchool, setDetailSchool] = useState(null)
  const [mapRef, setMapRef] = useState(null)

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_MAPS_API_KEY || '',
    id: 'google-map-script',
  })

  const onMapLoad = useCallback(map => setMapRef(map), [])

  const handleSchoolClick = useCallback((school) => {
    setSelectedId(school.school_id)
    setDetailSchool(school)
    // Pan map — do NOT navigate
    if (mapRef && school.lat && school.lng) {
      mapRef.panTo({ lat: school.lat, lng: school.lng })
    }
  }, [mapRef])

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Left sidebar: school list ─────────────────────────────── */}
      <aside className="w-80 flex-shrink-0 flex flex-col border-r overflow-hidden shadow-sm z-10"
             style={{ background: 'var(--surface-container-lowest)', borderColor: 'var(--surface-dim)' }}>
        <div className="p-5 border-b" style={{ borderColor: 'var(--surface-dim)' }}>
          <h2 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{t('nav.dashboard')}</h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            {import.meta.env.VITE_DEFAULT_DISTRICT_NAME || 'Nandurbar'} District
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading && <SkeletonList count={6} />}
          {error && (
            <div className="p-4 rounded-lg bg-red-900/20 border border-red-500/20">
              <p className="text-xs text-red-400">{error}</p>
              <button
                onClick={refetch}
                className="mt-2 text-xs text-red-300 underline"
              >{t('common.retry')}</button>
            </div>
          )}
          {!loading && !error && schools.map(school => (
            <SchoolCard
              key={school.school_id}
              school={school}
              onClick={handleSchoolClick}
              isSelected={selectedId === school.school_id}
            />
          ))}
        </div>
      </aside>

      {/* ── Map (always visible) ──────────────────────────────────── */}
      <main className="flex-1 relative">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={DEFAULT_CENTER}
            zoom={parseInt(import.meta.env.VITE_MAPS_DEFAULT_ZOOM || '9')}
            options={MAP_OPTIONS}
            onLoad={onMapLoad}
          >
            {schools.filter(s => s.lat && s.lng).map(school => (
              <Marker
                key={school.school_id}
                position={{ lat: school.lat, lng: school.lng }}
                onClick={() => handleSchoolClick(school)}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: school.di_score >= 80 ? 10 : school.di_score >= 60 ? 8 : 6,
                  fillColor: getDIColor(school.di_score),
                  fillOpacity: 0.9,
                  strokeColor: '#ffffff',
                  strokeWeight: 1.5,
                }}
                title={school.school_name}
              />
            ))}
          </GoogleMap>
        ) : (
          <div className="w-full h-full flex items-center justify-center"
               style={{ background: 'var(--surface-dim)' }}>
            <div className="skeleton w-full h-full opacity-50" />
          </div>
        )}

        {/* Map legend */}
        <div className="absolute bottom-6 left-4 bg-white/90 backdrop-blur-md p-3 rounded-lg shadow-md border border-gray-200 flex gap-4">
          {['critical','high','moderate','stable'].map(cat => (
            <div key={cat} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full di-${cat} shadow-sm`} />
              <span className="text-[11px] font-semibold tracking-wider uppercase text-gray-600">{t(`di.${cat}`)}</span>
            </div>
          ))}
        </div>
      </main>

      {/* ── School detail slide panel (over map, not instead of it) ── */}
      <SchoolDetailPanel
        school={detailSchool}
        onClose={() => { setDetailSchool(null); setSelectedId(null) }}
      />
    </div>
  )
}
