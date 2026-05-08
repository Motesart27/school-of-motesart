import React, { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { replaceState, getStudentId } from '../lesson_engine/concept_state_store.js'
import AmbassadorBubble from '../components/AmbassadorBubble.jsx'

/**
 * FindItChapter.jsx
 * 
 * Vertical proof loop: T_MAJOR_SCALE_PATTERN > Find It > one real interaction.
 * 
 * Success = found E-F AND B-C (binary).
 * Writes one clean event payload + Concept_State update on completion.
 * Teacher view reads the same state — no parallel logic.
 * 
 * Language rules:
 *   "together" = student-facing main word
 *   "squeeze"  = T.A.M.i coaching flavor only
 */

const CONCEPT_ID = 'T_MAJOR_SCALE_PATTERN'
const API_BASE = 'https://motesart-converter.netlify.app'

// The two correct squeeze pairs (half steps in C major)
const CORRECT_PAIRS = [
  { keys: ['E', 'F'], label: 'E-F', degree: '3 and 4' },
  { keys: ['B', 'C2'], label: 'B-C', degree: '7 and 8' }
]

// All 8 scale keys in order
const SCALE_KEYS = [
  { note: 'C', degree: 1, id: 'C' },
  { note: 'D', degree: 2, id: 'D' },
  { note: 'E', degree: 3, id: 'E' },
  { note: 'F', degree: 4, id: 'F' },
  { note: 'G', degree: 5, id: 'G' },
  { note: 'A', degree: 6, id: 'A' },
  { note: 'B', degree: 7, id: 'B' },
  { note: 'C', degree: 8, id: 'C2' }
]

// SVG note positions for treble clef staff (C4 to C5)
const STAFF_NOTES = [
  { id: 'C', y: 90, squeeze: false },
  { id: 'D', y: 84, squeeze: false },
  { id: 'E', y: 78, squeeze: true },
  { id: 'F', y: 72, squeeze: true },
  { id: 'G', y: 66, squeeze: false },
  { id: 'A', y: 60, squeeze: false },
  { id: 'B', y: 54, squeeze: true },
  { id: 'C2', y: 48, squeeze: true }
]

const BEAT_CHIPS = [
  { text: '1 skip 1', type: 'skip' },
  { text: '2 skip 1', type: 'skip' },
  { text: '3 & 4 together', type: 'together' },
  { text: '4 skip 1', type: 'skip' },
  { text: '5 skip 1', type: 'skip' },
  { text: '6 skip 1', type: 'skip' },
  { text: '7 & 8 together', type: 'together' }
]

function generateEventId() {
  return 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9)
}

export default function FindItChapter() {
  const navigate = useNavigate()
  
  // Core state
  const [foundPairs, setFoundPairs] = useState([]) // ['E-F', 'B-C']
  const [wrongTaps, setWrongTaps] = useState([])
  const [attemptCount, setAttemptCount] = useState(0)
  const [hintUsed, setHintUsed] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [lastTap, setLastTap] = useState(null) // for pair detection
  const [keyStates, setKeyStates] = useState({}) // { E: 'found', A: 'wrong', ... }
  const [tamiMsg, setTamiMsg] = useState('Tap the keys where you think the notes are together. Look for pairs with no black key between them.')
  const [feedbackMsg, setFeedbackMsg] = useState(null)
  const [feedbackType, setFeedbackType] = useState('success')

  const completedRef = useRef(false)

  const handleKeyTap = useCallback((keyId) => {
    if (completedRef.current) return
    
    setAttemptCount(prev => prev + 1)

    // Check if this tap + lastTap forms a correct pair
    const prevTap = lastTap
    setLastTap(keyId)

    if (prevTap) {
      // Check both orderings
      const pairFound = CORRECT_PAIRS.find(p => {
        return (p.keys[0] === prevTap && p.keys[1] === keyId) ||
               (p.keys[0] === keyId && p.keys[1] === prevTap)
      })

      if (pairFound && !foundPairs.includes(pairFound.label)) {
        // Correct pair found
        const newFound = [...foundPairs, pairFound.label]
        setFoundPairs(newFound)
        setKeyStates(prev => ({
          ...prev,
          [pairFound.keys[0]]: 'found',
          [pairFound.keys[1]]: 'found'
        }))
        setFeedbackMsg(pairFound.degree + ' are together')
        setFeedbackType('success')
        setLastTap(null)

        if (newFound.length === 1) {
          setTamiMsg('You found the first squeeze! Now find the second pair where the notes are together.')
        }

        // Check if both found -> complete
        if (newFound.length === 2) {
          completedRef.current = true
          setCompleted(true)
          setTamiMsg('You located the together pairs. Next: play the pattern yourself.')
          setFeedbackMsg('Located! Both together pairs found.')
          setFeedbackType('success')
          
          // Write the event and state
          writeCompletionState(newFound, wrongTaps, attemptCount + 1, hintUsed)
        }
      } else if (!pairFound) {
        // Not a correct pair — check if either key is part of a found pair
        const isAlreadyFound = Object.entries(keyStates).some(
          ([k, v]) => v === 'found' && (k === keyId || k === prevTap)
        )
        if (!isAlreadyFound) {
          // Wrong tap
          if (!wrongTaps.includes(keyId) && !CORRECT_PAIRS.some(p => p.keys.includes(keyId) && foundPairs.includes(p.label))) {
            setWrongTaps(prev => [...prev, keyId])
            setKeyStates(prev => ({ ...prev, [keyId]: 'wrong' }))
          }
          if (prevTap && !wrongTaps.includes(prevTap) && !CORRECT_PAIRS.some(p => p.keys.includes(prevTap) && foundPairs.includes(p.label))) {
            setWrongTaps(prev => [...prev, prevTap])
            setKeyStates(prev => ({ ...prev, [prevTap]: 'wrong' }))
          }
          setFeedbackMsg('Not quite — those notes skip, they are not together')
          setFeedbackType('warn')
          setLastTap(null)
        }
      }
    }
  }, [lastTap, foundPairs, wrongTaps, attemptCount, hintUsed, keyStates])

  const handleHint = useCallback(() => {
    setHintUsed(true)
    if (foundPairs.length === 0) {
      setTamiMsg('Look at E and F on the keyboard. Do you see a black key between them? Tap them both.')
    } else if (foundPairs.length === 1 && !foundPairs.includes('B-C')) {
      setTamiMsg('Now look at B and C at the top. Are they together too? Tap them both.')
    } else if (foundPairs.length === 1 && !foundPairs.includes('E-F')) {
      setTamiMsg('Now look at E and F. Are they together? Tap them both.')
    }
  }, [foundPairs])

  const handleListen = useCallback(() => {
    setTamiMsg('Listen to the scale... hear where the notes get closer? Those are the together spots.')
  }, [])

  return (
    <div style={styles.container}>
      {/* CURRICULUM TOGGLE */}
      <div style={styles.trackBar}>
        <span style={styles.trackLabel}>CURRICULUM</span>
        <div style={styles.trackToggle}>
          <span style={styles.trackBtnInactive}>School</span>
          <span style={styles.trackBtnActive}>Motesart Fast</span>
        </div>
      </div>

      {/* TOP BAR */}
      <div style={styles.topBar}>
        <div style={styles.backArrow} onClick={() => navigate('/curriculum')}>←</div>
        <div style={styles.conceptInfo}>
          <div style={styles.conceptTitle}>The Major Scale Pattern</div>
          <div style={styles.conceptSubtitle}>Learn the shape.</div>
            <div style={styles.homeBadge}>Home: C</div>
        </div>
        <span style={styles.stepBadge}>Step 3 · Find It</span>
        <div style={styles.progressRing}>
          <svg width="34" height="34" viewBox="0 0 36 36" style={{transform:'rotate(-90deg)'}}>
            <circle cx="18" cy="18" r="14" fill="none" stroke="#1e293b" strokeWidth="3"/>
            <circle cx="18" cy="18" r="14" fill="none" stroke="#22d3ee" strokeWidth="3"
              strokeLinecap="round" strokeDasharray="88"
              strokeDashoffset={completed ? 0 : 88 - (foundPairs.length / 2) * 88}/>
          </svg>
          <span style={styles.progressText}>{completed ? '100%' : Math.round((foundPairs.length / 2) * 100) + '%'}</span>
        </div>
      </div>

      {/* CHAPTER NAV */}
      <div style={styles.chapterNav}>
        {['Hear It','Say It','Find It','Play It','Move It','Own It'].map((name, i) => (
          <div key={name} style={{
            ...styles.chapterStep,
            ...(i < 2 ? styles.chapterCompleted : {}),
            ...(i === 2 ? styles.chapterActive : {}),
            ...(i > 2 ? styles.chapterUpcoming : {})
          }}>
            <span style={styles.chapterNum}>{i+1}</span>{name}
            {i < 2 && <span style={styles.completedDot}/>}
          </div>
        ))}
      </div>

      {/* SHEET MUSIC STAFF */}
      <div style={styles.staffStrip}>
        <div style={styles.staffContainer}>
          <span style={styles.staffHint}>Find where the notes are <em style={{color:'#f59e0b',fontStyle:'normal',fontWeight:600}}>together</em></span>
          <svg viewBox="0 0 480 125" style={{display:'block',width:'100%',height:'auto'}} xmlns="http://www.w3.org/2000/svg">
            {[30,42,54,66,78].map(y => (
              <line key={y} x1="40" y1={y} x2="460" y2={y} stroke="#334155" strokeWidth="1"/>
            ))}
            <text x="46" y="68" fontSize="52" fill="#64748b" fontFamily="serif">{String.fromCodePoint(119070)}</text>
            <line x1="100" y1="90" x2="124" y2="90" stroke="#64748b" strokeWidth="1.2"/>
            {STAFF_NOTES.map((n, i) => {
              const x = 112 + i * 44
              const isSqueeze = n.squeeze
              const isFound = keyStates[n.id] === 'found'
              const fill = isFound ? '#34d399' : isSqueeze ? '#f59e0b' : '#cbd5e1'
              return (
                <g key={n.id}>
                  <ellipse cx={x} cy={n.y} rx="7" ry="5.5" fill={fill} transform={'rotate(-12,'+x+','+n.y+')'}/>
                  <line x1={x+7} y1={n.y} x2={x+7} y2={n.y-40} stroke={fill} strokeWidth="1.4"/>
                  <text x={x} y="105" textAnchor="middle" fontSize="10" fill={isFound?'#34d399':isSqueeze?'#f59e0b':'#64748b'} fontWeight={isSqueeze?'700':'600'}>
                    {SCALE_KEYS[i].note}
                  </text>
                  <text x={x} y="115" textAnchor="middle" fontSize="8" fill={isFound?'#059669':isSqueeze?'#d97706':'#475569'} fontWeight={isSqueeze?'700':'500'}>
                    {SCALE_KEYS[i].degree}
                  </text>
                </g>
              )
            })}
            <path d="M196,22 L196,18 L244,18 L244,22" stroke="#f59e0b" strokeWidth="1.2" fill="none"/>
            <text x="220" y="14" textAnchor="middle" fontSize="8" fill="#f59e0b" fontWeight="600">3 &amp; 4 together</text>
            <path d="M368,8 L368,4 L420,4 L420,8" stroke="#f59e0b" strokeWidth="1.2" fill="none"/>
            <text x="394" y="1" textAnchor="middle" fontSize="8" fill="#f59e0b" fontWeight="600">7 &amp; 8 together</text>
          </svg>
        </div>
      </div>

      {/* SPOKEN PATTERN - BEAT CHIPS */}
      <div style={styles.spokenBar}>
        <div style={styles.spokenContainer}>
          <div style={styles.spokenLabel}>THE PATTERN</div>
          <div style={styles.beatChips}>
            {BEAT_CHIPS.map((chip, i) => (
              <span key={i} style={chip.type === 'together' ? styles.chipTogether : styles.chipSkip}>
                {chip.text}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* INSTRUCTION BRAIN */}
      <div style={styles.instructionBrain}>
        <div style={styles.currentTask}>
          <div style={styles.taskLabel}>WHAT TO DO NOW</div>
          <div style={styles.taskText}>
            {completed
              ? 'You found both pairs where the notes are together.'
              : 'Tap the keys where the notes are together.'}
          </div>
          <div style={styles.taskGoal}>
            <span style={{color:'#34d399',fontWeight:600}}>Goal: </span>
            {completed ? 'Complete!' : 'Find both — where 3 & 4 are together, and 7 & 8 are together'}
          </div>
        </div>

        <div style={styles.focusZone}>
          <div style={styles.focusIcon}>{String.fromCodePoint(9678)}</div>
          <div style={{flex:1}}>
            <div style={styles.focusLabel}>FOCUS</div>
            <div style={styles.focusText}>Most notes skip. Two pairs are together. Find them.</div>
          </div>
        </div>

        <AmbassadorBubble message={tamiMsg} ambassadorId="motesart" />

        {feedbackMsg && (
          <div style={{
            ...styles.feedbackBar,
            ...(feedbackType === 'success' ? styles.feedbackSuccess : feedbackType === 'warn' ? styles.feedbackWarn : styles.feedbackMiss)
          }}>
            <div style={{
              width:6,height:6,borderRadius:'50%',flexShrink:0,
              background: feedbackType==='success'?'#34d399':feedbackType==='warn'?'#f59e0b':'#ef4444'
            }}/>
            <span style={{
              fontSize:11,fontWeight:500,
              color: feedbackType==='success'?'#34d399':feedbackType==='warn'?'#f59e0b':'#ef4444'
            }}>{feedbackMsg}</span>
            <span style={styles.feedbackCount}>{foundPairs.length} of 2</span>
          </div>
        )}

        {completed && (
          <div style={styles.ctaButton} onClick={() => navigate('/curriculum')}>
            Next: Play It →
          </div>
        )}
      </div>

      {/* TOOLS ROW */}
      <div style={styles.toolsRow}>
        <div style={styles.toolPrimary} onClick={handleListen}><span style={styles.toolIcon}>{String.fromCodePoint(9835)}</span>Listen</div>
        <div style={styles.toolSecondary}><span style={styles.toolIcon}>{String.fromCodePoint(9995)}</span>Finger</div>
        <div style={styles.toolSecondary}><span style={styles.toolIcon}>{String.fromCodePoint(128214)}</span>Read</div>
        <div style={styles.toolSecondary}><span style={styles.toolIcon}>{String.fromCodePoint(8634)}</span>Replay</div>
        <div style={styles.toolPrimary} onClick={handleHint}><span style={styles.toolIcon}>{String.fromCodePoint(9671)}</span>Hint</div>
      </div>

      {/* KEYBOARD */}
      <div style={styles.keyboardSection}>
        <div style={styles.keyboard}>
          {SCALE_KEYS.map(k => {
            const state = keyStates[k.id]
            const isSqueeze = CORRECT_PAIRS.some(p => p.keys.includes(k.id) && !foundPairs.includes(p.label))
            const isFound = state === 'found'
            const isWrong = state === 'wrong'
            const isComplete = completed

            let keyStyle = { ...styles.whiteKey }
            if (isComplete && isFound) {
              keyStyle = { ...keyStyle, ...styles.keyComplete }
            } else if (isFound) {
              keyStyle = { ...keyStyle, ...styles.keyFound }
            } else if (isWrong) {
              keyStyle = { ...keyStyle, ...styles.keyWrong }
            } else if (isSqueeze) {
              keyStyle = { ...keyStyle, ...styles.keySqueeze }
            } else {
              keyStyle = { ...keyStyle, ...styles.keyScale }
            }

            return (
              <div key={k.id} style={keyStyle} onClick={() => handleKeyTap(k.id)}>
                {isFound && <span style={styles.foundMarker}>{String.fromCodePoint(10003)}</span>}
                {isSqueeze && !isFound && <span style={styles.squeezeMarker}>together</span>}
                <span style={{
                  fontSize:11,fontWeight:isFound||isSqueeze?700:600,
                  color: isFound?'#065f46':isSqueeze?'#92400e':'#475569'
                }}>{k.note}</span>
                <span style={{
                  fontSize:9,marginTop:1,fontWeight:isFound||isSqueeze?700:400,
                  color: isFound?'#059669':isSqueeze?'#d97706':'#94a3b8'
                }}>{k.degree}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/**
 * Write completion state to concept_state_store.
 * This is the one real state write that closes the proof loop.
 */
function writeCompletionState(foundPairs, wrongTaps, attemptCount, hintUsed) {
  const eventPayload = {
    client_event_id: generateEventId(),
    student_instrument_id: getStudentId(),
    concept_id: CONCEPT_ID,
    chapter: 'find_it',
    result: 'complete',
        success_summary: 'located together pairs in the major scale pattern',
    found_pairs: foundPairs,
    wrong_taps: wrongTaps,
    attempt_count: attemptCount,
    hint_used: hintUsed,
    tempo_factor: 1.0,
    timestamp: new Date().toISOString()
  }

  const confidence = wrongTaps.length === 0 && !hintUsed ? 0.9
    : wrongTaps.length <= 1 && !hintUsed ? 0.7
    : wrongTaps.length <= 2 ? 0.5
    : 0.3

  const conceptState = {
    confidence: confidence,
    trend: 'improving',
    mistake_pattern: wrongTaps.length > 0
      ? 'Tapped ' + wrongTaps.join(', ') + ' before finding correct pairs'
      : 'No wrong taps \u2014 found both pairs directly',
    recommended_strategy: confidence >= 0.7
      ? 'Ready to advance to Play It chapter'
      : 'May benefit from repeating Find It with a different key',
    next_action: 'play_it',
    evidence_summary: 'Find It complete: found ' + foundPairs.join(' and ')
      + ' in ' + attemptCount + ' taps'
      + (hintUsed ? ' (hint used)' : '')
      + (wrongTaps.length > 0 ? '. Wrong taps: ' + wrongTaps.join(', ') : '. No wrong taps')
      + '. Confidence: ' + (confidence * 100) + '%',
    mastery_ready: confidence >= 0.7,
    chapter_results: { find_it: eventPayload }
  }

  // Write to localStorage — teacher reads this as fallback
  replaceState(CONCEPT_ID, conceptState)
  console.log('[FindIt] Event payload:', eventPayload)
  console.log('[FindIt] Concept state written:', conceptState)

  // POST event to real backend, then recompute Concept_State
  fetch(API_BASE + '/api/practice-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventPayload)
  })
    .then(function(res) { return res.json() })
    .then(function(data) {
      console.log('[FindIt] API event response:', data)
      return fetch(API_BASE + '/api/concept-state/recompute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_instrument_id: eventPayload.student_instrument_id,
          concept_id: eventPayload.concept_id
        })
      })
    })
    .then(function(res) { return res.json() })
    .then(function(data) {
      console.log('[FindIt] API recompute response:', data)
    })
    .catch(function(err) {
      console.warn('[FindIt] API write failed (localStorage still saved):', err)
    })
}

const styles = {
  container: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    background: '#0a0a14', color: '#e2e8f0',
    height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden'
  },
  // Track bar
  trackBar: {
    display:'flex',alignItems:'center',justifyContent:'center',
    padding:'7px 20px',background:'#06060e',borderBottom:'1px solid #1a1a2e',flexShrink:0
  },
  trackLabel: { fontSize:10,textTransform:'uppercase',letterSpacing:'1.2px',color:'#475569',fontWeight:600,marginRight:12 },
  trackToggle: { display:'flex',background:'#111827',borderRadius:8,padding:3,border:'1px solid #1e293b' },
  trackBtnInactive: { padding:'5px 14px',fontSize:11,fontWeight:500,color:'#64748b',borderRadius:6,cursor:'pointer' },
  trackBtnActive: { padding:'5px 14px',fontSize:11,fontWeight:600,color:'#c4b5fd',borderRadius:6,background:'#3b1764' },
  // Top bar
  topBar: { display:'flex',alignItems:'center',padding:'7px 16px',background:'#0f0f1a',borderBottom:'1px solid #1a1a2e',gap:10,flexShrink:0 },
  backArrow: { fontSize:16,color:'#64748b',cursor:'pointer',width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:6,border:'1px solid #1e293b' },
  conceptInfo: { flex:1 },
  conceptTitle: { fontSize:15,fontWeight:600,color:'#f1f5f9' },
  conceptSubtitle: { fontSize:10,color:'#64748b',marginTop:1 },
    homeBadge: { fontSize:13,color:'#f59e0b',background:'#f59e0b15',padding:'6px 16px',borderRadius:8,fontWeight:700,letterSpacing:'1px',display:'inline-block',marginTop:8 },
  stepBadge: { fontSize:11,fontWeight:600,color:'#67e8f9',background:'rgba(34,211,238,0.08)',border:'1px solid rgba(34,211,238,0.2)',padding:'3px 10px',borderRadius:12,whiteSpace:'nowrap' },
  progressRing: { width:34,height:34,position:'relative' },
  progressText: { position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',fontSize:9,fontWeight:700,color:'#22d3ee' },
  // Chapter nav
  chapterNav: { display:'flex',padding:'5px 16px',gap:3,background:'#0a0a14',borderBottom:'1px solid #1a1a2e',flexShrink:0 },
  chapterStep: { flex:1,textAlign:'center',padding:'5px 2px 4px',fontSize:10,fontWeight:500,color:'#334155',borderRadius:6,cursor:'pointer',position:'relative',lineHeight:'1.3' },
  chapterNum: { display:'block',fontSize:8,fontWeight:700,letterSpacing:'0.5px',marginBottom:1,opacity:0.6 },
  chapterCompleted: { color:'#34d399',background:'rgba(52,211,153,0.05)' },
  chapterActive: { color:'#22d3ee',background:'rgba(34,211,238,0.08)',fontWeight:600,border:'1px solid rgba(34,211,238,0.2)' },
  chapterUpcoming: { color:'#334155' },
  completedDot: { position:'absolute',bottom:1,left:'50%',transform:'translateX(-50%)',width:4,height:4,borderRadius:'50%',background:'#34d399',display:'block' },
  // Staff
  staffStrip: { padding:'6px 12px 2px',flexShrink:0 },
  staffContainer: { background:'#0c0e16',border:'1px solid #1a1a2e',borderRadius:10,padding:'2px 4px 4px',overflow:'hidden',position:'relative' },
  staffHint: { position:'absolute',top:6,right:12,fontSize:9,color:'#64748b',fontStyle:'italic',letterSpacing:'0.3px',zIndex:1 },
  // Spoken pattern
  spokenBar: { padding:'3px 12px 4px',flexShrink:0 },
  spokenContainer: { background:'#0c0e16',border:'1px solid #1a1a2e',borderRadius:8,padding:'6px 10px',textAlign:'center' },
  spokenLabel: { fontSize:9,textTransform:'uppercase',letterSpacing:'1px',color:'#475569',fontWeight:600,marginBottom:4 },
  beatChips: { display:'flex',flexWrap:'wrap',gap:4,justifyContent:'center',alignItems:'center' },
  chipSkip: { fontSize:11,padding:'3px 8px',borderRadius:6,fontWeight:500,lineHeight:1,background:'rgba(103,232,249,0.06)',color:'#67e8f9',border:'1px solid rgba(103,232,249,0.15)' },
  chipTogether: { fontSize:11,padding:'3px 8px',borderRadius:6,fontWeight:700,lineHeight:1,background:'rgba(245,158,11,0.1)',color:'#f59e0b',border:'1px solid rgba(245,158,11,0.25)' },
  // Instruction brain
  instructionBrain: { flex:1,padding:'0 12px 4px',display:'flex',flexDirection:'column',gap:5,overflowY:'auto',minHeight:0 },
  currentTask: { background:'#0c0e16',border:'1px solid #1a1a2e',borderRadius:10,padding:'10px 14px' },
  taskLabel: { fontSize:9,textTransform:'uppercase',letterSpacing:'1px',color:'#475569',marginBottom:3,fontWeight:600 },
  taskText: { fontSize:15,fontWeight:500,color:'#f1f5f9',lineHeight:1.4 },
  taskGoal: { fontSize:11,color:'#64748b',marginTop:4,fontWeight:500 },
  focusZone: { background:'linear-gradient(135deg,#110f1e,#13112a)',border:'1px solid rgba(245,158,11,0.15)',borderRadius:10,padding:'8px 14px',display:'flex',alignItems:'center',gap:10 },
  focusIcon: { fontSize:14,color:'#f59e0b',width:26,height:26,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(245,158,11,0.08)',borderRadius:6 },
  focusLabel: { fontSize:9,textTransform:'uppercase',letterSpacing:'1px',color:'#f59e0b',fontWeight:700,marginBottom:1 },
  focusText: { fontSize:12,color:'#fde68a',fontWeight:500 },
  tamiSection: { background:'#0c0e16',border:'1px solid #1a1a2e',borderRadius:10,padding:'8px 10px',display:'flex',gap:8,alignItems:'flex-start' },
  tamiAvatar: { width:24,height:24,borderRadius:'50%',background:'linear-gradient(135deg,#7c3aed,#a78bfa)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,flexShrink:0 },
  tamiName: { fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.5px',color:'#a78bfa',marginBottom:1 },
  tamiText: { fontSize:11,color:'#cbd5e1',lineHeight:1.4 },
  feedbackBar: { display:'flex',alignItems:'center',gap:6,padding:'5px 12px',borderRadius:8,flexShrink:0 },
  feedbackSuccess: { background:'rgba(52,211,153,0.08)',border:'1px solid rgba(52,211,153,0.2)' },
  feedbackWarn: { background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)' },
  feedbackMiss: { background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)' },
  feedbackCount: { marginLeft:'auto',fontSize:10,color:'#64748b',fontWeight:600 },
  ctaButton: { background:'linear-gradient(135deg,#0e7490,#06b6d4)',color:'#f0fdfa',padding:'10px 20px',borderRadius:10,textAlign:'center',fontSize:14,fontWeight:600,cursor:'pointer',marginTop:2,letterSpacing:'0.3px' },
  // Tools
  toolsRow: { padding:'0 12px 4px',display:'flex',gap:4,flexShrink:0 },
  toolPrimary: { flex:1,padding:'5px 2px',background:'#0f1320',border:'1px solid #2a3040',borderRadius:6,color:'#94a3b8',fontSize:9,fontWeight:500,textAlign:'center',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:1 },
  toolSecondary: { flex:1,padding:'5px 2px',background:'#0c0e16',border:'1px solid #1a1a2e',borderRadius:6,color:'#3d4554',fontSize:9,fontWeight:500,textAlign:'center',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:1 },
  toolIcon: { fontSize:13 },
  // Keyboard
  keyboardSection: { padding:'0 10px 10px',flexShrink:0 },
  keyboard: { display:'flex',justifyContent:'center',gap:2,height:110 },
  whiteKey: { width:46,height:110,borderRadius:'0 0 6px 6px',cursor:'pointer',position:'relative',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',paddingBottom:6,transition:'all 0.15s' },
  keyScale: { background:'linear-gradient(180deg,#ecfdf5,#bbf7d0)',border:'1px solid #4ade80' },
  keySqueeze: { background:'linear-gradient(180deg,#fefce8,#fde68a)',border:'1px solid #f59e0b' },
  keyFound: { background:'linear-gradient(180deg,#d1fae5,#6ee7b7)',border:'1px solid #34d399',boxShadow:'0 0 12px rgba(52,211,153,0.3)' },
  keyComplete: { background:'linear-gradient(180deg,#d1fae5,#6ee7b7)',border:'1px solid #34d399',boxShadow:'0 0 16px rgba(52,211,153,0.5)' },
  keyWrong: { background:'linear-gradient(180deg,#f1f5f9,#d4d8e0)',border:'1px solid #94a3b8',opacity:0.5 },
  foundMarker: { position:'absolute',top:5,fontSize:9,fontWeight:700,color:'#059669' },
  squeezeMarker: { position:'absolute',top:5,fontSize:7,fontWeight:800,textTransform:'uppercase',color:'#d97706',background:'rgba(245,158,11,0.15)',padding:'1px 4px',borderRadius:3 }
}
