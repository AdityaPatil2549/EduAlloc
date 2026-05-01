// DeploymentMap — premium geospatial view with custom markers and legend
import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import axios from 'axios'
import { auth } from '../lib/firebase'
import { useSchools } from '../hooks/useSchools'
import { motion } from 'framer-motion'

const DEFAULT_CENTER = {
  lat: parseFloat(import.meta.env.VITE_MAPS_DEFAULT_LAT || '21.3661'),
  lng: parseFloat(import.meta.env.VITE_MAPS_DEFAULT_LNG || '74.2167'),
}

export default function DeploymentMap() {
  const districtId = import.meta.env.VITE_DEFAULT_DISTRICT_ID || 'NDB01'
  const { schools } = useSchools(districtId, 500) // load all schools for map context
  const [deployments, setDeployments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchHistory() {
      try {
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : 'dev_bypass'
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        
        const res = await axios.get(`${apiUrl}/api/deploy/history`, {
          params: { district_code: districtId, limit: 100 },
          headers: { Authorization: `Bearer ${token}` }
        })
        setDeployments(res.data.deployments || [])
      } catch (err) {
        console.error('Failed to load history', err)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [districtId])

  // Map deployments to school coordinates
  const deploymentMarkers = deployments.map(dep => {
    const school = schools.find(s => s.school_id === dep.school_id)
    return {
      ...dep,
      lat: school?.lat,
      lng: school?.lng,
      school_name: school?.school_name || dep.school_id,
      di_score: school?.di_score
    }
  }).filter(d => d.lat && d.lng)

  return (
    <div className="flex-1 flex flex-col h-full relative bg-slate-50">
      {/* Premium Header */}
      <header className="px-8 py-5 border-b border-slate-200 bg-white shadow-sm flex-shrink-0 flex items-center justify-between z-20 relative">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>explore</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Deployment Map</h1>
            <p className="text-xs text-slate-500 font-semibold">Geospatial view of recent assignments</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {loading && (
             <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
               <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
               Syncing Map...
             </div>
          )}
          <div className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-lg border border-indigo-100 text-xs font-bold shadow-sm">
            {deployments.length} Recent Deployments
          </div>
        </div>
      </header>

      {/* Map Container */}
      <div className="flex-1 relative z-10">
        <MapContainer
          center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
          zoom={parseInt(import.meta.env.VITE_MAPS_DEFAULT_ZOOM || '9')}
          style={{ width: '100%', height: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          {/* Base Layer: All Schools */}
          {schools.filter(s => s.lat && s.lng).map(school => (
            <CircleMarker
              key={`base-${school.school_id}`}
              center={[school.lat, school.lng]}
              radius={4}
              pathOptions={{
                color: 'transparent',
                fillColor: '#cbd5e1', // slate-300
                fillOpacity: 0.6,
              }}
            >
              <Popup className="premium-popup">
                <div className="p-2 min-w-[200px]">
                  <strong className="text-sm font-bold text-slate-900 block truncate">{school.school_name}</strong>
                  <div className="text-[10px] font-bold text-slate-500 uppercase mt-1">No recent deployments</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* Overlay: Deployment Markers */}
          {deploymentMarkers.map(dep => {
            // Color code based on DVS score for deployments
            const dvs = dep.dvs_score * 100
            const fillColor = dvs >= 75 ? '#10b981' : dvs >= 50 ? '#f59e0b' : '#ef4444'
            
            return (
              <CircleMarker
                key={dep.deployment_id}
                center={[dep.lat, dep.lng]}
                radius={8}
                pathOptions={{
                  color: '#ffffff', 
                  fillColor: fillColor,
                  fillOpacity: 0.9,
                  weight: 2,
                }}
              >
                <Popup className="premium-popup">
                  <div className="p-2 min-w-[200px]">
                    <div className="border-b border-slate-100 pb-2 mb-2">
                      <strong className="text-sm font-bold text-slate-900 block truncate" title={dep.school_name}>
                        {dep.school_name}
                      </strong>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">School ID: {dep.school_id}</span>
                        {dep.di_score && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${dep.di_score >= 80 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                            DI {dep.di_score.toFixed(0)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">subject</span> Subject
                        </span>
                        <span className="text-xs font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{dep.vacancy_subject}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">psychology</span> Match
                        </span>
                        <span className="text-xs font-black font-mono" style={{ color: fillColor }}>{dvs.toFixed(0)}%</span>
                      </div>
                      
                      <div className="flex justify-between items-center pt-1 border-t border-slate-50">
                        <span className="text-[10px] text-slate-400 font-semibold">Date</span>
                        <span className="text-[10px] text-slate-600 font-mono">{new Date(dep.approved_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>
        
        {/* Floating Legend */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute bottom-6 right-6 z-[400] bg-white/95 backdrop-blur border border-slate-200 rounded-xl p-4 shadow-lg pointer-events-auto"
        >
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">DVS Match Quality</h4>
          <div className="space-y-2">
            {[
              { label: 'High Match (≥75%)', color: 'bg-emerald-500' },
              { label: 'Medium Match (50-74%)', color: 'bg-amber-500' },
              { label: 'Low Match (<50%)', color: 'bg-rose-500' }
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${item.color}`} />
                <span className="text-xs text-slate-700 font-semibold">{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
