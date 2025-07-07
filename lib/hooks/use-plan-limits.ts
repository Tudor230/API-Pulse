'use client'

import { useState, useEffect } from 'react'

// Hook for plan limits (can be used on public pages like pricing)
export function usePlanLimits() {
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPlanLimits = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/plan-limits')
        if (!response.ok) {
          throw new Error('Failed to fetch plan limits')
        }

        const data = await response.json()
        setPlans(data.plans)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchPlanLimits()
  }, [])

  return { plans, loading, error }
}
