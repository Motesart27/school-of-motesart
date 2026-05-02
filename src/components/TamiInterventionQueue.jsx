import { buildTamiVoiceResponse } from '../ai/tami/tamiVoicePersona.js'

function field(record, key, fallback = '') {
  const fields = record?.fields || record || {}
  return fields[key] ?? record?.[key] ?? fallback
}

export function humanizeReason(reason) {
  const map = {
    low_motivation_high_error_high_hint: 'High hint load with low motivation - student may need teacher support.',
    student_support_needed: 'Repeated errors and dropping engagement - review concept pacing.',
    operator_attention_query: 'Student support signals are elevated - review recent practice.',
    teacher_struggle_query: 'A current struggle pattern is visible - check the student concept view.'
  }
  return map[reason] || 'Student support signals changed - review before the next lesson.'
}

function Metric({ label, value, color = '#f59e0b' }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'rgba(255,255,255,0.55)', marginBottom:5 }}>
        <span>{label}</span><span>{pct}</span>
      </div>
      <div style={{ height:7, borderRadius:999, background:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', borderRadius:999, background:color }} />
      </div>
    </div>
  )
}

export default function TamiInterventionQueue({ atRiskStudents, loading }) {
  if (loading) {
    return (
      <div style={{ marginTop:20, background:'rgba(19,28,46,0.82)', border:'1px solid rgba(245,158,11,0.24)', borderRadius:14, padding:18, color:'#fbbf24' }}>
        Reading student signals...
      </div>
    )
  }

  if (!Array.isArray(atRiskStudents)) {
    return (
      <div style={{ marginTop:20, background:'rgba(19,28,46,0.82)', border:'1px solid rgba(239,68,68,0.24)', borderRadius:14, padding:18, color:'#fca5a5' }}>
        T.A.M.i signal unavailable
      </div>
    )
  }

  return (
    <div style={{ marginTop:20, background:'rgba(19,28,46,0.82)', border:'1px solid rgba(245,158,11,0.18)', borderRadius:14, padding:20, boxShadow:'0 16px 50px rgba(0,0,0,0.28)' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:14 }}>
        <div style={{ fontSize:15, fontWeight:800, color:'#fff' }}>T.A.M.i - Intervention Queue</div>
        <div style={{ fontSize:11, color:'#f59e0b', fontWeight:700 }}>{atRiskStudents.length} active</div>
      </div>
      {atRiskStudents.length === 0 ? (
        <div style={{ color:'rgba(255,255,255,0.62)', fontSize:13 }}>All students nominal. No intervention needed.</div>
      ) : (
        <div style={{ display:'grid', gap:10 }}>
          {atRiskStudents.map((student, index) => {
            const scores = student.signalContext?.derivedScores || {}
            const priority = student.tamiDecision?.priority
            const isP0 = priority === 'P0'
            const name = field(student.record, 'Student / User Name', 'Unknown')
            const concept = field(student.record, 'current_concept', 'unknown')
            const output = { speechText: humanizeReason(student.tamiDecision?.reason) }
            return (
              <div key={field(student.record, 'User Email', index)} style={{ borderLeft:`3px solid ${isP0 ? '#ef4444' : '#f59e0b'}`, background: isP0 ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)', borderTop:'1px solid rgba(255,255,255,0.08)', borderRight:'1px solid rgba(255,255,255,0.08)', borderBottom:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:14 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:8 }}>
                  <div style={{ color:'#fff', fontWeight:800, fontSize:14 }}>{name} - {concept}</div>
                  <div style={{ color: isP0 ? '#fca5a5' : '#fbbf24', border:`1px solid ${isP0 ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.45)'}`, background: isP0 ? 'rgba(239,68,68,0.14)' : 'rgba(245,158,11,0.14)', borderRadius:999, padding:'3px 9px', fontSize:10, fontWeight:800 }}>
                    {isP0 ? 'Urgent' : 'Attention'}
                  </div>
                </div>
                <div style={{ color:'rgba(255,255,255,0.68)', fontSize:12, lineHeight:1.45, marginBottom:12 }}>
                  {buildTamiVoiceResponse({ output })}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                  <Metric label="Confusion" value={scores.confusionScore} color="#ef4444" />
                  <Metric label="Mastery" value={scores.masteryRiskScore} color="#f59e0b" />
                  <Metric label="Engagement" value={scores.engagementRiskScore} color="#3b82f6" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
