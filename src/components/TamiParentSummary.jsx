import { useEffect, useState } from 'react'
import api from '../services/api.js'
import { buildSignalContextFromStudentRecord } from '../ai/tami/tamiDataAdapter.js'
import { runTamiDecisionEngine } from '../ai/tami/tamiDecisionEngine.js'
import { formTamiOutput } from '../ai/tami/tamiOutputFormation.js'

const FORBIDDEN_PARENT_WORDS = /\b(P0|P1|risk|confusionScore|masteryRiskScore|engagementRiskScore|intervention|at-risk|flagged|alert|urgent|nominal)\b/i

function safeParentCopy(signalContext) {
  const concept = signalContext?.lessonContext?.currentConcept || 'current lesson work'
  const dpm = signalContext?.dpm || {}
  const motivation = Number(dpm.motivation || 50)
  const improved = motivation >= 50 ? 'Practice energy is holding steady.' : 'The next win is building a steadier practice rhythm.'
  return {
    progressSummary: `Your child worked on ${concept}. T.A.M.i is watching practice patterns and recent lesson activity.`,
    highlight: improved,
    nextGoal: 'Aim for one short, focused practice session before the next lesson.'
  }
}

export default function TamiParentSummary({ childEmail }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(Boolean(childEmail))

  useEffect(() => {
    let cancelled = false
    if (!childEmail) return
    setLoading(true)
    api.getStudentByEmail(childEmail)
      .then(async record => {
        const studentId = record?.id || record?.record_id || record?.fields?.id || childEmail
        const logs = await api.getPracticeLogs(studentId).catch(() => null)
        const signalContext = buildSignalContextFromStudentRecord(record, logs, null)
        const decision = runTamiDecisionEngine(signalContext || {})
        formTamiOutput({ decision, signals: signalContext, stakeholderMode: 'parent' })
        const nextSummary = safeParentCopy(signalContext)
        if (!cancelled) setSummary(nextSummary)
      })
      .catch(err => {
        console.warn('[TAMI Parent Summary] Failed to load child data:', err)
        if (!cancelled) setSummary({
          progressSummary: 'T.A.M.i could not read the latest practice data yet. The dashboard will try again later.',
          highlight: 'Your child still has access to practice tools.',
          nextGoal: 'Check back after the next practice session.'
        })
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [childEmail])

  if (!childEmail) {
    return (
      <div style={{ marginTop:24, background:'rgba(31,41,55,.55)', border:'1px solid rgba(59,130,246,.3)', borderRadius:16, padding:18, color:'#bfdbfe' }}>
        Link your child's account in Settings.
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ marginTop:24, background:'rgba(31,41,55,.55)', border:'1px solid rgba(59,130,246,.3)', borderRadius:16, padding:18, color:'#bfdbfe' }}>
        Reading weekly progress...
      </div>
    )
  }

  const copy = summary || safeParentCopy(null)
  const clean = Object.fromEntries(Object.entries(copy).map(([key, value]) => [
    key,
    FORBIDDEN_PARENT_WORDS.test(value) ? 'Practice patterns are ready for review.' : value
  ]))

  return (
    <div style={{ marginTop:24, background:'rgba(31,41,55,.55)', border:'1px solid rgba(59,130,246,.3)', borderRadius:16, padding:20 }}>
      <div style={{ fontSize:16, fontWeight:800, color:'#fff', marginBottom:14 }}>T.A.M.i Family Summary</div>
      <div style={{ display:'grid', gap:12 }}>
        <div><div style={{ color:'#60a5fa', fontSize:12, fontWeight:800, marginBottom:4 }}>What happened this week:</div><div style={{ color:'#d1d5db', fontSize:13, lineHeight:1.5 }}>{clean.progressSummary}</div></div>
        <div><div style={{ color:'#60a5fa', fontSize:12, fontWeight:800, marginBottom:4 }}>What improved:</div><div style={{ color:'#d1d5db', fontSize:13, lineHeight:1.5 }}>{clean.highlight}</div></div>
        <div><div style={{ color:'#60a5fa', fontSize:12, fontWeight:800, marginBottom:4 }}>Practice goal:</div><div style={{ color:'#d1d5db', fontSize:13, lineHeight:1.5 }}>{clean.nextGoal}</div></div>
      </div>
    </div>
  )
}
