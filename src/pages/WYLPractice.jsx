/* ================================================================
   LEGACY / ORPHANED — DO NOT IMPORT OR WIRE UP
   ================================================================
   This file has been superseded by WYLPracticeLive.jsx.
   The canonical route is /practice-live → WYLPracticeLive.
   Redirects in App.jsx cover /wyl-practice and /live-practice.

   Kept for reference only. Do not add to App.jsx routes.
   If this file is still here after the Practice Live feature
   is fully stable, it can be safely deleted.
   ================================================================ */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import useTextToSpeech from '../hooks/useTextToSpeech.js'

/* ================================================================
   WYL Practice - Full-Screen Live Practice Session
   ================================================================
   5-Phase Lesson Engine: init -> greeting -> confirm -> demonstrate -> practice -> wrapup
   Motesart speaks instantly on session open, confirms student readiness,
   demonstrates the lesson, then gives phase-aware contextual coaching.
   ================================================================ */

const AVATAR_SRC = '/motesart-avatar.png'

// --- CSS ---
const css = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Outfit:wght@400;500;600;700;800&display=swap');

:root {
  --bg:#F5F5FA; --bg-white:#FFF;
  --bg-dark-glass:rgba(20,20,40,0.75);
  --bg-dark-glass-heavy:rgba(20,20,40,0.88);
  --border-dark:rgba(255,255,255,0.1);
  --text:#1A1A2E; --text-secondary:#4A4A6A; --text-muted:#8E8EA8;
  --teal:#00C49A; --teal-bright:#00D4AA;
  --tami-pink:#e84b8a; --tami-orange:#f97316;
  --pink:#FF4F6E;
  --radius-2xl:24px; --radius-xl:20px; --radius-lg:16px; --radius-md:12px; --radius-sm:8px;
}

/* -- Reset for practice page -- */
.wyl-root { position:relative; width:100vw; height:100vh; overflow:hidden; background:#0a0a1a; font-family:'DM Sans',-apple-system,sans-serif; }
.wyl-root *,.wyl-root *::before,.wyl-root *::after { box-sizing:border-box; margin:0; padding:0; }
.wyl-root h1,.wyl-root h2,.wyl-root h3,.wyl-root h4,.wyl-root h5 { font-family:'Outfit',sans-serif; letter-spacing:-0.02em; }

/* -- Camera -- */
.wyl-camera { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; }
.wyl-camera video { width:100%; height:100%; object-fit:cover; }
.wyl-camera-placeholder { position:absolute; inset:0; background:linear-gradient(150deg,#14142a 0%,#1c1c3a 50%,#1a1a30 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; }
.wyl-camera-placeholder__icon { width:64px; height:64px; border-radius:50%; background:rgba(255,255,255,0.05); display:flex; align-items:center; justify-content:center; }
.wyl-camera-placeholder__text { font-size:13px; color:rgba(255,255,255,0.25); }

/* -- Nametag -- */
.wyl-nametag { position:absolute; top:76px; left:20px; display:flex; align-items:center; gap:6px; padding:4px 10px 4px 6px; background:rgba(0,0,0,0.4); backdrop-filter:blur(8px); border-radius:12px; z-index:5; }
.wyl-nametag__dot { width:6px; height:6px; border-radius:50%; background:#ff4f6e; animation:wylPulse 2s infinite; }
.wyl-nametag__name { font-size:11px; font-weight:600; color:rgba(255,255,255,0.9); }

/* -- Top Bar -- */
.wyl-bar { position:absolute; top:12px; left:12px; right:12px; display:flex; align-items:center; justify-content:space-between; padding:0 20px; height:48px; background:var(--bg-dark-glass); backdrop-filter:blur(20px); border:1px solid var(--border-dark); border-radius:var(--radius-lg); z-index:10; }
.wyl-bar__left { display:flex; align-items:center; gap:12px; }
.wyl-bar__brand { font-family:'Outfit',sans-serif; font-size:14px; font-weight:700; background:linear-gradient(135deg,#e84b8a,#f97316); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
.wyl-bar__sep { width:1px; height:18px; background:rgba(255,255,255,0.1); }
.wyl-bar__objective { font-size:12px; color:rgba(255,255,255,0.45); font-weight:500; }
.wyl-bar__right { display:flex; align-items:center; gap:10px; }
.wyl-bar__timer { font-family:'Outfit',sans-serif; font-size:18px; font-weight:700; color:var(--teal); font-variant-numeric:tabular-nums; padding:0 6px; }
.wyl-bar__btn { padding:6px 14px; border-radius:20px; border:1px solid rgba(255,255,255,0.1); background:transparent; color:rgba(255,255,255,0.5); font-family:'DM Sans',sans-serif; font-size:11px; font-weight:600; cursor:pointer; transition:all 0.2s; }
.wyl-bar__btn:hover { border-color:rgba(255,255,255,0.2); color:rgba(255,255,255,0.8); }
.wyl-bar__btn--end { border-color:rgba(255,79,110,0.3); color:var(--pink); }
.wyl-bar__btn--end:hover { background:var(--pink); color:#fff; border-color:var(--pink); }

/* ------- MOTESART CARD ------- */
.mc { position:absolute; bottom:24px; left:24px; z-index:10; animation:mcSlideUp 0.35s cubic-bezier(0.16,1,0.3,1); }
@keyframes mcSlideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

.mc__main { display:flex; gap:16px; align-items:center; padding:18px 24px; background:var(--bg-dark-glass-heavy); backdrop-filter:blur(24px); border:1px solid var(--border-dark); border-radius:var(--radius-xl); box-shadow:0 12px 40px rgba(0,0,0,0.4); cursor:pointer; transition:box-shadow 0.2s,border-color 0.2s,border-radius 0.3s; min-width:260px; }
.mc__main:hover { box-shadow:0 14px 48px rgba(0,0,0,0.5); border-color:rgba(255,255,255,0.12); }

/* Avatar */
.mc__av-wrap { position:relative; width:48px; height:48px; flex-shrink:0; transition:width 0.5s cubic-bezier(0.16,1,0.3,1),height 0.5s cubic-bezier(0.16,1,0.3,1); }
.mc__live-ring { position:absolute; inset:-4px; border-radius:50%; border:2px solid var(--teal); animation:mcRing 3s ease-in-out infinite; transition:border-color 0.3s,border-width 0.3s; }
@keyframes mcRing { 0%,100%{opacity:0.35;transform:scale(1)} 50%{opacity:1;transform:scale(1.06)} }
.mc__av { width:48px; height:48px; border-radius:50%; overflow:hidden; box-shadow:0 4px 20px rgba(232,75,138,0.35); transition:width 0.5s cubic-bezier(0.16,1,0.3,1),height 0.5s cubic-bezier(0.16,1,0.3,1),box-shadow 0.5s ease; }
.mc__av img { width:100%; height:100%; object-fit:contain; border-radius:50%; }

/* Info */
.mc__info { flex:1; }
.mc__name { font-family:'Outfit',sans-serif; font-size:16px; font-weight:700; color:rgba(255,255,255,0.95); margin-bottom:4px; transition:font-size 0.3s; }
.mc__status-row { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
.mc__status { display:inline-flex; align-items:center; gap:4px; font-size:10px; font-weight:600; color:var(--teal); padding:2px 8px; background:rgba(0,196,154,0.12); border-radius:10px; }
.mc__status-dot { width:5px; height:5px; border-radius:50%; background:var(--teal); animation:wylPulse 2s infinite; }
@keyframes wylPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

/* Phase badge */
.mc__phase-badge { display:inline-flex; align-items:center; gap:4px; font-size:9px; font-weight:600; color:var(--tami-orange); padding:2px 8px; background:rgba(249,115,22,0.12); border-radius:10px; margin-left:6px; text-transform:uppercase; letter-spacing:0.5px; }

/* Speech bars */
.mc__speech { display:flex; align-items:center; gap:6px; font-size:11px; color:rgba(255,255,255,0.55); }
.mc__speech-bars { display:flex; align-items:center; gap:2px; height:14px; }
.mc__speech-bar { width:3px; border-radius:2px; background:linear-gradient(180deg,var(--tami-pink),var(--tami-orange)); animation:mcSpeak 0.8s ease-in-out infinite alternate; }
.mc__speech-bar:nth-child(1){height:6px;animation-delay:0s}
.mc__speech-bar:nth-child(2){height:12px;animation-delay:0.15s}
.mc__speech-bar:nth-child(3){height:8px;animation-delay:0.3s}
.mc__speech-bar:nth-child(4){height:14px;animation-delay:0.1s}
.mc__speech-bar:nth-child(5){height:6px;animation-delay:0.25s}
@keyframes mcSpeak { 0%{transform:scaleY(0.4)} 100%{transform:scaleY(1)} }

.mc__tap-hint { font-size:9px; color:rgba(255,255,255,0.3); margin-top:2px; }

/* Importance badge */
.mc__importance { display:none; align-items:center; gap:4px; font-size:10px; font-weight:700; color:var(--tami-pink); margin-top:4px; }

/* -- Importance mode -- */
.mc.importance .mc__main { border-color:rgba(232,75,138,0.4); box-shadow:0 0 60px rgba(232,75,138,0.25),0 16px 48px rgba(0,0,0,0.5); }
.mc.importance .mc__av-wrap { width:64px; height:64px; }
.mc.importance .mc__av { width:64px; height:64px; box-shadow:0 6px 36px rgba(232,75,138,0.5); }
.mc.importance .mc__live-ring { border-color:var(--tami-pink); border-width:3px; animation:mcImpRing 1.5s ease-in-out infinite; }
@keyframes mcImpRing { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} }
.mc.importance .mc__name { font-size:18px; }
.mc.importance .mc__importance { display:inline-flex; }
.mc.importance { z-index:50; }

/* -- Chat panel -- */
.mc__chat { max-height:0; overflow:hidden; opacity:0; margin-top:0; background:var(--bg-dark-glass-heavy); backdrop-filter:blur(24px); border:1px solid var(--border-dark); border-top:none; border-radius:0 0 var(--radius-xl) var(--radius-xl); transition:max-height 0.4s cubic-bezier(0.16,1,0.3,1),opacity 0.3s ease,margin-top 0.3s ease,padding 0.3s ease; padding:0 24px; }
.mc.chat-open .mc__chat { max-height:400px; opacity:1; margin-top:-16px; padding:28px 24px 18px; }
.mc.chat-open .mc__main { border-radius:var(--radius-xl) var(--radius-xl) 0 0; }
.mc__chat-msg { font-size:13px; line-height:1.65; color:rgba(255,255,255,0.82); margin-bottom:10px; }
.mc__chat-tags { display:flex; gap:6px; }
.mc__chat-tag { font-size:9px; font-weight:600; color:rgba(255,255,255,0.4); padding:2px 8px; background:rgba(255,255,255,0.06); border-radius:12px; }
.mc__chat-tag--focus { color:var(--teal-bright); background:rgba(0,212,170,0.1); }

/* -- Sensor pill inside chat -- */
.mc__sensor-pill { display:flex; align-items:center; gap:6px; margin-top:12px; padding:6px 10px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:10px; cursor:pointer; transition:background 0.2s,border-color 0.2s; }
.mc__sensor-pill:hover { background:rgba(255,255,255,0.08); border-color:rgba(255,255,255,0.14); }
.mc__sensor-pill-label { font-size:9px; font-weight:600; color:rgba(255,255,255,0.45); text-transform:uppercase; letter-spacing:0.5px; }
.mc__sensor-dots-mini { display:flex; gap:4px; align-items:center; }
.mc__sensor-dot-mini { width:6px; height:6px; border-radius:50%; background:var(--teal); }
.mc__sensor-dot-mini--warn { background:var(--tami-orange); }
.mc__sensor-expand-icon { font-size:10px; color:rgba(255,255,255,0.3); margin-left:auto; transition:transform 0.2s; }
.mc__sensor-expanded { max-height:0; overflow:hidden; opacity:0; transition:max-height 0.35s cubic-bezier(0.16,1,0.3,1),opacity 0.25s ease,padding 0.25s ease; padding:0 2px; }
.mc__sensor-expanded.open { max-height:180px; opacity:1; padding:10px 2px 0; }
.sensor-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; }
.sensor-item { display:flex; align-items:center; gap:6px; padding:5px 8px; background:rgba(255,255,255,0.04); border-radius:8px; }
.sensor-dot { width:8px; height:8px; border-radius:50%; background:var(--teal); flex-shrink:0; }
.sensor-dot--warn { background:var(--tami-orange); }
.sensor-name { font-size:10px; color:rgba(255,255,255,0.6); }
.sensor-val { font-size:10px; font-weight:700; color:rgba(255,255,255,0.85); margin-left:auto; }

/* ------- HOVER-REVEAL SIDEBAR ------- */
.hr-trigger { position:absolute; top:50%; right:0; transform:translateY(-50%); width:40px; height:200px; z-index:15; cursor:pointer; }
.hr-trigger__bar { position:absolute; right:8px; top:50%; transform:translateY(-50%); width:4px; height:40px; border-radius:2px; background:rgba(255,255,255,0.12); transition:background 0.2s,height 0.2s; }
.hr-trigger:hover .hr-trigger__bar { background:rgba(255,255,255,0.25); height:50px; }
.hr-sidebar { position:absolute; top:50%; right:0; transform:translateY(-50%) translateX(100%); z-index:20; display:flex; flex-direction:column; gap:8px; padding:10px; opacity:0; pointer-events:none; transition:all 0.35s cubic-bezier(0.16,1,0.3,1); }
.hr-trigger:hover ~ .hr-sidebar,.hr-sidebar:hover { opacity:1; transform:translateY(-50%) translateX(0); pointer-events:auto; }

.mini-card { padding:12px; background:var(--bg-dark-glass-heavy); backdrop-filter:blur(24px); border:1px solid var(--border-dark); border-radius:var(--radius-md); cursor:pointer; transition:border-color 0.2s; min-width:140px; }
.mini-card:hover { border-color:rgba(255,255,255,0.15); }
.mini-card__row { display:flex; align-items:center; gap:10px; }
.mini-card__ring { position:relative; width:40px; height:40px; flex-shrink:0; }
.mini-card__ring svg { width:100%; height:100%; }
.mini-card__ring-inner { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-family:'Outfit',sans-serif; font-size:12px; font-weight:700; color:rgba(255,255,255,0.9); }
.mini-card__label { font-size:11px; font-weight:600; color:rgba(255,255,255,0.7); }
.mini-card__sublabel { font-size:9px; color:rgba(255,255,255,0.35); margin-top:2px; }
.sensor-mini__title { font-size:10px; font-weight:600; color:rgba(255,255,255,0.5); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px; }
.sensor-dots-row { display:flex; gap:10px; }
.sensor-dot-item { display:flex; flex-direction:column; align-items:center; gap:3px; }
.sensor-dot-circle { width:10px; height:10px; border-radius:50%; background:var(--teal); }
.sensor-dot-circle--warn { background:var(--tami-orange); }
.sensor-dot-name { font-size:8px; color:rgba(255,255,255,0.4); }

/* ------- DEMO ZOOM OVERLAY ------- */
.dz-overlay { position:absolute; inset:0; z-index:40; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.65); backdrop-filter:blur(6px); opacity:0; pointer-events:none; transition:opacity 0.4s ease; }
.dz-overlay.active { opacity:1; pointer-events:auto; }
.dz-card { position:relative; width:580px; max-width:85vw; background:var(--bg-dark-glass-heavy); backdrop-filter:blur(32px); border:1px solid var(--border-dark); border-radius:var(--radius-xl); box-shadow:0 24px 80px rgba(0,0,0,0.5); padding:32px; transform:scale(0.9); opacity:0; transition:transform 0.45s cubic-bezier(0.16,1,0.3,1),opacity 0.35s ease; }
.dz-overlay.active .dz-card { transform:scale(1); opacity:1; }
.dz__header { display:flex; align-items:center; gap:12px; margin-bottom:20px; }
.dz__icon { width:40px; height:40px; border-radius:12px; background:linear-gradient(135deg,var(--tami-pink),var(--tami-orange)); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.dz__title { font-family:'Outfit',sans-serif; font-size:18px; font-weight:700; color:rgba(255,255,255,0.95); }
.dz__subtitle { font-size:11px; color:rgba(255,255,255,0.45); margin-top:2px; }
.dz__visual { width:100%; height:200px; background:rgba(0,0,0,0.3); border-radius:12px; border:1px solid rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:center; overflow:hidden; margin-bottom:16px; }
.dz__caption { font-size:13px; line-height:1.6; color:rgba(255,255,255,0.7); text-align:center; }
.dz__caption strong { color:var(--teal-bright); font-weight:700; }
.dz__close { position:absolute; top:16px; right:16px; width:28px; height:28px; border-radius:50%; background:rgba(255,255,255,0.08); border:none; color:rgba(255,255,255,0.5); font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 0.15s; }
.dz__close:hover { background:rgba(255,255,255,0.15); }

/* Demo piano keys */
.dz-piano { display:flex; height:160px; gap:2px; padding:0 20px; }
.dz-piano__key { width:44px; border-radius:0 0 6px 6px; background:#f0f0f0; position:relative; box-shadow:0 4px 8px rgba(0,0,0,0.2); transition:background 0.15s,transform 0.15s; }
.dz-piano__key--active { background:linear-gradient(180deg,var(--teal-bright),var(--teal)); transform:translateY(3px); box-shadow:0 2px 16px rgba(0,196,154,0.5); }
.dz-piano__key--wrong { background:linear-gradient(180deg,#ff6b6b,#e84b8a); transform:translateY(3px); }
.dz-piano__label { position:absolute; bottom:8px; left:50%; transform:translateX(-50%); font-size:14px; font-weight:700; color:rgba(0,0,0,0.35); }
.dz-piano__key--active .dz-piano__label,.dz-piano__key--wrong .dz-piano__label { color:#fff; }

/* ------- POPOUT OVERLAYS ------- */
.popout-bg { position:fixed; inset:0; z-index:60; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.5); backdrop-filter:blur(6px); opacity:0; pointer-events:none; transition:opacity 0.3s; }
.popout-bg.active { opacity:1; pointer-events:auto; }
.popout-card { background:var(--bg-dark-glass-heavy); backdrop-filter:blur(32px); border:1px solid var(--border-dark); border-radius:var(--radius-xl); padding:28px; min-width:320px; max-width:480px; width:90vw; position:relative; }
.popout__close { position:absolute; top:12px; right:12px; width:28px; height:28px; border-radius:50%; background:rgba(255,255,255,0.08); border:none; color:rgba(255,255,255,0.5); font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
.popout__title { font-family:'Outfit',sans-serif; font-size:16px; font-weight:700; color:rgba(255,255,255,0.9); margin-bottom:16px; }

/* PIS popout ring */
.pis-ring { position:relative; width:100px; height:100px; margin:0 auto 16px; }
.pis-ring svg { width:100%; height:100%; }
.pis-ring__inner { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; }
.pis-ring__score { font-family:'Outfit',sans-serif; font-size:28px; font-weight:800; color:rgba(255,255,255,0.95); }
.pis-ring__label { font-size:9px; font-weight:600; color:rgba(255,255,255,0.4); text-transform:uppercase; }
.pis-breakdown { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.pis-item { padding:10px; background:rgba(255,255,255,0.04); border-radius:10px; }
.pis-item__label { font-size:10px; color:rgba(255,255,255,0.4); margin-bottom:2px; }
.pis-item__val { font-size:16px; font-weight:700; color:rgba(255,255,255,0.9); }

/* Sensor popout */
.sensor-popout-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.sensor-popout-item { padding:14px; background:rgba(255,255,255,0.04); border-radius:12px; display:flex; flex-direction:column; gap:6px; }
.sensor-popout-item__header { display:flex; align-items:center; gap:6px; }
.sensor-popout-item__dot { width:10px; height:10px; border-radius:50%; background:var(--teal); }
.sensor-popout-item__dot--warn { background:var(--tami-orange); }
.sensor-popout-item__name { font-size:12px; font-weight:600; color:rgba(255,255,255,0.7); }
.sensor-popout-item__val { font-size:18px; font-weight:700; color:rgba(255,255,255,0.9); }
.sensor-popout-item__detail { font-size:10px; color:rgba(255,255,255,0.35); }

/* ------- START SESSION OVERLAY ------- */
.wyl-start-overlay { position:absolute; inset:0; z-index:100; display:flex; flex-direction:column; align-items:center; justify-content:center; background:rgba(10,10,26,0.92); backdrop-filter:blur(12px); gap:24px; }
.wyl-start-overlay__title { font-family:'Outfit',sans-serif; font-size:28px; font-weight:800; background:linear-gradient(135deg,#e84b8a,#f97316); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
.wyl-start-overlay__sub { font-size:14px; color:rgba(255,255,255,0.5); max-width:320px; text-align:center; line-height:1.6; }
.wyl-start-overlay__btn { padding:14px 40px; border-radius:30px; border:none; background:linear-gradient(135deg,var(--teal),var(--teal-bright)); color:#fff; font-family:'Outfit',sans-serif; font-size:16px; font-weight:700; cursor:pointer; transition:transform 0.2s,box-shadow 0.2s; box-shadow:0 4px 24px rgba(0,196,154,0.4); }
.wyl-start-overlay__btn:hover { transform:scale(1.05); box-shadow:0 6px 32px rgba(0,196,154,0.5); }
`;

// --- Sub-components ---

function TopBar({ timer, objective, onPause, onEnd, lessonPhase }) {
  const phaseLabels = { init: 'Starting...', greeting: 'Welcome', confirm: 'Ready?', teach_lower: 'Learning Pattern', teach_full: 'Full Pattern', call_response: 'Call & Response', diagnostic: 'Understanding Check', explain: 'Theory', demonstrate: 'Piano Mapping', practice: 'Your Turn', wrapup: 'Great Work' }
  return (
    <div className="wyl-bar">
      <div className="wyl-bar__left">
        <span className="wyl-bar__brand">School of Motesart</span>
        <div className="wyl-bar__sep" />
        <span className="wyl-bar__objective">{objective}</span>
        <div className="wyl-bar__sep" />
        <span className="wyl-bar__objective" style={{ color: 'rgba(0,196,154,0.7)', fontWeight: 600 }}>{phaseLabels[lessonPhase] || ''}</span>
      </div>
      <div className="wyl-bar__right">
        <span className="wyl-bar__timer">{timer}</span>
        <button className="wyl-bar__btn" onClick={onPause}>Pause</button>
        <button className="wyl-bar__btn wyl-bar__btn--end" onClick={onEnd}>End Session</button>
      </div>
    </div>
  )
}

function MotesartCard({ coaching, importance, onToggleChat, chatOpen, sensors, motesartStatus, transcript, lessonPhase }) {
  const [sensorOpen, setSensorOpen] = useState(false)

  return (
    <div className={`mc${chatOpen ? ' chat-open' : ''}${importance ? ' importance' : ''}`}>
      <div className="mc__main" onClick={onToggleChat}>
        <div className="mc__av-wrap">
          <div className="mc__live-ring" />
          <div className="mc__av">
            <img src={AVATAR_SRC} alt="Motesart" />
          </div>
        </div>
        <div className="mc__info">
          <div className="mc__name">Motesart</div>
          <div className="mc__status-row">
            <span className="mc__status">
              <span className="mc__status-dot" />
              {motesartStatus === 'speaking' ? 'Speaking' : motesartStatus === 'thinking' ? 'Thinking...' : 'Listening'}
            </span>
          </div>
          <div className="mc__speech">
            <div className="mc__speech-bars">
              {[0,1,2,3,4].map(i => <div key={i} className="mc__speech-bar" />)}
            </div>
            <span>{motesartStatus === 'listening' && transcript ? transcript : motesartStatus === 'speaking' ? 'Speaking aloud...' : 'Listening for you...'}</span>
          </div>
          <div className="mc__tap-hint">Tap for text</div>
          <div className="mc__importance">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 9v4m0 4h.01M12 2L2 20h20L12 2z"/>
            </svg>
            Important
          </div>
        </div>
      </div>

      <div className="mc__chat">
        <p className="mc__chat-msg">{coaching?.message || 'Listening...'}</p>
        <div className="mc__chat-tags">
          {(coaching?.tags || []).map((t, i) => (
            <span key={i} className={`mc__chat-tag${i === 0 ? ' mc__chat-tag--focus' : ''}`}>{t}</span>
          ))}
        </div>

        {/* Sensor expanded */}
        <div className={`mc__sensor-expanded${sensorOpen ? ' open' : ''}`}>
          <div className="sensor-grid">
            {(sensors || []).map((s, i) => (
              <div key={i} className="sensor-item">
                <div className={`sensor-dot${s.warn ? ' sensor-dot--warn' : ''}`} />
                <span className="sensor-name">{s.name}</span>
                <span className="sensor-val">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sensor pill */}
        <div className="mc__sensor-pill" onClick={e => { e.stopPropagation(); setSensorOpen(!sensorOpen) }}>
          <span className="mc__sensor-pill-label">Sensors</span>
          <div className="mc__sensor-dots-mini">
            {(sensors || []).map((s, i) => (
              <div key={i} className={`mc__sensor-dot-mini${s.warn ? ' mc__sensor-dot-mini--warn' : ''}`} />
            ))}
          </div>
          <span className="mc__sensor-expand-icon" style={{ transform: sensorOpen ? 'rotate(180deg)' : '' }}>&#9660;</span>
        </div>
      </div>
    </div>
  )
}

function HoverRevealSidebar({ pisScore, sensors, onOpenPIS, onOpenSensors }) {
  return (
    <>
      <div className="hr-trigger">
        <div className="hr-trigger__bar" />
      </div>
      <div className="hr-sidebar">
        {/* PIS Mini Card */}
        <div className="mini-card" onClick={onOpenPIS}>
          <div className="mini-card__row">
            <div className="mini-card__ring">
              <svg viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="3"/>
                <circle cx="20" cy="20" r="16" fill="none" stroke="#00C49A" strokeWidth="3"
                  strokeDasharray="100.5" strokeDashoffset={100.5 - (100.5 * pisScore / 100)}
                  strokeLinecap="round" transform="rotate(-90 20 20)"/>
              </svg>
              <div className="mini-card__ring-inner">{pisScore}</div>
            </div>
            <div>
              <div className="mini-card__label">PIS Score</div>
              <div className="mini-card__sublabel">Tap to expand</div>
            </div>
          </div>
        </div>
        {/* Sensors Mini Card */}
        <div className="mini-card" onClick={onOpenSensors}>
          <div className="sensor-mini__title">Sensors</div>
          <div className="sensor-dots-row">
            {(sensors || []).map((s, i) => (
              <div key={i} className="sensor-dot-item">
                <div className={`sensor-dot-circle${s.warn ? ' sensor-dot-circle--warn' : ''}`} />
                <span className="sensor-dot-name">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function DemoZoom({ active, title, caption, onClose }) {
  const [activeKey, setActiveKey] = useState(-1)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (active) {
      let step = 0
      intervalRef.current = setInterval(() => {
        if (step < 3) setActiveKey(4)
        else if (step === 3) setActiveKey(103)
        else setActiveKey(-1)
        step = (step + 1) % 6
      }, 700)
    } else {
      clearInterval(intervalRef.current)
      setActiveKey(-1)
    }
    return () => clearInterval(intervalRef.current)
  }, [active])

  const keys = [1,2,3,4,5,6,7]

  return (
    <div className={`dz-overlay${active ? ' active' : ''}`}>
      <div className="dz-card">
        <button className="dz__close" onClick={onClose}>&times;</button>
        <div className="dz__header">
          <div className="dz__icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
          </div>
          <div>
            <div className="dz__title">{title}</div>
            <div className="dz__subtitle">Motesart is demonstrating</div>
          </div>
        </div>
        <div className="dz__visual">
          <div className="dz-piano">
            {keys.map((k, i) => (
              <div key={k} className={`dz-piano__key${activeKey === i ? ' dz-piano__key--active' : ''}${activeKey === 100 + i ? ' dz-piano__key--wrong' : ''}`}>
                <div className="dz-piano__label">{k}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="dz__caption" dangerouslySetInnerHTML={{ __html: caption }} />
      </div>
    </div>
  )
}

function PopoutPIS({ active, onClose, pisScore, breakdown }) {
  return (
    <div className={`popout-bg${active ? ' active' : ''}`} onClick={onClose}>
      <div className="popout-card" onClick={e => e.stopPropagation()}>
        <button className="popout__close" onClick={onClose}>&times;</button>
        <div className="popout__title">Practice Intelligence Score</div>
        <div className="pis-ring">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="7"/>
            <circle cx="50" cy="50" r="42" fill="none" stroke="#00C49A" strokeWidth="7"
              strokeDasharray="263.9" strokeDashoffset={263.9 - (263.9 * pisScore / 100)}
              strokeLinecap="round" transform="rotate(-90 50 50)"/>
          </svg>
          <div className="pis-ring__inner">
            <span className="pis-ring__score">{pisScore}</span>
            <span className="pis-ring__label">PIS</span>
          </div>
        </div>
        <div className="pis-breakdown">
          {(breakdown || []).map((b, i) => (
            <div key={i} className="pis-item">
              <div className="pis-item__label">{b.label}</div>
              <div className="pis-item__val">{b.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PopoutSensors({ active, onClose, sensors }) {
  return (
    <div className={`popout-bg${active ? ' active' : ''}`} onClick={onClose}>
      <div className="popout-card" onClick={e => e.stopPropagation()}>
        <button className="popout__close" onClick={onClose}>&times;</button>
        <div className="popout__title">Live Sensors</div>
        <div className="sensor-popout-grid">
          {(sensors || []).map((s, i) => (
            <div key={i} className="sensor-popout-item">
              <div className="sensor-popout-item__header">
                <div className={`sensor-popout-item__dot${s.warn ? ' sensor-popout-item__dot--warn' : ''}`} />
                <span className="sensor-popout-item__name">{s.name}</span>
              </div>
              <div className="sensor-popout-item__val">{s.value}</div>
              <div className="sensor-popout-item__detail">{s.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// --- Main Page Component ---

export default function WYLPractice() {
  const navigate = useNavigate()
  const videoRef = useRef(null)

  // -- State --
  const [timer, setTimer] = useState(0)
  const [paused, setPaused] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [importance, setImportance] = useState(false)
  const [demoZoom, setDemoZoom] = useState(false)
  const [pisPopout, setPisPopout] = useState(false)
  const [sensorPopout, setSensorPopout] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [sessionStarted, setSessionStarted] = useState(false)

  // -- Live State --
  const [objective] = useState('Scale of 1 - ascending')
  const [pisScore, setPisScore] = useState(0)
  const [coaching, setCoaching] = useState({ message: "Starting your session...", tags: ['Initializing'] })
  const [sensors, setSensors] = useState([
    { name: 'Mic', value: 'Waiting', warn: true, detail: 'Speak to activate' },
    { name: 'Hands', value: 'Ready', warn: false, detail: 'Place on keys' },
    { name: 'Posture', value: 'Good', warn: false, detail: 'Upright, relaxed' },
    { name: 'Rhythm', value: '-', warn: false, detail: 'Not started' },
  ])
  const [pisBreakdown, setPisBreakdown] = useState([
    { label: 'Note Accuracy', value: '-' },
    { label: 'Rhythm', value: '-' },
    { label: 'Tempo', value: '-' },
    { label: 'Expression', value: '-' },
  ])
  const [motesartStatus, setMotesartStatus] = useState('listening')
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef(null)
  const interactionCountRef = useRef(0)
  const speechDelayRef = useRef(null) // Debounce timer: waits for student to finish speaking

  // 10-PHASE LESSON ENGINE + WYL ADAPTIVE INTELLIGENCE
  // Phases: init -> greeting -> confirm -> teach_lower -> teach_full -> call_response -> diagnostic -> explain -> demonstrate -> practice -> wrapup
  const [lessonPhase, setLessonPhase] = useState('init')
  const phaseRef = useRef('init')
  const spokenPhaseRef = useRef(null)
  const repCountRef = useRef(0)
  const subPhaseRef = useRef(null)
  const diagnosticAttemptsRef = useRef(0)

  // ===== WYL (Way You Learn) ADAPTIVE INTELLIGENCE =====
  // WYL profile is determined during student registration assessment.
  // TAMi pulls the profile at session start and adapts teaching accordingly.
  // Recalibration happens based on quiz/test performance — not by asking questions.
  const [wylProfile, setWylProfile] = useState({
    visual: 25, auditory: 25, readwrite: 25, kinesthetic: 25,
    dominant: null,
    loaded: false,
  })
  const wylRef = useRef({ visual: 25, auditory: 25, readwrite: 25, kinesthetic: 25, dominant: null })

  // Fetch WYL profile from backend when session starts
  useEffect(() => {
    if (!sessionStarted) return
    async function loadWYL() {
      try {
        // Pull student WYL profile from Airtable via backend
        const user = JSON.parse(localStorage.getItem('som_user') || '{}')
        if (!user.id) return
        const apiUrl = import.meta.env.VITE_API_URL || 'https://deployable-python-codebase-som-production.up.railway.app'
        const resp = await fetch(apiUrl + '/students/' + user.id + '/wyl')
        if (resp.ok) {
          const data = await resp.json()
          const profile = {
            visual: data.visual || 25,
            auditory: data.auditory || 25,
            readwrite: data.readwrite || 25,
            kinesthetic: data.kinesthetic || 25,
            dominant: data.dominant || null,
            loaded: true,
          }
          // Determine dominant if not set
          if (!profile.dominant) {
            const max = Math.max(profile.visual, profile.auditory, profile.readwrite, profile.kinesthetic)
            if (profile.visual === max) profile.dominant = 'visual'
            else if (profile.auditory === max) profile.dominant = 'auditory'
            else if (profile.kinesthetic === max) profile.dominant = 'kinesthetic'
            else profile.dominant = 'readwrite'
          }
          wylRef.current = profile
          setWylProfile(profile)
          console.log('[Motesart] WYL profile loaded:', profile.dominant, profile)
        } else {
          console.log('[Motesart] No WYL profile found, using balanced default')
          // Default: balanced profile — TAMi will recalibrate from quiz performance
          const fallback = { visual: 25, auditory: 25, readwrite: 25, kinesthetic: 25, dominant: 'auditory', loaded: true }
          wylRef.current = fallback
          setWylProfile(fallback)
        }
      } catch (err) {
        console.log('[Motesart] WYL fetch error, using default:', err.message)
        const fallback = { visual: 25, auditory: 25, readwrite: 25, kinesthetic: 25, dominant: 'auditory', loaded: true }
        wylRef.current = fallback
        setWylProfile(fallback)
      }
    }
    loadWYL()
  }, [sessionStarted])

  // Recalibrate WYL based on quiz/test performance
  // Called after diagnostic checks — adjusts profile if approach is not effective
  const recalibrateWYL = useCallback((wasEffective, phase) => {
    const w = { ...wylRef.current }
    const boost = wasEffective ? 5 : -5
    // If the current approach worked, reinforce dominant style
    // If not, shift weight toward other modalities
    if (w.dominant === 'visual') { w.visual += boost; w.auditory -= Math.round(boost/3); w.kinesthetic -= Math.round(boost/3) }
    else if (w.dominant === 'auditory') { w.auditory += boost; w.visual -= Math.round(boost/3); w.kinesthetic -= Math.round(boost/3) }
    else if (w.dominant === 'kinesthetic') { w.kinesthetic += boost; w.auditory -= Math.round(boost/3); w.visual -= Math.round(boost/3) }
    else { w.readwrite += boost; w.auditory -= Math.round(boost/3); w.visual -= Math.round(boost/3) }
    // Normalize
    const total = Math.max(1, w.visual + w.auditory + w.readwrite + w.kinesthetic)
    w.visual = Math.max(5, Math.round((w.visual / total) * 100))
    w.auditory = Math.max(5, Math.round((w.auditory / total) * 100))
    w.readwrite = Math.max(5, Math.round((w.readwrite / total) * 100))
    w.kinesthetic = Math.max(5, Math.round((w.kinesthetic / total) * 100))
    const max = Math.max(w.visual, w.auditory, w.readwrite, w.kinesthetic)
    if (w.visual === max) w.dominant = 'visual'
    else if (w.auditory === max) w.dominant = 'auditory'
    else if (w.kinesthetic === max) w.dominant = 'kinesthetic'
    else w.dominant = 'readwrite'
    wylRef.current = w
    setWylProfile(prev => ({ ...prev, ...w }))
    console.log('[Motesart] WYL recalibrated after', phase, ':', w.dominant, w)
  }, [])

  // DPM% (Drive, Passion, Motivation) Tracking
  const [dpmScore, setDpmScore] = useState({ drive: 50, passion: 50, motivation: 50, overall: 50 })
  const dpmRef = useRef({
    responseTimestamps: [],
    correctAnswers: 0,
    totalAttempts: 0,
    engagementEvents: 0,
    lastPromptTime: null,
  })

  // Track DPM engagement on every interaction
  const trackDPM = useCallback((isCorrect) => {
    const d = dpmRef.current
    d.engagementEvents += 1
    d.totalAttempts += 1
    if (isCorrect) d.correctAnswers += 1
    if (d.lastPromptTime) {
      d.responseTimestamps.push(Date.now() - d.lastPromptTime)
    }
    // Recalculate DPM%
    const accuracy = d.totalAttempts > 0 ? (d.correctAnswers / d.totalAttempts) * 100 : 50
    const avgSpeed = d.responseTimestamps.length > 0
      ? d.responseTimestamps.reduce((a,b) => a+b, 0) / d.responseTimestamps.length : 5000
    const speedScore = Math.max(0, Math.min(100, 100 - (avgSpeed / 200)))
    const engagement = Math.min(100, d.engagementEvents * 8)
    const drive = Math.round((accuracy * 0.4 + speedScore * 0.3 + engagement * 0.3))
    const passion = Math.round(engagement * 0.7 + accuracy * 0.3)
    const motivation = Math.round(speedScore * 0.5 + engagement * 0.5)
    const overall = Math.round((drive + passion + motivation) / 3)
    setDpmScore({ drive, passion, motivation, overall })
  }, [])



  // Keep phaseRef in sync
  useEffect(() => { phaseRef.current = lessonPhase }, [lessonPhase])

  // Pluggable lesson plan - swap content per student, structure stays the same
  // ===== SOM BEGINNER CURRICULUM - Phase 1: The Code of the Major Scale =====
  const lessonPlanRef = useRef({
    // GREETING - introduce the concept
    greeting: "Today I am going to show you a secret code that controls almost every happy sounding scale in music. This code works on piano, guitar, violin, almost every instrument. Are you ready to learn it?",
    confirmAck: "Let us go.",

    // TEACH LOWER TETRACHORD
    teach_lower_intro: "I want you to repeat a phrase after me. Here is the first half. One skip one. Two skip one. Three and four together. Now you say it.",
    teach_lower_repeat: "Good. Say it again. One skip one. Two skip one. Three and four together.",
    teach_lower_done: "Nice. You have the first half down. Now let us add the second half.",

    // TEACH FULL PHRASE
    teach_full_intro: "Here is the full phrase. One skip one. Two skip one. Three and four together. Four skip one. Five skip one. Six skip one. Seven and eight together. Now say the whole thing.",
    teach_full_repeat: "Let us say it again. One skip one. Two skip one. Three and four together. Four skip one. Five skip one. Six skip one. Seven and eight together.",
    teach_full_done: "You got it. Notice how both halves end the same way? Two notes sitting together. Now I want to test something.",

    // CALL AND RESPONSE
    call_three: "I will start a phrase and you finish it. Ready? Three and...",
    call_three_correct: "That is right. Four. Together.",
    call_seven: "One more. Seven and...",
    call_seven_correct: "You know this pattern.",

    // DIAGNOSTIC QUESTION
    diagnostic_question: "Now here is the big question. Which numbers sit right next to each other in our pattern?",
    diagnostic_correct: "Excellent. You just discovered the two places in every major scale where the notes touch. Musicians call that a half step. When I said skip one, that means there is a space between the notes. That is called a whole step. You just learned the difference between half steps and whole steps without even trying.",
    diagnostic_incorrect: "Not quite. Let us go back to the phrase. Listen for the word together. One skip one. Two skip one. Three and four together. Four skip one. Five skip one. Six skip one. Seven and eight together. Which numbers are together?",
    diagnostic_hint: "Remember the phrase. Three and four... together. Seven and eight... together. Those are the numbers that sit right next to each other.",

    // EXPLAIN - reveal the meaning
    explain: "This pattern is the number code of the major scale. Every major scale in music follows this same pattern. It does not matter if we start on C, G, or A flat. The pattern stays the same. If you understand this pattern, you understand the foundation of music theory. Now let us see it on the piano.",

    // DEMONSTRATE - connect to C major
    demonstrate_intro: "When we start the major scale pattern on C, something amazing happens. Every note lands on a white key. Here is how the numbers map to notes. 1 is C. 2 is D. 3 is E. 4 is F. 5 is G. 6 is A. 7 is B. And 8 is C again, one octave higher.",
    demonstrate_play: "Put your right thumb on middle C, that is the 1. Now walk up one white key at a time, saying each number as you play. 1, 2, 3, 4, 5, 6, 7, 8.",

    // PRACTICE
    practiceStart: "Your turn. Start on the 1 and play up to 8. Say each number out loud as you play it. Go ahead.",

    // WRAPUP
    wrapup: "Nice work today. You learned the secret code of the major scale and played it on the piano. Here is your mission before next time. Say the pattern phrase five times every day. And I am sending you to a game called Find the Note. Your job is to start training your ear to hear the difference between notes. The better your ear gets, the faster you will be able to play by numbers. Great first lesson.",

    // CONTEXTUAL RESPONSES DURING PRACTICE
    noteTips: {
      '1': 'The 1 is your home base, middle C. Right thumb sits here.',
      '2': 'The 2 is D, one white key up. Use your index finger.',
      '3': 'The 3 is E. Remember, 3 and 4 sit together, so the next note is right next door.',
      '4': 'The 4 is F. It sits right next to the 3. No space between them. That is a half step.',
      '5': 'The 5 is G. We skipped one from the 4, so there is a space. That is a whole step.',
      '6': 'The 6 is A. Keep walking up the white keys.',
      '7': 'The 7 is B. Remember, 7 and 8 sit together, just like 3 and 4.',
    },
    mistakes: [
      { words: ['black key', 'wrong key', 'sharp', 'flat'], resp: 'Hold up. In the Scale of 1, every note is a white key. Slide back to the nearest white key.' },
      { words: ['fast', 'rushing', 'too fast', 'speed'], resp: 'Slow it down. Say each number out loud before you play the next note.' },
      { words: ['stuck', 'lost', 'confused', 'help', 'where'], resp: 'No stress. Put your right thumb on middle C, that is the 1. Walk up one white key at a time. 1, 2, 3, 4, 5, 6, 7, 8.' },
      { words: ['hurts', 'pain', 'tired', 'sore'], resp: 'Take a break. Shake out your hands gently. When you come back, keep your wrists relaxed.' },
      { words: ['half step', 'half steps'], resp: 'You remember. Half steps are where the notes sit right next to each other. 3 and 4, 7 and 8.' },
      { words: ['whole step', 'whole steps'], resp: 'Right. Whole steps are where we skip one. 1 to 2, 2 to 3, 4 to 5, 5 to 6, 6 to 7.' },
    ],
    defaults: [
      'Keep going. Say the number out loud as you play each note.',
      'I hear you. Try playing from the 1 up to the 8, saying each number.',
      'Remember the pattern. 3 and 4 together, 7 and 8 together. Everything else has a skip.',
      'Good effort. Now try saying the phrase. One skip one, two skip one, three and four together.',
    ],

  })

  // ElevenLabs TTS - Motesart's assigned "coach" voice
  const { speak: elevenSpeak, stop: elevenStop, isSpeaking: motesartSpeaking, isLoading: ttsLoading } = useTextToSpeech()

  // ElevenLabs TTS wrapper
  const speak = useCallback((message) => {
    if (!message || typeof message !== "string") return
    elevenStop()
    setMotesartStatus("speaking")
    elevenSpeak(message, "coach")
  }, [elevenSpeak, elevenStop])

  // Sync motesartStatus with ElevenLabs speaking state
  useEffect(() => {
    if (!motesartSpeaking && motesartStatus === 'speaking') {
      setMotesartStatus('listening')
    }
  }, [motesartSpeaking, motesartStatus])

  // Audio unlock + Start session handler (called by Start button click)
  const startSession = useCallback(() => {
    // Unlock audio context on user gesture (fixes browser autoplay policy)
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      ctx.resume().then(() => ctx.close())
    } catch(e) {}
    // Request mic + camera permissions on user gesture so both work reliably
    navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(stream => {
      // Got permissions - stop this stream (camera useEffect and speech recognition manage their own)
      stream.getTracks().forEach(t => t.stop())
      console.log('[Motesart] Mic + Camera permissions granted')
    }).catch(err => {
      console.log('[Motesart] Permission request error:', err)
      // Try audio-only if camera denied
      navigator.mediaDevices.getUserMedia({ audio: true }).then(s => {
        s.getTracks().forEach(t => t.stop())
        console.log('[Motesart] Mic-only permission granted')
      }).catch(e => console.log('[Motesart] Mic permission denied:', e))
    })
    setSessionStarted(true)
    setTimeout(() => setLessonPhase('greeting'), 300)
  }, [])

  // Global audio unlock on any click (ensures TTS works after speech recognition events)
  useEffect(() => {
    const unlock = () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        ctx.resume().then(() => ctx.close())
      } catch(e) {}
    }
    document.addEventListener('click', unlock, { once: false })
    document.addEventListener('touchstart', unlock, { once: false })
    return () => {
      document.removeEventListener('click', unlock)
      document.removeEventListener('touchstart', unlock)
    }
  }, [])

  // Phase Speech Driver: speaks the right message when phase changes
  useEffect(() => {
    if (spokenPhaseRef.current === lessonPhase) return
    const plan = lessonPlanRef.current
    phaseRef.current = lessonPhase

    if (lessonPhase === 'greeting') {
      spokenPhaseRef.current = 'greeting'
      setCoaching({ message: plan.greeting, tags: ['Welcome', 'Secret Code'] })
      speak(plan.greeting)
      // Auto-advance to confirm after greeting finishes (~15s)
      setTimeout(() => { if (phaseRef.current === 'greeting') setLessonPhase('confirm') }, 18000)
    }

    if (lessonPhase === 'confirm') {
      spokenPhaseRef.current = 'confirm'
      // Waiting for student to say ready - handled by handleSpeech
    }


    if (lessonPhase === 'teach_lower') {
      spokenPhaseRef.current = 'teach_lower'
      repCountRef.current = 0
      setCoaching({ message: plan.teach_lower_intro, tags: ['Pattern', 'Lower Half'] })
      speak(plan.teach_lower_intro)
    }

    if (lessonPhase === 'teach_full') {
      spokenPhaseRef.current = 'teach_full'
      repCountRef.current = 0
      setCoaching({ message: plan.teach_full_intro, tags: ['Pattern', 'Full Phrase'] })
      speak(plan.teach_full_intro)
    }

    if (lessonPhase === 'call_response') {
      spokenPhaseRef.current = 'call_response'
      subPhaseRef.current = 'three'
      setCoaching({ message: plan.call_three, tags: ['Call & Response'] })
      speak(plan.call_three)
    }

    if (lessonPhase === 'diagnostic') {
      spokenPhaseRef.current = 'diagnostic'
      diagnosticAttemptsRef.current = 0
      setCoaching({ message: plan.diagnostic_question, tags: ['Diagnostic', 'Half Steps'] })
      speak(plan.diagnostic_question)
    }

    if (lessonPhase === 'explain') {
      spokenPhaseRef.current = 'explain'
      setCoaching({ message: plan.explain, tags: ['Music Theory', 'Major Scale'] })
      speak(plan.explain)
      setTimeout(() => { if (phaseRef.current === 'explain') setLessonPhase('demonstrate') }, 20000)
    }

    if (lessonPhase === 'demonstrate') {
      spokenPhaseRef.current = 'demonstrate'
      const wyl = wylRef.current
      // WYL ADAPTIVE: visual learners get demo zoom opened automatically
      if (wyl.dominant === 'visual') {
        setDemoZoom(true)
        setCoaching({ message: plan.demonstrate_intro, tags: ['C Major', 'Piano', 'Visual Mode'] })
      } else {
        setCoaching({ message: plan.demonstrate_intro, tags: ['C Major', 'Piano'] })
      }
      speak(plan.demonstrate_intro)
      // WYL ADAPTIVE: kinesthetic learners move to practice faster
      const demoWait = wyl.dominant === 'kinesthetic' ? 12000 : 18000
      const playWait = wyl.dominant === 'kinesthetic' ? 10000 : 15000
      setTimeout(() => {
        if (phaseRef.current === 'demonstrate') {
          setCoaching({ message: plan.demonstrate_play, tags: ['Play Along'] })
          speak(plan.demonstrate_play)
          setTimeout(() => { if (phaseRef.current === 'demonstrate') setLessonPhase('practice') }, playWait)
        }
      }, demoWait)
    }

    if (lessonPhase === 'practice') {
      spokenPhaseRef.current = 'practice'
      const wyl = wylRef.current
      dpmRef.current.lastPromptTime = Date.now()
      // WYL ADAPTIVE: tailor the practice intro based on learning style
      if (wyl.dominant === 'visual') {
        setDemoZoom(true)
        setCoaching({ message: plan.practiceStart, tags: ['Your Turn', 'Scale of 1', 'Visual Guide On'] })
      } else if (wyl.dominant === 'readwrite') {
        setCoaching({ message: plan.practiceStart + " Remember the pattern: 1 skip 1, 2 skip 1, 3 and 4 together, 4 skip 1, 5 skip 1, 6 skip 1, 7 and 8 together.", tags: ['Your Turn', 'Written Pattern'] })
      } else {
        setCoaching({ message: plan.practiceStart, tags: ['Your Turn', 'Scale of 1'] })
      }
      speak(plan.practiceStart)
    }

    if (lessonPhase === 'wrapup') {
      spokenPhaseRef.current = 'wrapup'
      setCoaching({ message: plan.wrapup, tags: ['Great Work', 'Homework'] })
      speak(plan.wrapup)
    }
  }, [lessonPhase, speak])

  // Phase-Aware handleSpeech
  const handleSpeech = useCallback((text) => {
    interactionCountRef.current += 1
    // Natural 1.5s pause before Motesart responds — feels like she heard you and is thinking
    setMotesartStatus("thinking")
    setTimeout(() => {
    const plan = lessonPlanRef.current
    const phase = phaseRef.current
    console.log('[Motesart] Phase:', phase, 'Heard:', text)

    // GREETING: if student speaks during greeting, skip to confirm
    if (phase === 'greeting') {
      const readyWords = ['yes', 'yeah', 'ready', 'ok', 'okay', 'sure', 'yep', 'go', "let's go", "i'm ready"]
      if (readyWords.some(w => text.includes(w))) {
        setCoaching({ message: plan.confirmAck, tags: ['Confirmed'] })
        speak(plan.confirmAck)
        setTimeout(() => setLessonPhase('teach_lower'), 2000)
        return
      }
    }

    // CONFIRM: listen for readiness
    if (phase === 'confirm') {
      const readyWords = ['yes', 'yeah', 'ready', "let's go", 'go', 'ok', 'okay', 'sure', 'yep', 'start', "i'm ready", 'let us']
      if (readyWords.some(w => text.includes(w))) {
        setCoaching({ message: plan.confirmAck, tags: ['Confirmed'] })
        speak(plan.confirmAck)
        setTimeout(() => setLessonPhase('teach_lower'), 2000)
        return
      }
      const notReady = "No rush. Just say ready or yes when you want to begin."
      setCoaching({ message: notReady, tags: ['Waiting'] })
      speak(notReady)
      return
    }

    // TEACH LOWER: count repetitions of the phrase
    if (phase === 'teach_lower') {
      repCountRef.current += 1
      const count = repCountRef.current
      if (count < 3) {
        setCoaching({ message: plan.teach_lower_repeat, tags: ['Repeat', count + '/3'] })
        speak(plan.teach_lower_repeat)
      } else {
        setCoaching({ message: plan.teach_lower_done, tags: ['Lower Half Done'] })
        speak(plan.teach_lower_done)
        setTimeout(() => setLessonPhase('teach_full'), 4000)
      }
      return
    }

    // TEACH FULL: count repetitions of the full phrase
    if (phase === 'teach_full') {
      repCountRef.current += 1
      const count = repCountRef.current
      if (count < 3) {
        setCoaching({ message: plan.teach_full_repeat, tags: ['Repeat', count + '/3'] })
        speak(plan.teach_full_repeat)
      } else {
        setCoaching({ message: plan.teach_full_done, tags: ['Full Phrase Done'] })
        speak(plan.teach_full_done)
        setTimeout(() => setLessonPhase('call_response'), 5000)
      }
      return
    }

    // CALL AND RESPONSE
    if (phase === 'call_response') {
      if (subPhaseRef.current === 'three') {
        if (text.includes('four') || text.includes('together')) {
          setCoaching({ message: plan.call_three_correct, tags: ['Correct'] })
          speak(plan.call_three_correct)
          subPhaseRef.current = 'seven'
          setTimeout(() => {
            setCoaching({ message: plan.call_seven, tags: ['Call & Response'] })
            speak(plan.call_seven)
          }, 3000)
        } else {
          const retry = "Almost. I said three and... what comes next? Three and..."
          setCoaching({ message: retry, tags: ['Try Again'] })
          speak(retry)
        }
        return
      }
      if (subPhaseRef.current === 'seven') {
        if (text.includes('eight') || text.includes('together')) {
          setCoaching({ message: plan.call_seven_correct, tags: ['Correct'] })
          speak(plan.call_seven_correct)
          setTimeout(() => setLessonPhase('diagnostic'), 3000)
        } else {
          const retry = "Almost. Seven and... what comes next? Seven and..."
          setCoaching({ message: retry, tags: ['Try Again'] })
          speak(retry)
        }
        return
      }
    }

    // DIAGNOSTIC: check for 3-4 and 7-8
    if (phase === 'diagnostic') {
      diagnosticAttemptsRef.current += 1
      const has34 = (text.includes('3') || text.includes('three')) && (text.includes('4') || text.includes('four'))
      const has78 = (text.includes('7') || text.includes('seven')) && (text.includes('8') || text.includes('eight'))
      if (has34 && has78) {
        trackDPM(true)
        recalibrateWYL(true, 'diagnostic')
        setCoaching({ message: plan.diagnostic_correct, tags: ['Excellent', 'Half Steps'] })
        speak(plan.diagnostic_correct)
        setTimeout(() => setLessonPhase('explain'), 18000)
        return
      }
      if (has34 || has78) {
        const partial = has34
          ? "You got 3 and 4. There is one more pair. Which other numbers sit together?"
          : "You got 7 and 8. There is one more pair. Which other numbers sit together?"
        setCoaching({ message: partial, tags: ['Almost'] })
        speak(partial)
        return
      }
      trackDPM(false)
        recalibrateWYL(false, 'diagnostic')
        if (diagnosticAttemptsRef.current >= 3) {
        setCoaching({ message: plan.diagnostic_hint, tags: ['Hint'] })
        speak(plan.diagnostic_hint)
      } else {
        setCoaching({ message: plan.diagnostic_incorrect, tags: ['Try Again'] })
        speak(plan.diagnostic_incorrect)
      }
      return
    }

    // EXPLAIN: if student speaks, acknowledge and continue
    if (phase === 'explain') {
      const ack = "Good question. We will explore that more as we go. For now, let us see this on the piano."
      setCoaching({ message: ack, tags: ['Moving On'] })
      speak(ack)
      setTimeout(() => setLessonPhase('demonstrate'), 5000)
      return
    }

    // DEMONSTRATE: if student speaks, move to practice
    if (phase === 'demonstrate') {
      const readyWords = ['ok', 'okay', 'ready', 'got it', 'yes', 'yeah']
      if (readyWords.some(w => text.includes(w))) {
        setLessonPhase('practice')
        return
      }
    }

    // PRACTICE PHASE: contextual responses
    if (phase === 'practice') {
      // Check for note number mentions
      for (const [num, tip] of Object.entries(plan.noteTips)) {
        if (text.includes(num) || text.includes(['one','two','three','four','five','six','seven'][parseInt(num)-1])) {
          setCoaching({ message: tip, tags: ['Note ' + num] })
          speak(tip)
          return
        }
      }
      // Check for mistake keywords
      for (const m of plan.mistakes) {
        if (m.words.some(w => text.includes(w))) {
          setCoaching({ message: m.resp, tags: ['Coaching'] })
          speak(m.resp)
          return
        }
      }
      // Check for done/finished
      const doneWords = ['done', 'finished', 'did it', 'i did it', 'got it']
      if (doneWords.some(w => text.includes(w))) {
        trackDPM(true)
          const great = "Great job. Try it one more time, a little smoother this time."
        setCoaching({ message: great, tags: ['Encouragement'] })
        speak(great)
        return
      }
      // Default practice response
      const defaults = plan.defaults
      const resp = defaults[interactionCountRef.current % defaults.length]
      setCoaching({ message: resp, tags: ['Practice'] })
      speak(resp)
      return
    }

    // WRAPUP: acknowledge anything
    if (phase === 'wrapup') {
      const bye = "You did great today. See you next time."
      setCoaching({ message: bye, tags: ['Goodbye'] })
      speak(bye)
      return
    }
    }, 1500)
  }, [speak, trackDPM, recalibrateWYL])

  // -- Web Speech API (only active after session starts, pauses while Motesart speaks) --
  useEffect(() => {
    if (!sessionStarted) return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { console.log('SpeechRecognition not supported'); return }
    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognitionRef.current = recognition
    let stopped = false

    recognition.onresult = (event) => {
      let finalText = ''
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) finalText += t
        else interimText += t
      }
      setTranscript(interimText || finalText)
      if (finalText) {
        console.log('[Motesart] Heard:', finalText)
        // Wait 1s after student stops to be sure they are done, then respond
          clearTimeout(speechDelayRef.current)
          speechDelayRef.current = setTimeout(() => {
            handleSpeech(finalText.toLowerCase().trim())
          }, 1000)
      }
    }
    recognition.onend = () => {
      if (!stopped && !paused && sessionStarted) {
        try { recognition.start() } catch(e) {}
      }
    }
    recognition.onerror = (e) => {
      console.log('[Motesart] Speech error:', e.error)
      if (e.error === 'not-allowed') {
        setSensors(prev => prev.map(s => s.name === 'Mic' ? { ...s, value: 'Blocked', warn: true, detail: 'Allow mic access' } : s))
      }
    }

    if (!paused && !motesartSpeaking) {
      try {
        recognition.start()
        console.log('[Motesart] Speech recognition started')
        setSensors(prev => prev.map(s => s.name === 'Mic' ? { ...s, value: 'Active', warn: false, detail: 'Listening...' } : s))
      } catch(e) { console.log('[Motesart] Failed to start recognition:', e) }
    } else if (motesartSpeaking) {
      setSensors(prev => prev.map(s => s.name === 'Mic' ? { ...s, value: 'Paused', warn: false, detail: 'Motesart speaking...' } : s))
    }

    return () => { stopped = true; try { recognition.stop() } catch(e) {} }
  }, [paused, handleSpeech, sessionStarted, motesartSpeaking])

  const demoTitle = 'The Code of the Major Scale'
  const demoCaption = 'Learn the secret pattern: <strong>1 skip 1, 2 skip 1, 3 & 4 together, 4 skip 1, 5 skip 1, 6 skip 1, 7 & 8 together</strong>'

  // -- Timer --
  useEffect(() => {
    if (paused) return
    const id = setInterval(() => setTimer(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [paused])

  const fmtTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  // -- Camera -- (waits for session start so permission prompt doesn't conflict)
  useEffect(() => {
    if (!sessionStarted) return
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setCameraReady(true)
          console.log('[Motesart] Camera started')
        }
      } catch (err) {
        console.log('[Motesart] Camera not available:', err.message)
      }
    }
    startCamera()
    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop())
      }
    }
  }, [sessionStarted])

  // -- End session (triggers wrapup phase) --
  const handleEnd = useCallback(() => {
    if (lessonPhase !== 'wrapup') {
      setLessonPhase('wrapup')
      setTimeout(() => {
        if (videoRef.current?.srcObject) {
          videoRef.current.srcObject.getTracks().forEach(t => t.stop())
        }
        navigate('/session-summary')
      }, 8000)
    } else {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop())
      }
      navigate('/session-summary')
    }
  }, [navigate, lessonPhase])

  return (
    <>
      <style>{css}</style>
      <div className="wyl-root">
        {/* Camera feed */}
        <div className="wyl-camera">
          <video ref={videoRef} autoPlay playsInline muted style={{ display: cameraReady ? 'block' : 'none' }} />
          {!cameraReady && (
            <div className="wyl-camera-placeholder">
              <div className="wyl-camera-placeholder__icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5">
                  <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                </svg>
              </div>
              <span className="wyl-camera-placeholder__text">Connecting camera...</span>
            </div>
          )}
        </div>

        {/* Start Session Overlay - unlocks audio on user gesture */}
        {!sessionStarted && (
          <div className="wyl-start-overlay">
            <div className="wyl-start-overlay__title">School of Motesart</div>
            <div className="wyl-start-overlay__sub">Your practice session is ready. Click below and Motesart will guide you through today's lesson.</div>
            <button className="wyl-start-overlay__btn" onClick={startSession}>Begin Practice</button>
          </div>
        )}

        {/* Nametag */}
        <div className="wyl-nametag">
          <div className="wyl-nametag__dot" />
          <span className="wyl-nametag__name">Student</span>
        </div>

        {/* Top Bar */}
        <TopBar
          timer={fmtTime(timer)}
          objective={objective}
          onPause={() => setPaused(!paused)}
          onEnd={handleEnd}
          lessonPhase={lessonPhase}
        />

        {/* Motesart Card */}
        <MotesartCard
          coaching={coaching}
          importance={importance}
          chatOpen={chatOpen}
          onToggleChat={() => setChatOpen(!chatOpen)}
          sensors={sensors}
          motesartStatus={motesartStatus}
          transcript={transcript}
          lessonPhase={lessonPhase}
        />

        {/* Hover-reveal PIS + Sensors */}
        <HoverRevealSidebar
          pisScore={pisScore}
          sensors={sensors}
          onOpenPIS={() => setPisPopout(true)}
          onOpenSensors={() => setSensorPopout(true)}
        />

        {/* Demo Zoom overlay */}
        <DemoZoom
          active={demoZoom}
          title={demoTitle}
          caption={demoCaption}
          onClose={() => setDemoZoom(false)}
        />

        {/* Popout overlays */}
        <PopoutPIS active={pisPopout} onClose={() => setPisPopout(false)} pisScore={pisScore} breakdown={pisBreakdown} />
        <PopoutSensors active={sensorPopout} onClose={() => setSensorPopout(false)} sensors={sensors} />

      </div>
    </>
  )
}
