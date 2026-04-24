// GAME / DIAGNOSTIC LAYER — /game
import { useState, useCallback, useRef, useEffect } from 'react'
import useIsMobile from '../hooks/useIsMobile.js'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { updateWYLFromBehavior } from "../services/wylEvolution.js"

const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://deployable-python-codebase-som-production.up.railway.app'

// NOTE DATA 
const NOTE_FREQS = [
 261.63,293.66,329.63,349.23,392.00,440.00,493.88,
 523.25,587.33,659.25,698.46,783.99,880.00,987.77,
 1046.50,1174.66,1318.51,1396.91,
]
const NOTE_NAMES = ['C','D','E','F','G','A','B','C','D','E','F','G','A','B','C','D','E','F']

const SCALE_NOTES = [
 { name:'C', freq:261.63, top:96, hasLedger:true },
 { name:'D', freq:293.66, top:88, hasLedger:false },
 { name:'E', freq:329.63, top:81, hasLedger:false },
 { name:'F', freq:349.23, top:73, hasLedger:false },
 { name:'G', freq:392.00, top:65, hasLedger:false },
 { name:'A', freq:440.00, top:57, hasLedger:false },
 { name:'B', freq:493.88, top:49, hasLedger:false },
 { name:'C', freq:523.25, top:41, hasLedger:false },
]

// LEVEL HELPERS 
function getOctaves(level) {
 if (level <= 3) return 1
 if (level <= 9) return 2
 return 3
}
function getNoteCount(level) { return level }
function getMaxScaleReplays(level) {
 if (level <= 12) return 2
 return 3
}
function getMaxFindReplays() { return 2 }
function getOctaveLabel(level) {
 const o = getOctaves(level)
 return o === 1 ? 'One octave' : o === 2 ? 'Two octaves' : 'Three octaves'
}

// TAMI LEVEL UP MESSAGES 
function getTamiLevelUpMsg(level) {
 if (level === 2) return "You found your first note! Your ear is waking up µ"
 if (level === 3) return "Two notes at once your memory is growing! § "
 if (level === 4) return "Three notes! You're building real pitch memory now ¯"
 if (level === 5) return "Level 5! You're officially a music student now "
 if (level === 6) return "Six levels deep your ear is sharper than you think! ¨"
 if (level === 7) return "Seven! TAMi is taking notes on your progress "
 if (level === 8) return "Eight notes incoming you're entering expert territory! ¥"
 if (level === 9) return "Almost at double digits! Your pitch memory is elite ¸"
 if (level === 10) return "LEVEL 10! Double digits TAMi is seriously impressed ¡"
 if (level === 12) return "Level 12! Three octaves unlocked. You're a force "
 if (level >= 15) return "LEGENDARY status. TAMi bows to your ear training "
 return `Level ${level}! Keep climbing TAMi believes in you! `
}

function getPianoKeys(level) {
 const oct = getOctaves(level)
 const keys = []
 for (let o = 0; o < oct; o++) {
 for (let n = 0; n < 7; n++) {
 const globalIdx = o * 7 + n
 keys.push({ num: n + 1, name: NOTE_NAMES[globalIdx], freq: NOTE_FREQS[globalIdx], idx: globalIdx, isOctaveC: false, scaleNote: n })
 }
 }
 // Final high C only once
 const finalIdx = oct * 7
 keys.push({ num: 8, name: "C", freq: NOTE_FREQS[finalIdx], idx: finalIdx, isOctaveC: true, scaleNote: 7 })
 return keys
}


// GENERATE MYSTERY HELPER 
function generateMystery(length, prevMystery) {
 let seq
 let attempts = 0
 do {
 if (length <= 8) {
 // Pick unique random notes so each lights up a distinct staff position
 const pool = [0,1,2,3,4,5,6,7]
 seq = []
 for (let i = 0; i < length; i++) {
 const ri = Math.floor(Math.random() * pool.length)
 seq.push(pool.splice(ri, 1)[0])
 }
 } else {
 seq = Array.from({ length }, () => Math.floor(Math.random() * 8))
 }
 attempts++
 } while (
 attempts < 10 &&
 prevMystery &&
 prevMystery.length > 0 &&
 seq.length === prevMystery.length &&
 seq.every((n, i) => n === prevMystery[i])
 )
 return seq
}

// PIANO COMPONENT 
function Piano({ keys, octaves, pressed, onKeyPress, mob, labelMode }) {
 const whiteKeys = keys
 const totalWhite = whiteKeys.length
 const BLACK_OFFSETS = [0,1,3,4,5]

 return (
 <div style={{
 width:'100%', maxWidth: mob ? '100%' : 960, position:'relative', height: mob ? 110 : 150,
 background:'linear-gradient(180deg,#1a2744,#0f172a)',
 borderRadius:'0 0 12px 12px',
 border:'2px solid #2d3f5e',
 borderTop:'6px solid #3b4f6b',
 overflow:'visible',
 display:'flex',
 padding:'0 2px',
 gap:'2px',
 boxShadow:'inset 0 2px 8px rgba(0,0,0,.4), 0 4px 16px rgba(0,0,0,.5)'
 }}>
 {whiteKeys.map((k,i) => (
 <div
 key={i}
 onClick={() => onKeyPress(k.idx, i, k.scaleNote)}
 style={{
 flex:1,
 background: pressed===i
 ? 'linear-gradient(180deg,#bfdbfe,#93c5fd)'
 : k.isOctaveC
 ? 'linear-gradient(180deg,#dbeafe 0%,#c7d9f5 60%,#b8cef0 100%)'
 : 'linear-gradient(180deg,#f1f5f9 0%,#e2e8f0 60%,#cbd5e1 100%)',
 borderLeft:'none',
 borderRight:'none',
 borderBottom:'none',
 borderRadius:'0 0 6px 6px',
 display:'flex', flexDirection:'column', alignItems:'center',
 justifyContent:'flex-end', paddingBottom:8,
 cursor:'pointer', position:'relative', zIndex:1,
 minWidth:0,
 transform: pressed===i ? 'translateY(3px) scaleY(0.98)' : 'none',
 transition:'all .08s',
 boxShadow: pressed===i
 ? 'inset 0 -1px 0 rgba(0,0,0,.15), inset 0 2px 4px rgba(0,0,0,.2)'
 : k.isOctaveC
 ? 'inset -2px 0 0 rgba(100,140,220,.3), inset 2px 0 0 rgba(100,140,220,.3), inset 0 -3px 0 #8baad4, 2px 0 4px rgba(0,0,0,.25)'
 : 'inset -2px 0 0 rgba(0,0,0,.08), inset 2px 0 0 rgba(255,255,255,.6), inset 0 -3px 0 #94a3b8, 2px 0 4px rgba(0,0,0,.2)',
 }}
 >
 <span style={{fontSize:13,fontWeight:800,color: k.isOctaveC ? '#1d4ed8' : '#475569',pointerEvents:'none'}}>{labelMode === 'num' ? k.num : k.name}</span>
 </div>
 ))}

 {Array.from({length: octaves}, (_,o) => {
 const octaveStart = o * 8
 return BLACK_OFFSETS.map(offset => {
 const whiteIdx = octaveStart + offset
 if (whiteIdx >= totalWhite - 1) return null
 const keyWidth = 100 / totalWhite
 const leftPct = (whiteIdx + 1) * keyWidth - (keyWidth * 0.35)
 return (
 <div
 key={`b-${o}-${offset}`}
 style={{
 position:'absolute',
 left: leftPct + '%',
 top:0,
 width: keyWidth * 0.65 + '%',
 height:'62%',
 background:'linear-gradient(180deg,#1e2a3a 0%,#162030 50%,#0f1820 100%)',
 border:'1px solid #0a1520',
 borderTop:'2px solid #2d3f52',
 borderRadius:'0 0 5px 5px',
 zIndex:2,
 boxShadow:'2px 4px 8px rgba(0,0,0,.7), inset 1px 0 0 rgba(255,255,255,.06), inset -1px 0 0 rgba(0,0,0,.4)',
 cursor:'pointer',
 pointerEvents:'none',
 }}
 />
 )
 })
 })}
 </div>
 )
}

// STREAK CONFIG 
function getStreakStyle(streak) {
 if (streak === 0) return { border:'#374151', bg:'rgba(55,65,81,.2)', color:'#6b7280', label:'', emoji:'' }
 if (streak < 3) return { border:'#f97316', bg:'rgba(249,115,22,.1)', color:'#fb923c', label:'Warming Up', emoji:'¥' }
 if (streak < 5) return { border:'#f97316', bg:'rgba(249,115,22,.12)', color:'#fb923c', label:'Warming Up!', emoji:'¥' }
 if (streak < 10) return { border:'#ef4444', bg:'rgba(239,68,68,.15)', color:'#fbbf24', label:'ON FIRE!', emoji:'¥' }
 if (streak < 15) return { border:'#fbbf24', bg:'rgba(251,191,36,.2)', color:'#fbbf24', label:'INFERNO!', emoji:'' }
 return { border:'#a855f7', bg:'rgba(168,85,247,.2)', color:'#e879f9', label:'LEGENDARY!', emoji:'¡' }
}

// AUDIO 
let audioCtx = null
function getCtx() {
 if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
 if (audioCtx.state === 'suspended') audioCtx.resume()
 return audioCtx
}
function playTone(freq, dur = 0.5) {
 try {
 const ctx = getCtx()
 const osc = ctx.createOscillator()
 const gain = ctx.createGain()
 osc.connect(gain); gain.connect(ctx.destination)
 osc.type = 'sine'
 osc.frequency.setValueAtTime(freq, ctx.currentTime)
 gain.gain.setValueAtTime(0.4, ctx.currentTime)
 gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
 osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur)
 } catch(e) { console.warn('Audio error:', e) }
}

// CSS 
const css = `
.gp{min-height:100vh;background:linear-gradient(180deg,#0f172a,#1e293b);color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;flex-direction:column}
.gp-top{padding:8px 12px;background:rgba(15,23,42,.98);border-bottom:2px solid rgba(59,130,246,.3);backdrop-filter:blur(8px);position:sticky;top:0;z-index:10}
.gp-top-inner{max-width: mob ? '100%' : 1024px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px}
.gp-pill-pts{display:flex;align-items:center;gap:4px;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:700;border:1px solid rgba(234,179,8,.3);background:linear-gradient(135deg,rgba(234,179,8,.2),rgba(234,179,8,.1));color:#fbbf24}
.gp-lives{display:flex;gap:2px;font-size:16px}
.gp-bpm{background:linear-gradient(135deg,#f97316,#ef4444);color:#fff;border:none;border-radius:9999px;padding:4px 10px;font-size:12px;font-weight:700}
.gp-streak-ring{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;width:48px;height:48px;border-radius:50%;border:2px solid;position:relative;transition:all .3s}
.gp-streak-ring.animated{animation:streakPulse 1s infinite}
@keyframes streakPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.85;transform:scale(1.05)}}
.gp-streak-emoji{font-size:11px;position:absolute;top:-8px}
.gp-streak-label{font-size:9px;font-weight:700;margin-top:3px;letter-spacing:.5px}
.gp-prog-wrap{display:flex;align-items:center;gap:6px}
.gp-prog-bar{width:64px;height:10px;background:#374151;border-radius:9999px;overflow:hidden;border:1px solid #4b5563}
.gp-prog-fill{height:100%;background:linear-gradient(90deg,#3b82f6,#a855f7);border-radius:9999px;transition:width .3s}
.gp-mid{padding:16px;display:flex;flex-direction:column;align-items:center;gap:16px}
.gp-staff-wrap{width:100%;max-width: mob ? '100%' : 640px;background:rgba(30,41,59,.8);border:2px solid rgba(100,116,139,.4);border-radius:12px;padding:16px 12px 10px}
.gp-staff-outer{position:relative;height:130px}
.gp-staff-line{position:absolute;left:52px;right:8px;height:2px;background:rgba(148,163,184,.5);border-radius:1px}
.gp-ledger{position:absolute;height:2px;background:rgba(148,163,184,.5);border-radius:1px;width:26px}
.gp-clef{position:absolute;left:2px;top:6px;font-size:76px;line-height:1;opacity:.72;color:#94a3b8;user-select:none}
.gp-nh{position:absolute;width:16px;height:11px;border-radius:50%;transform:rotate(-18deg);transition:background .12s,box-shadow .12s,border-color .12s}
.gp-nh-idle{background:rgba(100,116,139,.2);border:2px solid rgba(100,116,139,.35)}
.gp-nh-lit{background:#3b82f6;border:2px solid #93c5fd;box-shadow:0 0 18px rgba(59,130,246,1),0 0 36px rgba(59,130,246,.5)}
.gp-nh-correct{background:#22c55e;border:2px solid #86efac;box-shadow:0 0 18px rgba(34,197,94,1)}
.gp-nh-wrong{background:#ef4444;border:2px solid #fca5a5;box-shadow:0 0 18px rgba(239,68,68,1)}
.gp-stem{position:absolute;width:2px;border-radius:1px;background:rgba(100,116,139,.35)}
.gp-stem-lit{background:#93c5fd}
.gp-stem-correct{background:#86efac}
.gp-note-lbl{position:absolute;font-size:9px;font-weight:700;top:113px;color:#475569;text-align:center;width:16px;pointer-events:none}
.gp-note-lbl-lit{color:#60a5fa}
.gp-staff-hint{font-size:10px;color:#475569;text-align:center;padding-top:4px}
.gp-title h1{font-size:24px;font-weight:700;font-family:Georgia,serif;background:linear-gradient(135deg,#e2e8f0,#94a3b8);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.gp-info{width:28px;height:28px;border-radius:50%;background:rgba(59,130,246,.2);border:1px solid rgba(59,130,246,.4);color:#60a5fa;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;font-weight:700}
.gp-action-row{display:flex;gap:8px;width:100%;max-width:384px}
.gp-abtn{flex:1;padding:12px;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:.2s}
.gp-abtn:hover{transform:scale(.98)}
.gp-abtn:disabled{opacity:.45;cursor:not-allowed;transform:none}
.gp-abtn-scale{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;box-shadow:0 4px 12px rgba(239,68,68,.3)}
.gp-abtn-find{background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;box-shadow:0 4px 12px rgba(34,197,94,.3)}
.gp-abtn-find.depleted{background:linear-gradient(135deg,#4b5563,#374151);box-shadow:none}
.gp-mode-row{display:flex;gap:8px;width:100%;max-width:384px}
.gp-mbtn{flex:1;padding:8px;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;transition:.2s}
.gp-mbtn-off{background:rgba(55,65,81,.8);color:#9ca3af}
.gp-mbtn-game{background:#9333ea;color:#fff;box-shadow:0 2px 8px rgba(147,51,234,.3)}
.gp-mbtn-academic{background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;box-shadow:0 2px 8px rgba(14,165,233,.3)}
.gp-dpm-bar{width:100%;max-width:384px;background:rgba(30,41,59,.8);border:1px solid rgba(14,165,233,.3);border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:10px}
.gp-kb{flex:1;padding:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px}
.gp-lvl-badge{background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;border-radius:10px;padding:8px 14px;text-align:center;box-shadow:0 4px 12px rgba(37,99,235,.3)}
.gp-lvl-num{font-size:24px;font-weight:900}
.gp-lvl-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px}
.gp-piano-wrap{width:100%;max-width:960px;margin:0 auto;padding:0 4px}
.gp-answer{background:rgba(30,41,59,.8);border:1px solid rgba(59,130,246,.3);border-radius:8px;padding:6px 16px;display:flex;align-items:center;gap:8px}
.gp-footer{padding:8px 12px;border-top:1px solid #1e293b;background:rgba(15,23,42,.95);display:flex;justify-content:center;gap:8px}
.gp-fbtn{padding:6px 16px;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer}
.gp-fbtn-dash{background:linear-gradient(135deg,#a855f7,#3b82f6);color:#fff}
.gp-fbtn-gray{background:#4b5563;color:#fff}
.gp-modal-bg{display:none;position:fixed;inset:0;z-index:50;align-items:center;justify-content:center;padding:16px}
.gp-modal-bg.show{display:flex}
.gp-modal-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.75);backdrop-filter:blur(4px)}
.gp-modal{position:relative;border-radius:16px;width:100%;max-height:90vh;overflow-y:auto}
.gp-htp{background:#1e293b;border:1px solid #334155;max-width: mob ? '100%' : 448px;padding:24px;color:#e2e8f0}
.gp-htp-step{display:flex;align-items:flex-start;gap:12px;margin-bottom:14px}
.gp-htp-badge{width:28px;height:28px;border-radius:6px;background:#334155;color:#e2e8f0;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
.gp-go-modal{background:#1e293b;border:1px solid #334155;max-width: mob ? '100%' : 440px;padding:28px;text-align:center}
.gp-go-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
.gp-go-stat{background:rgba(31,41,55,.5);border:1px solid rgba(55,65,81,.5);border-radius:10px;padding:12px;text-align:center}
.gp-go-actions{display:flex;gap:8px;margin-top:4px}
.gp-go-restart{flex:1;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#14b8a6,#06b6d4);color:#fff;font-weight:700;font-size:14px;cursor:pointer}
.gp-go-summary{flex:1;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#a855f7,#ec4899);color:#fff;font-weight:700;font-size:14px;cursor:pointer}
.gp-ear-meter{background:rgba(14,165,233,.08);border:1px solid rgba(14,165,233,.3);border-radius:12px;padding:14px;margin-bottom:14px}
.gp-ear-row{display:flex;align-items:center;gap:8px;margin-bottom:7px}
.gp-ear-label{font-size:11px;color:#64748b;width:110px;flex-shrink:0}
.gp-ear-bar-wrap{flex:1;height:7px;background:#0f172a;border-radius:9999px;overflow:hidden}
.gp-ear-bar-fill{height:100%;border-radius:9999px}
.gp-ear-score{font-size:11px;font-weight:700;width:32px;text-align:right;flex-shrink:0}
.gp-tami-card{background:linear-gradient(135deg,rgba(20,184,166,.08),rgba(6,182,212,.08));border:1px solid rgba(20,184,166,.3);border-radius:12px;padding:14px;margin-bottom:14px}
.gp-tami-avatar{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#14b8a6,#06b6d4);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:#fff;flex-shrink:0}
.gp-tami-tag{display:inline-block;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:700;margin:2px}
.gp-toast{position:fixed;top:80px;left:50%;transform:translateX(-50%) translateY(-20px);z-index:100;border-radius:12px;padding:10px 20px;font-size:14px;font-weight:700;display:flex;align-items:center;gap:10px;opacity:0;transition:all .4s;pointer-events:none;white-space:nowrap}
.gp-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
.gp-levelup-overlay{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.85);backdrop-filter:blur(6px)}
.gp-levelup-card{background:linear-gradient(135deg,#1e293b,#0f172a);border:2px solid rgba(251,191,36,.4);border-radius:20px;padding:32px 28px;max-width:380px;width:100%;text-align:center;position:relative;overflow:hidden}
.gp-levelup-card::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(251,191,36,.05),rgba(168,85,247,.05));pointer-events:none}
.gp-confetti-piece{position:fixed;width:8px;height:8px;border-radius:2px;animation:confettiFall linear forwards;pointer-events:none;z-index:300}
@keyframes confettiFall{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}
`

// CONFETTI COMPONENT 
function Confetti() {
 const pieces = Array.from({length: 60}, (_, i) => ({
 id: i,
 left: Math.random() * 100,
 delay: Math.random() * 0.8,
 duration: 1.5 + Math.random() * 1.5,
 color: ['#fbbf24','#a855f7','#14b8a6','#ef4444','#3b82f6','#22c55e','#f97316'][Math.floor(Math.random() * 7)],
 size: 6 + Math.random() * 8,
 }))
 return (
 <>
 {pieces.map(p => (
 <div key={p.id} className="gp-confetti-piece" style={{
 left: p.left + '%',
 top: '-10px',
 width: p.size,
 height: p.size,
 background: p.color,
 animationDelay: p.delay + 's',
 animationDuration: p.duration + 's',
 }}/>
 ))}
 </>
 )
}

// COMPONENT 
export default function GamePage() {
 const mob = useIsMobile()
 const navigate = useNavigate()
 const [searchParams] = useSearchParams()
 const urlMode = searchParams.get('mode')
 const urlConcept = searchParams.get('concept')
 const urlAssignmentId = searchParams.get('assignment_id')
 const isHomeworkSession = !!(urlAssignmentId && urlMode === 'academic')
 const storedUser = JSON.parse(localStorage.getItem('som_user') || '{}')

 // Level lives in state so UI updates when it changes
 const [level, setLevel] = useState(1)

 const keys = getPianoKeys(level)
 const noteCount = getNoteCount(level)
 const maxScaleReplays = getMaxScaleReplays(level)
 const maxFindReplays = getMaxFindReplays()
 const octaveLabel = getOctaveLabel(level)

 // Game state
 const [answers, setAnswers] = useState([])
 const [litNote, setLitNote] = useState(null)
 const [noteStates, setNoteStates] = useState({})
 const [pressed, setPressed] = useState(null)
 const [showHtp, setShowHtp] = useState(false)
 const [showGameOver, setShowGameOver] = useState(false)
 const [scaleReplays, setScaleReplays] = useState(2)
 const [findReplays, setFindReplays] = useState(2)
 const [mystery, setMystery] = useState([])
 const [mode, setMode] = useState(urlMode === 'academic' ? 'academic' : 'game')
 const [assignmentId] = useState(urlAssignmentId || null)
 const [labelMode, setLabelMode] = useState('abc')
 const [isPlaying, setIsPlaying] = useState(false)
 const [isEvaluating, setIsEvaluating] = useState(false)
 const [streak, setStreak] = useState(0)
 const [toast, setToast] = useState(null)

 // Lives
 const [lives, setLives] = useState(3)
 const [maxLives] = useState(6)

 // Progress toward level-up (resets each level)
 const [levelProgress, setLevelProgress] = useState(0)
 const CORRECT_TO_LEVELUP = 4

 // Level up celebration
 const [showLevelUp, setShowLevelUp] = useState(false)
 const [pendingLevel, setPendingLevel] = useState(null)

 const [sessionLogged, setSessionLogged] = useState(false)
 const [sessionPoints, setSessionPoints] = useState(0)

 const playingRef = useRef(false)
 const sessionRef = useRef({
 correct: 0, attempts: 0, noteErrors: {}, replaysUsed: 0,
 startTime: Date.now(), bestStreak: 0, currentStreak: 0,
 })

 // Log session + leaderboard
 const logSession = useCallback(async () => {
 if (sessionLogged) return
 const s = sessionRef.current
 const user = JSON.parse(localStorage.getItem('som_user') || '{}')
 const durationSeconds = Math.round((Date.now() - s.startTime) / 1000)
 const accuracy = s.attempts > 0 ? Math.round((s.correct / s.attempts) * 100) : 0
 const points = (s.correct * 100) + (s.bestStreak * 50)
 setSessionPoints(points)

 try {
 await fetch(`${BACKEND_URL}/session/log`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 user_id: user.id || user.name || 'anonymous',
 user_name: user.name || 'Player',
 level, mode,
 correct: s.correct, attempts: s.attempts, accuracy,
 best_streak: s.bestStreak, replays_used: s.replaysUsed,
 duration_seconds: durationSeconds,
 note_errors: s.noteErrors,
 points,
 game_name: 'Find the Note',
 })
 })
 await fetch(`${BACKEND_URL}/leaderboard/submit`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 user_id: user.id || user.name || 'anonymous',
 user_name: user.name || 'Player',
 game: 'Find the Note',
 level,
 points,
 accuracy,
 best_streak: s.bestStreak,
 })
 })
 setSessionLogged(true)
 updateWYLFromBehavior("ear_training_session", { accuracy, level })
 } catch (e) {
 console.warn('Session/leaderboard log failed:', e)
 }
 }, [sessionLogged, mode, level])

 // Generate mystery sequence whenever level or noteCount changes
 useEffect(() => {
 const seq = generateMystery(noteCount, mystery)
 setMystery(seq)
 setScaleReplays(getMaxScaleReplays(level))
 setFindReplays(getMaxFindReplays())
 }, [level, noteCount])

 // Play sequence WITH staff lighting (Play Scale)
 const playSequence = useCallback((noteIndices, onDone) => {
 if (playingRef.current) return
 playingRef.current = true
 setIsPlaying(true)
 setLitNote(null)
 let i = 0
 const step = () => {
 if (i >= noteIndices.length) {
 setLitNote(null)
 playingRef.current = false
 setIsPlaying(false)
 onDone && onDone()
 return
 }
 const ni = noteIndices[i]
 setLitNote(ni)
 playTone(SCALE_NOTES[ni].freq, 0.5)
 i++
 setTimeout(step, 620)
 }
 step()
 }, [])

 // Play sequence WITHOUT staff lighting (Find Note hidden)
 const playSequenceHidden = useCallback((noteIndices, onDone) => {
 if (playingRef.current) return
 playingRef.current = true
 setIsPlaying(true)
 let i = 0
 const step = () => {
 if (i >= noteIndices.length) {
 playingRef.current = false
 setIsPlaying(false)
 onDone && onDone()
 return
 }
 const ni = noteIndices[i]
 // Audio only no setLitNote
 playTone(SCALE_NOTES[ni].freq, 0.5)
 i++
 setTimeout(step, 620)
 }
 step()
 }, [])

 const playScale = () => {
 if (scaleReplays <= 0 || isPlaying) return
 if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume()
 setScaleReplays(r => r - 1)
 setFindReplays(r => Math.max(0, r - 1)) // costs 1 from both counters
 sessionRef.current.replaysUsed++
 playSequence([0,1,2,3,4,5,6,7], () => {
 setLitNote(null)
 setTimeout(() => playSequenceHidden(mystery), 600)
 })
 }

 const findNote = () => {
 if (findReplays <= 0 || !mystery.length || isPlaying) return
 if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume()
 setFindReplays(r => r - 1)
 sessionRef.current.replaysUsed++
 // Hidden no lighting
 playSequenceHidden(mystery)
 }

 const showToastMsg = (msg, color, bg, border) => {
 setToast({ msg, color, bg, border })
 setTimeout(() => setToast(null), 2000)
 }

 // Advance to next level
 const doLevelUp = useCallback((currentLevel) => {
 const newLevel = currentLevel + 1
 // Save to localStorage
 const user = JSON.parse(localStorage.getItem('som_user') || '{}')
 user.level = newLevel
 localStorage.setItem('som_user', JSON.stringify(user))
 setPendingLevel(newLevel)
 setShowLevelUp(true)
 }, [])

 // Dismiss level up and apply new level
 const dismissLevelUp = () => {
 setShowLevelUp(false)
 setLevel(pendingLevel)
 setLevelProgress(0)
 setAnswers([])
 setNoteStates({})
 setLitNote(null)
 setStreak(0)
 }

 // Key press
 const pressKey = useCallback((noteIdx, keyPos, scaleNote) => {
 if (isPlaying) return
 if (isEvaluating) return
 if (mode === 'game' && lives <= 0) return
 if (!audioCtx || audioCtx.state === 'suspended') {
 audioCtx = new (window.AudioContext || window.webkitAudioContext)()
 }
 setPressed(keyPos)
 setTimeout(() => setPressed(null), 180)
 playTone(NOTE_FREQS[noteIdx], 0.4)

 const next = [...answers, scaleNote]
 setAnswers(next)

 if (next.length >= noteCount) {
 setIsEvaluating(true)
 sessionRef.current.attempts++
 const allCorrect = next.every((n, i) => n === mystery[i])
 const newStates = {}
 // For each note in the answer, show feedback on the staff
 next.forEach((n, i) => {
 const isCorrect = n === mystery[i]
 if (isCorrect) {
 newStates[mystery[i]] = 'correct'
 } else {
 // Show red on the note the user actually played (not the expected one)
 newStates[n] = 'wrong'
 sessionRef.current.noteErrors[SCALE_NOTES[mystery[i]].name] =
 (sessionRef.current.noteErrors[SCALE_NOTES[mystery[i]].name] || 0) + 1
 }
 })
 // If all correct, mark ALL mystery positions green
 if (next.every((n, i) => n === mystery[i])) {
 mystery.forEach(pos => { newStates[pos] = 'correct' })
 }
 setNoteStates(newStates)

 if (allCorrect) {
 sessionRef.current.correct++
 const newStreak = sessionRef.current.currentStreak + 1
 sessionRef.current.currentStreak = newStreak
 sessionRef.current.bestStreak = Math.max(sessionRef.current.bestStreak, newStreak)
 setStreak(newStreak)

 // Check level up
 setLevelProgress(prev => {
 const newProgress = prev + 1
 if (newProgress >= CORRECT_TO_LEVELUP) {
 setTimeout(() => doLevelUp(level), 1600)
 }
 return newProgress
 })

 // Streak milestones
 if (newStreak === 3) showToastMsg('¥ TRIPLE! +50 pts', '#fb923c', 'rgba(249,115,22,.15)', 'rgba(249,115,22,.4)')
 if (newStreak === 5) {
 showToastMsg('¥ ON FIRE! Life recovered! ¤¸', '#ef4444', 'rgba(239,68,68,.15)', 'rgba(239,68,68,.4)')
 if (mode === 'game') setLives(l => Math.min(l + 1, maxLives))
 }
 if (newStreak === 10) showToastMsg(' INFERNO! x2 multiplier!', '#fbbf24', 'rgba(251,191,36,.12)', 'rgba(251,191,36,.4)')
 if (newStreak === 15) showToastMsg('¡ LEGENDARY! TAMi is impressed!', '#e879f9', 'rgba(168,85,247,.15)', 'rgba(168,85,247,.5)')
 } else {
 sessionRef.current.currentStreak = 0
 setStreak(0)
 if (mode === 'game') {
 setLives(l => {
 const newLives = l - 1
 if (newLives <= 0) {
 setTimeout(() => {
 logSession()
 setShowGameOver(true)
 }, 1800)
 }
 return Math.max(0, newLives)
 })
 }
 }

 setTimeout(() => {
 setAnswers([])
 setNoteStates({})
 // Always generate new mystery whether correct or wrong
 setIsEvaluating(false)
 const seq = generateMystery(noteCount, mystery)
 setMystery(seq)
 setScaleReplays(getMaxScaleReplays(level))
 setFindReplays(getMaxFindReplays())
 }, 1600)
 }
 }, [answers, isPlaying, isEvaluating, mystery, noteCount, mode, maxLives, logSession, level, doLevelUp])

 const resetGame = () => {
 setLevel(1)
 setAnswers([]); setNoteStates({}); setLitNote(null)
 setScaleReplays(getMaxScaleReplays(1)); setFindReplays(getMaxFindReplays())
 setStreak(0); setLives(3)
 setLevelProgress(0)
 setSessionLogged(false); setSessionPoints(0)
 sessionRef.current = {
 correct: 0, attempts: 0, noteErrors: {}, replaysUsed: 0,
 startTime: Date.now(), bestStreak: 0, currentStreak: 0,
 }
 setIsEvaluating(false)
 const seq = generateMystery(1, mystery)
 setMystery(seq)
 }

 const streakStyle = getStreakStyle(streak)
 const s = sessionRef.current
 const accuracy = s.attempts > 0 ? Math.round((s.correct / s.attempts) * 100) : 0
 const progressPct = Math.min(100, (levelProgress / CORRECT_TO_LEVELUP) * 100)

 return (
 <div className="gp"><style>{css}</style>

 {/* CONFETTI + LEVEL UP OVERLAY */}
 {showLevelUp && pendingLevel && (
 <>
 <Confetti />
 <div className="gp-levelup-overlay">
 <div className="gp-levelup-card">
 <div style={{fontSize: mob ? 32 : 52,marginBottom:4}}></div>
 <div style={{fontSize:13,fontWeight:700,color:'#fbbf24',textTransform:'uppercase',letterSpacing:2,marginBottom:8}}>Level Up!</div>
 <div style={{fontSize: mob ? 28 : 48,fontWeight:900,background:'linear-gradient(135deg,#fbbf24,#f97316)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',marginBottom:4}}>
 {pendingLevel}
 </div>
 <div style={{fontSize:14,color:'#94a3b8',marginBottom:20}}>
 {getOctaveLabel(pendingLevel)} · {getNoteCount(pendingLevel)} {getNoteCount(pendingLevel)===1?'note':'notes'} to find
 </div>
 {/* TAMi encouragement */}
 <div style={{background:'linear-gradient(135deg,rgba(20,184,166,.1),rgba(6,182,212,.1))',border:'1px solid rgba(20,184,166,.3)',borderRadius:12,padding:14,marginBottom:20,textAlign:'left'}}>
 <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
 <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#14b8a6,#06b6d4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:900,color:'#fff',flexShrink:0}}>T</div>
 <div style={{fontSize:12,fontWeight:700,color:'#2dd4bf'}}>TAMi says...</div>
 </div>
 <div style={{fontSize:13,color:'#94a3b8',lineHeight:1.6}}>
 {getTamiLevelUpMsg(pendingLevel)}
 </div>
 </div>
 <button
 onClick={dismissLevelUp}
 style={{width:'100%',padding:14,border:'none',borderRadius:12,fontSize: mob ? 13 : 15,fontWeight:700,cursor:'pointer',background:'linear-gradient(135deg,#fbbf24,#f97316)',color:'#fff',boxShadow:'0 4px 16px rgba(251,191,36,.4)'}}
 >
 Let's Go! ¹
 </button>
 </div>
 </div>
 </>
 )}

 {/* TOAST */}
 {toast && (
 <div className="gp-toast show" style={{background:toast.bg, border:`1px solid ${toast.border}`, color:toast.color}}>
 {toast.msg}
 </div>
 )}

 {/* TOP BAR */}
 <div className="gp-top"><div className="gp-top-inner">
 <div className="gp-pill-pts">° {sessionPoints + (s.correct * 100)}</div>
 {mode === 'game'
 ? <div className="gp-lives">{Array.from({length:3}, (_,i) => i < lives ? '¤¸' : '¤')}</div>
 : <div style={{fontSize:11,color:'#0ea5e9',fontWeight:700}}> Academic</div>
 }
 <div className="gp-bpm">Lv {level}</div>
 <div style={{textAlign:'center'}}>
 <div className={`gp-streak-ring ${streak > 0 ? 'animated' : ''}`}
 style={{borderColor:streakStyle.border, background:streakStyle.bg, color:streakStyle.color}}>
 {streakStyle.emoji && <span className="gp-streak-emoji">{streakStyle.emoji}</span>}
 <span style={{fontSize: mob ? 14 : 17,fontWeight:900}}>{streak}</span>
 <span style={{fontSize:7,fontWeight:700,textTransform:'uppercase',letterSpacing:1}}>Streak</span>
 </div>
 {streakStyle.label && <div className="gp-streak-label" style={{color:streakStyle.color}}>{streakStyle.label}</div>}
 </div>
 <div className="gp-prog-wrap">
 <span style={{fontSize:9,color:'#6b7280'}}>Level</span>
 <div className="gp-prog-bar"><div className="gp-prog-fill" style={{width:progressPct+'%'}}/></div>
 <span style={{fontSize:12,fontWeight:700,color:'#d1d5db'}}>{levelProgress}/{CORRECT_TO_LEVELUP}</span>
 </div>
 </div></div>

 {/* MID */}
 <div className="gp-mid">
 {/* TREBLE STAFF */}
 <div className="gp-staff-wrap">
 <div className="gp-staff-outer">
 <div className="gp-clef"></div>
 <div className="gp-staff-line" style={{top:88}}/>
 <div className="gp-staff-line" style={{top:72}}/>
 <div className="gp-staff-line" style={{top:56}}/>
 <div className="gp-staff-line" style={{top:40}}/>
 <div className="gp-staff-line" style={{top:24}}/>
 {SCALE_NOTES.map((note, i) => {
 const leftPct = 8 + i * (84 / (SCALE_NOTES.length - 1))
 const isLit = litNote === i
 const state = noteStates[i]
 const nhClass = state === 'correct' ? 'gp-nh gp-nh-correct'
 : state === 'wrong' ? 'gp-nh gp-nh-wrong'
 : isLit ? 'gp-nh gp-nh-lit' : 'gp-nh gp-nh-idle'
 const stemClass = isLit ? 'gp-stem gp-stem-lit'
 : state === 'correct' ? 'gp-stem gp-stem-correct' : 'gp-stem'
 return (
 <div key={i}>
 {note.hasLedger && <div className="gp-ledger" style={{top: note.top + 6, left: `calc(${leftPct}% - 5px)`}}/>}
 <div className={nhClass} style={{left: leftPct + '%', top: note.top}}>
 <div className={stemClass} style={{left:14, bottom:9, height: Math.max(18, 110 - note.top - 18)}}/>
 </div>
 <div className={`gp-note-lbl ${isLit ? 'gp-note-lbl-lit' : ''}`} style={{left: leftPct + '%'}}>{labelMode === 'num' ? (i + 1) : note.name}</div>
 </div>
 )
 })}
 </div>
 <div className="gp-staff-hint">C Major Scale · Play Scale lights the notes · Find Note is audio only</div>
 </div>

 {/* Title */}
 <div className="gp-title" style={{textAlign:'center'}}>
 <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
 <h1>Find the Note</h1>
 <button className="gp-info" onClick={()=>setShowHtp(true)}></button>
 </div>
 <div style={{fontSize:13,color:'#64748b',marginTop:4}}>
 Level {level} · {octaveLabel} · {noteCount} {noteCount===1?'note':'notes'}
 </div>
 </div>

 {/* Action buttons */}
 <div className="gp-action-row">
 <button className={`gp-abtn gp-abtn-scale ${scaleReplays<=0?'depleted':''}`}
 onClick={playScale} disabled={isPlaying || scaleReplays<=0}>
 µ Play Scale ({scaleReplays})
 </button>
 <button className={`gp-abtn gp-abtn-find ${findReplays<=0?'depleted':''}`}
 onClick={findNote} disabled={isPlaying || findReplays<=0}>
 ¶ Find Note ({findReplays})
 </button>
 </div>

 {/* Mode toggle */}
 <div className="gp-mode-row">
 <button className={`gp-mbtn ${mode==='academic'?'gp-mbtn-academic':'gp-mbtn-off'}`} onClick={()=>setMode('academic')}> Academic</button>
 <button className={`gp-mbtn ${mode==='game'?'gp-mbtn-game':'gp-mbtn-off'}`} onClick={()=>!isHomeworkSession&&setMode('game')} disabled={isHomeworkSession}>® Game</button>
 </div>
 {isHomeworkSession && (
 <div style={{fontSize:11,color:'rgba(255,255,255,.4)',textAlign:'center',marginTop:4}}>
   Academic Mode — assigned by teacher
 </div>
 )}
 {/* Label toggle: ABC / # */}
 <div style={{display:'flex',justifyContent:'center',width:'100%'}}>
 <div style={{display:'flex',gap:0,background:'rgba(30,41,59,.9)',border:'2px solid rgba(100,116,139,.4)',borderRadius:10,padding:3}}>
 <button onClick={()=>setLabelMode('abc')} style={{padding:'8px 20px',border:'none',borderRadius:8,fontSize:14,fontWeight:700,cursor:'pointer',background:labelMode==='abc'?'linear-gradient(135deg,#3b82f6,#2563eb)':'transparent',color:labelMode==='abc'?'#fff':'#9ca3af',boxShadow:labelMode==='abc'?'0 2px 8px rgba(59,130,246,.3)':'none',transition:'all .2s'}}>ABC</button>
 <button onClick={()=>setLabelMode('num')} style={{padding:'8px 20px',border:'none',borderRadius:8,fontSize:14,fontWeight:700,cursor:'pointer',background:labelMode==='num'?'linear-gradient(135deg,#f97316,#ea580c)':'transparent',color:labelMode==='num'?'#fff':'#9ca3af',boxShadow:labelMode==='num'?'0 2px 8px rgba(249,115,22,.3)':'none',transition:'all .2s'}}>#</button>
 </div>
 </div>

 {mode==='game' && <div style={{fontSize:11,color:'#22c55e',fontWeight:600}}> 5-streak recovers a life!</div>}
 {mode==='academic' && (
 <div className="gp-dpm-bar">
 <span style={{fontSize:18}}></span>
 <div style={{flex:1}}>
 <div style={{fontSize:11,fontWeight:700,color:'#0ea5e9'}}>DPM Tracking</div>
 <div style={{fontSize:10,color:'#64748b'}}>Extra practice beyond homework raises your DPM</div>
 </div>
 <div style={{fontSize:13,fontWeight:700,color:'#38bdf8'}}>+{s.correct * 2} DPM</div>
 </div>
 )}
 </div>

 {/* KEYBOARD */}
 <div className="gp-kb">
 <div style={{display:'flex',alignItems:'center',gap:12}}>
 <div className="gp-lvl-badge">
 <div className="gp-lvl-num">{level}</div>
 <div className="gp-lvl-lbl">Level</div>
 </div>
 <div>
 <div style={{fontSize: mob ? 13 : 15,fontWeight:700}}>C Major Scale</div>
 <div style={{fontSize:11,color:'#64748b'}}>Tap the keys to answer</div>
 </div>
 </div>

 <div className="gp-piano-wrap">
 <Piano
 keys={keys}
 octaves={getOctaves(level)}
 pressed={pressed}
 onKeyPress={pressKey}
 mob={mob}
 labelMode={labelMode}
 />
 </div>

 {answers.length > 0 && (
 <div className="gp-answer">
 <span style={{fontSize:12,fontWeight:600,color:'#60a5fa'}}>Your answer:</span>
 <span style={{fontSize: mob ? 13 : 15,fontFamily:'monospace',fontWeight:700,color:'#93c5fd'}}>
 {answers.map(i => SCALE_NOTES[i % 8].name).join(' ')}
 </span>
 </div>
 )}
 </div>

 {/* FOOTER */}
 <div className="gp-footer">
 <button className="gp-fbtn gp-fbtn-dash" onClick={()=>navigate('/')}> Dashboard</button>
 <button className="gp-fbtn gp-fbtn-gray" onClick={resetGame}>Reset</button>
 <button className="gp-fbtn gp-fbtn-gray" onClick={()=>{logSession();setShowGameOver(true)}}>End Game</button>
 </div>

 {/* HOW TO PLAY MODAL */}
 <div className={`gp-modal-bg ${showHtp?'show':''}`}>
 <div className="gp-modal-backdrop" onClick={()=>setShowHtp(false)}/>
 <div className="gp-modal gp-htp">
 <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
 <h2 style={{fontSize:22,fontWeight:700}}>µ How to Play</h2>
 <button style={{background:'none',border:'none',color:'#6b7280',fontSize:22,cursor:'pointer'}} onClick={()=>setShowHtp(false)}></button>
 </div>
 {[['1','Play Scale','Listen to the C Major scale. The notes light up on the staff so you can follow along!'],
 ['2','Find Note','Listen to the mystery notes audio only, no lighting. Use your ear!'],
 ['3','Tap the Answer','Tap the piano keys in the same order you heard them.'],
 ['4','Level Up','Get 4 correct answers to advance to the next level!'],
 ].map(([n,t,desc])=>(
 <div key={n} className="gp-htp-step">
 <div className="gp-htp-badge">{n}</div>
 <div><p style={{fontWeight:600,fontSize:14,margin:'0 0 2px'}}>{t}</p><p style={{fontSize:12,color:'#94a3b8',margin:0,lineHeight:1.5}}>{desc}</p></div>
 </div>
 ))}
 <div style={{padding:14,borderRadius:12,border:'1px solid rgba(239,68,68,.3)',background:'rgba(239,68,68,.08)',marginBottom:12}}>
 <h3 style={{fontWeight:700,marginBottom:8,fontSize:14,color:'#f87171'}}>¤¸ Lives</h3>
 <p style={{fontSize:13,color:'#fca5a5',margin:0,lineHeight:1.5}}>Start with 3 lives. Wrong answers cost 1 life. Game over at 0! Get a 5-streak to recover a life (cap: 6).</p>
 </div>
 <button style={{width:'100%',padding:14,border:'none',borderRadius:12,fontSize: mob ? 13 : 15,fontWeight:700,cursor:'pointer',background:'linear-gradient(135deg,#3b82f6,#a855f7)',color:'#fff'}} onClick={()=>setShowHtp(false)}>
 Got it! Let's Play ¹
 </button>
 </div>
 </div>

 {/* GAME OVER MODAL */}
 <div className={`gp-modal-bg ${showGameOver?'show':''}`}>
 <div className="gp-modal-backdrop" onClick={()=>setShowGameOver(false)}/>
 <div className="gp-modal gp-go-modal">
 <div style={{fontSize:44,marginBottom:4}}></div>
 <div style={{fontSize:26,fontWeight:900}}>Game Over!</div>
 <div style={{fontSize:13,color:'#9ca3af',marginBottom:16}}>Level {level} · Session Complete</div>
 <div className="gp-go-stats">
 {[[s.correct,'Correct','#4ade80'],[s.attempts,'Attempts','#c084fc'],
 [accuracy+'%','Accuracy','#fb923c'],[s.bestStreak,'Best Streak','#22d3ee']
 ].map(([v,l,c])=>(
 <div key={l} className="gp-go-stat">
 <div style={{fontSize:20,fontWeight:700,color:c}}>{v}</div>
 <div style={{fontSize:11,color:'#6b7280',marginTop:2}}>{l}</div>
 </div>
 ))}
 </div>
 <div style={{padding:12,borderRadius:10,background:'rgba(234,179,8,.1)',border:'1px solid rgba(234,179,8,.3)',marginBottom:16}}>
 <div style={{fontSize:22,fontWeight:900,color:'#fbbf24'}}> {s.correct * 100 + s.bestStreak * 50} pts</div>
 <div style={{fontSize:11,color:'#92400e'}}>Logged to leaderboard</div>
 </div>
 {/* Ear Training Meter */}
 <div className="gp-ear-meter">
 <div style={{fontSize:14,fontWeight:700,color:'#0ea5e9',marginBottom:12}}> Ear Training Meter</div>
 {[
 ['Pitch Accuracy', Math.min(accuracy+7,100), 'linear-gradient(90deg,#22c55e,#4ade80)', '#4ade80'],
 ['Note Memory', Math.max(accuracy-10,0), 'linear-gradient(90deg,#3b82f6,#60a5fa)', '#60a5fa'],
 ['Sequence Order', Math.max(accuracy-20,0), 'linear-gradient(90deg,#f97316,#fb923c)', '#fb923c'],
 ['Speed', Math.min(accuracy+15,100),'linear-gradient(90deg,#a855f7,#c084fc)', '#c084fc'],
 ['Replay Efficiency', Math.max(accuracy-5,0),'linear-gradient(90deg,#14b8a6,#2dd4bf)', '#2dd4bf'],
 ].map(([label,val,grad,col])=>(
 <div key={label} className="gp-ear-row">
 <div className="gp-ear-label">{label}</div>
 <div className="gp-ear-bar-wrap"><div className="gp-ear-bar-fill" style={{width:val+'%',background:grad}}/></div>
 <div className="gp-ear-score" style={{color:col}}>{val}%</div>
 </div>
 ))}
 </div>
 {/* TAMi */}
 <div className="gp-tami-card">
 <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
 <div className="gp-tami-avatar">T</div>
 <div>
 <div style={{fontSize:13,fontWeight:700,color:'#2dd4bf'}}>TAMi's Insight</div>
 <div style={{fontSize:10,color:'#64748b'}}>Personalized for you</div>
 </div>
 </div>
 <div style={{fontSize:12,color:'#94a3b8',lineHeight:1.6}}>
 {accuracy >= 80
 ? `Great session! Your ear is developing well. Keep the streak going! µ`
 : accuracy >= 50
 ? `Good effort! Focus on the interval between notes that pattern will help. TAMi is watching your progress! ¯`
 : `Keep practicing! Play Scale first, then really focus on each note before answering. You've got this! ª`
 }
 </div>
 <div style={{marginTop:8}}>
 <span className="gp-tami-tag" style={{background:'rgba(34,197,94,.2)',color:'#4ade80',border:'1px solid rgba(34,197,94,.3)'}}> WYL Saved</span>
 <span className="gp-tami-tag" style={{background:'rgba(59,130,246,.2)',color:'#60a5fa',border:'1px solid rgba(59,130,246,.3)'}}> DPM Updated</span>
 <span className="gp-tami-tag" style={{background:'rgba(234,179,8,.2)',color:'#fbbf24',border:'1px solid rgba(234,179,8,.3)'}}> Leaderboard</span>
 </div>
 </div>
 <div className="gp-go-actions">
 <button className="gp-go-restart" onClick={()=>{setShowGameOver(false);resetGame()}}>® Play Again</button>
 <button className="gp-go-summary" onClick={()=>navigate('/session-summary')}> Summary</button>
 </div>
 </div>
 </div>
 </div>
 )
}
