import React, { useState, useEffect } from 'react'
import { getState, subscribe, getStudentId } from '../lesson_engine/concept_state_store.js'

/**
 * ProofLoopPanel.jsx
 *
 * Standalone teacher view panel for the T_MAJOR_SCALE_PATTERN proof loop.
 * Reads from the real API first, falls back to localStorage.
 * No parallel logic — same state object, same fields.
 *
 * Displays: confidence, trend, mastery_ready, evidence_summary,
 *           mistake_pattern, next_action, recommended_strategy
 */

const CONCEPT_ID = 'T_MAJOR_SCALE_PATTERN'
const API_BASE = 'https://motesart-converter.netlify.app'

export default function ProofLoopPanel() {
  const [state, setState] = useState(() => getState(CONCEPT_ID))

  useEffect(() => {
    // Fetch from real API on mount
    const studentId = getStudentId()
    fetch(API_BASE + '/api/concept-state/' + studentId + '/' + CONCEPT_ID)
      .then(function(res) { return res.json() })
      .then(function(data) {
        if (data.found && data.state) {
          console.log('[ProofLoop] API state loaded:', data.state)
          setState(data.state)
        }
      })
      .catch(function(err) {
        console.warn('[ProofLoop] API fetch failed, using localStorage:', err)
      })

    // Also subscribe to localStorage changes as fallback
    const unsub = subscribe((conceptId, newState) => {
      if (conceptId === CONCEPT_ID) {
        setState(newState)
      }
    })
    return unsub
  }, [])

  if (!state) return null

  const conf = state.confidence || 0
  const confColor = conf >= 0.7 ? '#34d399' : conf >= 0.5 ? '#f59e0b' : '#ef4444'

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Live Proof Loop: Major Scale Pattern</h2>

      <div style={styles.grid}>
        <div style={styles.metric}>
          <div style={styles.metricLabel}>Confidence</div>
          <div style={{ ...styles.metricValue, color: confColor }}>
            {Math.round(conf * 100)}%
          </div>
        </div>
        <div style={styles.metric}>
          <div style={styles.metricLabel}>Trend</div>
          <div style={{ ...styles.metricValue, color: '#22d3ee' }}>
            {state.trend || '\u2014'}
          </div>
        </div>
        <div style={styles.metric}>
          <div style={styles.metricLabel}>Mastery Ready</div>
          <div style={{ ...styles.metricValue, color: state.mastery_ready ? '#34d399' : '#64748b' }}>
            {state.mastery_ready ? 'Yes' : 'Not yet'}
          </div>
        </div>
      </div>

      {state.evidence_summary && (
        <div style={styles.detail}>
          <div style={styles.detailLabel}>Evidence</div>
          <div style={styles.detailText}>{state.evidence_summary}</div>
        </div>
      )}

      {state.mistake_pattern && (
        <div style={styles.detail}>
          <div style={styles.detailLabel}>Pattern</div>
          <div style={{ ...styles.detailText, color: '#fde68a' }}>{state.mistake_pattern}</div>
        </div>
      )}

      <div style={styles.row}>
        {state.next_action && (
          <div style={{ ...styles.detail, flex: 1 }}>
            <div style={styles.detailLabel}>Next Action</div>
            <div style={{ ...styles.detailText, color: '#67e8f9' }}>{state.next_action}</div>
          </div>
        )}
        {state.recommended_strategy && (
          <div style={{ ...styles.detail, flex: 1 }}>
            <div style={styles.detailLabel}>Strategy</div>
            <div style={{ ...styles.detailText, color: '#a78bfa' }}>{state.recommended_strategy}</div>
          </div>
        )}
      </div>

      <div style={styles.timestamp}>
        Last updated: {(state.updated_at || state.last_updated) ? new Date(state.updated_at || state.last_updated).toLocaleString() : '\u2014'}
      </div>
    </div>
  )
}

const styles = {
  container: { background: '#111827', borderRadius: 12, padding: 20, marginBottom: 24, border: '1px solid #1e293b' },
  title: { fontSize: 18, fontWeight: 600, color: '#22d3ee', margin: 0, marginBottom: 16 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 },
  metric: { background: '#0f0f1a', borderRadius: 8, padding: 12, textAlign: 'center' },
  metricLabel: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 },
  metricValue: { fontSize: 24, fontWeight: 700 },
  detail: { background: '#0f0f1a', borderRadius: 8, padding: 12, marginBottom: 8 },
  detailLabel: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 },
  detailText: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.5 },
  row: { display: 'flex', gap: 12 },
  timestamp: { fontSize: 10, color: '#475569', marginTop: 8, textAlign: 'right' }
}
