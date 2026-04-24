import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../services/api.js'
import { COLORS, FONTS, GRADIENTS, ANIMATIONS, SHARED, logoStyles } from '../styles/theme.js'

const LOGO = logoStyles(138, 165)

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
  ${ANIMATIONS}
  *{box-sizing:border-box;}
  .reg-wyl-opt:hover{background:rgba(217,70,239,0.07);}
  .reg-wyl-opt.sel{background:rgba(217,70,239,0.12);color:#d946ef;}
  .reg-wyl-opt.sel .reg-radio{border-color:#d946ef;background:#d946ef;}
  .reg-role-card:hover{border-color:rgba(217,70,239,0.4);background:rgba(217,70,239,0.05);}
  .reg-chip:hover{border-color:rgba(217,70,239,0.4);color:#d946ef;}
  .reg-avatar-card:hover{border-color:rgba(217,70,239,0.4);}
  input::placeholder{color:rgba(255,255,255,0.25);}
  select option{background:#1c2333;color:#fff;}
`

const ROLES = [
  { icon: '🎹', name: 'Student',    desc: 'Learn & practice music' },
  { icon: '👨‍👩‍👧', name: 'Parent',     desc: 'Monitor your child' },
  { icon: '👩‍🏫', name: 'Teacher',    desc: 'Manage students' },
  { icon: '⭐',  name: 'Ambassador', desc: 'Grow the community' },
]

const AVATARS = [
  { emoji: '👩🏿‍🎤', name: 'Lyric',  role: 'The Storyteller' },
  { emoji: '🦸🏽',  name: 'Jazz',   role: 'The Performer' },
  { emoji: '🧒🏻',  name: 'Coda',   role: 'The Dreamer' },
  { emoji: '🧒🏾',  name: 'Forte',  role: 'The Rockstar' },
  { emoji: '🧒🏾',  name: 'Sol',    role: 'The Composer' },
  { emoji: '🦸🏻',  name: 'Riff',   role: 'The Freestyler' },
]

const WYL_QUESTIONS = [
  { q: 'You want to learn a new song. You:', opts: [
    { label: 'Watch someone play it on video', type: 'visual' },
    { label: 'Listen to it on repeat until you know it', type: 'auditory' },
    { label: 'Read through the sheet music first', type: 'readwrite' },
    { label: 'Jump in and figure it out by playing', type: 'kinesthetic' },
  ]},
  { q: 'When you make a mistake, you prefer to:', opts: [
    { label: 'See a diagram of correct finger placement', type: 'visual' },
    { label: 'Hear the correct version played back', type: 'auditory' },
    { label: 'Write down what went wrong', type: 'readwrite' },
    { label: 'Repeat the passage until it feels right', type: 'kinesthetic' },
  ]},
  { q: 'Your teacher shows a new rhythm. You learn it best by:', opts: [
    { label: 'Watching them tap it out', type: 'visual' },
    { label: 'Hearing them count it aloud', type: 'auditory' },
    { label: 'Reading the notation on the page', type: 'readwrite' },
    { label: 'Clapping or tapping it yourself', type: 'kinesthetic' },
  ]},
  { q: 'To remember a chord progression, you:', opts: [
    { label: 'Picture the keys on the keyboard', type: 'visual' },
    { label: 'Hum the notes to yourself', type: 'auditory' },
    { label: 'Write out the chord names', type: 'readwrite' },
    { label: 'Practice until it\'s muscle memory', type: 'kinesthetic' },
  ]},
  { q: 'The best way for you to improve is:', opts: [
    { label: 'Watching video tutorials', type: 'visual' },
    { label: 'Listening to great musicians', type: 'auditory' },
    { label: 'Reading music theory books', type: 'readwrite' },
    { label: 'Playing for as many hours as possible', type: 'kinesthetic' },
  ]},
  { q: 'When you hear a song you like, you first notice:', opts: [
    { label: 'The performance visuals or music video', type: 'visual' },
    { label: 'The melody or harmony', type: 'auditory' },
    { label: 'The lyrics and their meaning', type: 'readwrite' },
    { label: 'The beat and rhythm you want to move to', type: 'kinesthetic' },
  ]},
  { q: 'Preparing for a performance, you:', opts: [
    { label: 'Visualize yourself on stage', type: 'visual' },
    { label: 'Play recordings of the piece repeatedly', type: 'auditory' },
    { label: 'Go through your annotated score', type: 'readwrite' },
    { label: 'Run through it physically as many times as possible', type: 'kinesthetic' },
  ]},
  { q: 'In a group class, you prefer the teacher to:', opts: [
    { label: 'Show visual diagrams on the board', type: 'visual' },
    { label: 'Demonstrate on an instrument', type: 'auditory' },
    { label: 'Hand out written notes', type: 'readwrite' },
    { label: 'Let students try it themselves first', type: 'kinesthetic' },
  ]},
  { q: 'You remember music best when:', opts: [
    { label: 'You can picture the notes on the staff', type: 'visual' },
    { label: 'You\'ve heard it many times', type: 'auditory' },
    { label: 'You\'ve read about the theory behind it', type: 'readwrite' },
    { label: 'You\'ve played it with your hands', type: 'kinesthetic' },
  ]},
  { q: 'When stuck on a piece, you:', opts: [
    { label: 'Look up YouTube tutorials', type: 'visual' },
    { label: 'Call someone and ask them to explain it', type: 'auditory' },
    { label: 'Search for written explanations online', type: 'readwrite' },
    { label: 'Keep experimenting until something works', type: 'kinesthetic' },
  ]},
]

function scoreWYL(answers) {
  const counts = { visual: 0, auditory: 0, readwrite: 0, kinesthetic: 0 }
  answers.forEach(a => { if (a) counts[a]++ })
  const total = Object.values(counts).reduce((s, v) => s + v, 0) || 1
  const scores = {}
  Object.keys(counts).forEach(k => { scores[k] = Math.round((counts[k] / total) * 100) })
  const dominant = Object.keys(counts).reduce((a, b) => counts[a] >= counts[b] ? a : b)
  return { ...scores, dominant, answered: answers.filter(Boolean).length }
}

const WYL_LABEL = { visual: 'Visual', auditory: 'Auditory', readwrite: 'Read/Write', kinesthetic: 'Kinesthetic' }
const DURATIONS = ['Less than 6 months', '6 months–2 years', '2+ years']
const READINGS  = ['Not at all', 'With some difficulty', 'Comfortably']
const GOALS     = ['Just for fun', 'Play for friends/family', 'Perform or take exams']
const STEPS     = ['Profile', 'Role', 'Music', 'WYL', 'Assessment', 'Avatar', 'Confirm']

export default function RegistrationPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [step, setStep] = useState(0)
  const [role, setRole] = useState('Student')
  const [avatar, setAvatar] = useState(0)
  const [exp, setExp] = useState('Beginner')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [genre, setGenre] = useState('')
  const [song, setSong] = useState('')
  const [instrument, setInstrument] = useState('Piano')
  const [wylAnswers, setWylAnswers] = useState(Array(10).fill(null))
  const [assessmentDuration, setAssessmentDuration] = useState(0)
  const [assessmentReading, setAssessmentReading] = useState(1)
  const [assessmentGoal, setAssessmentGoal] = useState(0)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const wyl = scoreWYL(wylAnswers)
  const go = (dir) => { setError(''); setStep(s => Math.max(0, Math.min(6, s + dir))) }
  const setWylAnswer = (qIdx, type) => {
    setWylAnswers(prev => { const next = [...prev]; next[qIdx] = type; return next })
  }

  const finish = async () => {
    const fullName = `${firstName} ${lastName}`.trim()
    if (!fullName || !email || !password) { setError('Please fill in name, email and password'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setError(''); setIsSubmitting(true)
    try {
      const user = await api.register({
        name: fullName, email, password, role,
        avatar: AVATARS[avatar]?.name || '',
        instrument, genre, song, experience: exp,
        assessment: {
          duration: DURATIONS[assessmentDuration],
          reading: READINGS[assessmentReading],
          goal: GOALS[assessmentGoal],
        },
        wyl: {
          visual: wyl.visual, auditory: wyl.auditory,
          readwrite: wyl.readwrite, kinesthetic: wyl.kinesthetic,
          dominant: wyl.dominant,
        },
      })
      const userData = user.user || user
      const token = user.token || userData?.token || null
      login(userData, token)
      const userId = user.user?.id || user.id
      if (wyl && userId) api.updateWYL(userId, wyl).catch(() => {})
      navigate('/dashboard')
    } catch (err) {
      const msg = typeof err?.message === 'string' ? err.message : 'Registration failed. Please try again.'
      setError(msg)
      setIsSubmitting(false)
    }
  }

  const pillState = (i) => i < step ? 'done' : i === step ? 'active' : 'upcoming'
  const dotState  = (i) => i < step ? 'done' : i === step ? 'active' : 'inactive'

  return (
    <div style={S.page}>
      <style>{css}</style>

      <div style={S.topLabel}>School of Motesart — Registration</div>

      <div style={S.stepNav}>
        {STEPS.map((s, i) => (
          <div
            key={s}
            onClick={() => setStep(i)}
            style={{
              ...S.stepPill,
              ...(pillState(i) === 'active' ? S.stepPillActive : {}),
              ...(pillState(i) === 'done'   ? S.stepPillDone  : {}),
            }}
          >
            {i + 1} · {s}
          </div>
        ))}
      </div>

      <div style={S.card}>
        {/* Logo */}
        <div style={S.logoWrapper}>
          <div style={LOGO.logoGlow} />
          <div style={LOGO.laserRing1} />
          <div style={LOGO.laserRing2} />
          <div style={LOGO.logoCircle}>
            <img src="/SOM_logo.png" alt="School of Motesart" style={LOGO.logoImg} />
          </div>
        </div>

        <div style={S.cardTitle}>School of <span style={S.cardAccent}>Motesart</span></div>

        <div style={S.stepIndicator}>Step {step + 1} of 7</div>

        <div style={S.progressDots}>
          {Array.from({length: 7}).map((_, i) => (
            <div key={i} style={{
              ...S.dot,
              ...(dotState(i) === 'active' ? S.dotActive  : {}),
              ...(dotState(i) === 'done'   ? S.dotDone    : {}),
              ...(dotState(i) === 'inactive' ? S.dotInactive : {}),
            }} />
          ))}
        </div>

        {/* STEP 0 — Profile */}
        {step === 0 && (
          <div style={S.stepBody}>
            <div style={S.stepTitle}>Set up your profile</div>
            <div style={S.stepSub}>Tell us a bit about yourself</div>
            <div style={S.confidenceAnchor}>Takes less than 2 minutes — we'll personalize your learning style.</div>
            <div style={S.fieldRow}>
              <div style={S.field}>
                <label style={S.label}>First Name *</label>
                <input style={S.input} placeholder="John" value={firstName} onChange={e => setFirstName(e.target.value)} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Last Name *</label>
                <input style={S.input} placeholder="Doe" value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
            </div>
            <div style={S.field}>
              <label style={S.label}>Email *</label>
              <input style={S.input} type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div style={S.field}>
              <label style={S.label}>Password *</label>
              <input style={S.input} type="password" placeholder="Create a password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            {error && <p style={S.error}>{error}</p>}
            <button style={S.btnPrimary} onClick={() => go(1)}>Continue →</button>
          </div>
        )}

        {/* STEP 1 — Role */}
        {step === 1 && (
          <div style={S.stepBody}>
            <div style={S.stepTitle}>Choose your role</div>
            <div style={S.stepSub}>How will you use School of Motesart?</div>
            <div style={S.roleGrid}>
              {ROLES.map(r => (
                <div
                  key={r.name}
                  className="reg-role-card"
                  onClick={() => setRole(r.name)}
                  style={{
                    ...S.roleCard,
                    ...(role === r.name ? S.roleCardSel : {}),
                  }}
                >
                  <div style={{ fontSize: 26, marginBottom: 6 }}>{r.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{r.name}</div>
                  <div style={{ fontSize: 10, color: COLORS.textSecondary, marginTop: 2 }}>{r.desc}</div>
                </div>
              ))}
            </div>
            <div style={S.btnRow}>
              <button style={S.btnSecondary} onClick={() => go(-1)}>← Back</button>
              <button style={{...S.btnPrimary, flex: 1}} onClick={() => go(1)}>Continue →</button>
            </div>
          </div>
        )}

        {/* STEP 2 — Music */}
        {step === 2 && (
          <div style={S.stepBody}>
            <div style={S.stepTitle}>Your music journey</div>
            <div style={S.stepSub}>Help T.A.M.i personalize your experience</div>
            <div style={S.field}>
              <label style={S.label}>Favorite Genre</label>
              <input style={S.input} placeholder="e.g. R&B, Classical, Pop" value={genre} onChange={e => setGenre(e.target.value)} />
            </div>
            <div style={S.field}>
              <label style={S.label}>Favorite Song</label>
              <input style={S.input} placeholder="e.g. Moonlight Sonata" value={song} onChange={e => setSong(e.target.value)} />
            </div>
            <div style={S.field}>
              <label style={S.label}>Primary Instrument</label>
              <select style={S.input} value={instrument} onChange={e => setInstrument(e.target.value)}>
                {['Piano','Guitar','Violin','Voice','Drums','Bass','Cello','Flute','Trumpet','Saxophone'].map(i => <option key={i}>{i}</option>)}
              </select>
            </div>
            <div style={S.field}>
              <label style={S.label}>Experience Level</label>
              <div style={S.chips}>
                {['Beginner','Intermediate','Advanced'].map(e => (
                  <div key={e} className="reg-chip" onClick={() => setExp(e)} style={{...S.chip, ...(exp === e ? S.chipSel : {})}}>
                    {e}
                  </div>
                ))}
              </div>
            </div>
            <div style={S.btnRow}>
              <button style={S.btnSecondary} onClick={() => go(-1)}>← Back</button>
              <button style={{...S.btnPrimary, flex: 1}} onClick={() => go(1)}>Continue →</button>
            </div>
          </div>
        )}

        {/* STEP 3 — WYL */}
        {step === 3 && (
          <div style={S.stepBody}>
            <div style={S.stepTitle}>Way You Learn</div>
            <div style={S.stepSub}>Helps T.A.M.i teach the way that works best for you</div>
            <div style={S.wylProgressBar}>
              {WYL_QUESTIONS.map((_, i) => (
                <div key={i} style={{...S.wylTick, ...(wylAnswers[i] ? S.wylTickDone : {})}} />
              ))}
            </div>
            <div style={{ fontSize: 11, color: COLORS.accent, marginBottom: 12, fontWeight: 600 }}>
              {wyl.answered} / 10 answered
              {wyl.answered > 0 && wyl.dominant && ` · ${WYL_LABEL[wyl.dominant]} leaning`}
            </div>
            <div style={S.wylScroll}>
              {WYL_QUESTIONS.map((q, qi) => (
                <div key={qi} style={{...S.wylQ, ...(wylAnswers[qi] ? S.wylQAnswered : {})}}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 8, lineHeight: 1.5 }}>
                    {qi + 1}. {q.q}
                  </div>
                  {q.opts.map((o, oi) => (
                    <div
                      key={oi}
                      className={`reg-wyl-opt ${wylAnswers[qi] === o.type ? 'sel' : ''}`}
                      onClick={() => setWylAnswer(qi, o.type)}
                      style={S.wylOpt}
                    >
                      <div className="reg-radio" style={{
                        ...S.radio,
                        ...(wylAnswers[qi] === o.type ? S.radioSel : {}),
                      }} />
                      {o.label}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div style={S.btnRow}>
              <button style={S.btnSecondary} onClick={() => go(-1)}>← Back</button>
              <button style={{...S.btnPrimary, flex: 1}} onClick={() => go(1)}>Continue →</button>
            </div>
          </div>
        )}

        {/* STEP 4 — Assessment */}
        {step === 4 && (
          <div style={S.stepBody}>
            <div style={S.stepTitle}>Music Assessment</div>
            <div style={S.stepSub}>Helps T.A.M.i set your starting point</div>
            <div style={{ marginBottom: 14 }}>
              <div style={S.assessLabel}>How long have you been learning {instrument}?</div>
              <div style={S.chips}>
                {DURATIONS.map((d, i) => (
                  <div key={d} className="reg-chip" onClick={() => setAssessmentDuration(i)} style={{...S.chip, ...(assessmentDuration === i ? S.chipSel : {})}}>{d}</div>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={S.assessLabel}>Can you read sheet music?</div>
              <div style={S.chips}>
                {READINGS.map((r, i) => (
                  <div key={r} className="reg-chip" onClick={() => setAssessmentReading(i)} style={{...S.chip, ...(assessmentReading === i ? S.chipSel : {})}}>{r}</div>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={S.assessLabel}>What is your goal?</div>
              <div style={S.chips}>
                {GOALS.map((g, i) => (
                  <div key={g} className="reg-chip" onClick={() => setAssessmentGoal(i)} style={{...S.chip, ...(assessmentGoal === i ? S.chipSel : {})}}>{g}</div>
                ))}
              </div>
            </div>
            <div style={S.btnRow}>
              <button style={S.btnSecondary} onClick={() => go(-1)}>← Back</button>
              <button style={{...S.btnPrimary, flex: 1}} onClick={() => go(1)}>Continue →</button>
            </div>
          </div>
        )}

        {/* STEP 5 — Avatar */}
        {step === 5 && (
          <div style={S.stepBody}>
            <div style={S.stepTitle}>Choose your avatar</div>
            <div style={S.stepSub}>Pick a character that represents you</div>
            <div style={S.avatarGrid}>
              {AVATARS.map((a, i) => (
                <div
                  key={a.name}
                  className="reg-avatar-card"
                  onClick={() => setAvatar(i)}
                  style={{...S.avatarCard, ...(avatar === i ? S.avatarCardSel : {})}}
                >
                  {avatar === i && <div style={S.avatarCheck}>✓</div>}
                  <div style={{ fontSize: 36, marginBottom: 6 }}>{a.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{a.name}</div>
                  <div style={{ fontSize: 9, color: COLORS.textSecondary, marginTop: 2 }}>{a.role}</div>
                </div>
              ))}
            </div>
            <div style={S.btnRow}>
              <button style={S.btnSecondary} onClick={() => go(-1)}>← Back</button>
              <button style={{...S.btnPrimary, flex: 1}} onClick={() => go(1)}>Continue →</button>
            </div>
          </div>
        )}

        {/* STEP 6 — Confirm */}
        {step === 6 && (
          <div style={S.stepBody}>
            <div style={S.stepTitle}>Confirm your profile</div>
            <div style={S.stepSub}>Make sure everything looks right</div>
            <div style={S.confirmCard}>
              <div style={{ fontSize: 32 }}>{AVATARS[avatar].emoji}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{`${firstName} ${lastName}`.trim() || 'Your Name'}</div>
                <div style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 2 }}>{email || 'your@email.com'}</div>
                <div style={S.roleBadge}>{role}</div>
              </div>
            </div>
            <div style={S.detailCard}>
              <div style={S.detailCardTitle}>🎵 Music Profile</div>
              <div style={{ color: COLORS.textSecondary, fontSize: 12 }}>{instrument} · {exp}{genre ? ` · ${genre}` : ''}</div>
            </div>
            <div style={S.detailCard}>
              <div style={S.detailCardTitle}>🧠 Way You Learn</div>
              {wyl.answered > 0
                ? <div style={{ fontSize: 12 }}><span style={{ color: COLORS.accent }}>{WYL_LABEL[wyl.dominant]}</span> <span style={{ color: COLORS.textSecondary }}>learner · {wyl.answered}/10 answered</span></div>
                : <div style={{ fontSize: 12, color: COLORS.textSecondary }}>Not completed (optional)</div>
              }
            </div>
            <div style={S.detailCard}>
              <div style={S.detailCardTitle}>🎯 Assessment</div>
              <div style={{ color: COLORS.textSecondary, fontSize: 12 }}>{DURATIONS[assessmentDuration]} · {GOALS[assessmentGoal]}</div>
            </div>
            {error && <p style={S.error}>{error}</p>}
            <div style={S.btnRow}>
              <button style={S.btnSecondary} onClick={() => go(-1)}>← Back</button>
              <button
                style={{...S.btnPrimary, flex: 1, opacity: isSubmitting ? 0.6 : 1}}
                onClick={finish}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating Account...' : 'Finish Setup →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const S = {
  page: {
    minHeight: '100vh',
    background: GRADIENTS.page,
    fontFamily: FONTS.body,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '28px 16px 60px',
    position: 'relative', overflow: 'hidden',
  },
  topLabel: {
    fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
    color: COLORS.textMuted, marginBottom: 16, fontFamily: FONTS.body,
  },
  stepNav: {
    display: 'flex', gap: 6, marginBottom: 24,
    flexWrap: 'wrap', justifyContent: 'center',
    width: '100%', maxWidth: 680,
  },
  stepPill: {
    fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
    padding: '6px 14px', borderRadius: 20,
    border: `1px solid ${COLORS.cardBorder}`,
    background: 'rgba(255,255,255,0.04)',
    color: COLORS.textMuted,
    fontFamily: FONTS.body, fontWeight: 500,
    cursor: 'pointer', transition: 'all .2s',
  },
  stepPillActive: {
    borderColor: 'rgba(217,70,239,0.5)',
    background: 'rgba(217,70,239,0.1)',
    color: COLORS.accent,
  },
  stepPillDone: {
    borderColor: 'rgba(217,70,239,0.25)',
    background: 'rgba(217,70,239,0.05)',
    color: 'rgba(217,70,239,0.6)',
  },
  card: {
    background: COLORS.cardBg,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 20,
    padding: '36px 40px 28px',
    width: '100%', maxWidth: 680,
    backdropFilter: 'blur(20px)',
    boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  logoWrapper: { ...LOGO.logoWrapper, marginBottom: 10 },
  cardTitle: {
    fontFamily: FONTS.display, fontSize: 20, fontWeight: 700,
    color: '#fff', margin: '0 0 2px', textAlign: 'center',
  },
  cardAccent: { color: COLORS.accent },
  stepIndicator: {
    fontSize: 10, letterSpacing: '0.12em', color: COLORS.accent,
    textTransform: 'uppercase', marginBottom: 10, marginTop: 4,
  },
  progressDots: { display: 'flex', gap: 5, marginBottom: 18, justifyContent: 'center' },
  dot:         { height: 4, borderRadius: 3, background: 'rgba(255,255,255,0.1)', width: 14 },
  dotActive:   { width: 24, background: COLORS.accent },
  dotDone:     { width: 14, background: COLORS.accent, opacity: 0.4 },
  dotInactive: { width: 14, background: 'rgba(255,255,255,0.1)' },
  stepBody:    { width: '100%' },
  stepTitle:   { fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 3, fontFamily: FONTS.display },
  stepSub:     { fontSize: 13, color: COLORS.textSecondary, marginBottom: 10 },
  confidenceAnchor: {
    fontSize: 11, color: COLORS.textMuted,
    background: 'rgba(217,70,239,0.07)',
    border: '1px solid rgba(217,70,239,0.15)',
    borderRadius: 8, padding: '8px 12px',
    marginBottom: 16, lineHeight: 1.5,
  },
  field:    { marginBottom: 12, width: '100%' },
  fieldRow: { display: 'flex', gap: 8, width: '100%' },
  label:    { display: 'block', fontSize: 10, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 },
  input: {
    width: '100%', background: 'rgba(255,255,255,0.07)',
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 10, padding: '12px 14px',
    color: '#fff', fontSize: 14, fontFamily: FONTS.body,
    outline: 'none', boxSizing: 'border-box',
  },
  btnPrimary: {
    background: GRADIENTS.primary,
    color: '#fff', border: 'none', borderRadius: 12,
    padding: '13px 0', fontSize: 15, fontWeight: 700,
    fontFamily: FONTS.body, cursor: 'pointer', width: '100%',
  },
  btnSecondary: {
    background: 'rgba(255,255,255,0.06)',
    color: COLORS.textSecondary,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 12, padding: '13px 0',
    fontSize: 15, fontWeight: 600,
    fontFamily: FONTS.body, cursor: 'pointer', flex: 1,
  },
  btnRow:  { display: 'flex', gap: 8, marginTop: 14, width: '100%' },
  error:   { color: COLORS.error, fontSize: 12, margin: '8px 0 0', textAlign: 'center' },
  chips:   { display: 'flex', flexWrap: 'wrap', gap: 6 },
  chip: {
    background: 'rgba(255,255,255,0.06)',
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 8, padding: '8px 14px',
    fontSize: 12, cursor: 'pointer', color: COLORS.textSecondary,
    transition: 'all .15s',
  },
  chipSel: {
    borderColor: COLORS.accent,
    background: 'rgba(217,70,239,0.12)',
    color: COLORS.accent,
  },
  roleGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14, width: '100%' },
  roleCard: {
    background: 'rgba(255,255,255,0.05)',
    border: `1.5px solid ${COLORS.cardBorder}`,
    borderRadius: 12, padding: '14px 12px',
    cursor: 'pointer', textAlign: 'center', transition: 'all .2s',
  },
  roleCardSel: {
    borderColor: COLORS.accent,
    background: 'rgba(217,70,239,0.1)',
  },
  wylProgressBar: { display: 'flex', gap: 3, marginBottom: 8, flexWrap: 'wrap' },
  wylTick:     { width: 18, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.1)', transition: 'background .2s' },
  wylTickDone: { background: COLORS.accent },
  wylScroll:   { maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 },
  wylQ: {
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 10, padding: '10px 12px',
    border: `1px solid ${COLORS.cardBorder}`,
  },
  wylQAnswered: { borderColor: 'rgba(217,70,239,0.3)' },
  wylOpt: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '9px 10px', borderRadius: 7,
    fontSize: 12, color: COLORS.textSecondary,
    marginBottom: 2, cursor: 'pointer', transition: 'all .15s',
  },
  radio: {
    width: 12, height: 12, borderRadius: '50%',
    border: `2px solid ${COLORS.cardBorder}`,
    flexShrink: 0, transition: 'all .15s',
  },
  radioSel: { borderColor: COLORS.accent, background: COLORS.accent },
  assessLabel: { fontSize: 12, fontWeight: 500, color: '#fff', marginBottom: 8 },
  avatarGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14, width: '100%' },
  avatarCard: {
    background: 'rgba(255,255,255,0.05)',
    border: `2px solid ${COLORS.cardBorder}`,
    borderRadius: 14, padding: '16px 10px 12px',
    textAlign: 'center', cursor: 'pointer',
    position: 'relative', transition: 'all .2s',
  },
  avatarCardSel: {
    borderColor: COLORS.accent,
    background: 'rgba(217,70,239,0.08)',
    boxShadow: `0 0 16px rgba(217,70,239,0.2)`,
  },
  avatarCheck: {
    position: 'absolute', top: 6, right: 8,
    fontSize: 9, color: COLORS.accent, fontWeight: 700,
  },
  confirmCard: {
    background: 'rgba(255,255,255,0.06)',
    borderRadius: 12, padding: '14px',
    marginBottom: 10, display: 'flex', gap: 12, alignItems: 'center', width: '100%',
  },
  detailCard: {
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 10, padding: '10px 12px',
    marginBottom: 8, width: '100%',
  },
  detailCardTitle: { fontSize: 11, fontWeight: 700, color: '#fff', marginBottom: 4 },
  roleBadge: {
    display: 'inline-block',
    background: 'rgba(217,70,239,0.15)',
    color: COLORS.accent, fontSize: 9,
    padding: '2px 8px', borderRadius: 20, marginTop: 4,
  },
}
