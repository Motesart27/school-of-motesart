import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../services/api.js'
import useTextToSpeech from '../hooks/useTextToSpeech.js'

// ---------- TAMi Voice Pack ----------
// Source: TAMi Voice System Control Console (locked reference spec)
// Authority: canTamiSpeak() is the SINGLE gate. All speech flows through it.
// Rule: 70% phrase bank, 30% dynamic. Rotate within each pool. Never reuse within last 3.

const TAMI_PHRASE_BANK = {
  greeting_first: ["Let's build.", "We're ready.", "Back to it."],
  greeting_returning: ["Continue.", "Pick it up here."],
  greeting_context: ["You stopped on half steps. Let's lock that in."],
  greeting_dormant: [
    "Ready when you are.", "Pick up where you left off.", "Ask me what's next.",
    "Let's keep building.", "Ready.", "Continue.", "Pick it up here."
  ],
  instruction: ["Find 3.", "Go to 4.", "Stay close.", "Right next to it."],
  correction: [
    "Close. Try the note right next to it.",
    "Not that one. Stay tighter.",
    "You went too far. Bring it back."
  ],
  completion_micro: ["Yes.", "That's it."],
  completion_mid: ["Good. Keep that pattern."],
  completion_major: ["That's the pattern. You've got it.", "Now you understand it."],
  completion_full: ["Clean. Let's move forward.", "You own that now."],
  reinforcement: ["Yes.", "That's it.", "Good.", "Clean."],
  pattern_language: ["Together", "Closest", "No space", "Right next"],
  guidance: ["Bring it in.", "Too far \u2014 come back.", "Stay tighter."],
  replay_variation: [
    "Listen again \u2014 3 to 4.", "Here it is again \u2014 stay close.",
    "Focus on how tight that is."
  ],
  ownit_transition: [
    "No labels this time. You know where they are.",
    "Show me you own it.", "Blank keys. Same truth.", "New home, same truth."
  ],
  ownit_pass: ["Pass complete.", "You own it.", "Confirmed."],
  ownit_reset: ["Reset.", "Not yet. One more round.", "Close. Go again."],
  inactivity: ["Still here?", "Take your time.", "No rush.", "Whenever you're ready.", "I'm here."],
  session_wrap: ["Good session.", "Solid work today.", "Pick it up next time.", "You moved forward."]
}

const TAMI_FORBIDDEN = [
  "Great job", "Amazing!", "Perfect!", "You're doing awesome",
  "Try again", "Oops", "Let's try that again",
  "That's incorrect", "Well done", "Fantastic", "Wonderful",
  "You nailed it", "Bravo"
]

const DASHBOARD_VOICE_CONFIG = {
  lesson:     { greeting: 'speak', instruction: 'speak', correction: 'speak', completion: 'speak', hint: 'speak', replay: 'speak' },
  practice:   { greeting: 'speak', instruction: 'text-only', correction: 'speak', completion: 'speak', hint: 'text-only', replay: 'speak' },
  ownit:      { greeting: 'silent', instruction: 'silent', correction: 'silent', completion: 'speak', hint: 'silent', replay: 'speak' },
  student:    { greeting: 'speak', instruction: 'speak', correction: 'text-only', completion: 'text-only', hint: 'text-only', replay: 'speak' },
  teacher:    { greeting: 'speak', instruction: 'speak', correction: 'text-only', completion: 'text-only', hint: 'text-only', replay: 'speak' },
  chat:       { greeting: 'speak', instruction: 'speak', correction: 'speak', completion: 'speak', hint: 'speak', replay: 'speak' },
  admin:      { greeting: 'speak', instruction: 'speak', correction: 'speak', completion: 'speak', hint: 'text-only', replay: 'speak' },
  parent:     { greeting: 'speak', instruction: 'speak', correction: 'text-only', completion: 'text-only', hint: 'text-only', replay: 'speak' },
  ambassador: { greeting: 'speak', instruction: 'speak', correction: 'text-only', completion: 'text-only', hint: 'text-only', replay: 'speak' }
}

const _phraseHistory = {}
const _rapidTaps = []
let _globalRequestId = 0
const PHRASE_MEMORY_SIZE = 3
const RAPID_TAP_THRESHOLD = 3
const RAPID_TAP_WINDOW_MS = 800

function _pickPhrase(category) {
  const pool = TAMI_PHRASE_BANK[category]
  if (!pool || pool.length === 0) return null
  if (!_phraseHistory[category]) _phraseHistory[category] = []
  const recent = _phraseHistory[category]
  const available = pool.filter(p => !recent.includes(p))
  const usePool = available.length > 0 ? available : pool
  if (available.length === 0) _phraseHistory[category] = []
  const pick = usePool[Math.floor(Math.random() * usePool.length)]
  _phraseHistory[category].push(pick)
  if (_phraseHistory[category].length > PHRASE_MEMORY_SIZE) {
    _phraseHistory[category].shift()
  }
  return pick
}

function _containsForbidden(text) {
  if (!text) return false
  const lower = text.toLowerCase()
  return TAMI_FORBIDDEN.some(function(f) {
    return lower.includes(f.toLowerCase())
  })
}

function _checkRapidInput() {
  const now = Date.now()
  _rapidTaps.push(now)
  while (_rapidTaps.length > 0 && (now - _rapidTaps[0]) > RAPID_TAP_WINDOW_MS) {
    _rapidTaps.shift()
  }
  return _rapidTaps.length >= RAPID_TAP_THRESHOLD
}

function _getDashboard(pathname) {
  // ââ TAMi Context Contract: update this map whenever App.jsx routes change ââ
  if (pathname === '/login' || pathname === '/register') return 'auth'
  if (pathname === '/dashboard' || pathname === '/student') return 'student'
  if (pathname === '/tami' || pathname === '/my-coach') return 'tami-chat'
  if (pathname === '/admin') return 'admin'
  if (pathname === '/teacher-tami' || pathname === '/teacher') return 'teacher'
  if (pathname === '/parent') return 'parent'
  if (pathname === '/ambassador') return 'ambassador'
  // Lesson routes (active concept practice or game)
  if (pathname.startsWith('/game') || pathname === '/games') return pathname === '/games' ? 'games' : 'lesson'
  if (pathname === '/play-it' || pathname === '/find-it' || pathname === '/move-it' || pathname === '/own-it') return 'lesson'
  if (pathname.startsWith('/practice/')) return 'lesson'
  // Practice session routes
  if (pathname === '/practice' || pathname === '/practice-live' || pathname === '/wyl-practice' || pathname === '/live-practice' || pathname === '/wyl-practice-staff') return 'practice'
  if (pathname === '/practice-log') return 'practice-log'
  if (pathname === '/session-summary') return 'session-summary'
  if (pathname === '/curriculum') return 'curriculum'
  if (pathname === '/homework') return 'homework'
  if (pathname === '/leaderboard') return 'leaderboard'
  if (pathname === '/settings') return 'settings'
  if (pathname === '/concept-health') return 'admin'
  return 'tami-chat'
}



// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// TAMi CONTEXT CONTRACT â PRODUCT RULE, NOT A COMMENT
// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// TAMi intelligence is context-driven. This file MUST be updated in the same
// change set whenever ANY of the following occur:
//   1. A new route is added to App.jsx        â update _getDashboard + PAGE_DESCRIPTIONS + TAMI_DASHBOARD_CONTEXT
//   2. A new user role is added               â update TAMI_ROLE_CONTEXT + TAMI_GREETING_FRAMES + TAMI_RESET_PHRASES + TAMI_RESUME_PHRASES + getQuickActions
//   3. A dashboard purpose changes            â update TAMI_DASHBOARD_CONTEXT
//   4. A new Quick Actions pattern is approved â update getQuickActions
// Failing to do so leaves TAMi blind on that route, producing generic responses.
// This is a PRODUCT RULE. It applies to all collaborators including AI agents.
// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

// Role context: injected into every TAMi prompt to frame who it is speaking to
const TAMI_ROLE_CONTEXT = {
  student:    'You are speaking to a student. Your mode is curriculum coaching, lesson guidance, and practice support. Use Motesart number-system language, pattern-first instruction, and direct one-action responses.',
  teacher:    'You are speaking to a teacher. Your mode is class intelligence â student progress overview, DPM patterns, session activity, and class management. Do not give individual music lessons. Speak in class-level terms.',
  admin:      'You are speaking to a platform administrator. Your mode is platform intelligence â dashboard explanation, system structure, feature status, user flows, and rollout guidance. DO NOT offer music lesson coaching or instrument practice guidance unless the admin explicitly asks. Default responses should explain what is visible here, what is working, what connects to what, and what should happen next in the platform flow.',
  parent:     'You are speaking to a parent. Your mode is progress observation â practice streaks, DPM scores, homework completion, and weekly summaries for their child. Keep language accessible and family-friendly. Avoid technical Motesart system jargon unless the parent asks.',
  ambassador: 'You are speaking to a Motesart ambassador. Your mode is outreach support â campaign tools, referral tracking, student onboarding, and platform promotion. Be collaborative and brand-aligned.',
}

// Dashboard context: injected to tell TAMi what this area of the platform is for
const TAMI_DASHBOARD_CONTEXT = {
  student:         'Student progress hub. Shows DPM scores, practice stats, homework assignments, and weekly progress. Available actions: review DPM, check practice log, see homework, view streaks.',
  'tami-chat':     'Open TAMi conversation. No specific lesson or task context is active. Respond to whatever the user brings.',
  lesson:          'Active lesson or concept practice. The student is currently working through a specific musical concept interactively. Available actions: guide the pattern, correct errors, confirm understanding, advance to next step.',
  practice:        'Active practice session. Student is logging practice time and working on current concepts. Available actions: support focus, encourage consistency, note what they are working on.',
  'practice-log':  'Practice history log. Shows past sessions, time logged, and concept patterns. Available actions: reflect on consistency, identify gaps, suggest next focus.',
  'session-summary': 'Post-session review. Summary of what was practiced and how it went. Available actions: reinforce what was accomplished, suggest next session focus.',
  curriculum:      'Curriculum map. All concepts in order with student progress shown. Available actions: explain learning path, identify current position, suggest next concept.',
  games:           'Game lobby. All available School of Motesart music games. Available actions: recommend a game that matches current learning, explain game mechanics.',
  homework:        'Homework dashboard. Assigned work, submissions, and due dates. Available actions: clarify assignments, track completion, explain expectations.',
  leaderboard:     'Rankings by DPM scores and practice streaks. Available actions: contextualize standings, motivate improvement, explain DPM scoring.',
  settings:        'Account preferences and profile settings. Available actions: help navigate settings, explain options.',
  teacher:         'Teacher class dashboard. All students, DPM scores, session activity, and class management tools. Available actions: summarize class health, identify students needing attention, review session data.',
  admin:           'Platform administration dashboard. This is the control center of School of Motesart â system overview, all users, analytics, feature status, and management tools. Available actions: explain what each section does, describe data shown, navigate to connected areas, explain platform flow and feature rollout status.',
  ambassador:      'Ambassador outreach tools. Referrals, campaign tracking, and student onboarding. Available actions: track campaigns, review referrals, support onboarding flow.',
  parent:          'Parent progress view. Child practice logs, DPM scores, and achievements. Available actions: summarize child progress, explain scores, flag homework or practice gaps.',
  auth:            'Login or registration page. TAMi is silent here.',
}

// Role-specific greeting frame: appended to greeting prompts to set the right opening posture
const TAMI_GREETING_FRAMES = {
  student:    'This student just opened the platform. Orient them to their next learning action based on their current dashboard.',
  teacher:    'This teacher just opened the platform. Lead with class-level intelligence. Do not give personal music coaching.',
  admin:      'This administrator just opened the platform dashboard. Lead with platform context â explain what is visible here and what this area is for. Do NOT offer music coaching.',
  parent:     'This parent just opened the platform. Lead with their child\'s current status and recent activity.',
  ambassador: 'This ambassador just opened the platform. Lead with outreach or campaign context.',
}

// Reset phrases: shown when user clicks "New Chat" â thread clears, session stays intact
const TAMI_RESET_PHRASES = {
  student:    'Ready when you are.',
  teacher:    'Ready for your class overview.',
  admin:      'Ready to review the platform.',
  parent:     'Ready to review progress.',
  ambassador: 'Ready.',
}

// Resume phrases: shown when chat opens after greeting already happened this session
const TAMI_RESUME_PHRASES = {
  student:    'Back. What would you like to work on?',
  teacher:    'Ready. What do you need for your class?',
  admin:      'Here. What would you like to review?',
  parent:     'Ready. What would you like to check on?',
  ambassador: 'Ready.',
}

function getQuickActions(role, dashboard) {
  // Admin always gets platform-intelligence questions â never music coaching
  if (role === 'admin' || dashboard === 'admin') {
    return [
      { label: 'How is the platform performing?' },
      { label: 'Any students at risk?' },
      { label: 'Show me recent activity' },
    ]
  }
  if (role === 'teacher' || dashboard === 'teacher') {
    return [
      { label: 'How is my class doing?' },
      { label: 'Who needs attention today?' },
      { label: 'Review my assignments' },
    ]
  }
  if (role === 'parent') {
    return [
      { label: 'How is my child progressing?' },
      { label: 'Any homework due?' },
      { label: 'What should they practice?' },
    ]
  }
  if (role === 'ambassador') {
    return [
      { label: 'How are my students doing?' },
      { label: 'What should I focus on today?' },
      { label: 'Ambassador resources' },
    ]
  }
  // Student â vary by active dashboard
  if (dashboard === 'practice' || dashboard === 'lesson') {
    return [
      { label: 'Help me with this lesson' },
      { label: 'How am I doing?' },
      { label: 'What comes next?' },
    ]
  }
  if (dashboard === 'homework') {
    return [
      { label: 'Check my homework' },
      { label: 'How am I doing?' },
      { label: 'Help me understand this' },
    ]
  }
  if (dashboard === 'practice-log') {
    return [
      { label: 'Review my practice log' },
      { label: 'How am I improving?' },
      { label: 'What should I practice next?' },
    ]
  }
  // Default student
  return [
    { label: 'How am I doing?' },
    { label: 'What should I practice?' },
    { label: 'Check my homework' },
  ]
}

const TAMI_IDENTITY = [
  'You are TAMi (pronounced Tammy), the curriculum-aware AI guide for School of Motesart.',
  'Voice: direct, warm, musical. You are a coach, not a cheerleader.',
  "NEVER say: 'Great job!', 'Amazing!', 'Perfect!', 'You\'re doing awesome!', 'Try again!', 'Oops'.",
  'ALWAYS: be concise (1-2 sentences), use Motesart language (patterns before terminology),',
  'number-system-first, real piano logic. One teaching action per response.',
  "Priority order: 1) Don't interrupt flow 2) Clarity over personality 3) Timing over explanation",
  '4) Pattern over note 5) Silence over unnecessary speech 6) Consistency over variation',
  '7) Encouragement over correction tone.',
  'SPELLING: Always write Motesart as one word with no hyphen and no space. Never Motes-Art, never Motes Art.',
  'FORMAT: Never include emojis or emoji characters in any response. Use words only.'
].join(' ')

// TAMi response mode prompts (upgraded with TAMI_IDENTITY)
const TAMI_PROMPTS = {

  // greeting: called once per login session. Receives role and dashboard for full context.
  greeting: (name, role, dashboard) => {
    const roleCtx = TAMI_ROLE_CONTEXT[role] || TAMI_ROLE_CONTEXT.student
    const dashCtx = TAMI_DASHBOARD_CONTEXT[dashboard] || TAMI_DASHBOARD_CONTEXT['tami-chat']
    const frame   = TAMI_GREETING_FRAMES[role] || TAMI_GREETING_FRAMES.student
    return [
      TAMI_IDENTITY,
      roleCtx,
      'Current dashboard context: ' + dashCtx,
      'Generate a short natural opening for this ' + (role || 'user') + '.',
      'Rules:',
      '- Use their name (' + name + ') only if it feels completely natural.',
      '- Do not introduce yourself or explain what TAMi is if they are returning.',
      '- Base your opening on their role and the current dashboard â not on generic music instruction.',
      '- Keep it to 1-2 sentences. Sound direct, warm, and purposeful.',
      '- Do not use generic praise, filler, or cheerleader phrases.',
      '- No emojis. Words only. Spell it Motesart, one word, no hyphen.',
      frame,
    ].join(' ')
  },

  // instruction: called for every user message. Role, dashboard, and conversation state all inject context.
  instruction: (role, dashboard, hasHistory) => {
    const roleCtx = TAMI_ROLE_CONTEXT[role] || TAMI_ROLE_CONTEXT.student
    const dashCtx = TAMI_DASHBOARD_CONTEXT[dashboard] || TAMI_DASHBOARD_CONTEXT['tami-chat']
    const convRule = hasHistory
      ? 'IMPORTANT: This conversation is already in progress. Do NOT greet again. Do NOT re-introduce yourself. Do NOT say welcome. Answer directly from the current role and dashboard context.'
      : ''
    return [
      TAMI_IDENTITY,
      roleCtx,
      'Current dashboard context: ' + dashCtx,
      convRule,
      'Rules for all responses:',
      '- Be concise, clear, and context-aware.',
      '- Do not repeat opening phrases from your last 3 responses in this conversation.',
      '- Do not restate praise unless the user proved something new.',
      '- Prefer forward-moving responses over reworded encouragement.',
      '- One clear action or answer per response.',
      '- No emojis. Words only. Spell it Motesart, one word, no hyphen.',
    ].join(' ')
  },

  correction: () => [
    TAMI_IDENTITY,
    'The user made an error.',
    'Correction flow: Acknowledge what happened > Redirect to correct action > Focus on the pattern.',
    'Rules: be short, specific, cause-and-effect. No fluff. No repeated praise.',
    '- State what went wrong clearly.',
    '- Give the corrected action.',
    '- Use Motesart language where appropriate.',
  ].join(' '),

  completion: (tier) => [
    TAMI_IDENTITY,
    'The user completed a task.',
    'Completion tier: ' + (tier || 'standard') + '.',
    'Acknowledge with proportional weight: micro = one word, mid = one sentence, major = two sentences max.',
    'Move forward. Do not dwell. No repeated praise.',
  ].join(' '),

  hint: () => [
    TAMI_IDENTITY,
    'The user needs a hint.',
    'Give the smallest useful nudge â just enough to unblock them. Do not solve it for them.',
    'One action. One sentence max.',
  ].join(' '),

}
function buildWYLContext(user) {
  const wyl = user?.wyl
  if (!wyl || typeof wyl.visual === 'undefined') {
    return 'Student Learning Style Profile: No WYL profile yet — default balanced teaching style.'
  }
  const dominantRaw = wyl.dominant || 'balanced'
  const dominantLabel = dominantRaw === 'readwrite' ? 'Reading/Writing'
    : dominantRaw.charAt(0).toUpperCase() + dominantRaw.slice(1)
  return [
    'Student Learning Style Profile:',
    '- Visual: ' + (wyl.visual || 0) + '%',
    '- Auditory: ' + (wyl.auditory || 0) + '%',
    '- Kinesthetic: ' + (wyl.kinesthetic || 0) + '%',
    '- Reading/Writing: ' + (wyl.readwrite || wyl.reading_writing || 0) + '%',
    '- Dominant Style: ' + dominantLabel,
    'Adapt teaching:',
    '- Visual → use imagery, patterns, diagrams',
    '- Auditory → explain through sound, rhythm, phrasing',
    '- Kinesthetic → emphasize doing, repetition, physical action',
    '- Reading/Writing → structured explanation, steps, labels',
  ].join(' ')
}

function getPageContext(pathname) {
  const dash = _getDashboard(pathname)
  return TAMI_DASHBOARD_CONTEXT[dash] || 'This is an active platform page.'
}

// Voice state machine timing
const INITIAL_WARMUP_MS = 1400
const POST_SPEECH_HOLD_MS = 800
const SPEECH_SETTLE_MS = 400
const NO_SPEECH_TIMEOUT_MS = 5000
const AUTO_SUBMIT_MS = 1500          // voice auto-submit delay after silence
const GREETING_PLAY_DELAY_MS = 200   // buffer before first greeting plays


export default function TamiChat() {
  const { user, updateUser } = useAuth()
  const location = useLocation()

  // Hide TamiChat on HalfStep practice pages (they have their own coach)
  if (location.pathname.startsWith('/practice/T_HALF_STEP')) return null

  const [isOpen, setIsOpen] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [hasGreeted, setHasGreeted] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [autoPlay, setAutoPlay] = useState(true)
  const [greetingMode, setGreetingMode] = useState(false)
  const [muted, setMuted] = useState(false)
  const speakRequestId = useRef(0)
  const lastSpokenText = useRef('')
  const { speak: elevenSpeak, stop: elevenStop, unlock: elevenUnlock, isSpeaking, isLoading: ttsLoading } = useTextToSpeech()
  const messagesEndRef = useRef(null)
  const recognitionRef = useRef(null)
  const prevSpeaking = useRef(false)
  const voiceStateRef = useRef('booting')
  const settleTimerRef = useRef(null)
  const autoSubmitTimerRef = useRef(null)
  const listeningSessionIdRef = useRef(0)
  const hasAutoSubmittedRef = useRef(false)
  const [voicePhase, setVoicePhase] = useState('booting')
  const [liveTranscript, setLiveTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  // === LAYER A: Auto-save chat ===
useEffect(() => {
  if (!user) return
  if (restoreCheckedRef.current !== 'done') return

  _tamiSave(messages, history)

  // === LAYER B: Debounced backend save ===
  clearTimeout(saveTimeoutRef.current)
  saveTimeoutRef.current = setTimeout(() => {
    const uid = _tamiUserId()
    if (uid && messages.length > 0) {
      api.saveTamiHistory(uid, messages, history)
    }
  }, 3000)
  // === END LAYER B SAVE ===
}, [messages, history, user])
// === END AUTO SAVE ===
// === LAYER A: localStorage persistence helpers ===
const _tamiKey = () => {
  const id = user?.id || user?.email
  return id ? `tami_chat_${id}` : null
}

const MAX_PERSISTED = 100
const _tamiSave = (msgs, hist) => {
  const key = _tamiKey()
  if (!key) return
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        messages: msgs.slice(-MAX_PERSISTED),
        history: hist.slice(-MAX_PERSISTED)
      })
    )
  } catch (e) {
    console.warn('[TAMi] localStorage save failed:', e)
  }
}

const _tamiLoad = () => {
  const key = _tamiKey()
  if (!key) return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed.messages) && Array.isArray(parsed.history)) return parsed
    return null
  } catch (e) {
    return null
  }
}

const _tamiClear = () => {
  const key = _tamiKey()
  if (!key) return
  try {
    localStorage.removeItem(key)
  } catch (e) { /* silent */ }
}

const restoreCheckedRef = useRef('pending')
  const airtableSyncedRef = useRef(false)
  const saveTimeoutRef = useRef(null)
// === END LAYER A HELPERS ===
  const _tamiUserId = () =>
    user?.id || (user?.email ? user.email.toLowerCase().trim() : null) || null

  const studentName = user?.name || user?.email?.split('@')[0] || 'Friend'

  // Derive dashboard from current route
  const dashboard = _getDashboard(location.pathname)

  // === LAYER A: Restore chat from localStorage ===
useEffect(() => {
  if (!user) return
  if (restoreCheckedRef.current !== 'pending') return

  const data = _tamiLoad()
  if (data) {
    setMessages(data.messages || [])
    setHistory(data.history || [])
    setHasGreeted(true)
  }

  restoreCheckedRef.current = 'done'
}, [user])
// === END RESTORE ===
// === LAYER B: Cross-device Airtable load ===
useEffect(() => {
  if (!user) return
  if (airtableSyncedRef.current) return
  const uid = _tamiUserId()
  if (!uid) return
  airtableSyncedRef.current = true
  api.loadTamiHistory(uid).then(data => {
    if (data.message_count > 0 && restoreCheckedRef.current === 'done' && !_tamiLoad()) {
      setMessages(data.messages)
      setHistory(data.history)
      setHasGreeted(true)
      _tamiSave(data.messages, data.history)
    }
  })
}, [user])
// === END LAYER B LOAD ===
  // Listen for open-tami-chat event
  useEffect(() => {
    const handler = () => { elevenUnlock(); setIsOpen(true) }
    window.addEventListener('open-tami-chat', handler)
    return () => window.removeEventListener('open-tami-chat', handler)
  }, [])

  // Inject TAMi animations
  useEffect(() => {
    if (!document.getElementById('tami-pulse-style')) {
      const style = document.createElement('style')
      style.id = 'tami-pulse-style'
      // Load Righteous font for bubble mark
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Righteous&display=swap'
      document.head.appendChild(link)
      style.textContent = `
        @keyframes angelFloat {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(-6px); }
          50% { transform: translateY(-3px); }
          75% { transform: translateY(-8px); }
        }
        @keyframes angelGlow {
          0%, 100% {
            box-shadow: 0 0 0 3px rgba(139,92,246,0.4), 0 6px 24px rgba(139,92,246,0.3), 0 2px 8px rgba(0,0,0,0.15);
          }
          50% {
            box-shadow: 0 0 0 5px rgba(139,92,246,0.25), 0 8px 32px rgba(139,92,246,0.2), 0 0 18px 4px rgba(236,72,153,0.12), 0 2px 8px rgba(0,0,0,0.1);
          }
        }
        @keyframes haloSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes dotPulse {
          0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 6px rgba(74,222,128,0.6); }
          50% { opacity: 0.75; transform: scale(1.15); box-shadow: 0 0 10px rgba(74,222,128,0.8); }
        }
        @keyframes tamiSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes tamiDots {
          0%, 20% { opacity: 0.3; }
          50% { opacity: 1; }
          80%, 100% { opacity: 0.3; }
        }
        @keyframes thinkBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `
      document.head.appendChild(style)
    }
  }, [])

  // Stop speech when chat closes
  useEffect(() => {
    if (!isOpen) {
      elevenStop()
    }
  }, [isOpen])

  // Reset TAMi state when user identity changes (logout / login as different user)
  const prevUserIdRef = useRef(null)
  useEffect(() => {
  // === LAYER A: Restore chat BEFORE greeting ===
  if (restoreCheckedRef.current === 'pending') {
    const restored = _tamiLoad()

    if (restored) {
      setMessages(restored.messages || [])
      setHistory(restored.history || [])
      setHasGreeted(true)
    }

    restoreCheckedRef.current = 'done'
  }
  // === END RESTORE ===
    const currentId = user?.id || user?.email || null
    if (prevUserIdRef.current !== null && prevUserIdRef.current !== currentId) {
      clearTimeout(saveTimeoutRef.current)
      // Identity changed â clear everything so new user gets a fresh greeting
      setHasGreeted(false)
      setMessages([])
      setHistory([])
      setLoading(false)
      restoreCheckedRef.current = 'pending'
    }
    prevUserIdRef.current = currentId
  }, [user?.id, user?.email])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(saveTimeoutRef.current)
      elevenStop()
    }
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Greeting on first open - single authority: backend only
  useEffect(() => {
    if (!isOpen || hasGreeted || !user) return
    const _dbgRole = (user?.role||'student').toLowerCase(); const _dbgDash = dashboard; const _dbgSK = 'tami_session_'+(user?.id||user?.email||'anon'); console.log('[TAMi:debug] panel open', { role: _dbgRole, dashboard: _dbgDash, hasSession: !!sessionStorage.getItem(_dbgSK) })

    // Session guard: greet ONCE per authenticated login session (not time-windowed)
    const sessionKey = 'tami_session_' + (user?.id || user?.email || 'anon')
    if (sessionStorage.getItem(sessionKey)) {
      setHasGreeted(true)
      const role = (user?.role || 'student').toLowerCase()
      const resumePhrase = TAMI_RESUME_PHRASES[role] || TAMI_RESUME_PHRASES.student
      console.log('[TAMi:debug] session-guard: resume phrase shown, no backend call')
      setMessages([{ role: 'assistant', content: resumePhrase }])
      return
    }

    const fetchGreeting = async () => {
      console.log('[TAMi:debug] fresh greeting → firing backend call')
      setHasGreeted(true)
      setGreetingMode(true)
      setLoading(true)

      try {
        const role = (user?.role || 'student').toLowerCase()
        const dash = dashboard
        const pageContext = getPageContext(location.pathname)
        const firstName = studentName.split(' ')[0]
        const wylCtxGreeting = buildWYLContext(user)
        const greetingPrompt = TAMI_PROMPTS.greeting(firstName, role, dash) + ' ' + wylCtxGreeting
        const greetingUserId = _tamiUserId()

        // Race the API call against an 8-second timeout (Railway cold start guard)
        console.log('[TAMi] greeting request: /api/tami/chat', 'token:', !!localStorage.getItem('som_token'))
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Greeting timeout')), 8000)
        )
        const res = await Promise.race([
          api.chatWithTami(studentName, greetingPrompt, [], pageContext, role, greetingUserId),
          timeout
        ])
        const reply = res.reply || res.response || res.message; console.log('[TAMi:debug] backend reply received:', reply ? reply.substring(0,80) : 'null')
        if (reply) {
          setMessages([{ role: 'assistant', content: reply }])
          setHistory([
            { role: 'user', content: 'I just opened the app.' },
            { role: 'assistant', content: reply }
          ])
          sessionStorage.setItem(sessionKey, '1')
          _tamiSave(
            [{ role: 'assistant', content: reply }],
            [{ role: 'user', content: 'I just opened the app.' }, { role: 'assistant', content: reply }]
          )
          const uidG = _tamiUserId()
          if (uidG) api.saveTamiHistory(
            uidG,
            [{ role: 'assistant', content: reply }],
            [{ role: 'user', content: 'I just opened the app.' }, { role: 'assistant', content: reply }]
          )
          // Voice: speak greeting (stop mic first to prevent self-capture)
          if (recognitionRef.current) { try { recognitionRef.current.stop() } catch(e) {} }
          setIsListening(false)
          const voiceDecision = canTamiSpeak({ mode: 'greeting' })
          if (voiceDecision.action === 'speak') {
            setVoiceSystemPhase('speaking')
            setTimeout(async () => {
              try {
                await elevenSpeak(reply.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').replace(/[*_~`#<>]/g, '').replace(/\n+/g, ' ').trim(), 'tami')
              } catch (e) {
                console.error('[TAMi Voice] greeting TTS error:', e)
              } finally {
                if (voiceStateRef.current === 'speaking') setVoiceSystemPhase('ready')
              }
            }, GREETING_PLAY_DELAY_MS)
            setTimeout(function() {
              if (voiceStateRef.current === 'speaking') {
                console.log('[TAMi] Audio fallback: advancing to ready')
                setVoiceSystemPhase('ready')
              }
            }, NO_SPEECH_TIMEOUT_MS)
          } else {
            setVoiceSystemPhase('ready')
          }
        }
      } catch (err) {
        const _t = !!localStorage.getItem('som_token')
        const _u = '/api/tami/chat'
        const _s = err?.status || 'none'
        const _m = err?.message || String(err)
        console.error('[TAMi] greeting error:', _m, 'status:', _s, 'token:', _t)
        const fallback = 'TAMi connection failed. token=' + _t + ' status=' + _s + ' url=' + _u + ' message=' + _m
        setMessages([{ role: 'assistant', content: fallback }])
        sessionStorage.setItem(sessionKey, '1')
        setVoiceSystemPhase('ready')
        speakText(fallback, { mode: 'greeting' })
      } finally {
        setLoading(false)
        setGreetingMode(false)
      }
    }

    fetchGreeting()
  }, [isOpen, hasGreeted, user])

  // Monitor isSpeaking to advance voice state after speech ends
  useEffect(() => {
    if (isSpeaking) {
      if (voiceStateRef.current !== 'speaking') {
        setVoiceSystemPhase('speaking')
      }
    } else {
      if (voiceStateRef.current === 'speaking') {
        setVoiceSystemPhase('post_hold')
        setTimeout(function() {
          if (voiceStateRef.current === 'post_hold') {
            setVoiceSystemPhase('ready')
          }
        }, POST_SPEECH_HOLD_MS)
      }
    }
  }, [isSpeaking])

  // Auto-start listening when ready
  useEffect(() => {
    // Self-capture guard: don't open mic while TAMi audio is still active or loading
    if (voicePhase === 'ready' && isOpen && !isSpeaking && !ttsLoading && !loading) {
      clearTimeout(settleTimerRef.current)
      settleTimerRef.current = setTimeout(function() {
        if (voiceStateRef.current === 'ready' && !isSpeaking) {
          startListening()
        }
      }, SPEECH_SETTLE_MS)
    }
    return () => clearTimeout(settleTimerRef.current)
  }, [voicePhase, isOpen, isSpeaking, ttsLoading, loading])

  // ---------- canTamiSpeak: Single Authority Gate ----------
  // Every voice decision flows through this. Returns { action, reason }.
  const canTamiSpeak = useCallback(({
    mode = 'instruction',
    isReplay = false,
  } = {}) => {
    // Priority 1: Global mute - always wins
    if (muted) return { action: 'silent', reason: 'muted' }
    if (!voiceEnabled) return { action: 'silent', reason: 'voice-disabled' }

    // Priority 2: Replay bypasses most checks
    if (isReplay) return { action: 'speak', reason: 'replay-override' }

    // Priority 3: Rapid input detection
    if (_checkRapidInput()) return { action: 'text-only', reason: 'rapid-input' }

    // Priority 4: Dashboard voice policy
    const config = DASHBOARD_VOICE_CONFIG[dashboard] || DASHBOARD_VOICE_CONFIG.chat
    const policy = config[mode] || 'text-only'

    if (policy === 'silent') return { action: 'silent', reason: 'dashboard-' + dashboard + '-silent' }
    if (policy === 'text-only') return { action: 'text-only', reason: 'dashboard-' + dashboard + '-text-only' }

    // Priority 5: Greeting autoPlay gate
    if (mode === 'greeting' && !autoPlay) return { action: 'text-only', reason: 'greeting-autoplay-off' }

    // Priority 6: Allowed to speak
    return { action: 'speak', reason: 'allowed' }
  }, [muted, voiceEnabled, autoPlay, dashboard])

  // ---------- speakText: Full Voice Pipeline ----------
  // Event > gate > anti-repeat > stop > delay > speak > error recovery
  const speakText = useCallback(async (txt, { mode = 'instruction', isReplay = false } = {}) => {
    // Step 1: Run canTamiSpeak gate
    const decision = canTamiSpeak({ mode, isReplay })
    console.log('[TAMi Voice] gate:', decision.action, decision.reason, 'mode:', mode)
    if (decision.action !== 'speak') return

    if (!txt) return

    // Step 2: Clean text for TTS
    const cleanText = txt
      .replace(/[*_~`#]/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[<>]/g, '')
      .trim()

    if (!cleanText || cleanText.length > 3000) return

    // Step 3: Dedupe - skip if same text was just spoken (unless replay)

    // Step 4: Forbidden phrase check
    if (_containsForbidden(cleanText)) {
      console.warn('[TAMi Voice] Forbidden phrase blocked:', cleanText.substring(0, 40))
      return
    }

    // Step 5: Stale protection - increment request ID
    const thisRequest = ++speakRequestId.current

    // Step 6: Stop current audio + handoff delay
    try {
      elevenStop()
      await new Promise(r => setTimeout(r, 50))
    } catch (stopErr) {
      // Continue - stopping failure should not block new speech
    }

    // Step 7: Check if a newer request came in during the delay
    if (speakRequestId.current !== thisRequest) return

    // Step 8: Speak
    lastSpokenText.current = cleanText
    console.log('[TAMi Voice] calling TTS, text length:', cleanText.length)
    try {
      await elevenSpeak(cleanText, 'tami')
    } catch (ttsErr) {
      console.error('[TAMi Voice] TTS error:', ttsErr)
    } finally {
      if (voiceStateRef.current === 'speaking' && !isSpeaking) {
        console.log('[TAMi Voice] recovering phase to ready')
        setVoiceSystemPhase('ready')
      }
    }
  }, [canTamiSpeak, elevenSpeak, elevenStop, isSpeaking])

  // Send message
  const sendMessage = useCallback(async (messageText) => {
    clearTimeout(autoSubmitTimerRef.current)
    hasAutoSubmittedRef.current = true
    // Stop mic immediately so TAMi does not listen to its own voice
    if (recognitionRef.current) { try { recognitionRef.current.stop() } catch(e) {} }
    setIsListening(false)
    const userMsg = messageText || input.trim()
    if (!userMsg || loading) {
      console.log('[TAMi] sendMessage blocked:', !userMsg ? 'empty input' : 'loading=' + loading)
      return
    }
    setInput('')
    setLiveTranscript('')

    const userMessage = { role: 'user', content: userMsg }
    const baseMessages = [...messages, userMessage]
    const baseHistory  = [...history, userMessage]

    const loadingMessage = { role: 'assistant', content: '', isLoading: true }
    const optimisticMessages = [...baseMessages, loadingMessage]
    setMessages(optimisticMessages)
    setLoading(true)

    try {
      const role = (user?.role || 'student').toLowerCase()
      const dash = dashboard
      const wylCtxInstruction = buildWYLContext(user)
      const instructionPrompt = TAMI_PROMPTS.instruction(role, dash, baseHistory.length > 1) + ' ' + wylCtxInstruction
      const instructionUserId = _tamiUserId()
      console.log('[TAMi] chat request: /api/tami/chat', 'token:', !!localStorage.getItem('som_token'))
      const res = await api.chatWithTami(studentName, instructionPrompt + ' ' + userMsg, baseHistory, getPageContext(location.pathname), role, instructionUserId)
      const reply = res.reply || res.response || res.message
      if (reply) {
        const assistantMessage = { role: 'assistant', content: reply }
        const finalMessages = [...baseMessages, assistantMessage]
        const finalHistory  = [...baseHistory, assistantMessage]

        setMessages(finalMessages)
        setHistory(finalHistory)
        _tamiSave(finalMessages, finalHistory)
        const uid = _tamiUserId()
        if (uid) api.saveTamiHistory(uid, finalMessages, finalHistory)

        if (autoPlay && !muted && voiceEnabled) {
          if (recognitionRef.current) { try { recognitionRef.current.stop() } catch(e) {} }
          setIsListening(false)
          setVoiceSystemPhase('speaking')
          speakText(reply, { mode: 'instruction' })
        }
      }
    } catch (err) {
      const _t = !!localStorage.getItem('som_token')
      const _u = '/api/tami/chat'
      const _s = err?.status || 'none'
      const _m = err?.message || String(err)
      console.error('[TAMi] chat error:', _m, 'status:', _s, 'token:', _t)
      const errorMessage = { role: 'assistant', content: 'TAMi connection failed. token=' + _t + ' status=' + _s + ' url=' + _u + ' message=' + _m }
      const finalMessages = [...baseMessages, errorMessage]
      const finalHistory  = [...baseHistory, errorMessage]
      setMessages(finalMessages)
      setHistory(finalHistory)
      _tamiSave(finalMessages, finalHistory)
      const uidErr = _tamiUserId()
      if (uidErr) api.saveTamiHistory(uidErr, finalMessages, finalHistory)
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, history, studentName, speakText, autoPlay, dashboard, user?.role, location.pathname])

  // Replay last assistant message
  const replayLastMessage = () => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')
    if (lastAssistant) speakText(lastAssistant.content, { mode: 'replay', isReplay: true })
  }

  // Reset chat
  const resetChat = () => {
  elevenStop()
  // Reset-thread mode: clear messages/history, keep hasGreeted=true and sessionStorage intact
  const role = (user?.role || 'student').toLowerCase()
  console.log('[TAMi:debug] resetChat: new-thread mode, no backend call, role=' + role)
  const resetPhrase = TAMI_RESET_PHRASES[role] || TAMI_RESET_PHRASES.student
  const resetMessages = [{ role: 'assistant', content: resetPhrase }]
  setMessages(resetMessages)
  setHistory([])
  setLoading(false)
  _tamiClear()
  const uidR = _tamiUserId()
  if (uidR) api.clearTamiHistory(uidR)
}
  

  // Centralized phase setter â always syncs ref + state together
  const setVoiceSystemPhase = useCallback((phase) => {
    console.log('[TAMi] phase: ' + voiceStateRef.current + ' -> ' + phase)
    voiceStateRef.current = phase
    setVoicePhase(phase)
  }, [])

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    if (recognitionRef.current) { try { recognitionRef.current.stop() } catch(e) {} }
    const sessionId = ++listeningSessionIdRef.current
    hasAutoSubmittedRef.current = false
    console.log('[TAMi] listen session ' + sessionId + ' start')
    const rec = new SR()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = 'en-US'
    rec.onstart = () => setIsListening(true)
    setVoiceSystemPhase('listening')
    setLiveTranscript('')
    rec.onresult = (e) => {
      if (listeningSessionIdRef.current !== sessionId) return
      const text = Array.from(e.results).map(r => r[0].transcript).join('')
      setInput(text)
      setLiveTranscript(text)
      // Auto-submit after 1.5s of silence
      clearTimeout(autoSubmitTimerRef.current)
      if (text.trim()) {
        autoSubmitTimerRef.current = setTimeout(function() {
          if (listeningSessionIdRef.current !== sessionId) return
          if (hasAutoSubmittedRef.current) return
          const finalText = text.trim()
          if (!finalText) return
          hasAutoSubmittedRef.current = true
          console.log('[TAMi] auto-submit session ' + sessionId)
          sendMessage(finalText)
          setVoiceSystemPhase('responding')
        }, AUTO_SUBMIT_MS)
      }
    }
    rec.onend = () => { setIsListening(false); if (listeningSessionIdRef.current !== sessionId) return; setLiveTranscript(''); if (voiceStateRef.current === 'listening') { setVoiceSystemPhase('ready') } }
    rec.onerror = () => { setIsListening(false); if (listeningSessionIdRef.current !== sessionId) return; setLiveTranscript(''); setVoiceSystemPhase('ready') }
    recognitionRef.current = rec
    try { rec.start() } catch(e) { setIsListening(false) }
  }, [sendMessage])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) { try { recognitionRef.current.stop() } catch(e) {} }
    setIsListening(false)
  }, [])

  useEffect(() => {
    if (prevSpeaking.current && !isSpeaking && isOpen && !loading && hasGreeted && voiceStateRef.current !== 'listening') {
      const t = setTimeout(() => startListening(), SPEECH_SETTLE_MS)
      return () => clearTimeout(t)
    }
    prevSpeaking.current = isSpeaking
  }, [isSpeaking, isOpen, loading, hasGreeted, startListening])

  useEffect(() => {
    const handler = (e) => updateUser({ wyl: e.detail })
    window.addEventListener("wyl:update", handler)
    return () => window.removeEventListener("wyl:update", handler)
  }, [])

  // Quick actions â role + dashboard aware
  const quickActions = getQuickActions((user?.role || 'student').toLowerCase(), dashboard)

  if (!isOpen) {
    return (
      <button
        onClick={() => { elevenUnlock(); setIsOpen(true) }}
        style={{
          position: 'fixed', bottom: '24px', right: '24px',
          width: '48px', height: '48px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 40%, #EC4899 100%)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'angelFloat 4s ease-in-out infinite, angelGlow 3s ease-in-out infinite',
          transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.35s ease',
          boxShadow: '0 0 0 3px rgba(139,92,246,0.4), 0 6px 24px rgba(139,92,246,0.3), 0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 9999,
          overflow: 'visible', padding: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.animationPlayState = 'paused'; e.currentTarget.style.transform = 'scale(1.15) translateY(-4px)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(139,92,246,0.6), 0 12px 36px rgba(139,92,246,0.45), 0 0 40px 8px rgba(236,72,153,0.2)'; }}
        onMouseLeave={e => { e.currentTarget.style.animationPlayState = 'running'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
        title="Chat with TAMi"
      >
        {/* Halo ring */}
        <span style={{
          position: 'absolute', inset: '-6px', borderRadius: '50%',
          border: '1.5px solid transparent',
          borderTopColor: 'rgba(255,255,255,0.35)',
          borderRightColor: 'rgba(255,255,255,0.12)',
          animation: 'haloSpin 6s linear infinite',
          pointerEvents: 'none',
        }} />
        {/* TAMi bubble letter mark */}
        <svg viewBox="0 0 110 52" style={{ width: '36px', height: '36px', overflow: 'visible', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }}>
          <defs>
            <linearGradient id="bubbleFill" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="#FFFFFF"/>
              <stop offset="45%" stopColor="#F0EAFF"/>
              <stop offset="100%" stopColor="#D8C8F5"/>
            </linearGradient>
            <linearGradient id="bubbleShine" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9"/>
              <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.15"/>
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0"/>
            </linearGradient>
            <filter id="puffShadow" x="-10%" y="-10%" width="120%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#7C3AED" floodOpacity="0.35"/>
            </filter>
            <filter id="bubbleGlow" x="-15%" y="-15%" width="130%" height="130%">
              <feMorphology operator="dilate" radius="0.5" in="SourceAlpha" result="fat"/>
              <feGaussianBlur stdDeviation="1.8" in="fat" result="blur"/>
              <feFlood floodColor="#FFFFFF" floodOpacity="0.25" result="white"/>
              <feComposite in="white" in2="blur" operator="in" result="innerGlow"/>
              <feMerge><feMergeNode in="innerGlow"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <text x="55" y="42" fontFamily="'Righteous', sans-serif" fontSize="44" fill="none" stroke="rgba(124,58,246,0.2)" strokeWidth="3" textAnchor="middle" letterSpacing="1" filter="url(#puffShadow)">TAMi</text>
          <text x="55" y="40" fontFamily="'Righteous', sans-serif" fontSize="44" fill="url(#bubbleFill)" textAnchor="middle" letterSpacing="1" filter="url(#bubbleGlow)">TAMi</text>
          <text x="55" y="40" fontFamily="'Righteous', sans-serif" fontSize="44" fill="url(#bubbleShine)" textAnchor="middle" letterSpacing="1">TAMi</text>
        </svg>
        {/* Green online dot */}
        <span style={{
          position: 'absolute', top: '-2px', right: '-3px',
          width: '10px', height: '10px', borderRadius: '50%',
          background: '#4ADE80',
          border: '2px solid rgba(139,92,246,0.7)',
          boxShadow: '0 0 6px rgba(74,222,128,0.6)',
          animation: 'dotPulse 2.5s ease-in-out infinite',
        }} />
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px',
      width: '380px', height: '560px', borderRadius: '20px',
      overflow: 'hidden',
      boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
      display: 'flex', flexDirection: 'column',
      zIndex: 9999,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      background: '#0F0A1A',
      animation: 'tamiSlideUp 0.3s ease-out'
    }}>
      {/* HEADER - big centered TAMi avatar */}
      <div style={{
        background: 'linear-gradient(135deg, #7C3AED 0%, #DB2777 50%, #F59E0B 100%)',
        padding: '12px 14px 18px', position: 'relative',
        display: 'flex', flexDirection: 'column', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '10px' }}>
          <button onClick={() => setIsOpen(false)} style={{
            background: 'rgba(255,255,255,0.18)', border: 'none', color: 'white',
            width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(10px)'
          }}>
            <svg viewBox="0 0 24 24" style={{ width: '12px', height: '12px', fill: 'none', stroke: 'white', strokeWidth: 2, strokeLinecap: 'round' }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={replayLastMessage} title="Replay last response" style={{
              background: 'rgba(255,255,255,0.18)', border: 'none', color: 'white',
              width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(10px)', animation: isSpeaking ? 'tamiBounce 0.6s infinite' : 'none'
            }}>
              <svg viewBox="0 0 24 24" style={{ width: '12px', height: '12px', fill: 'none', stroke: 'white', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>
            </button>
            <button onClick={() => setMuted(m => !m)} title={muted ? 'Unmute TAMi' : 'Mute TAMi'} style={{
              background: muted ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.18)', border: muted ? '1px solid rgba(239,68,68,0.5)' : 'none', color: 'white',
              width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(10px)', transition: 'all 0.2s ease'
            }}>
              {muted ? (
                <svg viewBox="0 0 24 24" style={{ width: '12px', height: '12px', fill: 'none', stroke: '#EF4444', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" style={{ width: '12px', height: '12px', fill: 'none', stroke: '#A78BFA', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
              )}
            </button>
            <button onClick={resetChat} title="New chat" style={{
              background: 'rgba(255,255,255,0.18)', border: 'none', color: 'white',
              width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(10px)'
            }}>
              <svg viewBox="0 0 24 24" style={{ width: '12px', height: '12px', fill: 'none', stroke: 'white', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '140px', height: '140px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35), 0 0 0 4px rgba(255,255,255,0.25), 0 0 20px 2px rgba(245,158,11,0.2)',
            overflow: 'hidden', transition: 'transform 0.25s ease, box-shadow 0.25s ease'
          }}>
            <img src="/tami-avatar.png" alt="TAMi" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'white', fontSize: '18px', fontWeight: 700, letterSpacing: '-0.3px' }}>TAMi</span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 6px rgba(74,222,128,0.6)' }} />
          </div>
        </div>
      </div>

      {/* MESSAGES */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px',
        display: 'flex', flexDirection: 'column', gap: '12px', background: '#0F0A1A'
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            animation: 'tamiSlideUp 0.3s ease-out'
          }}>
            {msg.role === 'assistant' && (
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #7C3AED, #DB2777)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', marginRight: '8px', flexShrink: 0, marginTop: '2px',
                overflow: 'hidden'
              }}>
                <span style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'white', animation: 'thinkBounce 1.4s ease-in-out infinite' }} />
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'white', animation: 'thinkBounce 1.4s ease-in-out infinite 0.2s' }} />
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'white', animation: 'thinkBounce 1.4s ease-in-out infinite 0.4s' }} />
                </span>
              </div>
            )}
              <div style={{
                maxWidth: '75%', padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #7C3AED, #6D28D9)'
                : 'rgba(255, 255, 255, 0.08)',
              color: msg.role === 'user' ? 'white' : '#E2E8F0',
              fontSize: '14px', lineHeight: '1.5', wordBreak: 'break-word'
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', animation: 'tamiSlideUp 0.3s ease-out' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #7C3AED, #DB2777)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', flexShrink: 0, overflow: 'hidden'
            }}>
              <span style={{ fontSize: '14px', color: '#fff', fontWeight: '700' }}>T</span>
            </div>
            <div style={{
              borderRadius: '16px 16px 16px 4px',
              background: 'rgba(255, 255, 255, 0.08)', display: 'flex', gap: '4px'
            }}>
              {[0, 1, 2].map(j => (
                <div key={j} style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: '#8B5CF6',
                  animation: `tamiDots 1.4s infinite ${j * 0.2}s`
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* FOOTER - Quick Questions + Input */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: '#130E22' }}>
        {/* Quick Questions drawer toggle */}
        <button
          onClick={() => setShowQuickActions && setShowQuickActions(p => !p)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '6px', width: '100%', padding: '8px 16px',
            background: 'none', border: 'none',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            color: '#A78BFA', fontSize: '12px', fontWeight: 600,
            cursor: 'pointer', letterSpacing: '0.3px'
          }}
        >
          Quick Questions <span style={{ fontSize: '10px', transition: 'transform 0.3s' }}>{showQuickActions ? '\u25BC' : '\u25B2'}</span>
        </button>
        {showQuickActions && (
          <div style={{ display: 'flex', gap: '8px', padding: '10px 16px 12px', overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {quickActions.map((action, i) => (
              <button key={i} onClick={() => { setInput(action.label); sendMessage(action.label); }} style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.15))',
                border: '1px solid rgba(139,92,246,0.3)', color: '#C4B5FD',
                padding: '8px 14px', borderRadius: '20px', cursor: 'pointer',
                fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'all 0.2s ease'
              }}>
                {action.label}
              </button>
            ))}
          </div>
        )}
        {/* Input area */}
        <div style={{ padding: '8px 16px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Voice state panels */}
              {(voicePhase === 'speaking' || voicePhase === 'post_hold') && (
                <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.35)', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '22px' }}>
                    {[8,14,20,24,20,14,8].map((h, i) => (
                      <div key={i} style={{ width: '3px', height: (voicePhase === 'speaking' ? h : 4) + 'px', background: 'rgba(167,139,250,0.8)', borderRadius: '2px', transition: 'height 0.3s ease', animation: voicePhase === 'speaking' ? ('dotPulse ' + (0.75 + i * 0.08) + 's ease-in-out infinite alternate') : 'none', animationDelay: (i * 0.11) + 's' }} />
                    ))}
                  </div>
                  <span style={{ color: '#A78BFA', fontSize: '12px', fontWeight: '700', letterSpacing: '0.06em' }}>{voicePhase === 'speaking' ? 'TAMi is speaking' : 'TAMi finished...'}</span>
                </div>
              )}
              {(voicePhase === 'listening' || voicePhase === 'ready' || voicePhase === 'processing' || voicePhase === 'responding') && (
                <div style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '10px', padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: liveTranscript ? '8px' : '0' }}>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      {[0, 0.2, 0.4].map((d, i) => (
                        <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: voicePhase === 'listening' ? 'rgba(167,139,250,0.9)' : 'rgba(139,92,246,0.35)', display: 'inline-block', animation: voicePhase === 'listening' ? 'dotPulse 0.9s ease-in-out infinite' : 'none', animationDelay: d + 's' }} />
                      ))}
                    </div>
                    <span style={{ color: voicePhase === 'listening' ? '#A78BFA' : 'rgba(167,139,250,0.45)', fontSize: '12px', fontWeight: voicePhase === 'listening' ? '700' : '400', letterSpacing: '0.05em', flex: 1 }}>
                      {voicePhase === 'listening' ? 'Listening...' : voicePhase === 'processing' || voicePhase === 'responding' ? 'Thinking...' : 'Ready...'}
                    </span>
                  </div>
                  {liveTranscript && (
                    <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', lineHeight: '1.45', padding: '6px 10px', background: 'rgba(139,92,246,0.1)', borderRadius: '6px', border: '1px solid rgba(139,92,246,0.2)' }}>{liveTranscript}</div>
                  )}
                </div>
              )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !loading && input.trim() && sendMessage()}
                placeholder={isListening ? 'Listening...' : 'Ask TAMi anything...'}
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.06)',
                  border: isListening ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(139,92,246,0.2)',
                  borderRadius: '24px', padding: '10px 16px',
                  color: '#E2E8F0', fontSize: '14px', outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = isListening ? 'rgba(239,68,68,0.7)' : 'rgba(139,92,246,0.5)'}
                onBlur={e => e.target.style.borderColor = isListening ? 'rgba(239,68,68,0.5)' : 'rgba(139,92,246,0.2)'}
              />
              <button
                onClick={() => isListening ? stopListening() : startListening()}
                title={isListening ? 'Stop listening' : 'Tap to speak'}
                style={{
                  width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                  background: isListening ? 'linear-gradient(135deg,#EF4444,#DC2626)' : 'rgba(139,92,246,0.2)',
                  border: isListening ? '2px solid rgba(239,68,68,0.5)' : '1px solid rgba(139,92,246,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: isListening ? 'dotPulse 1s ease-in-out infinite' : 'none'
                }}
              >
                <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }} fill="none"
                  stroke={isListening ? 'white' : '#A78BFA'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="2" width="6" height="11" rx="3" />
                  <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </button>
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: loading || !input.trim() ? 'rgba(139,92,246,0.2)' : 'linear-gradient(135deg,#7C3AED,#DB2777)',
                  border: 'none', cursor: loading || !input.trim() ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px', color: 'white', transition: 'all 0.2s ease', flexShrink: 0
                }}
              >
                {loading ? (
                  <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', fill: 'none', stroke: 'white', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', fill: 'none', stroke: 'white', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                )}
              </button>
            </div>
          </div>
      </div>
    </div>
  )
}
