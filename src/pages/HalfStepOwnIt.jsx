/**
 * HalfStepOwnIt.jsx — T_HALF_STEP Own It Chapter
 *
 * Warm studio design matching HalfStepFindIt with:
 * - Coach QUIET and MUTED (no visible controls)
 * - Piano keys completely CLEAN (no labels at all)
 * - Minimal feedback: just ✓ or ✗ symbols
 * - Game logic PRESERVED: 6-round challenges, 2-tap flow, PASSES_NEEDED = 2
 */
import React, { useState, useCallback, useRef } from 'react';
import MotesartCoachCard from '../components/MotesartCoachCard.jsx';

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
  } catch (_) {}
}

const WHITE_KEYS = [
  { id: 'C', note: 'C', degree: 1 },
  { id: 'D', note: 'D', degree: 2 },
  { id: 'E', note: 'E', degree: 3 },
  { id: 'F', note: 'F', degree: 4 },
  { id: 'G', note: 'G', degree: 5 },
  { id: 'A', note: 'A', degree: 6 },
  { id: 'B', note: 'B', degree: 7 },
  { id: 'C2', note: 'C', degree: 8 }
];

const BLACK_KEYS = [
  { id: 'Cs', afterWhiteIdx: 0 },
  { id: 'Ds', afterWhiteIdx: 1 },
  { id: 'Fs', afterWhiteIdx: 3 },
  { id: 'Gs', afterWhiteIdx: 4 },
  { id: 'As', afterWhiteIdx: 5 }
];

const CHALLENGES = [
  { pair: [3, 4], label: 'Play 3 \u2192 4', isHalf: true },
  { pair: [7, 8], label: 'Play 7 \u2192 8', isHalf: true },
  { pair: [1, 2], label: 'Play 1 \u2192 2', isHalf: false },
  { pair: [5, 6], label: 'Play 5 \u2192 6', isHalf: false },
  { pair: [3, 4], label: 'Play 3 \u2192 4', isHalf: true },
  { pair: [7, 8], label: 'Play 7 \u2192 8', isHalf: true }
];

const PASSES_NEEDED = 2;

const COACH_MESSAGES = {
  intro: 'No labels. No hints. Just you and the keys. Show me you know where they are.',
  complete: 'You feel where the half steps are. The name matches what you already knew.'
};

const CHAPTER_TABS = [
  { id: 'find_it', label: 'Find It' },
  { id: 'play_it', label: 'Play It' },
  { id: 'move_it', label: 'Name It' },
  { id: 'own_it', label: 'Own It' },
];

export default function HalfStepOwnIt({ onComplete, currentChapter, onChapterChange }) {
  const [lessonStarted, setLessonStarted] = useState(false);
  const [pass, setPass] = useState(0);
  const [round, setRound] = useState(0);
  const [tapState, setTapState] = useState('first');
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('');
  const [mistakes, setMistakes] = useState(0);
  const [hesitations, setHesitations] = useState(0);
  const [complete, setComplete] = useState(false);
  const [coachMsg, setCoachMsg] = useState('');
  const [labelMode, setLabelMode] = useState('numbers');
  const [homeOn, setHomeOn] = useState(true);
  const [bpm, setBpm] = useState(103);
  const [metronomeOn, setMetronomeOn] = useState(false);
  const voiceRef = useRef(null);

  const current = CHALLENGES[round];
  const targetFirst = current ? current.pair[0] : null;
  const targetSecond = current ? current.pair[1] : null;

  const handleStartLesson = useCallback(() => {
    warmAudioContext();
    setLessonStarted(true);
    setTimeout(() => {
      setCoachMsg(COACH_MESSAGES.intro);
    }, 300);
  }, []);

  const handleKeyTap = useCallback((key) => {
    if (complete || !current || !lessonStarted) return;
    const degree = key.degree;

    if (tapState === 'first') {
      if (degree === targetFirst) {
        setTapState('second');
        setFeedback('');
      } else {
        setMistakes(prev => prev + 1);
        setFeedback('✗');
        setFeedbackType('wrong');
      }
    } else {
      if (degree === targetSecond) {
        setFeedback('✓');
        setFeedbackType('success');
        setTimeout(() => {
          const next = round + 1;
          if (next >= CHALLENGES.length) {
            const newPass = pass + 1;
            if (mistakes === 0) {
              setPass(newPass);
              if (newPass >= PASSES_NEEDED) {
                setComplete(true);
                setFeedback('');
                setCoachMsg(COACH_MESSAGES.complete);
                if (onComplete) {
                  onComplete({
                    concept_id: 'T_HALF_STEP',
                    chapter: 'own_it',
                    result: 'complete',
                    success_summary: 'performed half steps without visual cues',
                    hesitation_count: hesitations,
                    wrong_taps: mistakes,
                    feel_mode_stage: 'own_it',
                    visual_support_level: 'hidden'
                  });
                }
              } else {
                setRound(0);
                setTapState('first');
                setFeedback('');
                setFeedbackType('');
                setMistakes(0);
              }
            } else {
              setRound(0);
              setTapState('first');
              setFeedback('');
              setFeedbackType('');
              setMistakes(0);
            }
          } else {
            setRound(next);
            setTapState('first');
            setFeedback('');
            setFeedbackType('');
          }
        }, 600);
      } else {
        setMistakes(prev => prev + 1);
        setFeedback('✗');
        setFeedbackType('wrong');
      }
    }
  }, [round, tapState, targetFirst, targetSecond, current, complete, pass, mistakes, hesitations, lessonStarted, onComplete]);

  return (
    <div style={s.page}>
      <style>{`
        @keyframes floatBadge {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>

      {/* Start Lesson Splash */}
      {!lessonStarted && (
        <div style={s.splash}>
          <div style={s.splashCard}>
            <div style={s.splashAvatarWrap}>
              <img src="/Motesart%20Avatar%201.PNG" alt="Motesart" style={s.splashAvatar} />
            </div>
            <div style={s.splashName}>MOTESART</div>
            <div style={s.splashTitle}>Own It</div>
            <div style={s.splashSub}>No labels. Just you and the keys.</div>
            <button style={s.splashBtn} onClick={handleStartLesson}>
              Start Lesson
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={s.header}>
        <span style={s.backArrow}>←</span>
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
            style={{ ...s.tab, ...(t.id === 'own_it' ? s.tabActive : {}) }}
            onClick={() => onChapterChange?.(t.id)}
          >{t.label}</div>
        ))}
      </div>

      {/* Coach Module — QUIET + MUTED */}
      <MotesartCoachCard
        message={coachMsg}
        quiet={true}
        muted={true}
        homeKey="C"
        homeOn={homeOn}
        bpm={bpm}
        metronomeOn={metronomeOn}
        labelMode={labelMode}
        onLabelModeChange={setLabelMode}
        onHomeToggle={() => setHomeOn(!homeOn)}
        onBpmChange={setBpm}
        onMetronomeToggle={() => setMetronomeOn(!metronomeOn)}
        autoSpeak={false}
        voiceRef={voiceRef}
      />

      {/* Scroll area */}
      <div style={s.scrollArea}>
        {/* Callout — shows label but NO half-step hint */}
        {!complete && current && (
          <div style={s.callout}>
            <div style={s.calloutPair}>{current.label}</div>
          </div>
        )}

        {/* Pass counter */}
        <div style={s.passCounter}>
          <div style={s.passDots}>
            {Array.from({ length: PASSES_NEEDED }).map((_, i) => (
              <div key={i} style={i < pass ? s.passDotFilled : s.passDot} />
            ))}
          </div>
          <div style={s.passLabel}>{pass} of {PASSES_NEEDED} clean passes</div>
        </div>

        {/* Piano keyboard — COMPLETELY CLEAN, NO LABELS */}
        <div style={s.pianoKeysArea}>
          <div style={s.whiteKeys}>
            {WHITE_KEYS.map(k => (
              <div key={k.id} style={s.wk} onClick={() => handleKeyTap(k)} />
            ))}
          </div>
          {BLACK_KEYS.map(bk => (
            <div key={bk.id} style={{ ...s.bk, left: ((bk.afterWhiteIdx + 1) * 12.5 - 2) + '%' }} />
          ))}
        </div>

        {/* Minimal feedback — just symbols */}
        {feedback && (
          <div style={feedbackType === 'success' ? s.feedbackSuccess : s.feedbackWrong}>
            {feedback}
          </div>
        )}

        {/* Completion card */}
        {complete && (
          <div style={s.completion}>
            <div style={s.completionIcon}>✦</div>
            <div style={s.completionMsg}>You feel where the half steps are.</div>
            <div style={s.completionNext}>The name matches what you already knew.</div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page: {
    fontFamily: "'DM Sans', system-ui, sans-serif",
    background: '#F6F4EF',
    color: '#1E293B',
    minHeight: '100vh',
    maxWidth: 960,
    margin: '0 auto',
    padding: '0 24px',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column'
  },

  // Start Lesson splash
  splash: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    background: 'linear-gradient(180deg, #F6F4EF 0%, #EDE8DF 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  splashCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '36px 32px 40px',
    borderRadius: 20,
    background: '#FFFFFF',
    boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
    maxWidth: 320,
    width: '90%'
  },
  splashAvatarWrap: {
    width: 110,
    height: 110,
    borderRadius: '50%',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, #F3F0FF, #E9DDFB)',
    border: '3px solid #8B5CF6',
    boxShadow: '0 4px 16px rgba(139,92,246,0.15)',
    marginBottom: 14
  },
  splashAvatar: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center 10%'
  },
  splashName: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 10,
    fontWeight: 800,
    color: '#8B5CF6',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 16
  },
  splashTitle: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 22,
    fontWeight: 800,
    color: '#1E293B',
    letterSpacing: 0.5,
    marginBottom: 4
  },
  splashSub: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: 500,
    marginBottom: 28
  },
  splashBtn: {
    padding: '14px 48px',
    fontSize: 15,
    fontWeight: 800,
    fontFamily: "'Outfit', sans-serif",
    color: '#FFFFFF',
    background: '#8B5CF6',
    border: 'none',
    borderRadius: 14,
    cursor: 'pointer',
    letterSpacing: 0.8,
    boxShadow: '0 4px 16px rgba(139,92,246,0.35)',
    transition: 'transform 0.1s'
  },

  // Header
  header: {
    background: '#FFFFFF',
    padding: '14px 20px 10px',
    textAlign: 'center',
    position: 'relative',
    borderBottom: '1px solid #EEEAE2',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0
  },
  backArrow: {
    fontSize: 18,
    color: '#94A3B8',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    marginRight: 16,
    marginLeft: -8
  },
  headerTitle: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 15,
    fontWeight: 800,
    color: '#1E293B',
    letterSpacing: 1,
    textTransform: 'uppercase'
  },
  headerSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: 500
  },

  // Tabs
  tabs: {
    display: 'flex',
    background: '#FFFFFF',
    borderBottom: '1px solid #EEEAE2',
    flexShrink: 0
  },
  tab: {
    flex: 1,
    textAlign: 'center',
    fontFamily: "'Outfit', sans-serif",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    padding: '10px 4px 8px',
    color: '#C4BFB6',
    cursor: 'pointer',
    borderBottom: '2.5px solid transparent',
    transition: 'all 0.15s'
  },
  tabActive: {
    color: '#1E293B',
    borderBottomColor: '#8B5CF6'
  },

  // Scroll area
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 14px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },

  // Callout card
  callout: {
    textAlign: 'center',
    background: '#FFFFFF',
    border: '1px solid #EEEAE2',
    borderRadius: 12,
    padding: '18px 16px',
    marginBottom: 14,
    width: '100%'
  },
  calloutPair: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1E293B'
  },

  // Pass counter
  passCounter: {
    textAlign: 'center',
    marginBottom: 14,
    width: '100%'
  },
  passDots: {
    display: 'flex',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 4
  },
  passDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: 'transparent',
    border: '1.5px solid #C4BFB6'
  },
  passDotFilled: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#16A34A'
  },
  passLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: 500
  },

  // Piano keys area — wood frame, CLEAN, NO LABELS
  pianoKeysArea: {
    position: 'relative',
    display: 'inline-flex',
    background: 'linear-gradient(180deg, #5C4A3A 0%, #4A3828 40%, #3D2E20 100%)',
    padding: '8px 8px 10px',
    borderRadius: '6px 6px 12px 12px',
    boxShadow: '0 6px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)',
    width: '100%', maxWidth: 860,
    marginBottom: 12
  },
  whiteKeys: {
    display: 'flex',
    gap: 2,
    width: '100%'
  },

  // White key — plain, no labels, no degree numbers — flex fills width
  wk: {
    flex: 1,
    height: 200,
    borderTop: 'none',
    borderRadius: '0 0 8px 8px',
    cursor: 'pointer',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 14,
    background: 'linear-gradient(180deg, #FFFFFF 0%, #FCFCFA 25%, #F7F5F0 60%, #F0EDE5 100%)',
    border: '1px solid #D8D2C6',
    boxShadow: 'inset 0 -12px 18px rgba(200,191,176,0.15), inset 0 1px 0 rgba(255,255,255,1), 0 2px 4px rgba(0,0,0,0.04)',
    transition: 'all 0.06s'
  },

  // Black keys — percentage width/positioning
  bk: {
    position: 'absolute',
    width: '10%',
    height: 120,
    background: 'linear-gradient(180deg, #0F0F12 0%, #1A1A1F 40%, #252530 80%, #30303C 100%)',
    borderRadius: '0 0 5px 5px',
    zIndex: 2,
    cursor: 'pointer',
    boxShadow: '0 3px 8px rgba(0,0,0,0.35), inset 0 -3px 6px rgba(50,50,60,0.4), inset 0 1px 0 rgba(70,70,80,0.15)',
    top: 0
  },

  // Minimal feedback symbols
  feedbackSuccess: {
    textAlign: 'center',
    padding: '6px',
    fontSize: 32,
    color: '#16A34A',
    marginBottom: 8,
    fontWeight: 700
  },
  feedbackWrong: {
    textAlign: 'center',
    padding: '6px',
    fontSize: 32,
    color: '#EF4444',
    marginBottom: 8,
    fontWeight: 700
  },

  // Completion card
  completion: {
    textAlign: 'center',
    padding: '24px 16px',
    marginTop: 12,
    background: '#FFFFFF',
    border: '1px solid #BBF7D0',
    borderRadius: 12,
    width: '100%'
  },
  completionIcon: {
    fontSize: 28,
    marginBottom: 6,
    color: '#16A34A'
  },
  completionMsg: {
    fontSize: 14,
    fontWeight: 700,
    color: '#16A34A',
    marginBottom: 4
  },
  completionNext: {
    fontSize: 12,
    color: '#94A3B8'
  }
};
