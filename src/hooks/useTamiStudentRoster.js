import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../services/api.js'
import { buildSignalContextFromStudentRecord } from '../ai/tami/tamiDataAdapter.js'
import { runTamiDecisionEngine } from '../ai/tami/tamiDecisionEngine.js'

const CACHE_TTL_MS = 60000
let rosterCache = null
let rosterCacheAt = 0
let rosterInFlight = null

function field(record, key, fallback = undefined) {
  const fields = record?.fields || record || {}
  return fields[key] ?? record?.[key] ?? fallback
}

function recordId(record) {
  return record?.id || record?.record_id || field(record, 'id') || field(record, 'record_id') || field(record, 'User Email') || ''
}

function priorityScore(decision, signalContext) {
  const scores = signalContext?.derivedScores || {}
  const base = decision?.priority === 'P0' ? 200 : decision?.priority === 'P1' ? 100 : 0
  return base + (scores.interventionRiskScore || 0)
}

async function fetchRoster() {
  const now = Date.now()
  if (rosterCache && now - rosterCacheAt < CACHE_TTL_MS) return rosterCache
  if (rosterInFlight) return rosterInFlight

  rosterInFlight = (async () => {
    const records = await api.getStudents()
    const list = Array.isArray(records) ? records : records?.records || records?.students || []
    const studentRecords = list.filter(record => field(record, 'Role') === 'Student')
    const practiceSnapshots = await Promise.all(studentRecords.map(async record => {
      try {
        const id = recordId(record)
        return id ? await api.getPracticeLogs(id) : null
      } catch (err) {
        console.warn('[TAMI Roster] Practice log fetch failed:', err)
        return null
      }
    }))

    const students = studentRecords.map((record, index) => {
      const signalContext = buildSignalContextFromStudentRecord(record, practiceSnapshots[index], null)
      const tamiDecision = runTamiDecisionEngine(signalContext || {})
      return {
        record,
        signalContext,
        tamiDecision,
        priorityScore: priorityScore(tamiDecision, signalContext)
      }
    })

    const atRiskStudents = students
      .filter(student => ['P0', 'P1'].includes(student.tamiDecision?.priority))
      .sort((a, b) => b.priorityScore - a.priorityScore)

    rosterCache = { students, atRiskStudents }
    rosterCacheAt = Date.now()
    return rosterCache
  })()

  try {
    return await rosterInFlight
  } finally {
    rosterInFlight = null
  }
}

export function useTamiStudentRoster() {
  const [students, setStudents] = useState(rosterCache?.students || [])
  const [atRiskStudents, setAtRiskStudents] = useState(rosterCache?.atRiskStudents || [])
  const [loading, setLoading] = useState(!rosterCache)
  const [error, setError] = useState(null)
  const isLoadingRef = useRef(false)
  const mountedRef = useRef(false)

  const refresh = useCallback(async () => {
    if (isLoadingRef.current) return
    isLoadingRef.current = true
    setLoading(true)
    try {
      const result = await fetchRoster()
      if (!mountedRef.current) return
      setStudents(result.students)
      setAtRiskStudents(result.atRiskStudents)
      setError(null)
    } catch (err) {
      console.error('[TAMI Roster] Failed to fetch roster:', err)
      if (!mountedRef.current) return
      setError(err)
      setAtRiskStudents(null)
    } finally {
      isLoadingRef.current = false
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    refresh()
    const interval = setInterval(refresh, CACHE_TTL_MS)
    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [refresh])

  return {
    students,
    atRiskStudents,
    loading,
    error,
    refresh
  }
}
