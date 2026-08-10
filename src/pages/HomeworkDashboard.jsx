import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api.js'
import { isCanonicalAssignmentId } from '../services/evidenceClient.js'
import InstrumentSelect from '../components/InstrumentSelect.jsx'
import rrLevels from '../data/rhythm_racer_levels.json'

/* ── M1 R1 live assignments — GET /assignments/mine ──────────────────────────
 * Aligned to the canonical backend R1 serializer (parse_assignment @ 69147f5):
 *   id · assignment_id (Airtable rec… — the ONLY completion/evidence linkage
 *   key) · assignment_number (Autonumber, DISPLAY ONLY) · name · status ·
 *   student · due_date · title · minutes_target · type · teacher_feedback ·
 *   homework_template · student_instruments · created_by · concept_id ·
 *   completed_at · evidence_ref
 * Canonical names only — the R1 serializer makes the old defensive aliases
 * (concept, completedAt, evidenceRef, assignment_type, description)
 * unnecessary, so they are removed rather than hiding contract mismatches. */
const humanizeConcept = (c) =>
  c ? c.replace(/^[TR]_/, '').replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase()) : 'Assignment'

const rrLevelForConcept = (concept) => {
  const match = rrLevels.find(l => l.concept === concept)
  return match ? match.level : 1
}

// Launch routing: R_* → Rhythm Racer · Quiz → /game · everything else →
// /practice-live. The concept parameter is ONLY attached when the assignment
// actually carries one — a missing concept is never replaced with an invented
// default (no fabricated T_HALF_STEP / T_MAJOR_SCALE_PATTERN).
function launchRouteFor(a) {
  if (!a.assignmentId || !isCanonicalAssignmentId(a.assignmentId)) return null
  if (a.concept && a.concept.startsWith('R_')) {
    return `/rhythm-racer?mode=academic&concept=${encodeURIComponent(a.concept)}&assignment_id=${encodeURIComponent(a.assignmentId)}&level=${rrLevelForConcept(a.concept)}`
  }
  if (a.type === 'Quiz') {
    return a.concept
      ? `/game?mode=academic&concept=${encodeURIComponent(a.concept)}&assignment_id=${encodeURIComponent(a.assignmentId)}`
      : null
  }
  return a.concept
    ? `/practice-live?concept=${encodeURIComponent(a.concept)}&assignment_id=${encodeURIComponent(a.assignmentId)}`
    : null
}

function mapAssignment(a) {
  if (!a || typeof a !== 'object') return null
  const assignmentId = a.assignment_id || a.id || '' // both are the Airtable rec… id in the R1 serializer
  const concept = a.concept_id || ''
  const status = String(a.status || 'Assigned')
  const completed = status === 'Completed'
  const type = a.type || 'Homework'
  const mapped = {
    assignmentId,
    assignmentNumber: a.assignment_number ?? null, // display-only, never an identifier
    concept,
    type,
    name: a.name || '',
    title: a.title || a.name || `${humanizeConcept(concept)}${concept.startsWith('R_') ? ' — Rhythm' : ''}`,
    desc: concept
      ? `Launch this assignment and complete the ${humanizeConcept(concept)} practice.`
      : 'Your teacher will connect this assignment to a practice activity.',
    status,
    statusCls: completed ? 'co' : /progress/i.test(status) ? 'ip' : 'pn',
    completed,
    completedAt: a.completed_at || null,
    evidenceRef: a.evidence_ref || null,
    dueDate: a.due_date || null,
    minutesTarget: a.minutes_target ?? null,
    teacherFeedback: a.teacher_feedback || null,
  }
  mapped.route = launchRouteFor(mapped)
  return mapped
}
const SHEETS = [
  { name:'C Major Scale', meta:'Added Jan 10 \u00b7 Ms. Johnson' },
  { name:'Hanon No. 1', meta:'Added Jan 8 \u00b7 Ms. Johnson' },
  { name:'G Major Scale', meta:'Added Jan 5 \u00b7 Ms. Johnson' },
  { name:'Twinkle Variation', meta:'Added Dec 20 \u00b7 Ms. Johnson' },
]
// Article XIII: archive shows tier language, never scores/percentages.
const ARCH = [
  { name:'Interval Training', meta:'Homework \u00b7 Completed \u2713', tier:'Owned it', color:'#22c55e', date:'Jan 18', bg:'rgba(34,197,94,0.1)' },
  { name:'Note Reading Basics', meta:'Homework \u00b7 Completed \u2713', tier:'Owned it', color:'#22c55e', date:'Jan 12', bg:'rgba(34,197,94,0.1)' },
  { name:'Rhythm Exercise', meta:'Homework \u00b7 Completed \u2713', tier:'Solid', color:'#f59e0b', date:'Jan 6', bg:'rgba(245,158,11,0.1)' },
  { name:'Sight Reading Test', meta:'Quiz \u00b7 Completed \u2713', tier:'Growing', color:'#f09595', date:'Dec 19', bg:'rgba(226,75,74,0.1)' },
]
const ANN = [
  { initials:'MJ', name:'Ms. Johnson', time:'Today \u00b7 9:00 AM', pinned:true, title:'Recital coming up \u2014 Jan 30th!', body:'Our winter recital is January 30th at 5pm. Please have your piece memorized by next week\u2019s lesson. Parents are welcome to attend!' },
  { initials:'MJ', name:'Ms. Johnson', time:'Yesterday \u00b7 3:15 PM', pinned:false, title:'New sheet music added', body:'I\u2019ve added Hanon No. 1 and the G Major scale to your sheet music library. Please review before Thursday\u2019s lesson.' },
]

const css = `
.hw-page{display:flex;flex-direction:column;height:100vh;overflow:hidden;background:#0d1117;font-family:'DM Sans',sans-serif;color:#fff}
.hw-topbar{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0}
.hw-title{font-family:'Outfit',sans-serif;font-size:16px;font-weight:700;color:#fff}
.hw-sub{font-size:11px;color:rgba(255,255,255,0.28);margin-top:2px}
.hw-bell{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative}
.hw-bell-dot{position:absolute;top:4px;right:4px;width:6px;height:6px;border-radius:50%;background:#e84b8a;border:1.5px solid #0d1117}
.hw-tabs{display:flex;padding:0 20px;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0;gap:2px}
.hw-tab{padding:10px 14px;font-size:12px;font-weight:500;color:rgba(255,255,255,0.3);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap;transition:all .15s;display:flex;align-items:center;gap:6px;background:none;border-top:none;border-left:none;border-right:none;font-family:'DM Sans',sans-serif}
.hw-tab:hover{color:rgba(255,255,255,0.55)}
.hw-tab.active{color:#14b8a6;border-bottom-color:#14b8a6}
.hw-tab-badge{font-size:10px;font-weight:600;padding:1px 5px;border-radius:8px;background:rgba(245,158,11,0.18);color:#f59e0b}
.hw-body{flex:1;overflow:hidden;position:relative}
.hw-tc{position:absolute;top:0;left:0;right:0;bottom:0;overflow-y:auto;padding:16px 20px;display:none;flex-direction:column;gap:10px}
.hw-tc.active{display:flex}
.hw-filters{display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap}
.hw-fp{padding:4px 12px;font-size:11px;border-radius:20px;border:1px solid rgba(255,255,255,0.09);background:transparent;color:rgba(255,255,255,0.3);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s;white-space:nowrap}
.hw-fp:hover{border-color:rgba(255,255,255,0.2);color:rgba(255,255,255,0.5)}
.hw-fp.active{background:#14b8a6;border-color:#14b8a6;color:#fff;font-weight:500}
.hw-acard{background:#111827;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:14px 15px;cursor:pointer;display:flex;align-items:center;gap:12px;transition:border-color .15s;flex-shrink:0}
.hw-acard:hover{border-color:rgba(20,184,166,0.25)}
.hw-acard.overdue{border-left:3px solid rgba(226,75,74,0.5);border-radius:0 12px 12px 0}
.hw-acard-left{flex:1;min-width:0}
.hw-acard-title{font-family:'Outfit',sans-serif;font-size:13px;font-weight:600;color:#fff;margin-bottom:7px}
.hw-badges{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:9px}
.hw-bdg{font-size:10px;padding:2px 8px;border-radius:20px;font-weight:500;display:inline-block}
.hw-bdg-hw{background:rgba(20,184,166,0.12);color:#14b8a6}
.hw-bdg-qz{background:rgba(133,183,235,0.12);color:#85B7EB}
.hw-bdg-ip{background:rgba(133,183,235,0.12);color:#85B7EB}
.hw-bdg-pn{background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.38)}
.hw-bdg-ov{background:rgba(226,75,74,0.12);color:#f09595}
.hw-bdg-co{background:rgba(34,197,94,0.12);color:#22c55e}
.hw-cpill{font-size:10px;font-weight:500;padding:2px 8px;border-radius:20px;display:inline-block}
.cp-teal{background:rgba(20,184,166,0.1);color:#14b8a6}
.cp-amber{background:rgba(245,158,11,0.1);color:#f59e0b}
.cp-red{background:rgba(226,75,74,0.1);color:#f09595}
.cp-green{background:rgba(34,197,94,0.1);color:#22c55e}
.hw-prog-track{height:4px;background:rgba(255,255,255,0.07);border-radius:2px;overflow:hidden}
.hw-prog-fill{height:4px;border-radius:2px;background:#14b8a6}
.hw-prog-fill.red{background:#f09595}
.hw-chev{font-size:16px;color:rgba(255,255,255,0.2);flex-shrink:0}
.hw-det{position:absolute;top:0;left:0;right:0;bottom:0;background:#0d1117;overflow-y:auto;transform:translateX(100%);transition:transform .3s cubic-bezier(.4,0,.2,1);padding:16px 20px;display:flex;flex-direction:column;gap:10px;z-index:5}
.hw-det.open{transform:translateX(0)}
.hw-back{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:500;color:rgba(255,255,255,0.28);cursor:pointer;margin-bottom:4px;width:fit-content;background:none;border:none;font-family:'DM Sans',sans-serif;padding:0}
.hw-back:hover{color:#14b8a6}
.hw-dcard{background:#111827;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:13px 15px}
.hw-dcard-hd{font-family:'Outfit',sans-serif;font-size:13px;font-weight:600;color:#fff;margin-bottom:9px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between}
.hw-dcard-link{font-size:11px;font-weight:400;color:#14b8a6;cursor:pointer}
.hw-desc{font-size:12px;color:rgba(255,255,255,0.45);line-height:1.65}
.hw-help-wrap{margin-top:11px;padding-top:11px;border-top:1px solid rgba(255,255,255,0.07)}
.hw-help-btn{display:flex;align-items:center;gap:9px;padding:10px 12px;border-radius:9px;border:1.5px dashed rgba(255,255,255,0.1);background:transparent;cursor:pointer;transition:all .2s;width:100%;text-align:left;font-family:'DM Sans',sans-serif}
.hw-help-btn:hover{border-color:rgba(20,184,166,0.3)}
.hw-help-btn.active{border:1.5px solid rgba(20,184,166,0.35);background:rgba(20,184,166,0.06)}
.hw-help-main{font-size:12px;font-weight:500;color:rgba(255,255,255,0.55)}
.hw-help-btn.active .hw-help-main{color:#14b8a6}
.hw-help-sub{font-size:10px;color:rgba(255,255,255,0.25);margin-top:2px}
.hw-help-btn.active .hw-help-sub{color:rgba(20,184,166,0.6)}
.hw-guide-box{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;border:1px solid rgba(20,184,166,0.15);background:rgba(20,184,166,0.03);cursor:pointer;margin-top:8px}
.hw-guide-av{width:30px;height:30px;border-radius:50%;overflow:hidden;border:1px solid rgba(20,184,166,0.2);flex-shrink:0;background:rgba(20,184,166,0.1);display:flex;align-items:center;justify-content:center;font-size:9px;color:#14b8a6;font-weight:600}
.hw-guide-av img{width:100%;height:100%;object-fit:cover;border-radius:50%}
.hw-guide-name{font-size:12px;font-weight:500;color:rgba(255,255,255,0.62);margin-bottom:2px}
.hw-guide-meta{font-size:10px;color:rgba(20,184,166,0.6)}
.hw-data-note{display:flex;align-items:center;gap:6px;margin-top:7px;padding:5px 9px;border-radius:6px;background:rgba(139,92,246,0.05);border:1px solid rgba(139,92,246,0.1)}
.hw-data-note-dot{width:4px;height:4px;border-radius:50%;background:rgba(139,92,246,0.5);flex-shrink:0}
.hw-data-note-txt{font-size:10px;color:rgba(139,92,246,0.6)}
.hw-fb-teacher{background:rgba(20,184,166,0.06);border:1px solid rgba(20,184,166,0.18);border-radius:8px;padding:10px 12px;margin-bottom:8px}
.hw-fb-motesart{background:rgba(20,184,166,0.03);border:1px solid rgba(20,184,166,0.12);border-radius:8px;padding:10px 12px}
.hw-fb-hd{display:flex;align-items:center;gap:7px;margin-bottom:5px}
.hw-fb-av-init{width:20px;height:20px;border-radius:50%;background:rgba(20,184,166,0.15);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:600;color:#14b8a6;flex-shrink:0}
.hw-fb-av-img{width:20px;height:20px;border-radius:50%;overflow:hidden;flex-shrink:0;background:rgba(20,184,166,0.1);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:600;color:#14b8a6}
.hw-fb-av-img img{width:100%;height:100%;object-fit:cover;border-radius:50%}
.hw-fb-label{font-size:10px;font-weight:500;color:#14b8a6;text-transform:uppercase;letter-spacing:.05em}
.hw-fb-txt{font-size:12px;color:rgba(255,255,255,0.45);line-height:1.55}
.hw-rec-btn{background:rgba(226,75,74,0.07);border:1px solid rgba(226,75,74,0.17);border-radius:8px;padding:10px 12px;display:flex;align-items:center;gap:7px;cursor:pointer;font-size:12px;font-weight:500;color:#f09595;font-family:'DM Sans',sans-serif}
.hw-rec-btn:hover{background:rgba(226,75,74,0.12)}
.hw-rec-dot{width:7px;height:7px;border-radius:50%;background:#e24b4a;flex-shrink:0}
.hw-upload{background:rgba(255,255,255,0.02);border:1px dashed rgba(255,255,255,0.09);border-radius:8px;padding:13px;text-align:center;cursor:pointer}
.hw-upload:hover{border-color:rgba(255,255,255,0.18)}
.hw-upload-lbl{font-size:12px;color:rgba(255,255,255,0.26);margin-bottom:2px}
.hw-upload-sub{font-size:10px;color:rgba(255,255,255,0.14)}
.hw-submit{background:#14b8a6;color:#fff;border:none;border-radius:20px;padding:11px;font-size:13px;font-weight:500;cursor:pointer;width:100%;font-family:'DM Sans',sans-serif}
.hw-submit:hover{opacity:.88}
.hw-tami-btn{background:rgba(232,75,138,0.07);border:1px solid rgba(232,75,138,0.16);border-radius:20px;padding:9px;font-size:12px;font-weight:500;color:#e84b8a;cursor:pointer;width:100%;text-align:center;font-family:'DM Sans',sans-serif}
.hw-tami-btn:hover{background:rgba(232,75,138,0.12)}
.hw-vis{font-size:10px;color:rgba(255,255,255,0.2);margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.05);display:flex;flex-direction:column;gap:4px}
.hw-vis-row{display:flex;align-items:center;gap:6px}
.hw-vis-dot{width:4px;height:4px;border-radius:50%;flex-shrink:0}
.hw-btns-col{display:flex;flex-direction:column;gap:7px}
.hw-sheet-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:10px}
.hw-sheet-card{background:#111827;border:1px solid rgba(255,255,255,0.07);border-radius:11px;padding:13px;display:flex;flex-direction:column;gap:9px}
.hw-sheet-top{display:flex;align-items:center;gap:9px}
.hw-sheet-ico{width:34px;height:42px;background:rgba(20,184,166,0.08);border:1px solid rgba(20,184,166,0.15);border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.hw-sheet-name{font-family:'Outfit',sans-serif;font-size:12px;font-weight:600;color:#fff;margin-bottom:2px}
.hw-sheet-meta{font-size:10px;color:rgba(255,255,255,0.28)}
.hw-sheet-btns{display:flex;gap:6px}
.hw-sheet-practice{flex:1;background:#14b8a6;color:#fff;border:none;border-radius:20px;padding:7px;font-size:11px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif}
.hw-sheet-dl{background:transparent;color:rgba(255,255,255,0.35);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:7px 10px;font-size:11px;cursor:pointer;font-family:'DM Sans',sans-serif}
.hw-arch-row{background:#111827;border:1px solid rgba(255,255,255,0.07);border-radius:9px;padding:11px 13px;display:flex;align-items:center;gap:11px;flex-shrink:0}
.hw-arch-ico{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0}
.hw-arch-info{flex:1;min-width:0}
.hw-arch-title{font-family:'Outfit',sans-serif;font-size:13px;font-weight:600;color:rgba(255,255,255,0.75);margin-bottom:2px}
.hw-arch-meta{font-size:10px;color:rgba(255,255,255,0.28)}
.hw-arch-right{text-align:right;flex-shrink:0}
.hw-arch-score{font-family:'Outfit',sans-serif;font-size:13px;font-weight:600;margin-bottom:2px}
.hw-arch-date{font-size:10px;color:rgba(255,255,255,0.25)}
.hw-ann-card{background:#111827;border:1px solid rgba(255,255,255,0.08);border-radius:11px;padding:13px 14px;flex-shrink:0}
.hw-ann-hd{display:flex;align-items:center;gap:9px;margin-bottom:8px}
.hw-ann-av{width:26px;height:26px;border-radius:50%;background:rgba(20,184,166,0.15);border:1px solid rgba(20,184,166,0.2);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:600;color:#14b8a6;flex-shrink:0}
.hw-ann-who{flex:1}
.hw-ann-name{font-size:12px;font-weight:500;color:rgba(255,255,255,0.7)}
.hw-ann-time{font-size:10px;color:rgba(255,255,255,0.25);margin-top:1px}
.hw-ann-pin{font-size:10px;font-weight:500;padding:2px 7px;border-radius:20px;background:rgba(245,158,11,0.12);color:#f59e0b;border:1px solid rgba(245,158,11,0.2)}
.hw-ann-title{font-family:'Outfit',sans-serif;font-size:13px;font-weight:600;color:#fff;margin-bottom:5px}
.hw-ann-body{font-size:12px;color:rgba(255,255,255,0.45);line-height:1.6}
.hw-tami-float{position:fixed;bottom:16px;right:16px;width:46px;height:46px;border-radius:50%;overflow:hidden;cursor:pointer;border:2px solid rgba(232,75,138,0.35);z-index:50;transition:transform .2s;background:linear-gradient(135deg,#e84b8a,#f97316)}
.hw-tami-float:hover{transform:scale(1.08)}
.hw-tami-float img{width:100%;height:100%;object-fit:cover;border-radius:50%}
`

// SHEETS / ARCH / ANN remain STAGED (sample content) in the M1 minimal live cut.
const TABS = [
  { id:'asgn', label:'Assignments' },
  { id:'sheet', label:'Sheet Music', staged:true },
  { id:'arch', label:'Completed Archive', staged:true },
  { id:'ann', label:'Announcements', staged:true },
]
const FILTERS = ['All','Assigned','Completed']

const StagedNote = () => (
  <div style={{fontSize:10,color:'rgba(245,158,11,0.75)',background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:8,padding:'6px 10px',flexShrink:0}}>
    STAGED — sample content. This section is not live yet.
  </div>
)

const fmtDate = (iso) => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(undefined, { month:'short', day:'numeric' })
  } catch { return '' }
}

export default function HomeworkDashboard() {
  const { user, learningIdentity, evidenceStudentInstrumentId, evidenceReady, retryLearningIdentity } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('asgn')
  const [filter, setFilter] = useState('All')
  const [detOpen, setDetOpen] = useState(false)
  const [selAsgn, setSelAsgn] = useState(null)
  const [helpActive, setHelpActive] = useState(false)
  const [guideShow, setGuideShow] = useState(false)
  const helpTimer = useRef(null)

  // ── M1 R1 identity-gated data ──
  const identityStatus = learningIdentity.identity_status
  const identityReady = learningIdentity.learning_identity_ready
  const identityRetryable = learningIdentity.learning_identity_retryable_error
  const needsSelection = identityStatus === 'selection_required' && !learningIdentity.selected_student_instrument_id

  // ── M1 live assignments (canonical /assignments/mine) ──
  // M1 R1.1: with a multi-instrument identity the fetch carries the student's
  // EXPLICIT selection (?student_instrument_id=<rec…>) — authorized by the
  // backend against the SAME R1 identity authority. A resolved single-
  // instrument identity keeps the unchanged parameterless call.
  const selectionSi = identityStatus === 'selection_required'
    ? (learningIdentity.selected_student_instrument_id || null)
    : null
  const [assignments, setAssignments] = useState([])
  const [asgnLoading, setAsgnLoading] = useState(true)
  const [asgnFail, setAsgnFail] = useState(null) // null | 'blocked' | 'retryable' | 'error'
  const asgnSeqRef = useRef(0)

  const fetchAssignments = useCallback(() => {
    if (!identityReady) return
    const seq = ++asgnSeqRef.current
    // Multi-instrument before selection: no fetch — the selection panel IS the
    // state (never a false "no homework" empty state), and the backend would
    // correctly answer an unparameterised call with 409 selection_required.
    if (identityStatus === 'selection_required' && !selectionSi) {
      setAssignments([]); setAsgnFail(null); setAsgnLoading(false)
      return
    }
    // Instrument switch: the previous instrument's rows leave the screen NOW —
    // nothing from instrument A may remain visible while B loads (M1 R1.1).
    setAssignments([])
    setAsgnLoading(true)
    api.getMyAssignments(selectionSi)
      .then(data => {
        if (seq !== asgnSeqRef.current) return
        // The R1 endpoint returns a bare array — anything else is a real
        // contract mismatch and is surfaced, not aliased around.
        if (!Array.isArray(data)) {
          console.error('[Homework] /assignments/mine returned a non-array — contract mismatch:', typeof data)
          setAsgnFail('error')
          return
        }
        setAssignments(data.map(mapAssignment).filter(a => a && (a.assignmentId || a.concept)))
        setAsgnFail(null)
      })
      .catch(err => {
        if (seq !== asgnSeqRef.current) return
        if (err?.status === 409) {
          // Stale/invalid selection — the backend demands an explicit
          // selection. Same R1 flow the evidence client uses: clear the
          // selection pointer and return to the selection panel.
          console.warn('[Homework] /assignments/mine 409 selection_required — returning to instrument selection')
          window.dispatchEvent(new CustomEvent('som:selection-required'))
          setAsgnFail(null)
        } else if (err?.status === 403) {
          // wrong_student — fail closed. Another student's rows are never shown.
          console.error('[Homework] /assignments/mine 403 wrong_student — failing closed')
          setAsgnFail('blocked')
        } else if (err?.status === 503 || err?.status === 0 || err?.status >= 500) {
          // identity_unavailable_retryable / infrastructure — retryable, never permanent.
          setAsgnFail('retryable')
        } else {
          console.warn('[Homework] Failed to load assignments:', err?.message)
          setAsgnFail('error')
        }
      })
      .finally(() => { if (seq === asgnSeqRef.current) setAsgnLoading(false) })
  }, [identityReady, identityStatus, selectionSi])

  useEffect(() => { fetchAssignments() }, [fetchAssignments])

  // ── M1 R1 active assignment — GET /concept-state/{si}/active-assignment ──
  // Explicit contract only: has_active_assignment false → nothing is shown and
  // nothing is fabricated (no T_MAJOR_SCALE_PATTERN, no legacy fallback).
  // 403 → fail closed · 503 active_assignment_unavailable_retryable → retry UI.
  //
  // M1 R2-FE §A — the SAME stale-response protection the assignment list has:
  // every fetch takes a sequence number; switching instrument A → B clears
  // A's card IMMEDIATELY and bumps the sequence, so a delayed A response —
  // success OR error — can never overwrite B's state. Loading/error state
  // always belongs to the CURRENT instrument only. (Sequence guard, not just
  // effect cleanup: a stale promise still resolves — its writes are dropped.)
  const [activeAsgn, setActiveAsgn] = useState(null)
  const [activeState, setActiveState] = useState('idle') // idle|loading|loaded|none|retryable|blocked
  const activeSeqRef = useRef(0)
  const fetchActiveAssignment = useCallback(() => {
    const seq = ++activeSeqRef.current
    const si = evidenceStudentInstrumentId
    // Instrument switch (or no instrument): the previous instrument's card
    // leaves the screen NOW — nothing stale may remain visible (§A).
    setActiveAsgn(null)
    if (!si) { setActiveState('idle'); return }
    setActiveState('loading')
    api.getActiveAssignment(si)
      .then(data => {
        if (seq !== activeSeqRef.current) return   // stale success — dropped
        if (data?.has_active_assignment && data?.assignment) {
          setActiveAsgn(mapAssignment(data.assignment))
          setActiveState('loaded')
        } else {
          // Explicit "no active assignment" — never inferred, never invented.
          setActiveAsgn(null)
          setActiveState('none')
        }
      })
      .catch(err => {
        if (seq !== activeSeqRef.current) return   // stale error — dropped
        setActiveAsgn(null)
        if (err?.status === 403) {
          console.error('[Homework] active-assignment 403 wrong_student — failing closed')
          setActiveState('blocked')
        } else if (err?.status === 503 || err?.status === 0 || err?.status >= 500) {
          setActiveState('retryable')
        } else {
          console.warn('[Homework] active-assignment failed:', err?.message)
          setActiveState('retryable')
        }
      })
  }, [evidenceStudentInstrumentId])

  useEffect(() => { fetchActiveAssignment() }, [fetchActiveAssignment])

  const visibleAssignments = assignments.filter(a =>
    filter === 'All' ? true : filter === 'Completed' ? a.completed : !a.completed
  )
  const assignedCount = assignments.filter(a => !a.completed).length

  // M1 R3-FE §A — an instrument switch clears EVERYTHING about A's detail
  // immediately: the drawer closes and the selected assignment object is
  // dropped, so no stale A title/body/feedback can remain visible while B
  // loads, and stale A responses can never reopen A's detail (responses
  // never open the drawer; only an explicit user click does).
  React.useEffect(() => {
    setDetOpen(false)
    setSelAsgn(null)
  }, [selectionSi, evidenceStudentInstrumentId, identityStatus])

  const openDet = (a) => { setSelAsgn(a); setDetOpen(true); resetHelp() }
  const closeDet = () => { setDetOpen(false); resetHelp() }
  const resetHelp = () => { setHelpActive(false); setGuideShow(false); if(helpTimer.current) clearTimeout(helpTimer.current) }
  // Launch routing: only routes derived from the assignment's own canonical
  // fields (rec… assignment_id + real concept). No invented concepts, ever.
  const launchAssignment = (a) => {
    if (a.route) navigate(a.route)
  }
  const toggleHelp = () => {
    if (helpActive) { resetHelp(); return }
    setHelpActive(true)
    helpTimer.current = setTimeout(() => setGuideShow(true), 700)
  }
  const switchTab = (id) => { setTab(id); closeDet() }

  return (
    <div className="hw-page">
      <style>{css}</style>

      {/* TOP BAR */}
      <div className="hw-topbar">
        <div>
          <div className="hw-title">Homework</div>
          <div className="hw-sub">Music Theory 101</div>
        </div>
        <div className="hw-bell">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
          <div className="hw-bell-dot" />
        </div>
      </div>

      {/* TABS */}
      <div className="hw-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`hw-tab${tab===t.id?' active':''}`} onClick={() => switchTab(t.id)}>
            {t.label}
            {t.id==='asgn' && assignedCount > 0 ? <span className="hw-tab-badge">{assignedCount}</span> : null}
            {t.staged ? <span className="hw-tab-badge" style={{background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.3)'}}>STAGED</span> : null}
          </button>
        ))}
      </div>

      {/* BODY */}
      <div className="hw-body">

        {/* ── ASSIGNMENTS TAB ── */}
        <div className={`hw-tc${tab==='asgn'?' active':''}`}>

          {/* Identity not settled yet — a retryable failure is NEVER treated as permanent */}
          {!identityReady && identityRetryable && (
            <div data-testid="identity-retryable" style={{fontSize:12,color:'rgba(255,255,255,0.5)',background:'#111827',border:'1px solid rgba(245,158,11,0.25)',borderRadius:12,padding:'14px 15px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexShrink:0}}>
              <span>Reconnecting to your account…</span>
              <button onClick={() => retryLearningIdentity()} style={{minHeight:44,padding:'8px 18px',borderRadius:20,border:'1px solid rgba(245,158,11,0.4)',background:'transparent',color:'#f59e0b',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:"'DM Sans',sans-serif",flexShrink:0}}>Try again</button>
            </div>
          )}
          {!identityReady && !identityRetryable && (
            <div style={{fontSize:12,color:'rgba(255,255,255,0.35)',padding:'18px 4px'}}>Getting your account ready…</div>
          )}

          {/* Zero owned instruments — clear, non-technical setup state; evidence writes stay blocked */}
          {identityReady && identityStatus === 'unresolved' && (
            <div data-testid="identity-unresolved" style={{fontSize:12,color:'rgba(255,255,255,0.55)',background:'#111827',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'16px',lineHeight:1.6,flexShrink:0}}>
              <div style={{fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:700,color:'#fff',marginBottom:6}}>Almost there!</div>
              Your account isn’t connected to an instrument yet, so assignments and practice saving are paused.
              Ask your teacher to finish your setup — everything will show up here as soon as that’s done.
            </div>
          )}

          {/* Multiple instruments — explicit student selection, never auto-picked */}
          {identityReady && needsSelection && (
            <InstrumentSelect title="Who is practicing today?" />
          )}

          {identityReady && identityStatus !== 'unresolved' && !needsSelection && (
            <>
              {/* ── Up Next: canonical active assignment (explicit contract only) ── */}
              {activeState === 'loaded' && activeAsgn && (
                <div data-testid="active-assignment" style={{background:'rgba(20,184,166,0.06)',border:'1px solid rgba(20,184,166,0.3)',borderRadius:12,padding:'13px 15px',display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:10,fontWeight:600,letterSpacing:'.06em',color:'#14b8a6',textTransform:'uppercase',marginBottom:4}}>Up Next</div>
                    <div className="hw-acard-title" style={{marginBottom:6}}>{activeAsgn.title}</div>
                    <div className="hw-badges" style={{marginBottom:activeAsgn.route?9:0}}>
                      <span className={`hw-bdg ${activeAsgn.type==='Quiz'?'hw-bdg-qz':'hw-bdg-hw'}`}>{activeAsgn.type}</span>
                      {activeAsgn.dueDate ? <span className="hw-cpill cp-amber">Due {fmtDate(activeAsgn.dueDate)}</span> : null}
                    </div>
                    {activeAsgn.route && (
                      <button
                        onClick={() => launchAssignment(activeAsgn)}
                        style={{padding:'10px 22px',borderRadius:22,border:'none',background:'#14b8a6',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:"'DM Sans',sans-serif",minHeight:44,minWidth:110}}
                      >Start →</button>
                    )}
                  </div>
                </div>
              )}
              {activeState === 'retryable' && (
                <div data-testid="active-assignment-retryable" style={{fontSize:12,color:'rgba(255,255,255,0.45)',background:'#111827',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,padding:'12px 15px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexShrink:0}}>
                  <span>Checking for your next assignment…</span>
                  <button onClick={fetchActiveAssignment} style={{minHeight:44,padding:'8px 18px',borderRadius:20,border:'1px solid rgba(255,255,255,0.15)',background:'transparent',color:'rgba(255,255,255,0.6)',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:"'DM Sans',sans-serif",flexShrink:0}}>Try again</button>
                </div>
              )}
              {/* activeState 'none' renders NOTHING — a missing assignment is never invented */}

          <div className="hw-filters">
            {FILTERS.map(f => (
              <button key={f} className={`hw-fp${filter===f?' active':''}`} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
          {asgnLoading && (
            <div style={{fontSize:12,color:'rgba(255,255,255,0.35)',padding:'18px 4px'}}>Loading your assignments…</div>
          )}
          {!asgnLoading && asgnFail === 'blocked' && (
            <div data-testid="assignments-blocked" style={{fontSize:12,color:'#f09595',padding:'18px 4px'}}>
              These assignments aren{'’'}t available on this account.
            </div>
          )}
          {!asgnLoading && asgnFail === 'retryable' && (
            <div data-testid="assignments-retryable" style={{fontSize:12,color:'rgba(255,255,255,0.5)',background:'#111827',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,padding:'12px 15px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexShrink:0}}>
              <span>Couldn{'’'}t load your assignments {'—'} this is temporary.</span>
              <button onClick={fetchAssignments} style={{minHeight:44,padding:'8px 18px',borderRadius:20,border:'1px solid rgba(255,255,255,0.15)',background:'transparent',color:'rgba(255,255,255,0.6)',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:"'DM Sans',sans-serif",flexShrink:0}}>Try again</button>
            </div>
          )}
          {!asgnLoading && asgnFail === 'error' && (
            <div style={{fontSize:12,color:'#f09595',padding:'18px 4px'}}>Could not load your assignments right now.</div>
          )}
          {!asgnLoading && !asgnFail && visibleAssignments.length === 0 && (
            <div style={{fontSize:12,color:'rgba(255,255,255,0.35)',padding:'18px 4px'}}>
              {filter==='Completed' ? 'Nothing completed yet — your finished work will show up here.' : 'No assignments right now. Nice and clear!'}
            </div>
          )}
          {visibleAssignments.map(a => (
            <div key={a.assignmentId || a.concept} className="hw-acard" onClick={() => openDet(a)}>
              <div className="hw-acard-left">
                <div className="hw-acard-title">{a.title}</div>
                <div className="hw-badges">
                  <span className={`hw-bdg ${a.type==='Quiz'?'hw-bdg-qz':'hw-bdg-hw'}`}>{a.type}</span>
                  <span className={`hw-bdg hw-bdg-${a.statusCls}`}>{a.completed ? 'Completed ✓' : a.status}</span>
                  {a.completed && a.completedAt ? <span className="hw-cpill cp-green">{fmtDate(a.completedAt)}</span> : null}
                  {!a.completed && a.dueDate ? <span className="hw-cpill cp-amber">Due {fmtDate(a.dueDate)}</span> : null}
                </div>
                {/* Completed items show constitutional language only — no scores */}
                {!a.completed && a.route && (
                <button
                  onClick={e => { e.stopPropagation(); launchAssignment(a) }}
                  style={{marginTop:6,padding:'10px 22px',borderRadius:22,border:'none',background:'#14b8a6',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:"'DM Sans',sans-serif",minHeight:44,minWidth:110}}
                >Launch →</button>
                )}
                {!a.completed && !a.route && (
                  <div style={{marginTop:6,fontSize:11,color:'rgba(255,255,255,0.3)'}}>
                    Not ready to launch yet — check back soon.
                  </div>
                )}
              </div>
              <div className="hw-chev">{'\u203A'}</div>
            </div>
          ))}
            </>
          )}
        </div>

        {/* ── SHEET MUSIC TAB (STAGED) ── */}
        <div className={`hw-tc${tab==='sheet'?' active':''}`}>
          <StagedNote />
          <div className="hw-sheet-grid">
            {SHEETS.map((s,i) => (
              <div key={i} className="hw-sheet-card">
                <div className="hw-sheet-top">
                  <div className="hw-sheet-ico">{'\ud83c\udfbc'}</div>
                  <div>
                    <div className="hw-sheet-name">{s.name}</div>
                    <div className="hw-sheet-meta">{s.meta}</div>
                  </div>
                </div>
                <div className="hw-sheet-btns">
                  <button className="hw-sheet-practice">Start Practice</button>
                  <button className="hw-sheet-dl">{'\u2193'}</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── COMPLETED ARCHIVE TAB (STAGED) ── */}
        <div className={`hw-tc${tab==='arch'?' active':''}`} style={{gap:'8px'}}>
          <StagedNote />
          {ARCH.map((r,i) => (
            <div key={i} className="hw-arch-row">
              <div className="hw-arch-ico" style={{background:r.bg}}>{'\u2713'}</div>
              <div className="hw-arch-info">
                <div className="hw-arch-title">{r.name}</div>
                <div className="hw-arch-meta">{r.meta}</div>
              </div>
              <div className="hw-arch-right">
                <div className="hw-arch-score" style={{color:r.color}}>{r.tier}</div>
                <div className="hw-arch-date">{r.date}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── ANNOUNCEMENTS TAB (STAGED) ── */}
        <div className={`hw-tc${tab==='ann'?' active':''}`} style={{gap:'9px'}}>
          <StagedNote />
          {ANN.map((a,i) => (
            <div key={i} className="hw-ann-card">
              <div className="hw-ann-hd">
                <div className="hw-ann-av">{a.initials}</div>
                <div className="hw-ann-who">
                  <div className="hw-ann-name">{a.name}</div>
                  <div className="hw-ann-time">{a.time}</div>
                </div>
                {a.pinned && <span className="hw-ann-pin">Pinned</span>}
              </div>
              <div className="hw-ann-title">{a.title}</div>
              <div className="hw-ann-body">{a.body}</div>
            </div>
          ))}
        </div>

        {/* ── DETAIL PANEL ── */}
        <div className={`hw-det${detOpen?' open':''}`}>
          <button className="hw-back" onClick={closeDet}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            All Assignments
          </button>

          {/* What To Do */}
          <div className="hw-dcard">
            <div className="hw-dcard-hd">What To Do</div>
            <div className="hw-desc">{selAsgn?.desc}</div>
            {/* assignment_number is DISPLAY ONLY (Autonumber) — the rec… assignment_id
                does all linkage and is never shown as a student-facing number */}
            {(selAsgn?.assignmentNumber != null || selAsgn?.dueDate || selAsgn?.minutesTarget != null) && (
              <div data-testid="assignment-meta" style={{marginTop:9,display:'flex',gap:6,flexWrap:'wrap'}}>
                {selAsgn?.assignmentNumber != null && <span className="hw-cpill cp-teal">Assignment #{selAsgn.assignmentNumber}</span>}
                {selAsgn?.dueDate && <span className="hw-cpill cp-amber">Due {fmtDate(selAsgn.dueDate)}</span>}
                {selAsgn?.minutesTarget != null && <span className="hw-cpill cp-teal">{selAsgn.minutesTarget} min target</span>}
              </div>
            )}
            <div className="hw-help-wrap">
              <button className={`hw-help-btn${helpActive?' active':''}`} onClick={toggleHelp}>
                <span style={{fontSize:'16px',flexShrink:0}}>{'\ud83d\ude4b'}</span>
                <div style={{flex:1,textAlign:'left'}}>
                  <div className="hw-help-main">{helpActive?(guideShow?'Your guide is ready':'Getting your guide ready...'):'I need help with this'}</div>
                  <div className="hw-help-sub">{helpActive?(guideShow?'Tap play to hear Motesart walk you through it':'Motesart is generating your walkthrough'):'Tap to get a step-by-step guide from your coach'}</div>
                </div>
                <span style={{fontSize:'14px',color:'rgba(255,255,255,0.2)'}}>{helpActive?'\u2193':'\u203A'}</span>
              </button>
              {guideShow && (
                <>
                  <div className="hw-guide-box">
                    <div className="hw-guide-av"><img src="/Motesart Avatar 1.PNG" alt="Motesart" onError={e => { e.target.style.display='none'; e.target.parentElement.textContent='M' }} /></div>
                    <div>
                      <div className="hw-guide-name">Motesart Step-by-Step Guide</div>
                      <div className="hw-guide-meta">Audio walkthrough {'\u00b7'} personalized to your level</div>
                    </div>
                  </div>
                  <div className="hw-data-note">
                    <div className="hw-data-note-dot" />
                    <span className="hw-data-note-txt">Help request logged {'\u00b7'} T.A.M.i tracking difficulty data</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Feedback */}
          <div className="hw-dcard">
            <div className="hw-dcard-hd">Feedback</div>
            {selAsgn?.teacherFeedback ? (
              <div className="hw-fb-teacher">
                <div className="hw-fb-hd">
                  <div className="hw-fb-av-init">T</div>
                  <div className="hw-fb-label">From your teacher</div>
                </div>
                <div className="hw-fb-txt">{selAsgn.teacherFeedback}</div>
              </div>
            ) : (
            <div className="hw-fb-teacher">
              {/* M1 R3-FE §H — absence of canonical feedback stays absence:
                  no invented teacher quotes, names, or dates. */}
              <div className="hw-fb-txt" style={{color:'rgba(255,255,255,0.45)'}}>No teacher feedback yet.</div>
            </div>
            )}
            <div className="hw-fb-motesart">
              <div className="hw-fb-hd">
                <div className="hw-fb-av-img"><img src="/Motesart Avatar 1.PNG" alt="Motesart" onError={e => { e.target.style.display='none'; e.target.parentElement.textContent='M' }} /></div>
                <div className="hw-fb-label">Motesart</div>
              </div>
              <div className="hw-fb-txt">Open the practice and Motesart will guide you step by step.</div>
            </div>
          </div>

          {/* Submit */}
          <div className="hw-dcard">
            <div className="hw-dcard-hd">Submit Your Work <span className="hw-dcard-link">Submission history {'\u2192'}</span></div>
            <div className="hw-btns-col">
              <div className="hw-rec-btn"><div className="hw-rec-dot" /> Record &amp; Submit</div>
              <div className="hw-upload">
                <div className="hw-upload-lbl">Upload a file</div>
                <div className="hw-upload-sub">Audio, video, or PDF {'\u00b7'} max 50mb</div>
              </div>
              <button className="hw-submit">Submit Assignment</button>
              <div className="hw-tami-btn">Ask T.A.M.i for Help</div>
              <div className="hw-vis">
                <div className="hw-vis-row"><div className="hw-vis-dot" style={{background:'#14b8a6'}} />Teacher sees submissions immediately</div>
                <div className="hw-vis-row"><div className="hw-vis-dot" style={{background:'#f59e0b'}} />Parent receives a weekly summary</div>
                <div className="hw-vis-row"><div className="hw-vis-dot" style={{background:'#a78bfa'}} />Your progress updates automatically</div>
              </div>
            </div>
          </div>
        </div>

      </div>{/* /body */}

      {/* T.A.M.i Float */}
      <div className="hw-tami-float">
        <img src="/tami-avatar.png" alt="T.A.M.i" />
      </div>
    </div>
  )
}
