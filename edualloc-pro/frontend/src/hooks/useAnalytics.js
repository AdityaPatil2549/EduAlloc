import { useState, useEffect } from 'react'
import axios from 'axios'
import { auth } from '../lib/firebase'

export function useAnalytics(districtCode = 'NDB01') {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function fetchAnalytics() {
      try {
        setLoading(true)
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : 'dev_bypass'
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        
        const response = await axios.get(`${apiUrl}/api/deploy/analytics`, {
          params: { district_code: districtCode },
          headers: { Authorization: `Bearer ${token}` }
        })

        if (isMounted) {
          setData(response.data.analytics)
          setError(null)
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to fetch analytics')
          console.error('Analytics Error:', err)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchAnalytics()

    return () => { isMounted = false }
  }, [districtCode])

  return { data, loading, error }
}
