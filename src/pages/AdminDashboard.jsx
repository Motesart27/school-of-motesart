/**
 * Admin Dashboard ¢ School of Motesart
 * Converted from admin-v9.html ¢ React JSX
 *
 * Usage:
 * import AdminDashboard from './AdminDashboard';
 * import './AdminDashboard.css';
 *
 * Images are in ./assets/ ¢ update import paths to match your bundler.
 */

import './AdminDashboard.css';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Image imports
import tamiImg from './assets/image-1-nav-tab-active.png';
import motesartAvatar from './assets/amb-image-2.png';


// ¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢
// TOP NAV
// ¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢
function TopNav() {
 const navigate = useNavigate();

 const tabs = [
 { label: 'Overview', dotColor: '#f97316', dotShadow: true, active: true, route: '/admin' },
 { label: 'TAMi', isTami: true, dotColor: '#a855f7', route: '/tami' },
 { label: 'Students', dotColor: '#14b8a6', route: '/student' },
 { label: 'Teachers', dotColor: '#f97316', route: '/teacher' },
 { label: 'Ambassadors', dotColor: '#3b82f6', route: '/ambassador' },
 { label: 'Parents', dotColor: '#a855f7', route: '/parent' },
 { label: 'Game', dotColor: '#22c55e', route: '/game' },
 ];

 const { user, logout } = useAuth();

 return (
 <div className="topnav">
 <div className="nav-brand">
 <span style={{ fontSize: 18 }}>{'\u26A1'}</span>
 <span className="nav-brand-label">ADMIN</span>
 </div>
 <div className="nav-tabs">
 {tabs.map((tab, i) => (
 <div
 key={i}
 className={`nav-tab${tab.active ? ' active' : ''}`}
 onClick={() => navigate(tab.route)}
 style={{ cursor: 'pointer' }}
 >
 <div
 className="nav-dot"
 style={{
 background: tab.dotColor,
 ...(tab.dotShadow ? { boxShadow: `0 0 5px ${tab.dotColor}` } : {}),
 }}
 />
 {' '}{tab.label}
 </div>
 ))}
 </div>
 <div className="nav-right">
 <span
 className="nav-user"
 style={{ cursor: 'default' }}
 >
 {user?.name || 'User'} {'\u00B7'} All Roles
 </span>
 <button
 onClick={() => { logout(); navigate('/'); }}
 style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', fontSize: 11, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap' }}
 >Logout</button>
 </div>
 </div>
 );
}


// ¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢
// PROFILE HEADER
// ¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢
function ProfileHeader() {
 const navigate = useNavigate();
 const { user } = useAuth();

 return (
 <div className="profile-header">
 <div className="back-btn" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>{'\u2190'}</div>
 <div className="p-avatar" style={{ overflow: 'hidden' }}>
 <img src={user?.avatar || motesartAvatar} alt={user?.name || "User"} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
 </div>
 <div style={{ flex: 1 }}>
 <div className="p-name">{user?.name || 'User'}</div>
 <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
 <span className="badge-admin">ADMIN</span>
 </div>
 <div className="p-sub">School of Motesart {'\u00B7'} Platform Administrator</div>
 </div>
 <div className="tami-pill">
 <img src={tamiImg} alt="TAMi" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
 <div className="tami-online" />
 <span className="tami-pill-label">TAMi</span>
 </div>
 <div className="bell" style={{ marginLeft: 12 }}>
 {'\uD83D\uDD14'}<div className="bell-badge">4</div>
 </div>
 </div>
 );
}


// ¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢
// HERO SECTION
// ¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢
function HeroSection() {
 const { user } = useAuth();

 const stats = [
 { value: '142', color: '#3b82f6', label: 'Total Signups' },
 { value: '12', color: '#22c55e', label: 'Schools Enrolled' },
 { value: '66%', color: '#f97316', label: 'Avg Conv. Rate' },
 { value: '.8K', color: '#e84b8a', label: 'Revenue Raised' },
 ];

 return (
 <div className="hero">
 <div className="hero-left">
 <div className="hero-greeting">Good afternoon, {user?.name || 'User'} {'\uD83C\uDF89'}</div>
 <div className="ref-row">
 <span className="ref-label">Platform code:</span>
 <span className="ref-code" style={{ color: '#4ade80', borderColor: 'rgba(74,222,128,0.45)' }}>SOM-ADMIN</span>
 <span className="ref-copy" style={{ color: '#4ade80', borderColor: 'rgba(74,222,128,0.35)' }}>{'\uD83D\uDD17'} Copy</span>
 </div>
 <div className="hero-stats">
 {stats.map((s, i) => (
 <div key={i}>
 <div className="hs-val" style={{ color: s.color }}>{s.value}</div>
 <div className="hs-lbl">{s.label}</div>
 </div>
 ))}
 </div>
 <div className="share-btn" style={{ marginTop: 18 }}>{'\uD83D\uDCCB'} Share Platform Materials</div>
 </div>
 <div className="hero-right">
 <div className="hr-label">New Signup Sign-In Rate</div>
 <div className="hr-pct">82%</div>
 <div className="hr-bar">
 <div className="hr-bar-fill" />
 </div>
 <div className="hr-sub">Logged in within 7 days</div>
 <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
 <div className="hr-label">States Represented</div>
 <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 36, fontWeight: 800, color: '#a855f7', lineHeight: 1 }}>9</div>
 <div className="hr-sub" style={{ marginTop: 5 }}>TX {'\u00B7'} CA {'\u00B7'} FL {'\u00B7'} NY {'\u00B7'} GA {'\u00B7'} OH {'\u00B7'} IL {'\u00B7'} NC {'\u00B7'} WA</div>
 </div>
 </div>
 </div>
 );
}


// ¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢
// TAMI INSIGHT
// ¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢
function TamiInsight() {
 return (
 <div className="tami-insight">
 <div className="tami-chat-icon" style={{ width: 42, height: 42, borderRadius: 11, background: 'linear-gradient(135deg, #e84b8a, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, border: '2px solid rgba(232,75,138,0.3)' }}>
 {'\uD83D\uDCAC'}
 </div>
 <div>
 <div className="ti-label">TAMi Platform Intelligence</div>
 <div className="ti-text" style={{ color: '#e0d6ff' }}>
 Signups up <strong style={{ color: '#4ade80' }}>18%</strong> this week driven by
 Ambassador code MOTES2026. Texas leads with 23 new students. Revenue reached{' '}
 <strong style={{ color: '#fb923c' }}>,820</strong> this month. Top ear training school:{' '}
 <strong style={{ color: '#5eead4' }}>Westview Music Academy (82% accuracy)</strong>.
 3 students flagged for immediate outreach. {'\uD83C\uDFAF'}
 </div>
 </div>
 </div>
 );
}


// ¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢
// STAT CARDS
// ¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢
function StatsRow() {
 const cards = [
 { icon: '\u270D\uFE0F', value: '142', label: 'Total Signups', change: '\u2191 18 this week', colorClass: 's-or' },
 { icon: '\uD83C\uDFEB', value: '12', label: 'Schools Enrolled', change: '\u2191 2 this month', colorClass: 's-te' },
 { icon: '\uD83D\uDCCD', value: '9', label: 'States Represented', change: '\u2191 TX, FL added', colorClass: 's-bl' },
 { icon: '\uD83D\uDCB0', value: '.8K', label: 'Revenue Circulating', change: '\u2191 24% vs last month', colorClass: 's-pk' },
 { icon: '\uD83C\uDFAE', value: '1,284', label: 'Game Sessions / Week', change: '\u2191 12% vs last week', colorClass: 's-pu' },
 ];

 return (
 <div className="stats-row">
 {cards.map((c, i) => (
 <div key={i} className={`stat-card ${c.colorClass}`}>
 <div className="stat-icon">{c.icon}</div>
 <div className="stat-val">{c.value}</div>
 <div className="stat-lbl">{c.label}</div>
 <div className="stat-chg up">{c.change}</div>
 </div>
 ))}
 </div>
 );
}


// ¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢
// AMBASSADOR LEADERBOARD
// ¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢
function AmbassadorLeaderboard() {
 const ambassadors = [
 { medal: '\uD83E\uDD47', medalBg: 'rgba(234,179,8,0.1)', initials: 'M', avBg: 'rgba(249,115,22,0.15)', avColor: '#f97316', name: 'Motesart', tier: '\uD83C\uDFC6 AMBASSADOR', tierClass: 't-go', refs: 47, conv: 31, rate: '66%', money: '20', signups: '47 signups' },
 { medal: '\uD83E\uDD48', medalBg: 'rgba(59,130,246,0.07)', initials: 'JO', avBg: 'rgba(59,130,246,0.15)', avColor: '#3b82f6', name: 'James Okoro', tier: '\u2B50 RISING STAR', tierClass: 't-si', refs: 31, conv: 18, rate: '58%', money: '10', signups: '31 signups' },
 { medal: '\uD83E\uDD49', medalBg: 'rgba(168,85,247,0.08)', initials: 'SR', avBg: 'rgba(168,85,247,0.15)', avColor: '#a855f7', name: 'Sofia Rivera', tier: '\u2B50 RISING STAR', tierClass: 't-si', refs: 24, conv: 13, rate: '54%', money: '10', signups: '24 signups' },
 { medal: '', medalBg: 'rgba(232,75,138,0.05)', initials: 'AJ', avBg: 'rgba(232,75,138,0.15)', avColor: '#e84b8a', name: 'Aaliyah Johnson', tier: '\u2B50 RISING STAR', tierClass: 't-si', refs: 18, conv: 9, rate: '50%', money: '20', signups: '18 signups' },
 { medal: '', medalBg: 'rgba(34,197,94,0.08)', initials: 'MW', avBg: 'rgba(34,197,94,0.15)', avColor: '#22c55e', name: 'Marcus Williams', tier: '\u2B50 RISING STAR', tierClass: 't-br', refs: 12, conv: 5, rate: '42%', money: '50', signups: '12 signups' },
 ];

 return (
 <div className="card">
 <div className="card-hdr">
 <div>
 <div className="card-title">{'\uD83D\uDD17'} Ambassador Leaderboard</div>
 <div className="card-sub">8 active {'\u00B7'} ranked by performance tier</div>
 </div>
 <span className="pill p-or2">Live</span>
 </div>
 <div className="ftabs">
 <div className="ftab f-or">Signups</div>
 <div className="ftab">Money Raised</div>
 <div className="ftab">Tiers</div>
 </div>
 {ambassadors.map((a, i) => (
 <div key={i} className="amb-row">
 <div className="amb-medal" style={{ background: a.medalBg }}>{a.medal}</div>
 <div className="amb-av" style={{ background: a.avBg, color: a.avColor }}>{a.initials}</div>
 <div style={{ flex: 1 }}>
 <div className="amb-name-row">
 <span className="amb-name">{a.name}</span>
 <span className={`tier-badge ${a.tierClass}`}>{a.tier}</span>
 </div>
 <div className="amb-meta">
 <span>Refs: <b>{a.refs}</b></span>
 <span>Conv: <b>{a.conv}</b></span>
 <span>Rate: <b>{a.rate}</b></span>
 </div>
 </div>
 <div className="amb-right">
 <div className="amb-money">{a.money}</div>
 <div className="amb-count">{a.signups}</div>
 </div>
 </div>
 ))}
 </div>
 );
}


// ¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢
// TAMI LEADERS
// ¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢
function TamiLeaders() {
 const leaders = [
 { num: 1, initials: 'AJ', avBg: 'rgba(232,75,138,0.15)', avColor: '#e84b8a', name: 'Aaliyah Johnson', meta: 'Student \u00B7 Westview Academy \u00B7 TX', value: 94, valueColor: '#e84b8a' },
 { num: 2, initials: 'SR', avBg: 'rgba(20,184,166,0.15)', avColor: '#14b8a6', name: 'Sofia Rivera', meta: 'Student \u00B7 Lincoln Arts \u00B7 CA', value: 71, valueColor: '#14b8a6' },
 { num: 3, initials: 'M', avBg: 'rgba(249,115,22,0.15)', avColor: '#f97316', name: 'Motesart', meta: 'Admin \u00B7 Platform-wide \u00B7 TX', value: 58, valueColor: '#f97316' },
 { num: 4, initials: 'MW', avBg: 'rgba(59,130,246,0.15)', avColor: '#3b82f6', name: 'Marcus Williams', meta: 'Teacher \u00B7 Music Theory 101 \u00B7 NY', value: 44, valueColor: '#3b82f6' },
 { num: 5, initials: 'JO', avBg: 'rgba(168,85,247,0.15)', avColor: '#a855f7', name: 'James Okoro', meta: 'Ambassador \u00B7 Outreach \u00B7 GA', value: 38, valueColor: '#a855f7' },
 ];

 return (
 <div className="card">
 <div className="tami-card-hdr">
 <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #e84b8a, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, border: '2px solid rgba(232,75,138,0.35)' }}>
 {'\uD83D\uDCAC'}
 </div>
 <div style={{ flex: 1 }}>
 <div className="card-title">TAMi Leaders</div>
 <div className="card-sub">
 Top engagement with TAMi across the platform
 </div>
 </div>
 <span className="pill p-pk2">Live</span>
 </div>
 <div className="ftabs">
 <div className="ftab f-pk">{'\uD83D\uDC64'} User</div>
 <div className="ftab">{'\uD83C\uDF93'} Class</div>
 <div className="ftab">{'\uD83C\uDFEB'} School</div>
 <div className="ftab">{'\uD83D\uDCCD'} State</div>
 <div className="ftab">{'\uD83D\uDD25'} Streak</div>
 <div className="ftab">{'\u2B50'} Rising</div>
 </div>
 <div className="tab-cat-lbl">
 {'\uD83D\uDC64'} Top Users by TAMi Engagement
 </div>
 {leaders.map((l, i) => (
 <div key={i} className="lr">
 <div className="lr-num">{l.num}</div>
 <div className="lr-av" style={{ background: l.avBg, color: l.avColor }}>{l.initials}</div>
 <div style={{ flex: 1 }}>
 <div className="lr-name">{l.name}</div>
 <div className="lr-meta">{l.meta}</div>
 </div>
 <div>
 <div className="lr-val-n" style={{ color: l.valueColor }}>{l.value}</div>
 <div className="lr-val-l">
 {'\uD83D\uDCAC'} chats
 </div>
 </div>
 </div>
 ))}
 <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
 Switch tabs {'\u2192'} {'\uD83C\uDF93'} Class {'\u00B7'} {'\uD83C\uDFEB'} School {'\u00B7'} {'\uD83D\uDCCD'} State {'\u00B7'} {'\uD83D\uDD25'} Streak {'\u00B7'} {'\u2B50'} Rising Star
 </div>
 </div>
 );
}


// ¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢
// DPM HEALTH + RISK
// ¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢
function DpmHealth() {
 const bars = [
 { label: 'Students', width: '72%', gradient: 'linear-gradient(90deg,#14b8a6,#22c55e)', color: '#14b8a6', pct: '72%' },
 { label: 'Teachers', width: '88%', gradient: 'linear-gradient(90deg,#f97316,#fbbf24)', color: '#f97316', pct: '88%' },
 { label: 'Ambassadors', width: '65%', gradient: 'linear-gradient(90deg,#3b82f6,#a855f7)', color: '#3b82f6', pct: '65%' },
 { label: 'Parents', width: '41%', gradient: 'linear-gradient(90deg,#a855f7,#e84b8a)', color: '#a855f7', pct: '41%' },
 ];

 const risks = [
 { value: 8, label: '\uD83D\uDD34 Critical', className: 'r-cr' },
 { value: 14, label: '\uD83D\uDFE0 At Risk', className: 'r-at' },
 { value: 21, label: '\uD83D\uDFE1 Watch', className: 'r-wa' },
 { value: 55, label: '\uD83D\uDFE2 On Track', className: 'r-on' },
 ];

 return (
 <div className="card">
 <div className="card-hdr">
 <div><div className="card-title">{'\uD83D\uDCCA'} DPM Health by Role</div></div>
 <span className="pill p-or2">Avg: 74%</span>
 </div>
 {bars.map((b, i) => (
 <div key={i} className="bar-row">
 <div className="bar-lbl">{b.label}</div>
 <div className="bw">
 <div className="bf" style={{ width: b.width, background: b.gradient }} />
 </div>
 <div className="bar-pct" style={{ color: b.color }}>{b.pct}</div>
 </div>
 ))}
 <div className="sdiv">
 <div className="slbl">Student Risk Breakdown</div>
 <div className="risk-row">
 {risks.map((r, i) => (
 <div key={i} className={`risk-box ${r.className}`}>
 <div className="rv">{r.value}</div>
 <div className="rl">{r.label}</div>
 </div>
 ))}
 </div>
 </div>
 </div>
 );
}


// ¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢
// SYSTEM ALERTS + HEALTH
// ¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢
function SystemAlerts() {
 const alerts = [
 { color: '#ef4444', shadow: true, text: '14 students inactive 7+ days', time: 'TAMi flagged \u00B7 2h ago' },
 { color: '#f97316', shadow: false, text: '3 teacher accounts pending verification', time: 'System \u00B7 5h ago' },
 { color: '#eab308', shadow: false, text: 'Airtable API at 82% rate limit', time: 'System \u00B7 8h ago' },
 { color: '#eab308', shadow: false, text: 'Session log sync delayed \u2014 Railway', time: 'System \u00B7 12h ago' },
 ];

 const healthItems = [
 { name: 'Railway Backend', dotClass: 'dg', statusClass: 'hg', status: 'Online' },
 { name: 'Netlify Frontend', dotClass: 'dg', statusClass: 'hg', status: 'Deployed' },
 { name: 'Airtable DB', dotClass: 'dy', statusClass: 'hy', status: 'High Load' },
 { name: 'TAMi API', dotClass: 'dg', statusClass: 'hg', status: 'Active' },
 ];

 return (
 <div className="card">
 <div className="card-hdr">
 <div className="card-title">{'\uD83D\uDD14'} System Alerts</div>
 <span className="pill p-rd">4 active</span>
 </div>
 {alerts.map((a, i) => (
 <div key={i} className="alert-row">
 <div
 className="adot"
 style={{
 background: a.color,
 ...(a.shadow ? { boxShadow: `0 0 5px ${a.color}` } : {}),
 }}
 />
 <div>
 <div className="a-txt">{a.text}</div>
 <div className="a-time">{a.time}</div>
 </div>
 </div>
 ))}
 <div className="sdiv">
 <div className="slbl">{'\u2699\uFE0F'} System Health</div>
 {healthItems.map((h, i) => (
 <div key={i} className="h-row">
 <div className="h-name">{h.name}</div>
 <div className="h-st">
 <div className={h.dotClass} />
 <span className={h.statusClass}>{h.status}</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 );
}


// ¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢
// TOP STATES
// ¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢
function TopStates() {
 const states = [
 { abbr: 'TX', width: '90%', count: 28 },
 { abbr: 'CA', width: '70%', count: 21 },
 { abbr: 'FL', width: '55%', count: 17 },
 { abbr: 'NY', width: '42%', count: 13 },
 { abbr: 'GA', width: '28%', count: 9 },
 { abbr: 'OH', width: '18%', count: 6 },
 ];

 return (
 <div className="card">
 <div className="card-hdr">
 <div className="card-title">{'\uD83D\uDCCD'} Top States</div>
 <span className="pill p-or2">9 states</span>
 </div>
 {states.map((s, i) => (
 <div key={i} className="bar-row">
 <div className="bar-lbl-sm">{s.abbr}</div>
 <div className="bw">
 <div className="bf" style={{ width: s.width, background: 'linear-gradient(90deg,#f97316,#e84b8a)' }} />
 </div>
 <div className="bar-cnt">{s.count}</div>
 </div>
 ))}
 </div>
 );
}


// ¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢
// REVENUE BREAKDOWN
// ¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢
function RevenueBreakdown() {
 const rows = [
 { label: 'Subscriptions', value: ',200', color: '#22c55e' },
 { label: 'Ambassador Referrals', value: ',710', color: '#f97316' },
 { label: 'School Licenses', value: '10', color: '#3b82f6' },
 ];

 return (
 <div className="card">
 <div className="card-hdr">
 <div className="card-title">{'\uD83D\uDCB0'} Revenue Breakdown</div>
 <span className="pill p-gr">+24%</span>
 </div>
 {rows.map((r, i) => (
 <div key={i} className="money-row">
 <div className="m-lbl">{r.label}</div>
 <div className="m-val" style={{ color: r.color }}>{r.value}</div>
 </div>
 ))}
 <div
 className="money-row"
 style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 6, paddingTop: 10, borderBottom: 'none' }}
 >
 <div className="m-lbl" style={{ fontWeight: 800, color: '#fff' }}>Total</div>
 <div className="m-val" style={{ color: '#e84b8a', fontSize: 18 }}>,820</div>
 </div>
 <div style={{ marginTop: 14, padding: 10, borderRadius: 10, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.1)', textAlign: 'center' }}>
 <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>vs last month</div>
 <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 800, color: '#22c55e' }}>+,120</div>
 <div style={{ fontSize: 11, color: 'rgba(34,197,94,0.7)' }}>{'\u2191'} 24% growth</div>
 </div>
 </div>
 );
}


// ¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢
// QUICK ACTIONS
// ¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢
function QuickActions() {
 const actions = [
 { icon: '\u2795', label: 'Add User' },
 { icon: '\uD83D\uDCE7', label: 'Broadcast' },
 { icon: '\uD83D\uDD04', label: 'Restart Backend' },
 { icon: '\uD83D\uDCE4', label: 'Export Data' },
 { icon: '\uD83C\uDFEB', label: 'Manage Schools' },
 { icon: '\uD83D\uDCB0', label: 'Payouts' },
 { icon: '\uD83E\uDD16', label: 'TAMi Config' },
 { icon: '\uD83D\uDCDD', label: 'View Logs' },
 { icon: '\uD83D\uDCCA', label: 'Reports' },
 ];

 return (
 <div className="card">
 <div className="card-hdr">
 <div className="card-title">{'\u26A1'} Quick Actions</div>
 </div>
 <div className="qa-grid">
 {actions.map((a, i) => (
 <div key={i} className="qa-btn">
 <div className="qa-icon">{a.icon}</div>
 <div className="qa-lbl">{a.label}</div>
 </div>
 ))}
 </div>
 </div>
 );
}


// ¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢
// MAIN DASHBOARD (default export)
// ¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢
export default function AdminDashboard() {
 return (
 <>
 <TopNav />
 <ProfileHeader />
 <div className="main">
 <HeroSection />
 <TamiInsight />
 <StatsRow />
 <div className="grid-2col">
 <AmbassadorLeaderboard />
 <TamiLeaders />
 </div>
 <div className="grid-2col">
 <DpmHealth />
 <SystemAlerts />
 </div>
 <div className="grid-3col">
 <TopStates />
 <RevenueBreakdown />
 <QuickActions />
 </div>
 </div>
 </>
 );
}

export {
 TopNav,
 ProfileHeader,
 HeroSection,
 TamiInsight,
 StatsRow,
 AmbassadorLeaderboard,
 TamiLeaders,
 DpmHealth,
 SystemAlerts,
 TopStates,
 RevenueBreakdown,
 QuickActions,
};
