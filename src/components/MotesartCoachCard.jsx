/**
 * MotesartCoachCard.jsx — Hero coaching module
 *
 * Features:
 * - Large Motesart portrait (no ring, rounded rectangle)
 * - Speech bubble with live typing synced to ElevenLabs voice
 * - Speaking bars animate while audio plays
 * - Listen / Replay button (handles browser autoplay policy)
 * - Controls: # / ABC toggle, Home pill, BPM control
 *
 * Reusable across all concept chapters.
 */
import React, { useEffect, useRef } from 'react';
import useMotesartVoice from '../hooks/useMotesartVoice.js';

const AVATAR_URL = '/Motesart%20Avatar%201.PNG';

export default function MotesartCoachCard({
  message = '',
  homeKey = 'C',
  homeOn = true,
  bpm = 103,
  metronomeOn = false,
  labelMode = 'numbers',
  quiet = false,
  onLabelModeChange,
  onHomeToggle,
  onBpmChange,
  onMetronomeToggle,
  autoSpeak = true,
  muted = false,
  voiceRef,
}) {
  const voice = useMotesartVoice();
  const prevMsg = useRef('');
  const speakRef = useRef(voice.speak);      // always point at the latest speak fn
  speakRef.current = voice.speak;

  // Expose voice state to parent
  useEffect(() => {
    if (voiceRef) voiceRef.current = voice;
  }, [voice, voiceRef]);

  // Speak when message changes — guarded against empty, same-text, and stale refs
  useEffect(() => {
    if (!message || !autoSpeak) return;
    if (message === prevMsg.current) return;   // same text → skip
    prevMsg.current = message;
    speakRef.current(message, { muted: quiet || muted });
  }, [message, autoSpeak, quiet, muted]);

  const s = styles;

  return (
    <div style={{ ...s.module, ...(quiet ? s.quiet : {}) }}>
      {/* Controls row */}
      {!quiet && (
        <div style={s.controlsRow}>
          <div style={s.controlsLeft}>
            <div style={s.labelToggle}>
              <span
                style={{ ...s.ltOpt, ...(labelMode === 'numbers' ? s.ltOptActive : {}) }}
                onClick={() => onLabelModeChange?.('numbers')}
              >#</span>
              <span
                style={{ ...s.ltOpt, ...(labelMode === 'letters' ? s.ltOptActive : {}) }}
                onClick={() => onLabelModeChange?.('letters')}
              >ABC</span>
            </div>
            <div style={s.homePill} onClick={onHomeToggle}>
              <span style={s.homeLabel}>Home</span>
              <span style={s.homeVal}>{homeKey}</span>
              <span style={{ ...s.toggleSw, ...(homeOn ? s.toggleOn : {}) }}>
                <span style={{ ...s.toggleDot, ...(homeOn ? s.toggleDotOn : {}) }} />
              </span>
            </div>
          </div>
          <div style={s.controlsRight}>
            <div style={s.bpmControl}>
              <button style={s.bpmBtn} onClick={() => onBpmChange?.(Math.max(40, bpm - 1))}>{'\u2212'}</button>
              <div style={s.bpmDisplay} onClick={onMetronomeToggle}>
                <span style={{ ...s.dotInd, ...(metronomeOn ? s.dotOn : s.dotOff) }} />
                <span style={{ fontSize: 10 }}>{'\u2669'}</span>
                <span>{bpm}</span>
              </div>
              <button style={s.bpmBtn} onClick={() => onBpmChange?.(Math.min(220, bpm + 1))}>+</button>
            </div>
          </div>
        </div>
      )}

      {/* Coach layout: avatar + speech */}
      <div style={s.coachLayout}>
        <div style={s.avatarCol}>
          <div style={s.avatarPortrait}>
            <img src={AVATAR_URL} alt="Motesart" style={s.avatarImg} />
          </div>
          <div style={s.avatarName}>MOTESART</div>
        </div>
        <div style={s.messageCol}>
          <div style={s.speechBubble}>
            <div style={s.speechTail} />
            {voice.typedText || ''}
            {!voice.isDone && <span style={s.cursor} />}
          </div>
          {/* Speaking footer */}
          <div style={s.speakFooter}>
            <div style={s.speakBarsRow}>
              {voice.isSpeaking && (
                <div style={s.speakBars}>
                  {[4,9,5,12,3,8,5].map((h, i) => (
                    <div key={i} style={{ ...s.sbar, height: h, animationDelay: `${i * 0.08}s` }} />
                  ))}
                </div>
              )}
              {voice.isSpeaking && <span style={s.speakLabel}>speaking...</span>}
              {voice.isDone && !voice.isSpeaking && (
                <button style={s.replayBtn} onClick={voice.replay}>
                  {'\u25B6'} Replay
                </button>
              )}
              {voice.audioReady && !voice.isSpeaking && (
                <button style={s.listenBtn} onClick={() => { voice.playReady(); }}>
                  {'\u266A'} Listen
                </button>
              )}
              {voice.isLoading && <span style={s.loadingLabel}>loading voice...</span>}
            </div>
            {voice.isSpeaking && <span style={{ ...s.speakDot, background: '#16A34A' }} />}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes motesartBlink { 50% { opacity: 0; } }
        @keyframes motesartSpeak {
          0% { transform: scaleY(0.4); }
          100% { transform: scaleY(1.4); }
        }
        @keyframes motesartPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  module: { background: '#FFFFFF', padding: '14px 16px 16px' },
  quiet: { opacity: 0.4 },

  controlsRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14,
  },
  controlsLeft: { display: 'flex', gap: 6, alignItems: 'center' },
  controlsRight: { display: 'flex', gap: 6, alignItems: 'center' },

  labelToggle: {
    display: 'inline-flex', borderRadius: 8, overflow: 'hidden',
    border: '1px solid #EEEAE2',
    fontFamily: "'Outfit', sans-serif", fontSize: 10, fontWeight: 700,
    cursor: 'pointer', userSelect: 'none',
  },
  ltOpt: {
    padding: '4px 10px', background: '#FAFAF8', color: '#C4BFB6',
    transition: 'all 0.15s', textTransform: 'uppercase',
  },
  ltOptActive: { background: '#8B5CF6', color: '#fff' },

  homePill: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 10, fontWeight: 600,
    padding: '4px 10px', borderRadius: 10,
    background: '#FEF9EE', border: '1px solid #F0DDB8', color: '#B8860B',
    cursor: 'pointer', userSelect: 'none',
  },
  homeLabel: { fontWeight: 500 },
  homeVal: { fontWeight: 800 },
  toggleSw: {
    width: 24, height: 12, borderRadius: 6,
    background: '#D1D5DB', position: 'relative',
    display: 'inline-block', verticalAlign: 'middle',
  },
  toggleOn: { background: '#16A34A' },
  toggleDot: {
    width: 8, height: 8, borderRadius: '50%',
    background: '#fff', position: 'absolute',
    top: 2, left: 2, transition: 'left 0.2s',
  },
  toggleDotOn: { left: 14 },

  bpmControl: {
    display: 'inline-flex', alignItems: 'center',
    borderRadius: 10, border: '1px solid #EEEAE2',
    overflow: 'hidden', background: '#FAFAF8',
  },
  bpmBtn: {
    width: 24, height: 24, background: 'none', border: 'none',
    fontSize: 13, fontWeight: 700, color: '#8B5CF6',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  bpmDisplay: {
    display: 'flex', alignItems: 'center', gap: 3, padding: '0 4px',
    fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 700,
    color: '#5B21B6', minWidth: 44, justifyContent: 'center',
    cursor: 'pointer',
  },
  dotInd: { width: 5, height: 5, borderRadius: '50%', flexShrink: 0 },
  dotOff: { background: '#EF4444' },
  dotOn: { background: '#16A34A', animation: 'motesartPulse 1s ease-in-out infinite' },

  coachLayout: { display: 'flex', gap: 14, alignItems: 'flex-start' },
  avatarCol: {
    flexShrink: 0, display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 5,
  },
  avatarPortrait: {
    width: 96, height: 96, borderRadius: '50%', overflow: 'hidden',
    background: 'linear-gradient(135deg, #F3F0FF, #E9DDFB)',
    border: '3.5px solid #8B5CF6',
    boxShadow: '0 4px 16px rgba(139,92,246,0.15)',
  },
  avatarImg: {
    width: '100%', height: '100%',
    objectFit: 'cover', objectPosition: 'center 10%',
    borderRadius: '50%',
  },
  avatarName: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 9, fontWeight: 800, color: '#8B5CF6',
    letterSpacing: 1.5, textTransform: 'uppercase',
  },

  messageCol: { flex: 1, minWidth: 0 },
  speechBubble: {
    background: '#FAFAF8', border: '1px solid #E9DDFB',
    borderRadius: 12, padding: '11px 13px',
    fontSize: 13, lineHeight: 1.55, color: '#1E293B',
    position: 'relative', minHeight: 52,
  },
  speechTail: {
    position: 'absolute', left: -5, top: 16,
    width: 8, height: 8, background: '#FAFAF8',
    borderLeft: '1px solid #E9DDFB', borderBottom: '1px solid #E9DDFB',
    transform: 'rotate(45deg)',
  },
  cursor: {
    display: 'inline-block', width: 2, height: 12,
    background: '#8B5CF6', marginLeft: 1,
    animation: 'motesartBlink 0.6s step-end infinite',
    verticalAlign: 'text-bottom',
  },

  speakFooter: {
    display: 'flex', alignItems: 'center', gap: 8,
    marginTop: 7, justifyContent: 'flex-end',
    minHeight: 20,
  },
  speakBarsRow: {
    display: 'flex', alignItems: 'center', gap: 8,
  },
  speakBars: { display: 'flex', gap: 2, alignItems: 'flex-end', height: 14 },
  sbar: {
    width: 2.5, borderRadius: 1.5, background: '#8B5CF6',
    animation: 'motesartSpeak 0.7s ease-in-out infinite alternate',
  },
  speakLabel: { fontSize: 9, color: '#8B5CF6', fontStyle: 'italic' },
  speakDot: {
    width: 4, height: 4, borderRadius: '50%',
    animation: 'motesartPulse 1s ease-in-out infinite',
  },
  loadingLabel: { fontSize: 9, color: '#C4BFB6', fontStyle: 'italic' },

  listenBtn: {
    padding: '3px 10px', fontSize: 10, fontWeight: 700,
    color: '#fff', background: '#8B5CF6',
    border: 'none', borderRadius: 8,
    cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
    letterSpacing: 0.5,
  },
  replayBtn: {
    padding: '3px 10px', fontSize: 10, fontWeight: 600,
    color: '#8B5CF6', background: '#F5F3FF',
    border: '1px solid #E9DDFB', borderRadius: 8,
    cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
  },
};
