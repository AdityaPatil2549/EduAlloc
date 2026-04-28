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

  // approval state: { [teacher_id]: { status: 'APPROVED'|'APPROVED_LOCAL'|'REJECTED', deployment_id } }
  const [approvals, setApprovals] = useState({})
  const [approving, setApproving] = useState({})

  const fetchMatches = useCallback(async (schoolId, subject, districtId = 'NDB01') => {
    setMatchLoading(true)
    setMatchError(null)
    setApprovals({})  // clear previous approvals on new search
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

  const approveMatch = useCallback(async (match) => {
    const tid = match.teacher_id
    setApproving(prev => ({ ...prev, [tid]: true }))
    try {
      const { data } = await api.post('/api/deploy/approve', {
        teacher_id: tid,
        school_id: match.school_id,
        vacancy_subject: match.vacancy_subject,
        dvs_score: match.dvs?.dvs ?? 0,
        distance_km: match.distance_km,
        retention_score: match.retention_score,
        district_code: 'NDB01',
        approved_by: 'officer',
      }, { headers: DEV_HEADERS })
      setApprovals(prev => ({ ...prev, [tid]: { status: data.status, deployment_id: data.deployment_id, message: data.message } }))
    } catch (err) {
      // Still mark locally approved so UI doesn't get stuck
      setApprovals(prev => ({ ...prev, [tid]: { status: 'APPROVED_LOCAL', deployment_id: null, message: err.message } }))
    } finally {
      setApproving(prev => ({ ...prev, [tid]: false }))
    }
  }, [])

  const rejectMatch = useCallback((teacherId) => {
    setApprovals(prev => ({ ...prev, [teacherId]: { status: 'REJECTED', deployment_id: null, message: null } }))
  }, [])

  const undoDecision = useCallback((teacherId) => {
    setApprovals(prev => {
      const next = { ...prev }
      delete next[teacherId]
      return next
    })
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
    approvals, approving, approveMatch, rejectMatch, undoDecision,
    optimizeResult, optimizing, optimizeError, runOptimizer,
  }
}

