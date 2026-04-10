/**
 * HalfStepPlayIt.jsx — T_HALF_STEP Play It Chapter
 *
 * Two-tap flow with warm studio design:
 * - Tap first degree, then second degree
 * - Game logic: 6 ROUNDS array with predefined pairs
 * - MotesartCoachCard with voice feedback
 * - Warm feedback cards and progress tracking
 * - Purple target highlights, green done keys, amber home
 */
import React, { useState, useCallback, useRef } from 'react';
import MotesartCoachCard from '../components/MotesartCoachCard.jsx';
import { preloadTTS } from '../services/ttsService.js';

/* ── Warm the Web Audio context on first user gesture ── */
let _audioCtxWarmed = false;
function warmAudioContext() {
  if (_audioCtxWarmed) return;
  _audioCtxWarmed = true;
  window.__motesartInteracted = true;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    const silent = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
    silent.play().catch(() => {});
    if (ctx.state === 'suspended') ctx.resume();
  } catch (_) { /* non-critical */ }
}

const WHITE_KEYS = [
  { id:'C', note:'C', degree:1 }, { id:'D', note:'D', degree:2 },
  { id:'E', note:'E', degree:3 }, { id:'F', note:'F', degree:4 },
  { id:'G', note:'G', degree:5 }, { id:'A', note:'A', degree:6 },
  { id:'B', note:'B', degree:7 }, { id:'C2', note:'C', degree:8 }
];
const BLACK_KEYS = [
  { id:'Cs', note:'C♯', afterWhiteIdx:0 },
  { id:'Ds', note:'D♯', afterWhiteIdx:1 },
  { id:'Fs', note:'F♯', afterWhiteIdx:3 },
  { id:'Gs', note:'G♯', afterWhiteIdx:4 },
  { id:'As', note:'A♯', afterWhiteIdx:5 }
];

const ROUNDS = [
  { pair:[3,4], isHalf:true, label:'Play 3→4' },
  { pair:[7,8], isHalf:true, label:'Play 7→8' },
  { pair:[1,2], isHalf:false, label:'Play 1→2' },
  { pair:[3,4], isHalf:true, label:'Play 3→4' },
  { pair:[5,6], isHalf:false, label:'Play 5→6' },
  { pair:[7,8], isHalf:true, label:'Play 7→8' }
];

const COACH_MESSAGES = {
  intro: "I'll call out pairs. Play them on the piano — tap the first note, then the second.",
  tapSecond: (deg) => `Good — now tap ${deg}.`,
  halfStep: "✓ Half step! Those notes are as close as they get.",
  notHalf: "✓ Not a half step — wider distance. Hear the difference?",
  wrongFirst: (deg) => `Start with ${deg}.`,
  wrongSecond: (deg) => `That's not ${deg} — try again.`,
  complete: "You executed half steps when called. Your ear knows the sound now."
};

const CHAPTER_TABS = [
  { id: 'find_it', label: 'Find It' },
  { id: 'play_it', label: 'Play It' },
  { id: 'move_it', label: 'Name It' },
  { id: 'own_it', label: 'Own It' },
];

export default function HalfStepPlayIt({ onComplete, currentChapter, onChapterChange }) {
  const [lessonStarted, setLessonStarted] = useState(false);
  const [roundIdx, setRoundIdx] = useState(0);
  const [tapState, setTapState] = useState('first'); // 'first' or 'second'
  const [firstTap, setFirstTap] = useState(null);
  const [coachMsg, setCoachMsg] = useState('');
  const [wrongTaps, setWrongTaps] = useState(0);
  const [complete, setComplete] = useState(false);
  const [labelMode, setLabelMode] = useState('numbers');
  const [homeOn, setHomeOn] = useState(true);
  const [bpm, setBpm] = useState(103);
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState(null); // 'half', 'notHalf', 'error'
  const voiceRef = useRef(null);

  /** User taps "Start Lesson" → warm audio context → set intro message */
  const handleStartLesson = useCallback(() => {
    warmAudioContext();
    setLessonStarted(true);
    // Preload likely voice lines into cache
    preloadTTS([
      COACH_MESSAGES.intro,
      COACH_MESSAGES.halfStep,
      COACH_MESSAGES.notHalf,
      COACH_MESSAGES.complete,
    ]);
    setTimeout(() => {
      setCoachMsg(COACH_MESSAGES.intro);
    }, 300);
  }, []);

  const currentRound = ROUNDS[roundIdx];

  const handleKeyTap = useCallback((key) => {
    if (complete) return;

    if (tapState === 'first') {
      // Expecting first tap
      if (key.degree === currentRound.pair[0]) {
        // Correct first tap
        setFirstTap(key.degree);
        setTapState('second');
        const secondDeg = currentRound.pair[1];
        setCoachMsg(COACH_MESSAGES.tapSecond(secondDeg));
      } else {
        // Wrong first tap
        setWrongTaps(prev => prev + 1);
        setCoachMsg(COACH_MESSAGES.wrongFirst(currentRound.pair[0]));
      }
    } else {
      // tapState === 'second', expecting second tap
      if (key.degree === currentRound.pair[1]) {
        // Correct second tap
        setFeedbackType(currentRound.isHalf ? 'half' : 'notHalf');
        setShowFeedback(true);
        setCoachMsg(
          currentRound.isHalf
            ? COACH_MESSAGES.halfStep
            : COACH_MESSAGES.notHalf
        );

        // Advance to next round after 900ms
        setTimeout(() => {
          setShowFeedback(false);
          if (roundIdx + 1 >= ROUNDS.length) {
            // All rounds done
            setComplete(true);
            setCoachMsg(COACH_MESSAGES.complete);
            if (onComplete) {
              onComplete({
                concept_id: 'T_HALF_STEP',
                chapter: 'play_it',
                result: 'complete',
                success_summary: 'executed half steps when called',
                rounds_completed: ROUNDS.length,
                wrong_taps: wrongTaps,
                attempt_count: roundIdx + 1
              });
            }
          } else {
            // Go to next round
            setRoundIdx(prev => prev + 1);
            setTapState('first');
            setFirstTap(null);
            setCoachMsg('');
          }
        }, 900);
      } else {
        // Wrong second tap
        setWrongTaps(prev => prev + 1);
        setCoachMsg(COACH_MESSAGES.wrongSecond(currentRound.pair[1]));
      }
    }
  }, [tapState, firstTap, roundIdx, complete, currentRound, wrongTaps, onComplete]);

  const getWhiteKeyStyle = (key) => {
    const base = { ...s.wk };
    if (key.degree === 1 && homeOn) Object.assign(base, s.wkHome);
    if (tapState === 'first' && key.degree === currentRound.pair[0]) return { ...base, ...s.wkTarget };
    if (tapState === 'second' && key.degree === currentRound.pair[1]) return { ...base, ...s.wkTarget };
    if (tapState === 'second' && key.degree === firstTap) return { ...base, ...s.wkDone };
    return base;
  };

  return (
    <div style={s.page}>
      <style>{`
        @keyframes floatBadge {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>

      {/* ── Start Lesson Splash ── */}
      {!lessonStarted && (
        <div style={s.splash}>
          <div style={s.splashCard}>
            <div style={s.splashAvatarWrap}>
              <img src="/Motesart%20Avatar%201.PNG" alt="Motesart" style={s.splashAvatar} />
            </div>
            <div style={s.splashName}>MOTESART</div>
            <div style={s.splashTitle}>The Half Step</div>
            <div style={s.splashSub}>Name the closest distance</div>
            <button style={s.splashBtn} onClick={handleStartLesson}>
              Start Lesson
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={s.header}>
        <span style={s.backArrow}>{'\u2190'}</span>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={s.headerTitle}>THE HALF STEP</div>
          <div style={s.headerSub}>Name the closest distance</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {CHAPTER_TABS.map(t => (
          <div
            key={t.id}
            style={{ ...s.tab, ...(t.id === 'play_it' ? s.tabActive : {}) }}
            onClick={() => onChapterChange?.(t.id)}
          >{t.label}</div>
        ))}
      </div>

      {/* Coach Module with Voice */}
      <MotesartCoachCard
        message={coachMsg}
        homeKey="C"
        homeOn={homeOn}
        bpm={bpm}
        metronomeOn={metronomeOn}
        labelMode={labelMode}
        onLabelModeChange={setLabelMode}
        onHomeToggle={() => setHomeOn(!homeOn)}
        onBpmChange={setBpm}
        onMetronomeToggle={() => setMetronomeOn(!metronomeOn)}
        autoSpeak={true}
        voiceRef={voiceRef}
      />

      {/* Piano Section */}
      <div style={s.pianoSection}>
        {/* Current round callout card */}
        {!complete && lessonStarted && (
          <div style={s.calloutCard}>
            <div style={s.calloutLabel}>Current Round</div>
            <div style={s.calloutPair}>{currentRound.label}</div>
          </div>
        )}

        {/* Progress dots */}
        {lessonStarted && !complete && (
          <div style={s.progressDots}>
            {ROUNDS.map((_, idx) => {
              const isDone = idx < roundIdx;
              const isActive = idx === roundIdx;
              return (
                <div
                  key={idx}
                  style={{
                    ...s.dot,
                    ...(isDone ? s.dotDone : {}),
                    ...(isActive ? s.dotActive : {})
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Piano keys - clean, no wood frame */}
        <div style={s.pianoKeysArea}>
          <div style={s.whiteKeys}>
            {WHITE_KEYS.map((k) => (
              <div key={k.id} style={getWhiteKeyStyle(k)} onClick={() => handleKeyTap(k)}>
                <span style={{
                  ...s.noteLbl,
                  ...(labelMode === 'letters' ? s.noteLblPrimary : {}),
                  ...(labelMode === 'letters' && [currentRound.pair[0], currentRound.pair[1]].includes(k.degree) ? { color: '#7C3AED' } : {}),
                  ...(labelMode === 'letters' && k.degree === 1 && homeOn ? { color: '#D97706' } : {}),
                }}>{k.note}</span>
                <span style={{
                  ...s.degLbl,
                  ...(labelMode === 'numbers' ? {} : s.degLblSecondary),
                  ...([currentRound.pair[0], currentRound.pair[1]].includes(k.degree) ? { color: '#7C3AED' } : {}),
                  ...(k.degree === 1 && homeOn ? { color: '#D97706' } : {}),
                }}>{k.degree}</span>
              </div>
            ))}
          </div>

          {/* Black keys — percentage positioning */}
          {BLACK_KEYS.map(bk => (
            <div key={bk.id} style={{ ...s.bk, left: ((bk.afterWhiteIdx + 1) * 12.5 - 2) + '%' }} />
          ))}
        </div>

        {/* Feedback card */}
        {showFeedback && (
          <div style={{
            ...s.feedbackCard,
            ...(feedbackType === 'half' || feedbackType === 'notHalf' ? s.feedbackSuccess : s.feedbackError)
          }}>
            <div style={s.feedbackIcon}>
              {feedbackType === 'half' || feedbackType === 'notHalf' ? '✓' : '⚠'}
            </div>
            <div style={s.feedbackText}>
              {feedbackType === 'half'
                ? 'Half step! Right next to each other.'
                : feedbackType === 'notHalf'
                  ? 'Not a half step — wider distance.'
                  : 'Try again.'}
            </div>
          </div>
        )}

        {/* Completion card */}
        {complete && (
          <div style={s.completionCard}>
            <div style={s.completionIcon}>✓</div>
            <div style={s.completionMsg}>You executed half steps when called.</div>
            <div style={s.completionNext}>Your ear knows the sound now.</div>
          </div>
        )}

        {/* Wrong taps counter */}
        {lessonStarted && !complete && (
          <div style={s.counterLabel}>Wrong taps: {wrongTaps}</div>
        )}
      </div>
    </div>
  );
}

const s = {
  page: {
    fontFamily: "'DM Sans', system-ui, sans-serif",
    background: '#F6F4EF', color: '#1E293B',
    minHeight: '100vh', maxWidth: 960, margin: '0 auto', padding: '0 24px',
    position: 'relative',
  },

  // Start Lesson splash
  splash: {
    position: 'fixed', inset: 0, zIndex: 100,
    background: 'linear-gradient(180deg, #F6F4EF 0%, #EDE8DF 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  splashCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '36px 32px 40px', borderRadius: 20,
    background: '#FFFFFF', boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
    maxWidth: 320, width: '90%',
  },
  splashAvatarWrap: {
    width: 110, height: 110, borderRadius: '50%', overflow: 'hidden',
    background: 'linear-gradient(135deg, #F3F0FF, #E9DDFB)',
    border: '3px solid #8B5CF6',
    boxShadow: '0 4px 16px rgba(139,92,246,0.15)',
    marginBottom: 14,
  },
  splashAvatar: {
    width: '100%', height: '100%',
    objectFit: 'cover', objectPosition: 'center 10%',
  },
  splashName: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 10, fontWeight: 800, color: '#8B5CF6',
    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16,
  },
  splashTitle: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 22, fontWeight: 800, color: '#1E293B',
    letterSpacing: 0.5, marginBottom: 4,
  },
  splashSub: {
    fontSize: 13, color: '#94A3B8', fontWeight: 500, marginBottom: 28,
  },
  splashBtn: {
    padding: '14px 48px', fontSize: 15, fontWeight: 800,
    fontFamily: "'Outfit', sans-serif",
    color: '#FFFFFF', background: '#8B5CF6',
    border: 'none', borderRadius: 14, cursor: 'pointer',
    letterSpacing: 0.8,
    boxShadow: '0 4px 16px rgba(139,92,246,0.35)',
    transition: 'transform 0.1s',
  },

  // Header
  header: {
    background: '#FFFFFF', padding: '14px 20px 10px',
    textAlign: 'center', position: 'relative',
    borderBottom: '1px solid #EEEAE2',
    display: 'flex', alignItems: 'center',
  },
  backArrow: { fontSize: 18, color: '#94A3B8', cursor: 'pointer' },
  headerTitle: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 15, fontWeight: 800, color: '#1E293B',
    letterSpacing: 1, textTransform: 'uppercase',
  },
  headerSub: { fontSize: 11, color: '#94A3B8', marginTop: 2, fontWeight: 500 },

  // Tabs
  tabs: {
    display: 'flex', background: '#FFFFFF',
    borderBottom: '1px solid #EEEAE2',
  },
  tab: {
    flex: 1, textAlign: 'center',
    fontFamily: "'Outfit', sans-serif",
    fontSize: 10, fontWeight: 700,
    letterSpacing: 0.8, textTransform: 'uppercase',
    padding: '10px 4px 8px', color: '#C4BFB6',
    cursor: 'pointer', borderBottom: '2.5px solid transparent',
  },
  tabActive: { color: '#1E293B', borderBottomColor: '#8B5CF6' },

  // Piano section
  pianoSection: {
    background: '#F6F4EF', padding: '16px 14px 22px',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    borderTop: '1px solid #EEEAE2',
  },

  // Callout card
  calloutCard: {
    padding: '12px 16px', marginBottom: 12,
    background: '#FFFFFF', border: '1px solid #EEEAE2',
    borderRadius: 12, textAlign: 'center', width: '90%',
  },
  calloutLabel: {
    fontSize: 10, fontWeight: 700, color: '#94A3B8',
    fontFamily: "'Outfit', sans-serif",
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4,
  },
  calloutPair: {
    fontSize: 14, fontWeight: 700, color: '#7C3AED',
  },

  // Progress dots
  progressDots: {
    display: 'flex', gap: 8, marginBottom: 12, justifyContent: 'center',
  },
  dot: {
    width: 10, height: 10, borderRadius: '50%',
    background: '#E5E1D8', transition: 'all 0.2s',
  },
  dotActive: {
    background: 'transparent', border: '2px solid #8B5CF6',
    width: 12, height: 12,
  },
  dotDone: {
    background: '#16A34A',
  },

  // Piano keys area — wood frame
  pianoKeysArea: {
    position: 'relative', display: 'inline-flex',
    background: 'linear-gradient(180deg, #5C4A3A 0%, #4A3828 40%, #3D2E20 100%)',
    padding: '8px 8px 10px',
    borderRadius: '6px 6px 12px 12px',
    boxShadow: '0 6px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)',
    width: '100%', maxWidth: 860,
  },
  whiteKeys: { display: 'flex', gap: 2, width: '100%' },

  // White key base — flex fills width
  wk: {
    flex: 1, height: 200, borderTop: 'none',
    borderRadius: '0 0 8px 8px', cursor: 'pointer',
    position: 'relative', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 14,
    background: 'linear-gradient(180deg, #FFFFFF 0%, #FCFCFA 25%, #F7F5F0 60%, #F0EDE5 100%)',
    border: '1px solid #D8D2C6',
    boxShadow: 'inset 0 -12px 18px rgba(200,191,176,0.15), inset 0 1px 0 rgba(255,255,255,1), 0 2px 4px rgba(0,0,0,0.04)',
    transition: 'all 0.06s',
  },
  wkTarget: {
    background: 'linear-gradient(180deg, #FAF8FF 0%, #F3EFFE 25%, #EAE3FA 60%, #E0D6F5 100%)',
    borderColor: 'rgba(139,92,246,0.3)',
    boxShadow: '0 0 12px rgba(139,92,246,0.15), inset 0 -12px 18px rgba(139,92,246,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
  },
  wkDone: {
    background: 'linear-gradient(180deg, #F0FDF4 0%, #DCFCE7 50%, #BBF7D0 100%)',
    borderColor: '#16A34A',
    boxShadow: '0 0 12px rgba(22,163,74,0.15)',
  },
  wkHome: {
    background: 'linear-gradient(180deg, #FFFDF6 0%, #FDF8EA 30%, #FAF2DA 100%)',
    borderColor: 'rgba(217,119,6,0.25)',
  },

  // Key labels — scaled for desktop
  degLbl: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 24, fontWeight: 800, color: '#78716C',
    transition: 'all 0.15s',
  },
  degLblSecondary: { opacity: 0.3, fontSize: 12 },
  noteLbl: {
    fontSize: 12, color: '#B0A99E', fontWeight: 600,
    letterSpacing: 0.3, marginBottom: 3,
    transition: 'all 0.15s',
  },
  noteLblPrimary: { fontSize: 20, fontWeight: 800, color: '#78716C' },

  // Black keys — percentage width/positioning
  bk: {
    position: 'absolute', width: '10%', height: 120, top: 0,
    background: 'linear-gradient(180deg, #0F0F12 0%, #1A1A1F 40%, #252530 80%, #30303C 100%)',
    borderRadius: '0 0 5px 5px', zIndex: 2, cursor: 'pointer',
    boxShadow: '0 3px 8px rgba(0,0,0,0.35), inset 0 -3px 6px rgba(50,50,60,0.4), inset 0 1px 0 rgba(70,70,80,0.15)',
  },

  // Feedback card
  feedbackCard: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 16px', marginTop: 14, borderRadius: 12,
    maxWidth: 300,
  },
  feedbackSuccess: {
    background: '#F0FDF4', border: '1px solid #BBF7D0',
  },
  feedbackError: {
    background: '#FEF2F2', border: '1px solid #FECACA',
  },
  feedbackIcon: {
    fontSize: 18, fontWeight: 800, color: '#16A34A',
    flexShrink: 0,
  },
  feedbackText: {
    fontSize: 12, fontWeight: 500, color: '#16A34A', lineHeight: 1.4,
  },

  // Completion card
  completionCard: {
    textAlign: 'center', padding: '20px 16px', marginTop: 14,
    background: '#FFFFFF', border: '2px solid #16A34A', borderRadius: 12,
  },
  completionIcon: { fontSize: 32, fontWeight: 800, color: '#16A34A', marginBottom: 8 },
  completionMsg: { fontSize: 14, fontWeight: 700, color: '#16A34A', marginBottom: 4 },
  completionNext: { fontSize: 12, color: '#94A3B8' },

  // Counter
  counterLabel: {
    textAlign: 'center', fontSize: 11, color: '#C4BFB6',
    marginTop: 8, fontWeight: 500,
  },
};
