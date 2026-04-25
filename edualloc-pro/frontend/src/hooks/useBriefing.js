// useBriefing — fetch Gemini weekly district briefing + PDF download
import { useState, useCallback } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT_MS || '35000')

const api = axios.create({ baseURL: API_URL, timeout: TIMEOUT })
const DEV_HEADERS = { 'X-Dev-Role': 'officer' }

/**
 * useBriefing — manages Gemini weekly briefing data and PDF download.
 */
export function useBriefing(districtId = 'NDB01') {
  const [briefing, setBriefing] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState(null)

  const fetchBriefing = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/api/briefing', {
        params: { district_id: districtId },
        headers: DEV_HEADERS,
      })
      setBriefing(data)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to generate briefing')
    } finally {
      setLoading(false)
    }
  }, [districtId])

  const downloadPDF = useCallback(async (deploymentId) => {
    setPdfLoading(true)
    setPdfError(null)
    const did = deploymentId || crypto.randomUUID()
    try {
      const res = await api.post('/api/briefing/order', null, {
        params: { district_id: districtId, deployment_id: did },
        headers: DEV_HEADERS,
        responseType: 'blob',
      })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `deployment-order-${districtId}-${did.slice(0, 8)}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setPdfError(err.response?.data?.message || err.message || 'PDF generation failed')
    } finally {
      setPdfLoading(false)
    }
  }, [districtId])

  return {
    briefing,
    loading,
    error,
    fetchBriefing,
    pdfLoading,
    pdfError,
    downloadPDF,
  }
}
