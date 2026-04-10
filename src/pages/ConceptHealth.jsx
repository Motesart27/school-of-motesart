import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ProofLoopPanel from '../components/ProofLoopPanel.jsx';

const ConceptHealth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const MOCK_CONCEPT_HEALTH = [
    { id: 'T_FINGER_NUMBERING', name: 'Finger Numbering', phase: 'F01_BODY', phaseName: 'Body', avgConfidence: 0.92, practicing: 2, owned: 20, atRisk: 0, total: 24, status: 'healthy' },
    { id: 'T_HAND_POSITION', name: 'Hand Position', phase: 'F01_BODY', phaseName: 'Body', avgConfidence: 0.85, practicing: 5, owned: 16, atRisk: 1, total: 24, status: 'healthy' },
    { id: 'T_HALF_STEP', name: 'Half Step \u2014 The Squeeze', phase: 'F02_BEAT_PATTERN', phaseName: 'Beat + Pattern', avgConfidence: 0.68, practicing: 10, owned: 6, atRisk: 3, total: 24, status: 'needs_attention', sourceRule: '3\u21924 and 7\u21928 are the natural half steps', feelPassRates: { A: 18, B: 8, C: 2 }, commonMistakes: ['half_whole_confusion', 'e_f_miss', 'visual_dependency'] },
    { id: 'T_WHOLE_STEP', name: 'Whole Step \u2014 The Skip', phase: 'F02_BEAT_PATTERN', phaseName: 'Beat + Pattern', avgConfidence: 0.61, practicing: 12, owned: 4, atRisk: 4, total: 24, status: 'needs_attention', sourceRule: 'One key between; contrast builds ear', feelPassRates: { A: 15, B: 5, C: 1 }, commonMistakes: ['half_whole_confusion', 'skip_count_error', 'ear_contrast_failure'] },
    { id: 'T_MAJOR_SCALE_PATTERN', name: 'Major Scale Pattern \u2014 The Chant', phase: 'F02_BEAT_PATTERN', phaseName: 'Beat + Pattern', avgConfidence: 0.52, practicing: 14, owned: 2, atRisk: 5, total: 24, status: 'critical', sourceRule: 'W-W-H \u00b7 W-W-W-H', feelPassRates: { A: 12, B: 3, C: 0 }, commonMistakes: ['pattern_recitation_error', 'half_step_placement_wrong', 'chant_breakdown_under_pressure'] },
    { id: 'T_RHYTHM_BASIC', name: 'Basic Rhythm', phase: 'F02_BEAT_PATTERN', phaseName: 'Beat + Pattern', avgConfidence: 0.58, practicing: 15, owned: 3, atRisk: 2, total: 24, status: 'needs_attention' },
    { id: 'T_SCALE_DEGREES_MAJOR', name: 'Scale Degrees \u2014 Home & Tension', phase: 'F03_VISUAL', phaseName: 'Visual', avgConfidence: 0.35, practicing: 8, owned: 0, atRisk: 2, total: 24, status: 'critical', sourceRule: '1 = home always; 7 wants to go home', feelPassRates: { A: 6, B: 0, C: 0 }, commonMistakes: ['home_key_confusion', 'tension_deafness', 'number_letter_conflation'] },
    { id: 'T_KEYBOARD_LAYOUT', name: 'Keyboard Layout', phase: 'F03_VISUAL', phaseName: 'Visual', avgConfidence: 0.45, practicing: 10, owned: 0, atRisk: 1, total: 24, status: 'needs_attention' },
  ];

  const MOCK_STUDENT_CONCEPT_STATES = {
    T_HALF_STEP: [
      { studentId: 's1', name: 'Emma Rodriguez', ownership: 'accurate_with_support', confidence: 0.72, trend: 'improving', feelModes: { A: true, B: false, C: false }, evidence: '22 attempts \u00b7 72% \u00b7 improving \u00b7 e_f_miss' },
      { studentId: 's2', name: 'Tyler Kim', ownership: 'practicing', confidence: 0.45, trend: 'declining', feelModes: { A: true, B: false, C: false }, evidence: '15 attempts \u00b7 45% \u00b7 declining \u00b7 half_whole_confusion' },
      { studentId: 's3', name: 'Mia Thompson', ownership: 'introduced', confidence: 0.28, trend: 'stable', feelModes: { A: false, B: false, C: false }, evidence: '8 attempts \u00b7 28% \u00b7 stable \u00b7 visual_dependency' },
      { studentId: 's4', name: 'Aiden Jackson', ownership: 'owned', confidence: 0.95, trend: 'stable', feelModes: { A: true, B: true, C: true }, evidence: '35 attempts \u00b7 95% \u00b7 stable \u00b7 none' },
      { studentId: 's5', name: 'Zoe Martinez', ownership: 'accurate_without_support', confidence: 0.82, trend: 'improving', feelModes: { A: true, B: true, C: false }, evidence: '28 attempts \u00b7 82% \u00b7 improving \u00b7 b_c_miss' },
      { studentId: 's6', name: 'Noah Davis', ownership: 'practicing', confidence: 0.55, trend: 'improving', feelModes: { A: true, B: false, C: false }, evidence: '18 attempts \u00b7 55% \u00b7 improving \u00b7 counting_instead_of_feeling' },
    ],
  };

  const AT_RISK_STUDENTS = [
    { id: 's2', name: 'Tyler Kim', stalledConcept: 'Half Step', confidence: 0.45, daysSinceLastAttempt: 5, trend: 'declining' },
    { id: 's3', name: 'Mia Thompson', stalledConcept: 'Major Scale Pattern', confidence: 0.28, daysSinceLastAttempt: 8, trend: 'stable' },
    { id: 's7', name: 'Lily Chen', stalledConcept: 'Whole Step', confidence: 0.32, daysSinceLastAttempt: 12, trend: 'declining' },
  ];

  const [selectedClass, setSelectedClass] = useState('Piano 101 - Period 3');
  const [expandedConcept, setExpandedConcept] = useState(null);
  const [liveHealth, setLiveHealth] = useState(null)

  // Load live Concept_State from shared store
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { getStatesForTeacherView } = await import('../lesson_engine/concept_state_store.js')
        const { getTeacherConceptHealthView } = await import('../lesson_engine/curriculum_data_provider.js')
        const studentStates = getStatesForTeacherView()
        if (studentStates.length > 0) {
          const healthData = await getTeacherConceptHealthView(studentStates)
          if (!cancelled && healthData?.conceptHealth?.length) {
            setLiveHealth(healthData.conceptHealth)
          }
        }
      } catch (err) {
        console.warn('[ConceptHealth] Live data load failed, using mock:', err)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const conceptHealthData = liveHealth || MOCK_CONCEPT_HEALTH
  const metrics = { totalStudents: 24, conceptsActive: 8, avgConfidence: 62, atRisk: 3, readyToAdvance: 5 };
  const formatConfidence = (val) => Math.round(val * 100);
  const statusColors = { healthy: '#10b981', needs_attention: '#f59e0b', critical: '#ef4444' };
  const ownershipColors = { introduced: '#4b5563', practicing: '#1e40af', accurate_with_support: '#92400e', accurate_without_support: '#6b21a8', owned: '#134e4a' };

  const OwnershipBadge = ({ ownership }) => (
    <span style={{ display: 'inline-block', backgroundColor: ownershipColors[ownership] || '#6b7280', color: '#fff', borderRadius: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '4px 8px', fontSize: 11 }}>
      {ownership.replace(/_/g, ' ')}
    </span>
  );

  const TrendIndicator = ({ trend }) => {
    const icons = { improving: '\ud83d\udcc8', declining: '\ud83d\udcc9', stable: '\u2192' };
    const colors = { improving: '#10b981', declining: '#ef4444', stable: '#6b7280' };
    return <span style={{ color: colors[trend], fontWeight: 'bold', marginRight: 4 }}>{icons[trend]}</span>;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #111827, #1f2937)', color: '#fff', fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <style>{`
        @keyframes expandDown { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 1000px; } }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(17,24,39,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(245,158,11,0.2)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => navigate('/teacher')} style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: 24, cursor: 'pointer', padding: '4px 8px' }}>\u2190</button>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Concept Health Dashboard</h1>
        </div>
        <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} style={{ background: 'rgba(31,41,55,0.8)', border: '1px solid rgba(245,158,11,0.3)', color: '#fff', padding: '8px 12px', borderRadius: 6, fontSize: 14 }}>
          <option value="Piano 101 - Period 3">Piano 101 - Period 3</option>
          <option value="Voice - Period 5">Voice - Period 5</option>
          <option value="Strings Ensemble - Period 2">Strings Ensemble - Period 2</option>
        </select>
      </div>

      <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
        {/* Metrics Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Total Students', value: metrics.totalStudents, color: '#fff' },
            { label: 'Concepts Active', value: metrics.conceptsActive, color: '#fff' },
            { label: 'Avg Confidence', value: metrics.avgConfidence + '%', color: '#f59e0b' },
            { label: 'Students At Risk', value: metrics.atRisk, color: '#ef4444' },
            { label: 'Ready to Advance', value: metrics.readyToAdvance, color: '#10b981' },
          ].map((m) => (
            <div key={m.label} style={{ background: 'rgba(31,41,55,0.6)', border: '1px solid rgba(75,85,99,0.4)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 12, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, fontWeight: 500 }}>{m.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: m.color, lineHeight: 1 }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Concept Health Table */}
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Concept Health Overview</h2>
        <div style={{ overflowX: 'auto', marginBottom: 32 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'rgba(31,41,55,0.3)', borderRadius: 8, overflow: 'hidden' }}>
            <thead style={{ background: 'rgba(17,24,39,0.6)', borderBottom: '2px solid rgba(245,158,11,0.2)' }}>
              <tr>
                {['Concept', 'Phase', 'Avg Confidence', 'Practicing', 'Owned', 'Status'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#d1d5db', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {conceptHealthData.map((concept) => (
                <React.Fragment key={concept.id}>
                  <tr
                    style={{ borderBottom: '1px solid rgba(75,85,99,0.2)', cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => setExpandedConcept(expandedConcept === concept.id ? null : concept.id)}
                  >
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500, color: '#e5e7eb' }}>{concept.name}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#e5e7eb' }}>{concept.phaseName}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#f59e0b', marginBottom: 4 }}>{formatConfidence(concept.avgConfidence)}%</div>
                      <div style={{ height: 6, background: 'rgba(75,85,99,0.3)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: '#f59e0b', width: `${formatConfidence(concept.avgConfidence)}%`, transition: 'width 0.3s' }} />
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#e5e7eb' }}>{concept.practicing}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#e5e7eb' }}>{concept.owned}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, backgroundColor: statusColors[concept.status], color: '#fff', textTransform: 'capitalize' }}>
                        {concept.status === 'needs_attention' ? 'Needs Attention' : concept.status}
                      </span>
                    </td>
                  </tr>
                  {/* Expanded Row */}
                  {expandedConcept === concept.id && (
                    <tr style={{ borderBottom: '1px solid rgba(75,85,99,0.2)' }}>
                      <td colSpan="6">
                        <div style={{ background: 'rgba(17,24,39,0.8)', padding: '24px 16px', animation: 'expandDown 0.3s ease-out' }}>
                          {concept.sourceRule && (
                            <div style={{ background: 'rgba(31,41,55,0.6)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: '#f59e0b', marginBottom: 8 }}>Core Rule</div>
                              <div style={{ fontSize: 13, color: '#d1d5db', marginBottom: 8 }}>{concept.sourceRule}</div>
                              {concept.feelPassRates && (
                                <div style={{ display: 'flex', gap: 16, fontSize: 13, marginTop: 8 }}>
                                  <strong>Feel Modes:</strong>
                                  <span style={{ color: '#10b981' }}>A: {concept.feelPassRates.A}/24</span>
                                  <span style={{ color: '#f59e0b' }}>B: {concept.feelPassRates.B}/24</span>
                                  <span style={{ color: '#ef4444' }}>C: {concept.feelPassRates.C}/24</span>
                                </div>
                              )}
                            </div>
                          )}
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#d1d5db', marginBottom: 12 }}>Student Breakdown</div>
                          {MOCK_STUDENT_CONCEPT_STATES[concept.id] ? (
                            MOCK_STUDENT_CONCEPT_STATES[concept.id].map((s, idx) => (
                              <div key={s.studentId} style={{ display: 'grid', gridTemplateColumns: '180px 140px 100px 90px 120px 1fr auto', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: idx < MOCK_STUDENT_CONCEPT_STATES[concept.id].length - 1 ? '1px solid rgba(75,85,99,0.1)' : 'none', fontSize: 13, animation: `slideInLeft 0.3s ease-out ${idx * 0.05}s` }}>
                                <div style={{ fontWeight: 500, color: '#e5e7eb' }}>{s.name}</div>
                                <div><OwnershipBadge ownership={s.ownership} /></div>
                                <div>
                                  <div style={{ fontWeight: 600, color: '#f59e0b' }}>{formatConfidence(s.confidence)}%</div>
                                  <div style={{ height: 4, background: 'rgba(75,85,99,0.3)', borderRadius: 2, overflow: 'hidden', marginTop: 3 }}>
                                    <div style={{ height: '100%', background: '#f59e0b', width: `${formatConfidence(s.confidence)}%` }} />
                                  </div>
                                </div>
                                <div><TrendIndicator trend={s.trend} /><span style={{ textTransform: 'capitalize', fontSize: 12, color: '#d1d5db' }}>{s.trend}</span></div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  {['A', 'B', 'C'].map(mode => (
                                    <span key={mode} style={{ width: 24, height: 24, borderRadius: 4, fontSize: 11, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: s.feelModes[mode] ? '#10b981' : '#6b7280' }}>{mode}</span>
                                  ))}
                                </div>
                                <div style={{ fontSize: 12, color: '#9ca3af' }}>{s.evidence}</div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', color: '#f59e0b', padding: '5px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>Review</button>
                                  <button style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', color: '#f59e0b', padding: '5px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>Assign</button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div style={{ color: '#9ca3af', fontSize: 13 }}>No student data available for this concept.</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* At-Risk Students */}
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Students Needing Support</h2>
        <div style={{ background: 'rgba(31,41,55,0.6)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: 16, marginBottom: 32 }}>
          {AT_RISK_STUDENTS.map((student, idx) => (
            <div key={student.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: idx < AT_RISK_STUDENTS.length - 1 ? '1px solid rgba(75,85,99,0.1)' : 'none' }}>
              <div>
                <div style={{ fontWeight: 600, color: '#e5e7eb', marginBottom: 4 }}>{student.name}</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>Stalled on <strong>{student.stalledConcept}</strong> \u00b7 {formatConfidence(student.confidence)}% confidence \u00b7 {student.daysSinceLastAttempt} days inactive</div>
              </div>
              <button style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>Reach Out</button>
            </div>
          ))}
        </div>

        <ProofLoopPanel />

        {/* Pilot Concepts Analysis */}
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Pilot Concepts Analysis</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {conceptHealthData.filter(c => c.sourceRule).map(concept => (
            <div key={concept.id} style={{ background: 'rgba(31,41,55,0.6)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#f59e0b', marginBottom: 8 }}>{concept.name}</div>
              <div style={{ fontSize: 13, color: '#d1d5db', marginBottom: 8 }}><strong>Source Rule:</strong> {concept.sourceRule}</div>
              {concept.feelPassRates && (
                <div style={{ fontSize: 13, color: '#d1d5db', marginBottom: 8 }}>
                  <strong>Feel Mode Distribution:</strong>
                  <div style={{ marginTop: 6, display: 'flex', gap: 12, fontSize: 12 }}>
                    <span style={{ color: '#10b981' }}>A: {concept.feelPassRates.A}/24</span>
                    <span style={{ color: '#f59e0b' }}>B: {concept.feelPassRates.B}/24</span>
                    <span style={{ color: '#ef4444' }}>C: {concept.feelPassRates.C}/24</span>
                  </div>
                </div>
              )}
              {concept.commonMistakes && (
                <div style={{ fontSize: 13, color: '#d1d5db' }}>
                  <strong>Common Mistakes:</strong>
                  <div style={{ marginTop: 6, fontSize: 12, color: '#9ca3af' }}>{concept.commonMistakes.map(m => m.replace(/_/g, ' ')).join(', ')}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ConceptHealth;
