import { useNavigate } from 'react-router-dom'

/**
 * Teacher TAMi Dashboard — QUARANTINED for M1 (Codex R3.2 HIGH-1).
 *
 * The prior implementation presented hard-coded student / DPM / WYL data
 * (fake roster, fabricated DPM percentages, invented "insights") behind a
 * live-data indicator with NO backend call. The frozen backend
 * (382fab0) exposes no ratified teacher-TAMi *class-aggregate* live-data
 * contract — only per-student privileged operations
 * (/tami/weekly-review, /tami/suggest-homework, /tami/student-brief).
 *
 * Per governance we do NOT invent a backend endpoint and we do NOT relabel
 * fabricated data as live. The route renders a truthful, non-canonical
 * unavailable state. It contains:
 *   - no hard-coded learner/student metrics
 *   - no fabricated DPM / WYL / roster
 *   - no live-class-data claim
 *   - no fabricated canonical state and no ability to mutate canonical state
 *
 * The route remains TeacherRoute-gated (teacher/admin/founder) in App.jsx and,
 * post R3.2, only mounts after backend role verification.
 */
export default function TeacherTamiDashboard() {
  const navigate = useNavigate()

  return (
    <div
      data-testid="teacher-tami-quarantine"
      style={{
        fontFamily: "'Inter',-apple-system,sans-serif",
        background: '#0a0e1a',
        color: '#e2e8f0',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          maxWidth: 520,
          background: '#131c2e',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          padding: '32px 28px',
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'linear-gradient(135deg,#e84b8a,#f97316)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            fontWeight: 800,
            color: '#fff',
            margin: '0 auto 16px',
          }}
        >
          T
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 10px' }}>
          Teacher TAMi
        </h1>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: '#9ca3af', margin: '0 0 8px' }}>
          Teacher TAMi live data is not available in M1.
        </p>
        <p style={{ fontSize: 12, lineHeight: 1.6, color: '#6b7280', margin: '0 0 22px' }}>
          A class-level live data view is not yet connected to a ratified backend
          contract. No student, DPM, or WYL figures are shown here because none
          would be real. Per-student teacher tools remain available from the
          Teacher Dashboard.
        </p>
        <button
          onClick={() => navigate('/teacher')}
          style={{
            padding: '9px 18px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#e2e8f0',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Back to Teacher Dashboard
        </button>
      </div>
    </div>
  )
}
