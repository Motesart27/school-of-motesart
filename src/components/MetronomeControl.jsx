import React, { useState, useRef, useEffect, useCallback } from 'react'

/**
 * MetronomeControl.jsx
 *
 * Compact metronome for practice chapter headers.
 * Plays a click at the given BPM using Web Audio API.
 *
 * Props:
 *   bpm          — number, beats per minute (default: 72)
 *   defaultOn    — boolean, start enabled (default: false)
 *   onToggle     — callback(isOn) when toggled
 */

export default function MetronomeControl({ bpm = 72, defaultOn = false, onToggle }) {
  const [isOn, setIsOn] = useState(defaultOn)
  const audioCtxRef = useRef(null)
  const intervalRef = useRef(null)

  const playClick = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    const ctx = audioCtxRef.current
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.06)
  }, [])

  useEffect(() => {
    if (isOn) {
      const ms = 60000 / bpm
      playClick()
      intervalRef.current = setInterval(playClick, ms)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isOn, bpm, playClick])

  const toggle = () => {
    const next = !isOn
    setIsOn(next)
    if (onToggle) onToggle(next)
  }

  return (
    <div style={styles.wrap} onClick={toggle}>
      <span style={styles.icon}>{'\u2669'}</span>
      <span style={styles.bpm}>{bpm}</span>
      <div style={{ ...styles.toggle, background: isOn ? 'rgba(99,102,241,0.35)' : '#2a2a3a' }}>
        <div
          style={{
            ...styles.dot,
            background: isOn ? '#818cf8' : '#64748b',
            ...(isOn ? { right: 2 } : { left: 2 }),
          }}
        />
      </div>
    </div>
  )
}

const styles = {
  wrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(99,102,241,0.06)',
    border: '1px solid rgba(99,102,241,0.15)',
    borderRadius: 8,
    padding: '5px 10px',
    cursor: 'pointer',
    userSelect: 'none',
    flexShrink: 0,
  },
  icon: {
    fontSize: 14,
    color: '#818cf8',
  },
  bpm: {
    fontSize: 13,
    fontWeight: 700,
    color: '#a5b4fc',
    letterSpacing: '0.3px',
  },
  toggle: {
    width: 28,
    height: 14,
    borderRadius: 7,
    position: 'relative',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    position: 'absolute',
    top: 2,
  },
}
