/**
 * HalfStepMoveIt.jsx — T_HALF_STEP Move It Chapter
 *
 * Warm studio design matching HalfStepFindIt with:
 * - MotesartCoachCard (live typing + ElevenLabs voice)
 * - Clean piano with warm white key gradients
 * - Home selector pills (amber active, green done, gray pending)
 * - Game logic: find 2 half-step pairs in each of 3 homes (C, G, F)
 *
 * Preserves ALL game logic:
 * - 3 HOMES with keys and blacks arrays
 * - Two-tap flow: tap first → tap second → check if half step
 * - Track foundPairs per home, auto-advance when complete
 * - 3→4 and 7→8 are the target pairs
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

const HOMES = {
  C: {
    label: 'C', keys: [
      { id: 'C', note: 'C', degree: 1 }, { id: 'D', note: 'D', degree: 2 },
      { id: 'E', note: 'E', degree: 3 }, { id: 'F', note: 'F', degree: 4 },
      { id: 'G', note: 'G', degree: 5 }, { id: 'A', note: 'A', degree: 6 },
      { id: 'B', note: 'B', degree: 7 }, { id: 'C2', note: 'C', degree: 8 }
    ],
    blacks: [
      { id: 'Cs', afterWhiteIdx: 0 }, { id: 'Ds', afterWhiteIdx: 1 },
      { id: 'Fs', afterWhiteIdx: 3 }, { id: 'Gs', afterWhiteIdx: 4 },
      { id: 'As', afterWhiteIdx: 5 }
    ]
  },
  G: {
    label: 'G', keys: [
      { id: 'G', note: 'G', degree: 1 }, { id: 'A', note: 'A', degree: 2 },
      { id: 'B', note: 'B', degree: 3 }, { id: 'C', note: 'C', degree: 4 },
      { id: 'D', note: 'D', degree: 5 }, { id: 'E', note: 'E', degree: 6 },
      { id: 'Fs', note: 'F♯', degree: 7 }, { id: 'G2', note: 'G', degree: 8 }
    ],
    blacks: [
      { id: 'Gs', afterWhiteIdx: 0 }, { id: 'As', afterWhiteIdx: 1 },
      { id: 'Cs', afterWhiteIdx: 3 }, { id: 'Ds', afterWhiteIdx: 4 },
      { id: 'Es', afterWhiteIdx: 5 }
    ]
  },
  F: {
    label: 'F', keys: [
      { id: 'F', note: 'F', degree: 1 }, { id: 'G', note: 'G', degree: 2 },
      { id: 'A', note: 'A', degree: 3 }, { id: 'Bb', note: 'B♭', degree: 4 },
      { id: 'C', note: 'C', degree: 5 }, { id: 'D', note: 'D', degree: 6 },
      { id: 'E', note: 'E', degree: 7 }, { id: 'F2', note: 'F', degree: 8 }
    ],
    blacks: [
      { id: 'Fs', afterWhiteIdx: 0 }, { id: 'Gs', afterWhiteIdx: 1 },
      { id: 'Bs', afterWhiteIdx: 3 }, { id: 'Cs', afterWhiteIdx: 4 },
      { id: 'Ds', afterWhiteIdx: 5 }
    ]
  }
};
const HOME_ORDER = ['C', 'G', 'F'];

const COACH_MESSAGES = {
  intro: "New home, same half steps. 3 and 4 are always together — find them in each key.",
  tapSecond: "Now tap the second note.",
  foundPair: (home) => `✓ Half step in ${home}! Find the other pair.`,
  homeComplete: (home) => `Both half steps found in ${home}. Moving to the next home.`,
  wrongPair: "Not a half step — try 3→4 or 7→8.",
  complete: "You transferred the half steps to every home. The pattern is the same everywhere."
};

const CHAPTER_TABS = [
  { id: 'find_it', label: 'Find It' },
  { id: 'play_it', label: 'Play It' },
  { id: 'move_it', label: 'Name It' },
  { id: 'own_it', label: 'Own It' },
];

export default function HalfStepMoveIt({ onComplete, currentChapter, onChapterChange }) {
  const [lessonStarted, setLessonStarted] = useState(false);
  const [homeIdx, setHomeIdx] = useState(0);
  const [foundPairs, setFoundPairs] = useState([]);
  const [lastTap, setLastTap] = useState(null);
  const [coachMsg, setCoachMsg] = useState('');
  const [completedHomes, setCompletedHomes] = useState([]);
  const [complete, setComplete] = useState(false);
  const [wrongTaps, setWrongTaps] = useState(0);
  const [labelMode, setLabelMode] = useState('numbers');
  const [homeOn, setHomeOn] = useState(true);
  const [bpm, setBpm] = useState(103);
  const [metronomeOn, setMetronomeOn] = useState(false);
  const voiceRef = useRef(null);

  const currentHome = HOMES[HOME_ORDER[homeIdx]];
  const isHalfStepKey = (d) => [3, 4, 7, 8].includes(d);
  const isInFound = (d) => foundPairs.some(p => p.includes(d));

  /** User taps "Start Lesson" → warm audio context → set intro message */
  const handleStartLesson = useCallback(() => {
    warmAudioContext();
    setLessonStarted(true);
    // Preload likely voice lines into cache
    preloadTTS([
      COACH_MESSAGES.intro,
      COACH_MESSAGES.tapSecond,
      COACH_MESSAGES.wrongPair,
      COACH_MESSAGES.complete,
    ]);
    setTimeout(() => {
      setCoachMsg(COACH_MESSAGES.intro);
    }, 300);
  }, []);

  const handleKeyTap = useCallback((key) => {
    if (complete) return;
    const degree = key.degree;

    if (lastTap !== null) {
      const pair = [lastTap, degree].sort((a, b) => a - b);
      const isHS = (pair[0] === 3 && pair[1] === 4) || (pair[0] === 7 && pair[1] === 8);
      if (isHS && !foundPairs.find(f => f[0] === pair[0] && f[1] === pair[1])) {
        const newFound = [...foundPairs, pair];
        setFoundPairs(newFound);
        setCoachMsg(COACH_MESSAGES.foundPair(currentHome.label));
        if (newFound.length >= 2) {
          const newCompleted = [...completedHomes, HOME_ORDER[homeIdx]];
          setCompletedHomes(newCompleted);
          if (homeIdx + 1 >= HOME_ORDER.length) {
            setComplete(true);
            setCoachMsg(COACH_MESSAGES.complete);
            if (onComplete) {
              onComplete({
                concept_id: 'T_HALF_STEP', chapter: 'move_it', result: 'complete',
                success_summary: 'transferred half steps to all homes',
                wrong_taps: wrongTaps, home_key: HOME_ORDER.join(',')
              });
            }
          } else {
            setTimeout(() => {
              setHomeIdx(homeIdx + 1);
              setFoundPairs([]);
              setLastTap(null);
              setCoachMsg(COACH_MESSAGES.intro);
            }, 1000);
          }
        }
      } else if (!isHS) {
        setWrongTaps(prev => prev + 1);
        setCoachMsg(COACH_MESSAGES.wrongPair);
      }
      setLastTap(null);
    } else {
      setLastTap(degree);
      setCoachMsg(COACH_MESSAGES.tapSecond);
    }
  }, [lastTap, foundPairs, homeIdx, completedHomes, complete, currentHome, wrongTaps, onComplete]);

  const getWhiteKeyStyle = (key) => {
    const base = { ...s.wk };
    if (key.degree === 1 && homeOn) Object.assign(base, s.wkHome);
    if (isInFound(key.degree)) return { ...base, ...s.wkFound };
    if (isHalfStepKey(key.degree) && foundPairs.length === 0) return { ...base, ...s.wkHs };
    if (lastTap === key.degree) return { ...base, ...s.wkActive };
    return base;
  };

  if (!lessonStarted) {
    return (
      <div style={s.page}>
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
      </div>
    );
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <span style={s.backArrow}>{'←'}</span>
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
            style={{ ...s.tab, ...(t.id === 'move_it' ? s.tabActive : {}) }}
            onClick={() => onChapterChange?.(t.id)}
          >{t.label}</div>
        ))}
      </div>

      {/* Coach Module with Voice */}
      <MotesartCoachCard
        message={coachMsg}
        homeKey={currentHome.label}
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

      {/* Home selector pills */}
      <div style={s.homePills}>
        {HOME_ORDER.map((h, i) => (
          <div key={h} style={
            completedHomes.includes(h) ? s.pillDone :
            i === homeIdx ? s.pillActive : s.pill
          }>
            {h}{completedHomes.includes(h) ? ' ✓' : ''}
          </div>
        ))}
      </div>

      {/* Instruction */}
      <div style={s.instruction}>
        Find and play the half-step pairs in {currentHome.label}
      </div>

      {/* Piano Section */}
      <div style={s.pianoSection}>
        {/* Piano keys - clean, no wood frame */}
        <div style={s.pianoKeysArea}>
          <div style={s.whiteKeys}>
            {currentHome.keys.map((k) => (
              <div key={k.id} style={getWhiteKeyStyle(k)} onClick={() => handleKeyTap(k)}>
                {isInFound(k.degree) && (
                  <span style={s.foundCheck}>{'✓'}</span>
                )}
                <span style={{
                  ...s.noteLbl,
                  ...(labelMode === 'letters' ? s.noteLblPrimary : {}),
                  ...(labelMode === 'letters' && isHalfStepKey(k.degree) ? { color: '#7C3AED' } : {}),
                  ...(labelMode === 'letters' && k.degree === 1 && homeOn ? { color: '#D97706' } : {}),
                }}>{k.note}</span>
                <span style={{
                  ...s.degLbl,
                  ...(labelMode === 'numbers' ? {} : s.degLblSecondary),
                  ...(isHalfStepKey(k.degree) ? { color: '#7C3AED' } : {}),
                  ...(k.degree === 1 && homeOn ? { color: '#D97706' } : {}),
                }}>{k.degree}</span>
              </div>
            ))}
          </div>

          {/* Black keys */}
          {currentHome.blacks.map(bk => (
            <div key={bk.id} style={{ ...s.bk, left: ((bk.afterWhiteIdx + 1) * 12.5 - 2) + '%' }} />
          ))}
        </div>

        {/* Half step label */}
        <div style={s.hsLabel}>
          <span style={s.hsLine} />
          <span style={s.hsTag}>
            {foundPairs.length >= 2 ? 'Both Half Steps Found ✓' : '3 and 4 — Half Step!'}
          </span>
          <span style={s.hsLine} />
        </div>

        {/* Completion */}
        {complete && (
          <div style={s.completion}>
            <div style={s.completionIcon}>{'✨'}</div>
            <div style={s.completionMsg}>You transferred the half steps to every home.</div>
            <div style={s.completionNext}>Next: prove it without support.</div>
          </div>
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
  backArrow: { fontSize: 18, color: '#94A3B8', cursor: 'pointer', background: 'none', border: 'none' },
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

  // Home selector pills
  homePills: { display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 12, paddingTop: 14, background: '#F6F4EF', paddingLeft: 16, paddingRight: 16 },
  pill: {
    padding: '6px 18px', fontSize: 13, fontWeight: 600, borderRadius: 16,
    background: '#FAFAF8', color: '#B0A99E', border: '1px solid #EEEAE2'
  },
  pillActive: {
    padding: '6px 18px', fontSize: 13, fontWeight: 600, borderRadius: 16,
    background: '#FEF9EE', color: '#D97706',
    border: '1px solid rgba(217,119,6,0.3)'
  },
  pillDone: {
    padding: '6px 18px', fontSize: 13, fontWeight: 600, borderRadius: 16,
    background: '#F0FDF4', color: '#16A34A',
    border: '1px solid rgba(22,163,74,0.3)'
  },

  // Instruction
  instruction: {
    textAlign: 'center', fontSize: 14, color: '#94A3B8', marginBottom: 14,
    paddingLeft: 16, paddingRight: 16, background: '#F6F4EF',
  },

  // Piano section
  pianoSection: {
    background: '#F6F4EF', padding: '12px 14px 22px',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },

  // Piano keys area — wood frame
  pianoKeysArea: {
    position: 'relative', display: 'inline-flex',
    background: 'linear-gradient(180deg, #5C4A3A 0%, #4A3828 40%, #3D2E20 100%)',
    padding: '8px 8px 10px',
    borderRadius: '6px 6px 12px 12px',
    boxShadow: '0 6px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)',
    width: '100%', maxWidth: 860, marginBottom: 12,
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
  wkHs: {
    background: 'linear-gradient(180deg, #FAF8FF 0%, #F3EFFE 25%, #EAE3FA 60%, #E0D6F5 100%)',
    borderColor: 'rgba(139,92,246,0.3)',
    boxShadow: '0 0 12px rgba(139,92,246,0.1), inset 0 -12px 18px rgba(139,92,246,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
  },
  wkHome: {
    background: 'linear-gradient(180deg, #FFFDF6 0%, #FDF8EA 30%, #FAF2DA 100%)',
    borderColor: 'rgba(217,119,6,0.25)',
  },
  wkFound: {
    background: 'linear-gradient(180deg, #F0FDF4 0%, #DCFCE7 50%, #BBF7D0 100%)',
    borderColor: '#16A34A',
    boxShadow: '0 0 12px rgba(22,163,74,0.15)',
  },
  wkActive: {
    background: 'linear-gradient(180deg, #F5F3FF 0%, #EDE9FE 50%, #DDD6FE 100%)',
    borderColor: '#8B5CF6',
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

  foundCheck: {
    position: 'absolute', top: 8, fontSize: 12, fontWeight: 700,
    color: '#16A34A',
  },

  // Black keys — percentage width/positioning
  bk: {
    position: 'absolute', width: '10%', height: 120, top: 0,
    background: 'linear-gradient(180deg, #0F0F12 0%, #1A1A1F 40%, #252530 80%, #30303C 100%)',
    borderRadius: '0 0 5px 5px', zIndex: 2, cursor: 'pointer',
    boxShadow: '0 3px 8px rgba(0,0,0,0.35), inset 0 -3px 6px rgba(50,50,60,0.4), inset 0 1px 0 rgba(70,70,80,0.15)',
  },

  // Half step label
  hsLabel: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 14,
  },
  hsLine: { height: 2, width: 28, background: '#C4B5FC', borderRadius: 1 },
  hsTag: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 13, fontWeight: 700, color: '#7C3AED',
    background: '#F5F3FF', padding: '5px 16px', borderRadius: 8,
    border: '1px solid #E9DDFB', whiteSpace: 'nowrap',
  },

  // Completion
  completion: {
    textAlign: 'center', padding: '20px 16px', marginTop: 14,
    background: '#FFFFFF', border: '1px solid #BBF7D0', borderRadius: 12,
  },
  completionIcon: { fontSize: 28, marginBottom: 6, color: '#16A34A' },
  completionMsg: { fontSize: 14, fontWeight: 700, color: '#16A34A', marginBottom: 4 },
  completionNext: { fontSize: 12, color: '#94A3B8' },
};
