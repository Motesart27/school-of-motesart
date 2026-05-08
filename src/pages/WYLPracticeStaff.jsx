import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const AVATAR_SRC = '/motesart-avatar.png'

// ─────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────
const NOTES = [
  { letter:'C', num:1, noteY:80, type:'normal', stem:'up',   ledger:true  },
  { letter:'D', num:2, noteY:72, type:'normal', stem:'up',   ledger:false },
  { letter:'E', num:3, noteY:64, type:'hl',     stem:'up',   ledger:false },
  { letter:'F', num:4, noteY:56, type:'hl',     stem:'up',   ledger:false },
  { letter:'G', num:5, noteY:48, type:'normal', stem:'up',   ledger:false },
  { letter:'A', num:6, noteY:40, type:'normal', stem:'down', ledger:false },
  { letter:'B', num:7, noteY:32, type:'together',stem:'down',ledger:false },
  { letter:'C', num:8, noteY:24, type:'together',stem:'down',ledger:false },
]

const KEY_DATA = [
  { label:'C', deg:'1', idx:0 },
  { label:'D', def:'2', idx:1 },
  { label:'E', deg:'3', idx:2 },
  { label:'F', deg:'4', idx:3 },
  { label:'G', deg:'5', idx:4 },
  { label:'A', deg:'6', idx:5 },
  { label:'B', def:'7', idx:6 },
  { label:'C', def:'8', idx:7 },
]
const BLACK_AFTER = [0, 1, 3, 4, 5]

const PHASE_STATE = [
  {
    label:'See It', lit:[2], litOrange:[4],
    bubble:'See this note? It sits on the first line of the staff. That\'s <strong>E — degree 3</strong>. The orange key shows where <strong>G (degree 5)</strong> lives — two notes, two colors.',
    pill:'E · degree 3 · purple   |   G · degree 5 · orange'
  },
  {
    label:'Read It', lit:[], litOrange:[2,3],
    bubble:'These two — <strong>E and F, 3 and 4</strong> — are right next to each other on the staff. No space between them. That squeeze is a half step.',
    pill:'E → F · the squeeze · half step'
  },
  {
    label:'Name It', lit:[0,1,2,3,4,5,6,7], litOrange:[],
    bubble:'All eight notes. <strong>Name each one</strong> as I point to it on the staff — then tap the matching key. C-D-E-F-G-A-B-C.',
    pill:'Name each note — C through C'
  },
  {
    label:'Write It', lit:[4], litOrange:[],
    bubble:'Now <strong>you</strong> place it. I\'ll call a note — find it on the staff, then play it below. Starting with <strong>G — degree 5</strong>.',
    pill:'G · degree 5 · second line from bottom'
  },
]

const BAR_HEIGHTS = [8,14,20,24,20,14,8]
const M_STATES = ['talking','thinking','listening']
const M_DURATIONS = { talking:4500, thinking:2200, listening:3500 }

// ─────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@400;500&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
.wylstaff-root{
  --bg:#faf8f5;--card:#ffffff;--bd:#e8e4de;--bd2:#d5d0c8;
  --tx:#1a1a2e;--txm:#6b6b80;--txd:#9a9aaa;
  --purple:#7c3aed;--purple-light:#ede9fe;--purple-mid:#a78bfa;
  --lavender:#d8b4fe;
  --green:#22c55e;--teal:#14b8a6;
  --red:#ef4444;--orange:#f97316;
  background:var(--bg);color:var(--tx);
  font-family:'DM Sans',sans-serif;
  min-height:100vh;display:flex;flex-direction:column;
}
.wylstaff-root h1,.wylstaff-root h2,.wylstaff-root h3{font-family:'Outfit',sans-serif;font-weight:700}

/* ── TRIGGER ── */
.ws-trigger{display:flex;align-items:center;gap:10px;padding:10px 28px;background:var(--purple-light);border-bottom:1px solid var(--lavender);font-size:11px;color:var(--txm);flex-shrink:0}
.ws-trigger strong{color:var(--purple)}
.ws-trigger .dot{width:8px;height:8px;border-radius:50%;background:var(--purple);flex-shrink:0}
.ws-trigger .back-link{margin-left:auto;background:none;border:1px solid var(--lavender);border-radius:20px;padding:4px 12px;font-size:11px;color:var(--purple);cursor:pointer;font-weight:600;font-family:'DM Sans',sans-serif}
.ws-trigger .back-link:hover{background:var(--purple-light)}

/* ── TOP BAR ── */
.ws-topbar{display:flex;align-items:center;justify-content:space-between;padding:12px 28px;background:var(--card);border-bottom:1px solid var(--bd);flex-shrink:0}
.ws-back{background:none;border:none;font-size:22px;color:var(--tx);cursor:pointer;padding:4px 8px;border-radius:6px}
.ws-back:hover{background:var(--purple-light)}
.ws-currtoggle{display:flex;background:var(--bg);border-radius:22px;border:1px solid var(--bd);overflow:hidden}
.ws-ctbtn{padding:7px 18px;font-size:12px;font-weight:600;font-family:'DM Sans',sans-serif;border:none;cursor:pointer;color:var(--txm);background:transparent;transition:all 0.15s}
.ws-ctbtn.active{background:var(--purple);color:#fff}
.ws-topright{display:flex;align-items:center;gap:12px}
.ws-lbl-toggle{display:inline-flex;background:var(--bg);border:1px solid var(--bd);border-radius:12px;overflow:hidden}
.ws-lbl-btn{padding:4px 13px;font-size:11px;font-weight:700;letter-spacing:0.5px;border:none;cursor:pointer;color:var(--txm);background:transparent;font-family:'DM Sans',sans-serif;transition:all 0.15s}
.ws-lbl-btn.active{background:var(--purple);color:#fff}
.ws-home-pill{display:inline-flex;align-items:center;gap:6px;background:var(--purple-light);border:1px solid var(--lavender);border-radius:22px;padding:6px 16px;font-size:13px;font-weight:600;color:var(--tx)}
.ws-bpm-pill{display:inline-flex;align-items:center;gap:6px;background:var(--card);border:1px solid var(--bd);border-radius:22px;padding:6px 16px;font-size:13px;color:var(--tx)}
.ws-bpm-pill .rec{width:8px;height:8px;border-radius:50%;background:var(--red)}

/* ── CONCEPT HEADER ── */
.ws-concept-hdr{padding:16px 28px 10px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.ws-concept-hdr h1{font-size:24px;color:var(--tx)}
.ws-concept-hdr p{font-size:13px;color:var(--txm);margin-top:2px}
.ws-step-pill{background:var(--purple);color:#fff;border-radius:8px;padding:5px 14px;font-size:12px;font-weight:600}

/* ── PHASE TABS ── */
.ws-phase-tabs{display:flex;padding:0 28px;border-bottom:2px solid var(--bd);background:var(--card);flex-shrink:0}
.ws-phase-tab{padding:11px 20px;font-size:13px;font-weight:600;color:var(--txd);cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-2px;letter-spacing:0.3px;transition:color 0.15s;text-transform:uppercase;font-family:'DM Sans',sans-serif}
.ws-phase-tab:hover{color:var(--txm)}
.ws-phase-tab.active{color:var(--tx);border-bottom-color:var(--purple)}

/* ── MAIN CONTENT ── */
.ws-main{flex:1;display:flex;flex-direction:column;padding:0 28px}

/* ── STAFF ── */
.ws-staff-area{flex:1;position:relative;padding:24px 0;min-height:280px;display:flex;align-items:center;justify-content:center}
.ws-staff-wrap{position:relative;width:100%;max-width:900px;height:220px}
.ws-staff-lines{position:absolute;left:70px;right:20px;top:60px}
.ws-sl{position:absolute;left:0;right:0;height:1.5px;background:#c0b8a8}
.ws-sl:nth-child(1){top:0}.ws-sl:nth-child(2){top:16px}.ws-sl:nth-child(3){top:32px}.ws-sl:nth-child(4){top:48px}.ws-sl:nth-child(5){top:64px}
.ws-treble{position:absolute;left:4px;top:17px;font-size:140px;line-height:1;color:#8a8070;z-index:2;user-select:none;font-family:'Times New Roman',Georgia,serif}
.ws-notes-row{position:absolute;left:90px;right:30px;top:60px;z-index:3}
.ws-sn{position:absolute;display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:transform 0.12s}
.ws-sn:hover{transform:scale(1.08)translateX(-50%)}
.ws-nh{width:18px;height:13px;border-radius:50%;transform:rotate(-8deg);position:relative}
.ws-nh.normal{background:#8a8070}.ws-nh.hl{background:var(--purple)}.ws-nh.together{background:var(--orange)}
.ws-ns{position:absolute;width:1.5px;height:40px}
.ws-ns.stem-up{right:-1px;bottom:10px}.ws-ns.stem-down{left:0;top:10px}
.ws-ns.normal{background:#8a8070}.ws-ns.hl{background:var(--purple)}.ws-ns.together{background:var(--orange)}
.ws-ledger{position:absolute;width:26px;height:1.5px;background:#c0b8a8;left:50%;transform:translateX(-50%);top:6px}
.ws-note-labels{position:absolute;left:90px;right:30px;top:142px;z-index:3}
.ws-nl{position:absolute;text-align:center;width:36px;transform:translateX(-50%)}
.ws-nl .letter{font-size:20px;font-weight:700;font-family:'Outfit',sans-serif;color:var(--tx)}
.ws-nl .number{font-size:15px;font-family:'Outfit',sans-serif;color:var(--txm)}
.ws-nl.hl .letter,.ws-nl.hl .number{color:var(--purple)}
.ws-nl.together .letter,.ws-nl.together .number{color:var(--orange)}
.ws-bracket{position:absolute;display:flex;flex-direction:column;align-items:center;z-index:5;top:16px}
.ws-bracket .blabel{font-size:14px;font-weight:700;font-family:'Outfit',sans-serif;margin-bottom:3px;white-space:nowrap}
.ws-bracket .bline{border:2px solid;border-bottom:none;border-radius:5px 5px 0 0;height:10px}
.ws-bracket.purple .blabel{color:var(--purple)}.ws-bracket.purple .bline{border-color:var(--purple)}
.ws-bracket.orange .blabel{color:var(--orange)}.ws-bracket.orange .bline{border-color:var(--orange)}

/* ── INSTRUCTION ── */
.ws-instruct{padding:16px 0;border-top:1px solid var(--bd);flex-shrink:0}
.ws-instruct-label{font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--txd);font-weight:600;margin-bottom:4px}
.ws-instruct-text{font-size:17px;font-weight:600;color:var(--tx);font-family:'Outfit',sans-serif}
.ws-instruct-goal{font-size:13px;color:var(--txm);margin-top:4px}
.ws-instruct-goal strong{color:var(--purple)}

/* ── BOTTOM SECTION ── */
.ws-bottom{flex-shrink:0;background:var(--card);border-top:1px solid var(--bd)}

/* ── MOTESART ── */
.ws-motesart{padding:14px 28px 6px;display:flex;align-items:flex-start;gap:16px}
.ws-avatar-col{display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0}
.ws-avatar{width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#ddd6fe,#c4b5fd);border:3px solid var(--purple);display:flex;align-items:center;justify-content:center;flex-shrink:0;position:relative;overflow:visible}
.ws-avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%;display:block}
.ws-avatar .initials{font-size:28px;font-weight:800;color:var(--purple);font-family:'Outfit',sans-serif}
.ws-live-ring{position:absolute;inset:-6px;border-radius:50%;border:2.5px solid var(--teal);opacity:0;animation:wsLiveRing 2.2s ease-in-out infinite;pointer-events:none}
.ws-avatar.talking .ws-live-ring{opacity:1}
.ws-listen-ring{position:absolute;inset:-6px;border-radius:50%;border:2.5px solid var(--purple-mid);opacity:0;animation:wsListenRing 1.8s ease-in-out infinite;pointer-events:none}
.ws-avatar.listening .ws-listen-ring{opacity:1}
.ws-avatar.thinking{animation:wsAvatarThink 0.6s ease-in-out infinite alternate}
.ws-avatar-label{font-size:10px;font-weight:700;color:var(--green);letter-spacing:1.8px;text-transform:uppercase;font-family:'Outfit',sans-serif}
.ws-bubble-wrap{flex:1;display:flex;flex-direction:column;gap:4px}
.ws-bubble{background:var(--bg);border:1px solid var(--bd);border-radius:16px;padding:14px 18px;font-size:15px;color:var(--tx);line-height:1.55;position:relative;box-shadow:0 1px 6px rgba(0,0,0,0.03)}
.ws-bubble::before{content:"";position:absolute;left:-10px;top:18px;border-top:8px solid transparent;border-bottom:8px solid transparent;border-right:10px solid var(--bd)}
.ws-bubble::after{content:"";position:absolute;left:-8px;top:19px;border-top:7px solid transparent;border-bottom:7px solid transparent;border-right:9px solid var(--bg)}
.ws-think-dots{display:none;gap:4px;align-items:center;padding:2px 0}
.ws-think-dots span{width:7px;height:7px;border-radius:50%;background:var(--purple-mid);animation:wsDotPulse 1.4s ease-in-out infinite;display:inline-block}
.ws-think-dots span:nth-child(2){animation-delay:0.2s}
.ws-think-dots span:nth-child(3){animation-delay:0.4s}
.ws-root-thinking .ws-think-dots{display:flex}
.ws-root-thinking .ws-bubble-text{display:none}

/* ── VOICE STATE ── */
.ws-voice-state{display:flex;align-items:center;gap:8px;padding:4px 28px 8px;min-height:30px;margin-left:88px}
.ws-speak-bars{display:flex;gap:3px;align-items:flex-end;height:26px}
.ws-speak-bars .bar{width:3px;border-radius:2px;background:linear-gradient(to top,rgba(139,92,246,0.6),rgba(167,139,250,0.9))}
.ws-listen-dots{display:flex;gap:5px;align-items:center}
.ws-listen-dots span{width:7px;height:7px;border-radius:50%;background:var(--purple-mid);animation:wsDotPulse 0.9s ease-in-out infinite;display:inline-block}
.ws-listen-dots span:nth-child(2){animation-delay:0.2s}
.ws-listen-dots span:nth-child(3){animation-delay:0.4s}
.ws-voice-label{font-size:12px;color:var(--txd);font-style:italic}

/* ── SOM STANDARD PIANO ── */
.ws-kb-area{padding:16px 36px 24px;display:flex;flex-direction:column}
.ws-keyboard{
  display:flex;position:relative;
  border-radius:16px;overflow:hidden;
  background:#0d1117;border:none;
  padding:6px 6px 0;
  box-shadow:0 10px 32px rgba(0,0,0,0.50),inset 0 1px 0 rgba(255,255,255,0.06);
  min-height:150px;flex:1;
}
.ws-key-white{
  flex:1;height:150px;background:#f4f7fb;
  border:none;border-right:2.5px solid #0d1117;
  display:flex;flex-direction:column;align-items:center;justify-content:flex-end;
  padding-bottom:10px;cursor:pointer;position:relative;
  transition:background 0.12s;z-index:1;border-radius:0 0 9px 9px;
}
.ws-key-white:last-child{border-right:none}
.ws-key-white:hover{background:#e6ecf7}
.ws-key-white .lbl-letter{font-size:12px;color:#8892aa;font-weight:600;letter-spacing:0.3px}
.ws-key-white .lbl-number{font-size:22px;font-weight:800;font-family:'Outfit',sans-serif;color:#1a2035}
.ws-key-white.hl-purple{background:#ede9fe}
.ws-key-white.hl-purple .lbl-letter{color:#7c3aed}
.ws-key-white.hl-purple .lbl-number{color:#111}
.ws-key-white.hl-orange{background:#fde8cf}
.ws-key-white.hl-orange .lbl-letter{color:#c05a1a}
.ws-key-white.hl-orange .lbl-number{color:#111}
.ws-key-black{
  width:calc(12.5% * 0.58);height:90px;
  background:linear-gradient(175deg,#1a2035 0%,#080d18 100%);
  border-radius:0 0 7px 7px;position:absolute;z-index:2;cursor:pointer;top:6px;
  box-shadow:0 5px 14px rgba(0,0,0,0.75),inset 0 1px 0 rgba(255,255,255,0.07);
}
.ws-key-black:hover{background:linear-gradient(175deg,#252d45,#10162a)}
@keyframes wsArrowBounce{0%,100%{transform:translateX(calc(-50% - 5px))}50%{transform:translateX(calc(-50% + 5px))}}
.ws-pair-arrow{position:absolute;bottom:54px;font-size:20px;font-weight:900;animation:wsArrowBounce 0.9s ease-in-out infinite;z-index:5;pointer-events:none;line-height:1;letter-spacing:2px}

/* ── BOTTOM PILL ── */
.ws-bottom-pill{text-align:center;padding:6px 28px 14px}
.ws-pill-wrap{display:inline-flex;align-items:center;gap:8px}
.ws-pill-line{width:28px;height:2px;background:var(--purple-mid)}
.ws-pill-label{display:inline-block;background:var(--purple-light);border:1px solid var(--lavender);color:var(--purple);font-size:14px;font-weight:700;padding:8px 22px;border-radius:24px;font-family:'Outfit',sans-serif}

/* ── LABEL MODE ── */
.ws-root-number .lbl-letter{display:none}
.ws-root-number .lbl-number{display:block}
.ws-root-letter .lbl-number{display:none}
.ws-root-letter .lbl-letter{display:block}

/* ── KEYFRAME ANIMATIONS ── */
@keyframes wsLiveRing{0%,100%{transform:scale(1);opacity:0.7}50%{transform:scale(1.08);opacity:1}}
@keyframes wsListenRing{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(1.1);opacity:0.9}}
@keyframes wsAvatarThink{0%{transform:translateY(0)}100%{transform:translateY(-4px)}}
@keyframes wsDotPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.8)}}
@keyframes wsSpeakBar{0%,100%{transform:scaleY(0.4)}50%{transform:scaleY(1)}}

/* ── RESPONSIVE ── */
@media(max-width:600px){
  .ws-topbar,.ws-concept-hdr,.ws-main,.ws-motesart,.ws-kb-area,.ws-voice-state{padding-left:14px;padding-right:14px}
  .ws-concept-hdr h1{font-size:18px}
  .ws-phase-tab{padding:9px 10px;font-size:11px}
  .ws-key-white{height:120px}.ws-key-black{height:70px}
  .ws-bubble{font-size:13px;padding:10px 14px}
  .ws-avatar{width:56px;height:56px}
  .ws-staff-area{min-height:200px}
  .ws-instruct-text{font-size:15px}
  .ws-treble{font-size:100px;top:26px}
  .ws-staff-lines{left:52px}
  .ws-notes-row{left:64px}
  .ws-note-labels{left:64px}
  .ws-kb-area{padding:8px 14px 14px}
}
@media(min-width:640px){
  .ws-keyboard{border-radius:18px;padding:8px 8px 0;min-height:260px;flex:1}
  .ws-key-white{height:100%;min-height:260px;border-radius:0 0 12px 12px;border-right-width:3px}
  .ws-key-white .lbl-letter{font-size:16px;font-weight:600}
  .ws-key-white .lbl-number{font-size:30px}
  .ws-key-black{height:56%;border-radius:0 0 9px 9px;top:8px}
  .ws-pair-arrow{font-size:24px;bottom:90px}
}
@media(min-width:900px){
  .ws-staff-wrap{height:270px}
  .ws-treble{font-size:170px;top:-3px}
  .ws-staff-lines{left:82px}
  .ws-notes-row{left:104px}
  .ws-note-labels{left:104px;top:152px}
  .ws-nl .letter{font-size:22px}
  .ws-bubble{font-size:16px}
}
@media(min-width:1200px){
  .ws-treble{font-size:190px;top:-14px}
  .ws-staff-lines{left:90px}
  .ws-notes-row{left:115px}
  .ws-note-labels{left:115px}
}
`

// ─────────────────────────────────────────────
// PIANO COMPONENT
// ─────────────────────────────────────────────
function SOMPiano({ phData, labelMode, arrowPos }) {
  const bracketColor = (phData.lit.includes(2) && phData.lit.includes(3)) ? '#7c3aed' : '#f97316'
  const showArrow = arrowPos !== null && (
    (phData.litOrange.includes(2) && phData.litOrange.includes(3)) ||
    (phData.lit.includes(2) && phData.lit.includes(3))
  )

  return (
    <div className="ws-keyboard">
      {KEY_DATA.map(k => {
        const isLit    = phData.lit.includes(k.idx)
        const isOrange = phData.litOrange.includes(k.idx)
        const hlCls    = isLit ? ' hl-purple' : isOrange ? ' hl-orange' : ''
        const showDeg  = isLit || isOrange
        return (
          <div key={k.idx} className={`ws-key-white${hlCls}`}>
            <span className="lbl-letter">{k.label}</span>
            <span className="lbl-number">{showDeg ? k.deg : ''}</span>
          </div>
        )
      })}
      {BLACK_AFTER.map(idx => (
        <div
          key={`bk-${idx}`}
          className="ws-key-black"
          style={{ left: `calc(${((idx + 1) / 8) * 100}% - 14px)` }}
        />
      ))}
      {showArrow && (
        <div
          className="ws-pair-arrow"
          style={{ left: arrowPos + 'px', color: bracketColor }}
        >⇦⇨</div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// STAFF NOTATION
// ─────────────────────────────────────────────
function StaffNotation({ brk1Ref, brk2Ref }) {
  return (
    <div className="ws-staff-area">
      <div className="ws-staff-wrap" id="ws-staff-wrap">
        <div className="ws-treble">𝄞</div>
        <div className="ws-staff-lines">
          <div className="ws-sl" /><div className="ws-sl" /><div className="ws-sl" />
          <div className="ws-sl" /><div className="ws-sl" />
        </div>
        <div className="ws-bracket purple" ref={brk1Ref} style={{ position:'absolute' }}>
          <span className="blabel">3 &amp; 4 together</span>
          <div className="bline" style={{ width:80 }} />
        </div>
        <div className="ws-bracket orange" ref={brk2Ref} style={{ position:'absolute' }}>
          <span className="blabel">7 &amp; 8 together</span>
          <div className="bline" style={{ width:80 }} />
        </div>
        <div className="ws-notes-row" id="ws-notes-row">
          {NOTES.map((n, i) => {
            const pct = (i / (NOTES.length - 1)) * 100
            const cls = n.type === 'hl' ? 'hl' : n.type === 'together' ? 'together' : 'normal'
            return (
              <div
                key={i}
                className="ws-sn"
                style={{ position:'absolute', left: pct + '%', top:(n.noteY - 6) + 'px', transform:'translateX(-50%)' }}
              >
                <div className={`ws-nh ${cls}`}>
                  {n.stem === 'up'
                    ? <div className={`ws-ns stem-up ${cls}`} />
                    : <div className={`ws-ns stem-down ${cls}`} />}
                </div>
                {n.ledger && <div className="ws-ledger" />}
              </div>
            )
          })}
        </div>
        <div className="ws-note-labels" id="ws-note-labels">
          {NOTES.map((n, i) => {
            const pct = (i / (NOTES.length - 1)) * 100
            const cls = n.type === 'normal' ? '' : n.type
            return (
              <div key={i} className={`ws-nl ${cls}`} style={{ position:'absolute', left: pct + '%' }}>
                <div className="letter">{n.letter}</div>
                <div className="number">{n.num}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// MOTESART AVATAR
// ─────────────────────────────────────────────
function MotesartAvatar({ mState }) {
  const [imgFailed, setImgFailed] = useState(false)
  return (
    <div className="ws-avatar-col">
      <div className={`ws-avatar ${mState}`}>
        <div className="ws-live-ring" />
        <div className="ws-listen-ring" />
        {!imgFailed
          ? <img src={AVATAR_SRC} alt="Motesart" onError={() => setImgFailed(true)} />
          : <span className="initials">M</span>}
      </div>
      <div className="ws-avatar-label">MOTESART</div>
    </div>
  )
}

// ─────────────────────────────────────────────
// VOICE STATE ROW
// ─────────────────────────────────────────────
function VoiceStateRow({ mState }) {
  if (mState === 'talking') {
    return (
      <div className="ws-voice-state">
        <div className="ws-speak-bars">
          {BAR_HEIGHTS.map((h, i) => (
            <div key={i} className="bar" style={{
              height: h + 'px',
              transformOrigin: 'bottom',
              animation: `wsSpeakBar ${0.75 + i * 0.08}s ease-in-out ${i * 0.11}s infinite alternate`
            }} />
          ))}
        </div>
        <span className="ws-voice-label">speaking...</span>
      </div>
    )
  }
  if (mState === 'listening') {
    return (
      <div className="ws-voice-state">
        <div className="ws-listen-dots">
          <span /><span /><span />
        </div>
        <span className="ws-voice-label">listening...</span>
      </div>
    )
  }
  return <div className="ws-voice-state" />
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function WYLPracticeStaff() {
  const navigate = useNavigate()
  const [phase, setPhase]       = useState(0)
  const [mState, setMState]     = useState('talking')
  const [labelMode, setLabelMode] = useState('number')
  const [arrowPos, setArrowPos] = useState(null)
  const [currMode, setCurrMode] = useState('motesart')

  const kbRef      = useRef(null)
  const mStateIdx  = useRef(0)
  const mTimerRef  = useRef(null)
  const brk1Ref    = useRef(null)
  const brk2Ref    = useRef(null)

  // Motesart state machine
  useEffect(() => {
    const cycle = () => {
      const state = M_STATES[mStateIdx.current % M_STATES.length]
      setMState(state)
      mStateIdx.current++
      mTimerRef.current = setTimeout(cycle, M_DURATIONS[state])
    }
    cycle()
    return () => clearTimeout(mTimerRef.current)
  }, [])

  // Arrow positioning — runs after phase changes and DOM settles
  useEffect(() => {
    const ph = PHASE_STATE[phase]
    const showPair =
      (ph.litOrange.includes(2) && ph.litOrange.includes(3)) ||
      (ph.lit.includes(2) && ph.lit.includes(3))
    if (!showPair) { setArrowPos(null); return }

    const timer = setTimeout(() => {
      const kb = kbRef.current
      if (!kb) return
      const whites = kb.querySelectorAll('.ws-key-white')
      if (whites.length < 4) return
      const r3 = whites[2].getBoundingClientRect()
      const r4 = whites[3].getBoundingClientRect()
      const kbR = kb.getBoundingClientRect()
      setArrowPos(((r3.left + r3.right + r4.left + r4.right) / 4) - kbR.left)
    }, 180)
    return () => clearTimeout(timer)
  }, [phase])

  // Staff bracket positioning
  useEffect(() => {
    const timer = setTimeout(() => {
      const notesRow = document.getElementById('ws-notes-row')
      const wrap = document.getElementById('ws-staff-wrap')
      if (!notesRow || !wrap) return
      const allN = notesRow.querySelectorAll('.ws-sn')
      const wRect = wrap.getBoundingClientRect()
      if (allN.length >= 8 && brk1Ref.current && brk2Ref.current) {
        const r2 = allN[2].getBoundingClientRect()
        const r3 = allN[3].getBoundingClientRect()
        const cx1 = ((r2.left + r2.right) / 2 + (r3.left + r3.right) / 2) / 2 - wRect.left
        brk1Ref.current.style.left = (cx1 - 42) + 'px'
        brk1Ref.current.querySelector('.bline').style.width = Math.abs(r3.right - r2.left + 20) + 'px'

        const r6 = allN[6].getBoundingClientRect()
        const r7 = allN[7].getBoundingClientRect()
        const cx2 = ((r6.left + r6.right) / 2 + (r7.left + r7.right) / 2) / 2 - wRect.left
        brk2Ref.current.style.left = (cx2 - 42) + 'px'
        brk2Ref.current.querySelector('.bline').style.width = Math.abs(r7.right - r6.left + 20) + 'px'
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [])

  const phData = PHASE_STATE[phase]
  const phases = ['See It','Read It','Name It','Write It']
  const rootCls = [
    'wylstaff-root',
    `ws-root-${labelMode}`,
    mState === 'thinking' ? 'ws-root-thinking' : ''
  ].join(' ')

  return (
    <>
      <style>{css}</style>
      <div className={rootCls}>

        {/* Trigger tag */}
        <div className="ws-trigger">
          <span className="dot" />
          <span><strong>Staff Note View</strong> — triggered by curriculum teaching notation</span>
          <button className="back-link" onClick={() => navigate('/practice-live')}>← Back to Practice Live</button>
        </div>

        {/* Top bar */}
        <div className="ws-topbar">
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button className="ws-back" onClick={() => navigate(-1)}>←</button>
            <div className="ws-currtoggle">
              <button
                className={`ws-ctbtn${currMode === 'school' ? ' active' : ''}`}
                onClick={() => setCurrMode('school')}
              >School</button>
              <button
                className={`ws-ctbtn${currMode === 'motesart' ? ' active' : ''}`}
                onClick={() => setCurrMode('motesart')}
              >Motesart Fast</button>
            </div>
          </div>
          <div className="ws-topright">
            <div className="ws-lbl-toggle">
              <button
                className={`ws-lbl-btn${labelMode === 'letter' ? ' active' : ''}`}
                onClick={() => setLabelMode('letter')}
              >A–G</button>
              <button
                className={`ws-lbl-btn${labelMode === 'number' ? ' active' : ''}`}
                onClick={() => setLabelMode('number')}
              >1–8</button>
            </div>
            <div className="ws-home-pill">Home: <strong>C</strong></div>
            <div className="ws-bpm-pill"><span className="rec" />♩<strong>103</strong></div>
          </div>
        </div>

        {/* Concept header */}
        <div className="ws-concept-hdr">
          <div>
            <h1>NOTES ON THE STAFF</h1>
            <p>Where each note lives on the lines and spaces</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span className="ws-step-pill">Step {phase + 1} · {phases[phase]}</span>
          </div>
        </div>

        {/* Phase tabs */}
        <div className="ws-phase-tabs">
          {phases.map((p, i) => (
            <div
              key={i}
              className={`ws-phase-tab${phase === i ? ' active' : ''}`}
              onClick={() => setPhase(i)}
            >{p}</div>
          ))}
        </div>

        {/* Staff + instruction */}
        <div className="ws-main">
          <StaffNotation brk1Ref={brk1Ref} brk2Ref={brk2Ref} />
          <div className="ws-instruct">
            <div className="ws-instruct-label">WHAT TO DO NOW</div>
            <div className="ws-instruct-text">Find each note on the staff — then tap the matching key below.</div>
            <div className="ws-instruct-goal"><strong>Goal:</strong> Connect each staff position to the correct key on the keyboard.</div>
          </div>
        </div>

        {/* Bottom: Motesart + piano */}
        <div className="ws-bottom">

          <div className="ws-motesart">
            <MotesartAvatar mState={mState} />
            <div className="ws-bubble-wrap">
              <div className="ws-bubble">
                <span
                  className="ws-bubble-text"
                  dangerouslySetInnerHTML={{ __html: phData.bubble }}
                />
                <div className="ws-think-dots"><span /><span /><span /></div>
              </div>
            </div>
          </div>

          <VoiceStateRow mState={mState} />

          <div className="ws-kb-area" ref={kbRef}>
            <SOMPiano phData={phData} labelMode={labelMode} arrowPos={arrowPos} />
          </div>

          <div className="ws-bottom-pill">
            <div className="ws-pill-wrap">
              <span className="ws-pill-line" />
              <span className="ws-pill-label">{phData.pill}</span>
              <span className="ws-pill-line" />
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
