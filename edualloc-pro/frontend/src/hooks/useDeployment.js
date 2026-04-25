import { useState, useCallback } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const api = axios.create({ baseURL: API_URL, timeout: 35000 })
const DEV_HEADERS = { 'X-Dev-Role': 'officer' }

export function useDeployment() {
  const [matches, setMatches] = useState([])
  const [matchLoading, setMatchLoading] = useState(false)
  const [matchError, setMatchError] = useState(null)

  const [optimizeResult, setOptimizeResult] = useState(null)
  const [optimizing, setOptimizing] = useState(false)
  const [optimizeError, setOptimizeError] = useState(null)

  const fetchMatches = useCallback(async (schoolId, subject, districtId = 'NDB01') => {
    setMatchLoading(true)
    setMatchError(null)
    try {
      const { data } = await api.get('/api/deploy/matches', {
        params: { school_id: schoolId, subject, district_id: districtId },
        headers: DEV_HEADERS,
      })
      setMatches(data.matches || [])
    } catch (err) {
      setMatchError(err.response?.data?.message || err.message)
    } finally {
      setMatchLoading(false)
    }
  }, [])

  const runOptimizer = useCallback(async (districtCode = 'NDB01') => {
    setOptimizing(true)
    setOptimizeError(null)
    try {
      const { data } = await api.post('/api/deploy/optimize',
        { district_code: districtCode, time_limit_s: 20 },
        { headers: DEV_HEADERS },
      )
      setOptimizeResult(data)
    } catch (err) {
      setOptimizeError(err.response?.data?.message || err.message)
    } finally {
      setOptimizing(false)
    }
  }, [])

  return {
    matches, matchLoading, matchError, fetchMatches,
    optimizeResult, optimizing, optimizeError, runOptimizer,
  }
}
