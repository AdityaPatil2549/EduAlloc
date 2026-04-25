// useSchools — fetch + cache school list by district
import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT_MS || '30000')

const api = axios.create({ baseURL: API_URL, timeout: TIMEOUT })

export function useSchools(districtId = 'NDB01', limit = 50) {
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSchools = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/api/schools', {
        params: { district_id: districtId, limit },
        headers: { 'X-Dev-Role': 'officer' },
      })
      setSchools(data.schools || [])
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load schools')
    } finally {
      setLoading(false)
    }
  }, [districtId, limit])

  useEffect(() => { fetchSchools() }, [fetchSchools])

  return { schools, loading, error, refetch: fetchSchools }
}

export function useSchoolDetail(schoolId) {
  const [school, setSchool] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!schoolId) return
    setLoading(true)
    setError(null)
    api.get(`/api/schools/${schoolId}`, { headers: { 'X-Dev-Role': 'officer' } })
      .then(({ data }) => setSchool(data))
      .catch(err => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false))
  }, [schoolId])

  return { school, loading, error }
}
