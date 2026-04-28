// Briefing page — premium Gemini district intelligence report
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const api = axios.create({ baseURL: API_URL, timeout: 35000 })

function MetricChip({ label, value, color = 'blue' }) {
  return (
    <div className={`flex flex-col items-center bg-${color}-50 border border-${color}-100 rounded-xl p-4`}>
      <div className={`text-2xl font-black text-${color}-700`}>{value}</div>
      <div className="text-xs font-semibold text-slate-500 mt-1 text-center">{label}</div>
    </div>
  )
}

function SectionCard({ number, title, accentColor, children }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: number * 0.08 }}
      className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"
    >
      <div className={`px-6 py-4 border-b border-slate-100 flex items-center gap-3`}>
        <span className={`w-7 h-7 rounded-full bg-${accentColor}-100 flex items-center justify-center text-xs font-black text-${accentColor}-700`}>
          {number}
        </span>
        <h2 className={`text-sm font-black text-${accentColor}-700 uppercase tracking-widest`}>{title}</h2>
      </div>
      <div className="px-6 py-5">
        {children}
      </div>
    </motion.section>
  )
}

export default function Briefing() {
  const { t, i18n } = useTranslation()
  const [briefing, setBriefing] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const districtId = import.meta.env.VITE_DEFAULT_DISTRICT_ID || 'NDB01'
  const isMr = i18n.language === 'mr'

  const fetchBriefing = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/api/briefing', {
        params: { district_id: districtId },
        headers: { 'X-Dev-Role': 'officer' },
      })
      setBriefing(data)
    } catch (err) {
      setError(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  const downloadPDF = async () => {
    if (!briefing) return
    try {
      const res = await api.post('/api/briefing/order', null, {
        params: { district_id: districtId, deployment_id: crypto.randomUUID() },
        headers: { 'X-Dev-Role': 'officer' },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `deployment-order-${districtId}.pdf`
      a.click()
    } catch (err) {
      console.error('PDF download failed', err)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-slate-200 bg-white shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[20px]">auto_awesome</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">{t('briefing.title')}</h1>
            <p className="text-xs text-slate-500 font-semibold">Nandurbar · Powered by Gemini 1.5 Pro</p>
          </div>
        </div>

        <div className="flex gap-3 items-center">
          {briefing && (
            <button
              onClick={downloadPDF}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Export PDF
            </button>
          )}
          <button
            onClick={fetchBriefing}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 transition-all disabled:opacity-50 shadow-md shadow-blue-200"
            id="generate-briefing-btn"
          >
            {loading ? (
              <>
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Analyzing District…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">psychology</span>
                {briefing ? 'Refresh' : 'Generate Intelligence'}
              </>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Loading skeletons */}
          {loading && (
            <div className="space-y-4 animate-pulse">
              <div className="h-8 bg-slate-200 rounded-lg w-1/3" />
              <div className="h-40 bg-slate-200 rounded-xl" />
              <div className="grid grid-cols-3 gap-4">
                <div className="h-24 bg-slate-200 rounded-xl" />
                <div className="h-24 bg-slate-200 rounded-xl" />
                <div className="h-24 bg-slate-200 rounded-xl" />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
              <span className="material-symbols-outlined text-[20px] flex-shrink-0">error</span>
              <div>
                <div className="font-bold text-sm">Failed to generate intelligence report</div>
                <div className="text-xs mt-1 opacity-80">{error}</div>
              </div>
            </div>
          )}

          {/* Briefing content */}
          <AnimatePresence>
            {briefing && !loading && (
              <motion.div
                key="briefing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Report header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-3 py-1 rounded-full bg-blue-600 text-white font-black uppercase tracking-widest">
                      Intelligence Report
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Gemini 1.5 Pro
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase">
                    {districtId} · {new Date().toLocaleDateString()}
                  </div>
                </div>

                {/* Key Metrics row */}
                {briefing.metrics && (
                  <div className="grid grid-cols-4 gap-4">
                    <MetricChip label="Critical Schools" value={briefing.metrics.critical_schools ?? '—'} color="rose" />
                    <MetricChip label="Subject Vacancies" value={briefing.metrics.total_vacancies ?? '—'} color="amber" />
                    <MetricChip label="Recent Deployments" value={briefing.metrics.recent_deployments ?? 0} color="blue" />
                    <MetricChip label="Avg DI Score" value={briefing.metrics.avg_di ?? '—'} color="slate" />
                  </div>
                )}

                {/* Executive Summary */}
                <SectionCard number="I" title="Executive Summary" accentColor="blue">
                  <p className={`text-base leading-relaxed text-slate-700 ${isMr ? 'font-mr' : ''}`}>
                    {isMr ? briefing.marathi_summary : briefing.summary}
                  </p>
                </SectionCard>

                <div className="grid grid-cols-2 gap-6">
                  {/* Priority Schools */}
                  <SectionCard number="II" title="Priority Deployments" accentColor="rose">
                    <div className="space-y-2">
                      {briefing.priority_schools?.map((id, i) => (
                        <div key={id} className="flex items-center justify-between px-3 py-2.5 bg-rose-50 rounded-lg border border-rose-100">
                          <span className="text-xs font-mono font-bold text-rose-700">{id}</span>
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            <span className="text-[10px] text-rose-500 font-semibold">Priority {i + 1}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </SectionCard>

                  {/* Recommendations */}
                  <SectionCard number="III" title="Strategic Actions" accentColor="blue">
                    <ul className="space-y-4">
                      {briefing.recommendations?.map((rec, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <p className="text-sm text-slate-700 leading-snug">{rec}</p>
                        </li>
                      ))}
                    </ul>
                  </SectionCard>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state */}
          {!briefing && !loading && !error && (
            <div className="h-[500px] flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-blue-500 text-[40px]">psychology</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900">District Intelligence Ready</h3>
              <p className="text-slate-500 text-sm mt-2 max-w-sm">
                Click "Generate Intelligence" to run a Gemini-powered analysis of current district equity and staffing data.
              </p>
              <button
                onClick={fetchBriefing}
                className="mt-6 px-6 py-3 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 shadow-md shadow-blue-200"
              >
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                Run Analysis
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
