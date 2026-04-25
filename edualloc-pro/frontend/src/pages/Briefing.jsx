// Briefing page — Gemini weekly district briefing + PDF download
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import SkeletonList from '../components/SkeletonCard'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const api = axios.create({ baseURL: API_URL, timeout: 35000 })

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
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{t('briefing.title')}</h1>
        <button
          onClick={fetchBriefing}
          disabled={loading}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--brand)' }}
          id="generate-briefing-btn"
        >
          {loading ? 'Generating…' : 'Generate Briefing'}
        </button>
      </div>

      {loading && <SkeletonList count={3} />}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {briefing && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* AI badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded-full bg-indigo-900/40 text-indigo-300">
              ✦ {t('briefing.generated')} · Gemini 1.5 Pro
            </span>
            <span className="text-xs text-gray-500">{briefing.week_ending}</span>
          </div>

          {/* Summary — English or Marathi based on language toggle */}
          <div className="glass-card p-6">
            <p className={`text-sm leading-relaxed text-gray-200 ${isMr ? 'lang-mr' : ''}`}>
              {isMr ? briefing.marathi_summary : briefing.summary}
            </p>
          </div>

          {/* Priority schools */}
          {briefing.priority_schools?.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">{t('briefing.priority_schools')}</h3>
              <div className="flex flex-wrap gap-2">
                {briefing.priority_schools.map(id => (
                  <span key={id} className="di-number text-xs px-3 py-1 rounded-full bg-red-900/30 text-red-300 border border-red-500/20">
                    {id}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {briefing.recommendations?.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Action Items</h3>
              <ul className="space-y-2">
                {briefing.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="di-number text-indigo-400 mt-0.5">{i+1}.</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* PDF download */}
          <button
            onClick={downloadPDF}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white border border-indigo-500/40 hover:bg-indigo-500/10 transition-all"
            id="download-pdf-btn"
          >
            ↓ {t('briefing.download_pdf')}
          </button>
        </motion.div>
      )}
    </div>
  )
}
