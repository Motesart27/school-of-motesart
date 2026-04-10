/**
 * HalfStepFindIt.jsx — T_HALF_STEP Find It Chapter
 *
 * Warm studio dashboard with:
 * - MotesartCoachCard (live typing + ElevenLabs voice)
 * - Clean piano (no wood frame) with floating half-step connector
 * - # / ABC toggle, Home pill, BPM control
 * - Purple half-step highlights, amber home key
 */
import React, { useState, useCallback, useRef } from 'react';
import MotesartCoachCard from '../components/MotesartCoachCard.jsx';
import { preloadTTS } from '../services/ttsService.js';

/* ── Warm the Web Audio context on first user gesture ── */
let _audioCtxWarmed = false;
function warmAudioContext() {
  if (_audioCtxWarmed) return;
  _audioCtxWarmed = true;
  // Tell the voice hook that the user has interacted
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
  { id:'Cs', note:'C\u266f', afterWhiteIdx:0 },
  { id:'Ds', note:'D\u266f', afterWhiteIdx:1 },
  { id:'Fs', note:'F\u266f', afterWhiteIdx:3 },
  { id:'Gs', note:'G\u266f', afterWhiteIdx:4 },
  { id:'As', note:'A\u266f', afterWhiteIdx:5 }
];
const HALF_STEP_PAIRS = [
  { degrees:[3,4], names:['E','F'], label:'3 and 4' },
  { degrees:[7,8], names:['B','C'], label:'7 and 8' }
];

const COACH_MESSAGES = {
  intro: "Look, here are the closest notes: 3 and 4. That's E and F \u2014 together they make a half step.",
  tapFirst: "Now tap the second note of the pair.",
  found: (label) => `\u2713 ${label} \u2014 half step! Great ear.`,
  wrong: "Not a half step \u2014 try two notes right next to each other.",
  complete: "You located both half steps. That closeness has a name now.",
};

const CHAPTER_TABS = [
  { id: 'find_it', label: 'Find It' },
  { id: 'play_it', label: 'Play It' },
  { id: 'move_it', label: 'Name It' },
  { id: 'own_it', label: 'Own It' },
];

export default function HalfStepFindIt({ onComplete, currentChapter, onChapterChange }) {
  const [lessonStarted, setLessonStarted] = useState(false);
  const [taps, setTaps] = useState([]);
  const [foundPairs, setFoundPairs] = useState([]);
  const [lastTap, setLastTap] = useState(null);
  const [coachMsg, setCoachMsg] = useState('');
  const [hintUsed, setHintUsed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [complete, setComplete] = useState(false);
  const [wrongTaps, setWrongTaps] = useState(0);
  const [labelMode, setLabelMode] = useState('numbers');
  const [homeOn, setHomeOn] = useState(true);
  const [bpm, setBpm] = useState(103);
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [inputMode, setInputMode] = useState('listen'); // 'listen' or 'type'
  const [userMessage, setUserMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const voiceRef = useRef(null);

  /** User taps "Start Lesson" → warm audio context → set intro message */
  const handleStartLesson = useCallback(() => {
    warmAudioContext();
    setLessonStarted(true);
    // Preload likely voice lines into cache
    preloadTTS([
      COACH_MESSAGES.intro,
      COACH_MESSAGES.tapFirst,
      COACH_MESSAGES.wrong,
      COACH_MESSAGES.complete,
    ]);
    setTimeout(() => {
      setCoachMsg(COACH_MESSAGES.intro);
    }, 300);
  }, []);

  const isHalfStepKey = (degree) => [3,4,7,8].includes(degree);
  const isInFoundPair = (degree) => foundPairs.some(p => p.degrees.includes(degree));

  const handleKeyTap = useCallback((key) => {
    if (complete) return;
    const degree = key.degree;
    setTaps(prev => [...prev, degree]);

    if (lastTap !== null) {
      const pair = [lastTap, degree].sort((a,b) => a-b);
      const match = HALF_STEP_PAIRS.find(p =>
        p.degrees[0] === pair[0] && p.degrees[1] === pair[1]
      );
      if (match && !foundPairs.find(f => f.label === match.label)) {
        const newFound = [...foundPairs, match];
        setFoundPairs(newFound);
        setCoachMsg(COACH_MESSAGES.found(match.label));
        if (newFound.length === HALF_STEP_PAIRS.length) {
          setComplete(true);
          setCoachMsg(COACH_MESSAGES.complete);
          if (onComplete) {
            onComplete({
              concept_id: 'T_HALF_STEP', chapter: 'find_it', result: 'complete',
              success_summary: 'located half steps in the major scale',
              found_pairs: newFound.map(p => p.label),
              wrong_taps: wrongTaps, hint_used: hintUsed,
              attempt_count: taps.length + 1
            });
          }
        }
      } else if (!match) {
        setWrongTaps(prev => prev + 1);
        setCoachMsg(COACH_MESSAGES.wrong);
      }
      setLastTap(null);
    } else {
      setLastTap(degree);
      setCoachMsg(COACH_MESSAGES.tapFirst);
    }
  }, [lastTap, foundPairs, complete, taps, wrongTaps, hintUsed, onComplete]);

  const handleHint = () => {
    setHintUsed(true);
    setShowHint(true);
    setTimeout(() => setShowHint(false), 3000);
  };

  const getWhiteKeyStyle = (key) => {
    const base = { ...s.wk };
    if (key.degree === 1 && homeOn) Object.assign(base, s.wkHome);
    if (isInFoundPair(key.degree)) return { ...base, ...s.wkFound };
    if (showHint && isHalfStepKey(key.degree)) return { ...base, ...s.wkHs };
    if (isHalfStepKey(key.degree) && foundPairs.length === 0) return { ...base, ...s.wkHs };
    if (lastTap === key.degree) return { ...base, ...s.wkActive };
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
            style={{ ...s.tab, ...(t.id === 'find_it' ? s.tabActive : {}) }}
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

      {/* User Input Section — Listen or Type */}
      <div style={s.inputSection}>
        {/* Mode toggle */}
        <div style={s.modeToggle}>
          <button
            style={{ ...s.modeBtn, ...(inputMode === 'listen' ? s.modeBtnActive : {}) }}
            onClick={() => setInputMode('listen')}
          >
            {'\u266A'} Listen
          </button>
          <button
            style={{ ...s.modeBtn, ...(inputMode === 'type' ? s.modeBtnActive : {}) }}
            onClick={() => setInputMode('type')}
          >
            {'\u270E'} Type
          </button>
        </div>

        {/* Listen mode */}
        {inputMode === 'listen' && (
          <div style={s.listenArea}>
            <div style={s.listenIcon}>{'\u266B'}</div>
            <div style={s.listenText}>
              {voiceRef.current?.isSpeaking
                ? 'Motesart is speaking... listen closely.'
                : voiceRef.current?.isDone
                  ? 'Tap Replay above to hear it again, or tap a key.'
                  : 'Motesart will speak. Listen and follow along.'}
            </div>
          </div>
        )}

        {/* Type mode */}
        {inputMode === 'type' && (
          <div style={s.typeArea}>
            {/* Chat history */}
            {chatHistory.length > 0 && (
              <div style={s.chatHistory}>
                {chatHistory.map((msg, i) => (
                  <div key={i} style={msg.from === 'user' ? s.chatUser : s.chatMotesart}>
                    {msg.from === 'motesart' && <span style={s.chatAvatar}>M</span>}
                    <span style={s.chatMsg}>{msg.text}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={s.typeRow}>
              <input
                type="text"
                style={s.typeInput}
                placeholder="Type to Motesart..."
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && userMessage.trim()) {
                    const msg = userMessage.trim();
                    setChatHistory(prev => [...prev, { from: 'user', text: msg }]);
                    setUserMessage('');
                    // Motesart responds contextually
                    const responses = [
                      "Good question! The half step is the smallest distance between two notes.",
                      "That's right \u2014 3 and 4 are right next to each other with no black key between them.",
                      "Try tapping E then F on the piano. Hear how close they sound?",
                      "You're getting it! A half step means there's nothing in between.",
                      "Look at the piano \u2014 where there's no black key, that's a half step.",
                    ];
                    const response = responses[Math.floor(Math.random() * responses.length)];
                    setTimeout(() => {
                      setChatHistory(prev => [...prev, { from: 'motesart', text: response }]);
                      setCoachMsg(response);
                    }, 600);
                  }
                }}
              />
              <button
                style={s.sendBtn}
                onClick={() => {
                  if (userMessage.trim()) {
                    const msg = userMessage.trim();
                    setChatHistory(prev => [...prev, { from: 'user', text: msg }]);
                    setUserMessage('');
                    const responses = [
                      "Good question! The half step is the smallest distance between two notes.",
                      "That's right \u2014 3 and 4 are right next to each other with no black key between them.",
                      "Try tapping E then F on the piano. Hear how close they sound?",
                      "You're getting it! A half step means there's nothing in between.",
                      "Look at the piano \u2014 where there's no black key, that's a half step.",
                    ];
                    const response = responses[Math.floor(Math.random() * responses.length)];
                    setTimeout(() => {
                      setChatHistory(prev => [...prev, { from: 'motesart', text: response }]);
                      setCoachMsg(response);
                    }, 600);
                  }
                }}
              >{'\u2191'}</button>
            </div>
          </div>
        )}
      </div>

      {/* Piano Section */}
      <div style={s.pianoSection}>
        {/* Pair chips */}
        <div style={s.pairChips}>
          {HALF_STEP_PAIRS.map(p => {
            const found = foundPairs.find(f => f.label === p.label);
            return (
              <div key={p.label} style={found ? s.chipFound : s.chip}>
                <span style={s.chipDeg}>{p.label}</span>
                <span style={s.chipNames}>{p.names.join('\u2013')}</span>
                {found && <span style={{ color: '#16A34A', fontWeight: 700 }}>{'\u2713'}</span>}
              </div>
            );
          })}
        </div>

        {/* Piano keys - clean, no wood frame */}
        <div style={s.pianoKeysArea}>
          {/* Floating half-step connector over keys 3-4 */}
          {(foundPairs.length === 0 || showHint) && (
            <div style={s.hsConnector}>
              <div style={s.hsFloatBadge}>{'\u00BD'} step</div>
              <div style={s.hsBridge}>
                <div style={s.hsBridgeLine} />
              </div>
            </div>
          )}

          <div style={s.whiteKeys}>
            {WHITE_KEYS.map((k) => (
              <div key={k.id} style={getWhiteKeyStyle(k)} onClick={() => handleKeyTap(k)}>
                {isInFoundPair(k.degree) && (
                  <span style={s.foundCheck}>{'\u2713'}</span>
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

          {/* Black keys — percentage positioning */}
          {BLACK_KEYS.map(bk => (
            <div key={bk.id} style={{ ...s.bk, left: ((bk.afterWhiteIdx + 1) * 12.5 - 2) + '%' }} />
          ))}
        </div>

        {/* Half step label */}
        <div style={s.hsLabel}>
          <span style={s.hsLine} />
          <span style={s.hsTag}>
            {complete ? 'Both Half Steps Found \u2713' : '3 and 4 \u2014 Half Step!'}
          </span>
          <span style={s.hsLine} />
        </div>

        {/* Hint button */}
        {!complete && (
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <button style={s.hintBtn} onClick={handleHint}>
              {showHint ? 'Look at the purple keys' : 'Need a hint?'}
            </button>
          </div>
        )}

        {/* Tap counter */}
        <div style={s.tapCounter}>{taps.length} taps</div>

        {/* Completion */}
        {complete && (
          <div style={s.completion}>
            <div style={s.completionIcon}>{'\u2726'}</div>
            <div style={s.completionMsg}>You found the half steps.</div>
            <div style={s.completionNext}>Next: Play them when called.</div>
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

  // Piano section
  pianoSection: {
    background: '#F6F4EF', padding: '16px 14px 22px',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    borderTop: '1px solid #EEEAE2',
  },

  // Pair chips
  pairChips: { display: 'flex', gap: 8, marginBottom: 12 },
  chip: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '4px 12px', borderRadius: 10,
    background: '#FAFAF8', border: '1px solid #EEEAE2',
    fontSize: 11, color: '#94A3B8',
  },
  chipFound: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '4px 12px', borderRadius: 10,
    background: '#F0FDF4', border: '1px solid #BBF7D0',
    fontSize: 11, color: '#16A34A',
  },
  chipDeg: { fontWeight: 700, color: '#7C3AED' },
  chipNames: { fontSize: 10, color: '#B0A99E' },

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

  // Half-step floating connector — percentage-based with arc
  hsConnector: {
    position: 'absolute', zIndex: 4, pointerEvents: 'none',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    left: '24.5%', top: -34, width: '14.5%',
  },
  hsFloatBadge: {
    background: '#8B5CF6', color: '#fff',
    fontFamily: "'Outfit', sans-serif",
    fontSize: 10, fontWeight: 800,
    letterSpacing: 1, textTransform: 'uppercase',
    padding: '3px 10px', borderRadius: 6,
    boxShadow: '0 2px 8px rgba(139,92,246,0.3)',
    animation: 'floatBadge 2.5s ease-in-out infinite',
    marginBottom: 3, whiteSpace: 'nowrap',
  },
  hsBridge: {
    width: '100%', height: 28, position: 'relative',
  },
  hsBridgeLine: {
    position: 'absolute', top: 0, left: 6, right: 6,
    height: 2, background: '#8B5CF6', borderRadius: 1,
    boxShadow: '0 0 8px rgba(139,92,246,0.3)',
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

  // Hint button
  hintBtn: {
    padding: '6px 18px', fontSize: 11, fontWeight: 600,
    color: '#8B5CF6', background: '#F5F3FF',
    border: '1px solid #E9DDFB', borderRadius: 12,
    cursor: 'pointer',
  },

  tapCounter: {
    textAlign: 'center', fontSize: 10, color: '#C4BFB6',
    marginTop: 8, fontWeight: 500,
  },

  // Completion
  completion: {
    textAlign: 'center', padding: '20px 16px', marginTop: 14,
    background: '#FFFFFF', border: '1px solid #BBF7D0', borderRadius: 12,
  },
  completionIcon: { fontSize: 28, marginBottom: 6, color: '#16A34A' },
  completionMsg: { fontSize: 14, fontWeight: 700, color: '#16A34A', marginBottom: 4 },
  completionNext: { fontSize: 12, color: '#94A3B8' },

  // User input section
  inputSection: {
    background: '#FFFFFF', padding: '12px 16px 14px',
    borderTop: '1px solid #EEEAE2',
  },
  modeToggle: {
    display: 'flex', gap: 0, marginBottom: 10,
    borderRadius: 10, overflow: 'hidden',
    border: '1px solid #EEEAE2', alignSelf: 'center',
    width: 'fit-content', margin: '0 auto 10px',
  },
  modeBtn: {
    padding: '6px 18px', fontSize: 11, fontWeight: 700,
    fontFamily: "'Outfit', sans-serif",
    background: '#FAFAF8', color: '#C4BFB6',
    border: 'none', cursor: 'pointer',
    transition: 'all 0.15s', letterSpacing: 0.5,
  },
  modeBtnActive: {
    background: '#8B5CF6', color: '#FFFFFF',
  },

  // Listen mode
  listenArea: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 14px',
    background: '#F5F3FF', borderRadius: 10,
    border: '1px solid #E9DDFB',
  },
  listenIcon: {
    fontSize: 18, color: '#8B5CF6', flexShrink: 0,
  },
  listenText: {
    fontSize: 12, color: '#5B21B6', lineHeight: 1.4, fontWeight: 500,
  },

  // Type mode
  typeArea: {},
  chatHistory: {
    maxHeight: 120, overflowY: 'auto',
    marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 6,
  },
  chatUser: {
    display: 'flex', justifyContent: 'flex-end',
  },
  chatMotesart: {
    display: 'flex', alignItems: 'flex-start', gap: 6,
  },
  chatAvatar: {
    width: 20, height: 20, borderRadius: 6,
    background: '#8B5CF6', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 9, fontWeight: 800, flexShrink: 0,
    fontFamily: "'Outfit', sans-serif",
  },
  chatMsg: {
    fontSize: 12, lineHeight: 1.4, padding: '6px 10px',
    borderRadius: 10, maxWidth: '80%',
  },
  typeRow: {
    display: 'flex', gap: 6,
  },
  typeInput: {
    flex: 1, padding: '8px 12px', fontSize: 13,
    border: '1px solid #EEEAE2', borderRadius: 10,
    background: '#FAFAF8', color: '#1E293B',
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
  },
  sendBtn: {
    width: 34, height: 34, borderRadius: 10,
    background: '#8B5CF6', color: '#fff', border: 'none',
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
};
