import React, { useState } from 'react'

/**
 * AmbassadorBubble.jsx
 *
 * Reusable floating coaching bubble for every practice chapter.
 * T.A.M.i decides the message. The ambassador delivers it in that persona.
 *
 * Resolution priority:
 *   1. student-assigned ambassador
 *   2. school ambassador
 *   3. system default = Motesart
 *
 * Props:
 *   message        — string, coaching/hint/feedback text (set by T.A.M.i)
 *   triggerLabel   — string, e.g. 'proactive — chapter intro'
 *   ambassadorId   — string, which ambassador to render (default: 'motesart')
 *   quiet          — boolean, dimmed mode for Own It (default: false)
 *   defaultOpen    — boolean, start with popup open (default: false)
 */

const AMBASSADORS = {
  motesart: {
    name: 'Motesart',
    portrait: '/Motesart Avatar 1.PNG',
    icon: '\u266A',
    gradient: ['#2d1b69', '#1a1040'],
    borderColor: 'rgba(167,139,250,0.5)',
    nameColor: '#a78bfa',
  },
}

export default function AmbassadorBubble({
  message,
  triggerLabel = '',
  ambassadorId = 'motesart',
  quiet = false,
  defaultOpen = false,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const amb = AMBASSADORS[ambassadorId] || AMBASSADORS.motesart

  const toggleOpen = (e) => {
    e.stopPropagation()
    setIsOpen((prev) => !prev)
  }

  return (
    <div style={styles.wrapper}>
      {/* Speech popup */}
      {isOpen && (
        <div style={styles.speech}>
          <div style={styles.face}>
            <img
              src={amb.portrait}
              alt={amb.name}
              style={styles.faceImg}
            />
          </div>
          <div style={styles.body}>
            <div style={{ ...styles.label, color: amb.nameColor }}>
              {amb.name}
            </div>
            <div style={styles.text}>{message}</div>
            {triggerLabel && (
              <div style={styles.trigger}>{triggerLabel}</div>
            )}
          </div>
        </div>
      )}

      {/* Floating icon */}
      <div
        onClick={toggleOpen}
        style={{
          ...styles.icon,
          background:
            'linear-gradient(145deg,' +
            amb.gradient[0] +
            ',' +
            amb.gradient[1] +
            ')',
          borderColor: amb.borderColor,
          opacity: quiet ? 0.5 : 1,
        }}
      >
        <span style={styles.note}>{amb.icon}</span>
        {!isOpen && !quiet && <div style={styles.notify} />}
      </div>
    </div>
  )
}

const styles = {
  wrapper: {
    position: 'fixed',
    bottom: 20,
    right: 20,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 10,
  },
  speech: {
    maxWidth: 320,
    background: 'linear-gradient(135deg, #1e1b3a 0%, #171430 100%)',
    border: '1px solid rgba(124,58,237,0.45)',
    borderRadius: '18px 18px 6px 18px',
    padding: 14,
    boxShadow: '0 8px 28px rgba(0,0,0,0.5), 0 0 20px rgba(124,58,237,0.12)',
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
    animation: 'bubbleFadeIn 0.25s ease-out',
  },
  face: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    overflow: 'hidden',
    border: '2.5px solid rgba(167,139,250,0.5)',
    flexShrink: 0,
    boxShadow: '0 3px 12px rgba(91,33,182,0.5)',
  },
  faceImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.8px',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  text: {
    fontSize: 13,
    color: '#e2e8f0',
    lineHeight: 1.55,
  },
  trigger: {
    fontSize: 8,
    color: '#475569',
    marginTop: 6,
    fontStyle: 'italic',
    borderTop: '1px solid rgba(124,58,237,0.12)',
    paddingTop: 5,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: '50%',
    border: '2.5px solid rgba(167,139,250,0.5)',
    boxShadow:
      '0 4px 14px rgba(0,0,0,0.45), 0 0 18px rgba(124,58,237,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    position: 'relative',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  note: {
    fontSize: 26,
    color: '#e9d5ff',
    lineHeight: 1,
    textShadow: '0 1px 6px rgba(124,58,237,0.4)',
  },
  notify: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: '#f59e0b',
    border: '2px solid #1e1b3a',
    boxShadow: '0 0 6px rgba(245,158,11,0.4)',
  },
}
