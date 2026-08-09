import { useAuth } from '../context/AuthContext.jsx'

/**
 * InstrumentSelect — M1 R1 explicit instrument selection (fix 2B).
 *
 * Shown when the backend learning identity is `selection_required` (multiple
 * owned instruments). The student explicitly picks which instrument this
 * session is for — the app NEVER auto-picks owned_instruments[0]. The choice
 * is validated against the current owned_instruments by AuthContext and cached
 * only as a convenience pointer (re-validated on every login/reload).
 *
 * Student-safe by design: names and instruments only — no numerics, no
 * internals (Article XIII).
 */
export default function InstrumentSelect({ title = 'Who is practicing today?', compact = false }) {
  const { learningIdentity, selectInstrument } = useAuth()
  const owned = learningIdentity?.owned_instruments || []

  if (!learningIdentity?.selection_required) return null

  return (
    <div
      data-testid="instrument-select"
      style={{
        background: '#111827',
        border: '1px solid rgba(20,184,166,0.25)',
        borderRadius: 12,
        padding: compact ? '12px 14px' : '16px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, color: '#fff' }}>
        {title}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
        Pick your instrument so your practice saves to the right place.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {owned.map(o => (
          <button
            key={o.student_instrument_id}
            type="button"
            data-testid={`instrument-option-${o.student_instrument_id}`}
            onClick={() => selectInstrument(o.student_instrument_id)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 10, width: '100%', minHeight: 48, padding: '12px 14px',
              borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(20,184,166,0.06)', color: '#fff', cursor: 'pointer',
              fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600,
              textAlign: 'left',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {o.label || 'My account'}
            </span>
            <span style={{
              flexShrink: 0, fontSize: 11, fontWeight: 500, color: '#14b8a6',
              background: 'rgba(20,184,166,0.12)', borderRadius: 20, padding: '3px 10px',
            }}>
              {o.instrument || 'Instrument'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
