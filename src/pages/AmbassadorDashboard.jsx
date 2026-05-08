import React, { useState } from 'react';
import TamiChat from '../components/TamiChat';
import tamiImg from './assets/amb-image-1.png';
import avatarImg from './assets/amb-image-2.png';
import './AmbassadorDashboard.css';
import { useAuth } from '../context/AuthContext.jsx';

// Sub-components
export const TopNav = ({ activeTab, setActiveTab, onIntelClick, onStudentsClick, user }) => {
 const navTabs = [
 { id: 'overview', label: 'Overview', color: '#059669', glow: true },
 { id: 'students', label: 'Students', color: '#059669' },
 { id: 'referrals', label: 'Referrals', color: '#059669' },
 { id: 'intelligence', label: 'Intelligence', color: '#7c3aed' },
 ];

 return (
 <div className="topnav">
 <div className="nav-brand">
 <span className="nav-brand-label">AMBASSADOR</span>
 </div>
 <div className="nav-tabs">
 {navTabs.map((tab) => (
 <div
 key={tab.id}
 className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
 onClick={() => {
 setActiveTab(tab.id);
 if (tab.id === 'intelligence' && onIntelClick) {
 onIntelClick();
 } else if (tab.id === 'students' && onStudentsClick) {
 onStudentsClick();
 }
 }}
 >
 <div
 className="nav-dot"
 style={{
 background: tab.color,
 boxShadow: tab.glow ? `0 0 5px ${tab.color}` : 'none',
 }}
 />
 {tab.label}
 </div>
 ))}
 </div>
 <div className="nav-right">
 <span className="nav-user">{user?.name || 'User'} · Musician Ambassador</span>
 <div className="bell">
 
 <div className="bell-badge">3</div>
 </div>
 </div>
 <div className="nav-type-stripe" />
 </div>
 );
};

export const ProfileHeader = ({ onTamiClick, user }) => {
 return (
 <div className="profile-header">
 <div className="back-btn" onClick={() => window.history.back()}></div>
 <div style={{ flex: 1 }}>
 <div className="p-name">{user?.name || 'User'}</div>
 <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
 <span className="badge-amb">AMBASSADOR</span>
 <span className="badge-musician">µ Musician</span>
 <span className="badge-gold"> GOLD TIER</span>
 </div>
 <div className="p-sub">School of Motesart · T.A.M.i Outreach Partner · Top 12%</div>
 </div>
 <div className="tami-pill" onClick={onTamiClick}>
 <img src={tamiImg} alt="T.A.M.i" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(232,75,138,0.4)' }} />
 <div className="tami-online" />
 <span className="tami-pill-label">T.A.M.i</span>
 </div>
 </div>
 );
};

export const OrbitalHero = ({ user }) => {
 const stats = [
 { id: 1, value: '47', label: 'Referrals', color: '#059669', animation: 'os1' },
 { id: 2, value: '66%', label: 'Conv. Rate', color: '#22c55e', animation: 'os2' },
 { id: 3, value: '$620', label: 'Raised', color: '#e84b8a', animation: 'os2b' },
 { id: 4, value: '31', label: 'Converted', color: '#3b82f6', animation: 'os2c' },
 { id: 5, value: '82%', label: 'Sign-in Rate', color: '#7c3aed', animation: 'os3' },
 { id: 6, value: '14', label: 'This Month', color: '#f97316', animation: 'os3b' },
 { id: 7, value: '#1', label: 'TX Rank', color: '#059669', animation: 'os3c' },
 ];

 const bigStats = [
 { label: 'Total Referrals', value: '47', change: ' 8 this month', className: 'bs-te' },
 { label: 'Converted', value: '31', change: ' 5 this month', className: 'bs-gold' },
 { label: 'Money Raised', value: '$620', change: ' $140 this month', className: 'bs-pink' },
 { label: 'Conversion Rate', value: '66%', change: ' 4% vs last month', className: 'bs-blue' },
 ];

 const handleCopyCode = () => {
 navigator.clipboard.writeText('MOTES2026');
 console.log('Referral code copied!');
 };

 return (
 <div className="orbital-section">
 <div className="orbital-wrap">
 <div className="orb-center-glow" />
 <div className="orbit-ring ring1" />
 <div className="orbit-ring ring2" />
 <div className="orbit-ring ring3" />
 <div className="orb-center">
 <img src={avatarImg} alt={user?.name || "User"} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
 </div>
 {stats.map((stat) => (
 <div key={stat.id} className={`orb-stat ${stat.animation}`}>
 <div className="stat-bubble">
 <div className="sb-val" style={{ color: stat.color }}>
 {stat.value}
 </div>
 <div className="sb-lbl">{stat.label}</div>
 </div>
 </div>
 ))}
 </div>

 <div className="orbital-info">
 <div className="oi-greeting">Good afternoon, {user?.name || 'User'} µ</div>
 <div className="oi-sub">Your referral impact is in the top 12% of all ambassadors this month.</div>
 <div className="ref-row">
 <span className="ref-label">Your code:</span>
 <span className="ref-code">MOTES2026</span>
 <span className="ref-copy" onClick={handleCopyCode}>
 Copy
 </span>
 </div>

 <div className="big-stats">
 {bigStats.map((stat, idx) => (
 <div key={idx} className={`big-stat ${stat.className}`}>
 <div className="bs-val">{stat.value}</div>
 <div className="bs-lbl">{stat.label}</div>
 <div className="bs-chg">{stat.change}</div>
 </div>
 ))}
 </div>

 <div className="rate-bar-card">
 <div className="rb-label">New Signup Sign-In Rate</div>
 <div className="rb-val">
 82%{' '}
 <span style={{ fontSize: '14px', color: 'rgba(13,45,30,0.4)', fontFamily: "'DM Sans'" }}>
 of referrals
 </span>
 </div>
 <div className="rb-bar">
 <div className="rb-fill" />
 </div>
 <div className="rb-sub">Logged in within 7 days of sign-up</div>
 </div>
 </div>
 </div>
 );
};

export const TypeCard = ({ icon, name, description, stats, barWidth, className, onIntelClick }) => {
 return (
 <div className={`type-card ${className}`}>
 {className === 'tc-musician' && <div className="tc-badge">YOUR TYPE</div>}
 <div className="tc-icon">{icon}</div>
 <div className="tc-name">{name}</div>
 <div className="tc-desc">{description}</div>
 <div className="tc-stats">
 {stats.map((stat, idx) => (
 <div key={idx} className="tc-stat">
 <span className="tc-stat-lbl">{stat.label}</span>
 <span className="tc-stat-val">{stat.value}</span>
 </div>
 ))}
 </div>
 <div className="tc-bar-wrap">
 <div className="tc-bar-fill" style={{ width: `${barWidth}%` }} />
 </div>
 {className === 'tc-intel' && (
 <button className="intel-open-btn" onClick={onIntelClick}>
 §  Open Intelligence Dashboard 
 </button>
 )}
 </div>
 );
};

export const TypeCardsSection = ({ onIntelClick }) => {
 const typeCards = [
 {
 icon: '',
 name: 'Teacher',
 description: 'Educators referring students & schools to the platform',
 stats: [
 { label: 'Schools referred', value: '' },
 { label: 'Students enrolled', value: '' },
 { label: 'Rank in category', value: '' },
 ],
 barWidth: 0,
 className: 'tc-teacher',
 },
 {
 icon: '¨',
 name: 'Artist',
 description: 'Creative ambassadors building brand presence & culture',
 stats: [
 { label: 'Content created', value: '' },
 { label: 'Reach generated', value: '' },
 { label: 'Rank in category', value: '' },
 ],
 barWidth: 0,
 className: 'tc-artist',
 },
 {
 icon: 'µ',
 name: 'Musician',
 description: 'Performing musicians amplifying the SOM brand through music',
 stats: [
 { label: 'Schools referred', value: '3' },
 { label: 'Students enrolled', value: '47' },
 { label: 'Rank in category', value: '#1' },
 ],
 barWidth: 92,
 className: 'tc-musician',
 },
 {
 icon: '§ ',
 name: 'Intelligence',
 description: 'Your unique teaching DNA, brand voice, & AI-powered profile',
 stats: [
 { label: 'Brand score', value: '94' },
 { label: 'Voice samples', value: '2' },
 { label: 'Style match', value: '88%' },
 ],
 barWidth: 88,
 className: 'tc-intel',
 },
 ];

 return (
 <>
 <div className="type-cards-label">Ambassador Type & Position</div>
 <div className="type-cards">
 {typeCards.map((card, idx) => (
 <TypeCard
 key={idx}
 icon={card.icon}
 name={card.name}
 description={card.description}
 stats={card.stats}
 barWidth={card.barWidth}
 className={card.className}
 onIntelClick={onIntelClick}
 />
 ))}
 </div>
 </>
 );
};

export const AnalyticsRow = () => {
 const trendBars = [
 { height: '55%', opacity: 0.45 },
 { height: '40%', opacity: 0.5 },
 { height: '70%', opacity: 0.6 },
 { height: '60%', opacity: 0.6 },
 { height: '80%', opacity: 0.8 },
 { height: '65%', opacity: 0.7 },
 { height: '100%', opacity: 1 },
 ];

 const rewards = [
 { icon: '¥', name: 'Gold Tier', sub: 'Top 12% · Unlocked', val: 'Active', valColor: '#d4a017' },
 { icon: '°', name: 'Revenue Share', sub: '10% of each conversion', val: '$620', valColor: '#22c55e' },
 { icon: '¯', name: 'Platinum Unlock', sub: '3 more conversions needed', val: '28/31', valColor: '#a855f7' },
 ];

 const activities = [
 { icon: '', color: '#22c55e', text: 'Marcus T. enrolled via MOTES2026', time: '2 hours ago' },
 { icon: '', color: '#3b82f6', text: 'Sofia R. signed up pending conversion', time: 'Yesterday' },
 { icon: '', color: '#059669', text: 'Westview Academy linked to your code', time: '3 days ago' },
 { icon: '', color: '#22c55e', text: 'Payout of $140 processed', time: 'Last week' },
 { icon: '', color: '#a855f7', text: 'Intelligence profile updated by T.A.M.i', time: 'Last week' },
 ];

 return (
 <>
 <div className="analytics-label">Referral Analytics & Activity</div>
 <div className="analytics-row">
 {/* Pipeline Card */}
 <div className="acard">
 <div className="acard-title">
 Referral Pipeline{' '}
 <span className="acard-pill ap-gold">This Month</span>
 </div>
 <div className="pipeline">
 <div className="pipe-stage p-clicks">
 <div className="ps-val" style={{ color: '#3b82f6' }}>
 62
 </div>
 <div className="ps-lbl">Link Clicks</div>
 </div>
 <div style={{ display: 'flex', alignItems: 'center', color: 'rgba(13,45,30,0.2)', fontSize: '18px', paddingTop: '4px' }}>
 
 </div>
 <div className="pipe-stage p-signups">
 <div className="ps-val" style={{ color: '#f97316' }}>
 47
 </div>
 <div className="ps-lbl">Signed Up</div>
 </div>
 <div style={{ display: 'flex', alignItems: 'center', color: 'rgba(13,45,30,0.2)', fontSize: '18px', paddingTop: '4px' }}>
 
 </div>
 <div className="pipe-stage p-conv">
 <div className="ps-val" style={{ color: '#22c55e' }}>
 31
 </div>
 <div className="ps-lbl">Converted</div>
 </div>
 </div>

 <div style={{ marginTop: '10px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
 <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(13,45,30,0.4)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '10px' }}>
 Weekly Trend
 </div>
 <div className="trend-row">
 {trendBars.map((bar, idx) => (
 <div key={idx} className="trend-bar" style={{ height: bar.height, background: '#059669', opacity: bar.opacity }} />
 ))}
 </div>
 <div className="trend-labels">
 <div className="trend-lbl">W1</div>
 <div className="trend-lbl">W2</div>
 <div className="trend-lbl">W3</div>
 <div className="trend-lbl">W4</div>
 <div className="trend-lbl">W5</div>
 <div className="trend-lbl">W6</div>
 <div className="trend-lbl">W7</div>
 </div>
 </div>
 </div>

 {/* Rewards Card */}
 <div className="acard">
 <div className="acard-title">
 Rewards & Tier Progress{' '}
 <span className="acard-pill ap-gold">Gold</span>
 </div>
 {rewards.map((reward, idx) => (
 <div key={idx} className="reward-row">
 <div className="rew-icon">{reward.icon}</div>
 <div>
 <div className="rew-name">{reward.name}</div>
 <div className="rew-sub">{reward.sub}</div>
 </div>
 <div className="rew-val" style={{ color: reward.valColor }}>
 {reward.val}
 </div>
 </div>
 ))}
 <div style={{ marginTop: '12px', padding: '12px', borderRadius: '12px', background: 'rgba(5,150,105,0.05)', border: '1px solid rgba(5,150,105,0.15)' }}>
 <div style={{ fontSize: '10px', fontWeight: 700, color: '#059669', marginBottom: '6px' }}>
 PLATINUM PROGRESS
 </div>
 <div style={{ height: '7px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
 <div style={{ height: '100%', width: '90%', background: 'linear-gradient(90deg,#059669,#34d399)', borderRadius: '4px' }} />
 </div>
 <div style={{ fontSize: '11px', color: 'rgba(13,45,30,0.45)', marginTop: '5px' }}>
 3 more conversions Platinum unlocked
 </div>
 </div>
 </div>

 {/* Activity Card */}
 <div className="acard">
 <div className="acard-title">
 ¡ Recent Activity{' '}
 <span className="acard-pill ap-te">Live</span>
 </div>
 {activities.map((activity, idx) => (
 <div key={idx} className="activity-row">
 <div
 className="act-dot"
 style={{
 background: activity.color,
 boxShadow: `0 0 5px ${activity.color}`,
 }}
 />
 <div>
 <div className="act-txt">{activity.text}</div>
 <div className="act-time">{activity.time}</div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </>
 );
};

export const IntelligenceOverlay = ({ isOpen, onClose, onTamiClick, user }) => {
 const keywords = [
 { text: 'µ music journey', color: 'rgba(167,139,250,0.15)', textColor: '#a78bfa' },
 { text: '¥ you\'ve got this', color: 'rgba(34,197,94,0.12)', textColor: '#22c55e' },
 { text: '¯ level up', color: 'rgba(249,115,22,0.12)', textColor: '#f97316' },
 { text: '¡ find your sound', color: 'rgba(232,75,138,0.12)', textColor: '#e84b8a' },
 { text: ' practice wins', color: 'rgba(59,130,246,0.12)', textColor: '#3b82f6' },
 { text: 'School of Motesart', color: 'rgba(167,139,250,0.1)', textColor: '#a78bfa' },
 { text: 'T.A.M.i', color: 'rgba(34,197,94,0.1)', textColor: '#22c55e' },
 { text: 'ear training', color: 'rgba(249,115,22,0.1)', textColor: '#f97316' },
 ];

 const traits = [
 { label: 'Motivational', width: '92%', color: 'linear-gradient(90deg,#a78bfa,#7c3aed)', val: '92', valColor: '#a78bfa' },
 { label: 'Structured', width: '70%', color: 'linear-gradient(90deg,#22c55e,#14b8a6)', val: '70', valColor: '#22c55e' },
 { label: 'Visual Thinker', width: '85%', color: 'linear-gradient(90deg,#f97316,#fbbf24)', val: '85', valColor: '#f97316' },
 { label: 'Empathetic', width: '78%', color: 'linear-gradient(90deg,#e84b8a,#f43f5e)', val: '78', valColor: '#e84b8a' },
 ];

 const audienceMatch = [
 { label: 'Beginners (all ages)', width: '94%', color: '#22c55e', val: '94%' },
 { label: 'Teens (1318)', width: '90%', color: '#a78bfa', val: '90%' },
 { label: 'Young Adults (1825)', width: '85%', color: '#3b82f6', val: '85%' },
 { label: 'Kids (612)', width: '72%', color: '#f97316', val: '72%' },
 { label: 'Intermediate', width: '68%', color: '#e84b8a', val: '68%' },
 { label: 'Adults (25+)', width: '55%', color: '#14b8a6', val: '55%' },
 { label: 'Advanced students', width: '40%', color: '#94a3b8', val: '40%' },
 ];

 const colorPalette = ['#059669', '#1a1040', '#34d399', '#a78bfa', '#f8f4ff'];

 const voiceButtons = [
 { label: '´ Record New', className: 'vbtn vbtn-rec', onClick: () => console.log('Record New') },
 { label: ' Upload File', className: 'vbtn vbtn-up', onClick: () => console.log('Upload File') },
 { label: '¶ Preview Mimic', className: 'vbtn vbtn-play', onClick: () => console.log('Preview Mimic') },
 { label: '¬ Download', className: 'vbtn vbtn-dl', onClick: () => console.log('Download') },
 ];

 const kitButtons = [
 { label: ' Copy Bio', onClick: () => { navigator.clipboard.writeText('"Musician & T.A.M.i Ambassador at School of Motesart. Helping students find their musical voice through ear training, theory, and real-world coaching. Use code MOTES2026 to join."'); console.log('Bio copied!'); } },
 { label: '¼¸ Download Referral Graphic', onClick: () => console.log('Download Referral Graphic') },
 { label: '± Get Social Media Kit', onClick: () => console.log('Get Social Media Kit') },
 { label: ' Copy Referral Landing Page', onClick: () => { navigator.clipboard.writeText('motesart.com/join/MOTES2026'); console.log('Landing page copied!'); } },
 { label: ' Download Ambassador One-Pager', onClick: () => console.log('Download One-Pager') },
 ];

 const waveformBars = [30, 60, 45, 80, 55, 90, 40, 70, 50, 85, 35, 65, 75, 45, 95, 60, 40, 70, 55, 80];

 return (
 <div className={`intel-overlay ${isOpen ? 'open' : ''}`}>
 <div className="intel-nav">
 <button className="intel-back-btn" onClick={onClose}>
 Back to Dashboard
 </button>
 <div className="intel-title-block">
 <div className="intel-title">§  Intelligence Dashboard</div>
 <div className="intel-sub">{user?.name || 'User'} · Ambassador Intelligence Profile</div>
 </div>
 <div className="intel-tami-pill" onClick={onTamiClick}>
 <div className="i-online" />
 <span style={{ fontSize: '13px', fontWeight: 800, color: '#e84b8a' }}>T.A.M.i</span>
 </div>
 </div>

 <div className="intel-body">
 {/* T.A.M.i Insight */}
 <div className="intel-insight">
 <img src={tamiImg} alt="T.A.M.i" style={{ width: '42px', height: '42px', borderRadius: '11px', objectFit: 'cover', border: '2px solid rgba(232,75,138,0.3)' }} />
 <div>
 <div className="ii-label">T.A.M.i Intelligence Analysis</div>
 <div className="ii-text">
 {user?.name || 'User'}'s teaching style is <strong style={{ color: '#a78bfa' }}>highly adaptive and motivational</strong> best matched to beginners and intermediate learners aged 1025.
 His communication fingerprint shows strong <strong style={{ color: '#22c55e' }}>energetic coaching energy</strong> with natural musical authority. Recommend short-form video content
 (Reels) to maximize reach. Voice mimic profile is ready for preview. ¯
 </div>
 </div>
 </div>

 {/* Row 1: Identity Profile, Voice Mimic, Teaching DNA */}
 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
 {/* Identity Profile */}
 <div className="icard">
 <div className="icard-title">
 ¤ Ambassador Identity <span className="ipill ip-pu">Analyzed</span>
 </div>
 <div className="id-grid">
 <div style={{ padding: '10px', borderRadius: '10px', textAlign: 'center', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)' }}>
 <div className="id-lbl">Archetype</div>
 <div className="id-val" style={{ color: '#a78bfa' }}>
 The Coach
 </div>
 </div>
 <div style={{ padding: '10px', borderRadius: '10px', textAlign: 'center', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
 <div className="id-lbl">Tone</div>
 <div className="id-val" style={{ color: '#22c55e' }}>
 Energetic
 </div>
 </div>
 <div style={{ padding: '10px', borderRadius: '10px', textAlign: 'center', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.15)' }}>
 <div className="id-lbl">Audience</div>
 <div className="id-val" style={{ color: '#f97316' }}>
 Ages 1025
 </div>
 </div>
 <div style={{ padding: '10px', borderRadius: '10px', textAlign: 'center', background: 'rgba(232,75,138,0.08)', border: '1px solid rgba(232,75,138,0.15)' }}>
 <div className="id-lbl">Style Match</div>
 <div className="id-val" style={{ color: '#e84b8a' }}>
 88%
 </div>
 </div>
 </div>
 <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '8px' }}>
 Communication Traits
 </div>
 {traits.map((trait, idx) => (
 <div key={idx} className="trait-row">
 <div className="trait-lbl">{trait.label}</div>
 <div className="trait-bar">
 <div className="trait-fill" style={{ width: trait.width, background: trait.color }} />
 </div>
 <div className="trait-val" style={{ color: trait.valColor }}>
 {trait.val}
 </div>
 </div>
 ))}
 </div>

 {/* Voice Mimic */}
 <div className="icard">
 <div className="icard-title">
 ¸ Voice & Brand Mimic <span className="ipill ip-pk">Ready</span>
 </div>
 <div className="voice-upload">
 <div style={{ fontSize: '28px', marginBottom: '6px' }}>¸</div>
 <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '3px' }}>
 Voice Sample Uploaded
 </div>
 <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
 Last updated 3 days ago · 45 sec sample
 </div>
 </div>
 <div className="waveform">
 {waveformBars.map((height, idx) => (
 <div key={idx} className="wf-bar" style={{ height: `${height}%` }} />
 ))}
 </div>
 <div className="voice-btns">
 {voiceButtons.map((btn, idx) => (
 <div key={idx} className={btn.className} onClick={btn.onClick}>
 {btn.label}
 </div>
 ))}
 </div>
 <div className="mimic-label">T.A.M.i MIMIC PREVIEW</div>
 <div className="mimic-preview">
 "Hey, I'm Motesart with School of Motesart where every student finds their musical voice. Join us and let T.A.M.i guide your journey."
 </div>
 </div>

 {/* Teaching DNA */}
 <div className="icard">
 <div className="icard-title">
 §¬ Teaching Style DNA <span className="ipill ip-pu">Profile</span>
 </div>
 <div className="radar-wrap">
 <svg className="radar-svg" viewBox="0 0 160 160">
 <defs>
 <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%">
 <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.6" />
 <stop offset="100%" stopColor="#e84b8a" stopOpacity="0.4" />
 </linearGradient>
 </defs>
 <polygon points="80,20 140,60 140,100 80,140 20,100 20,60" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
 <polygon points="80,35 125,63 125,97 80,125 35,97 35,63" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
 <polygon points="80,50 110,66 110,94 80,110 50,94 50,66" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
 <polygon points="80,28 136,64 130,98 80,128 28,95 32,62" fill="url(#rg)" stroke="#a78bfa" strokeWidth="1.5" />
 <line x1="80" y1="80" x2="80" y2="20" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
 <line x1="80" y1="80" x2="140" y2="60" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
 <line x1="80" y1="80" x2="140" y2="100" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
 <line x1="80" y1="80" x2="80" y2="140" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
 <line x1="80" y1="80" x2="20" y2="100" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
 <line x1="80" y1="80" x2="20" y2="60" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
 <text x="80" y="14" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9">
 Motivate
 </text>
 <text x="148" y="62" textAnchor="start" fill="rgba(255,255,255,0.5)" fontSize="9">
 Energize
 </text>
 <text x="148" y="104" textAnchor="start" fill="rgba(255,255,255,0.5)" fontSize="9">
 Analyze
 </text>
 <text x="80" y="152" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9">
 Structure
 </text>
 <text x="12" y="104" textAnchor="end" fill="rgba(255,255,255,0.5)" fontSize="9">
 Empathy
 </text>
 <text x="12" y="62" textAnchor="end" fill="rgba(255,255,255,0.5)" fontSize="9">
 Creative
 </text>
 </svg>
 </div>
 <div className="style-grid">
 <div style={{ padding: '7px', borderRadius: '8px', textAlign: 'center', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)' }}>
 <div className="sg-top" style={{ color: '#a78bfa' }}>
 Adaptive
 </div>
 <div className="sg-sub">vs Rigid</div>
 </div>
 <div style={{ padding: '7px', borderRadius: '8px', textAlign: 'center', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.15)' }}>
 <div className="sg-top" style={{ color: '#f97316' }}>
 Auditory
 </div>
 <div className="sg-sub">Learning Style</div>
 </div>
 <div style={{ padding: '7px', borderRadius: '8px', textAlign: 'center', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
 <div className="sg-top" style={{ color: '#22c55e' }}>
 Coach
 </div>
 <div className="sg-sub">vs Lecturer</div>
 </div>
 <div style={{ padding: '7px', borderRadius: '8px', textAlign: 'center', background: 'rgba(232,75,138,0.08)', border: '1px solid rgba(232,75,138,0.15)' }}>
 <div className="sg-top" style={{ color: '#e84b8a' }}>
 High Energy
 </div>
 <div className="sg-sub">Delivery</div>
 </div>
 </div>
 </div>
 </div>

 {/* Row 2: Content Fingerprint + Audience Match */}
 <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px', marginBottom: '16px' }}>
 {/* Content Fingerprint */}
 <div className="icard">
 <div className="icard-title">
 Content Fingerprint <span className="ipill ip-or">Generated</span>
 </div>
 <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '10px' }}>
 Top Keywords & Phrases
 </div>
 <div className="tag-cloud" style={{ marginBottom: '16px' }}>
 {keywords.map((kw, idx) => (
 <div
 key={idx}
 className="ftag"
 style={{
 background: kw.color,
 color: kw.textColor,
 border: `1px solid ${kw.textColor}${40}`,
 }}
 >
 {kw.text}
 </div>
 ))}
 </div>
 <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '10px' }}>
 Recommended Content Formats
 </div>
 <div className="fmt-grid">
 <div style={{ padding: '12px 8px', borderRadius: '11px', textAlign: 'center', background: 'rgba(232,75,138,0.08)', border: '1px solid rgba(232,75,138,0.2)' }}>
 <div className="fmt-icon">¬</div>
 <div className="fmt-lbl" style={{ color: '#e84b8a' }}>
 Reels
 </div>
 <div className="fmt-sub">Best fit</div>
 </div>
 <div style={{ padding: '12px 8px', borderRadius: '11px', textAlign: 'center', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}>
 <div className="fmt-icon">±</div>
 <div className="fmt-lbl" style={{ color: '#f97316' }}>
 Lives
 </div>
 <div className="fmt-sub">High match</div>
 </div>
 <div style={{ padding: '12px 8px', borderRadius: '11px', textAlign: 'center', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
 <div className="fmt-icon"></div>
 <div className="fmt-lbl" style={{ color: '#3b82f6' }}>
 Posts
 </div>
 <div className="fmt-sub">Good fit</div>
 </div>
 </div>
 <div style={{ padding: '12px', borderRadius: '11px', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)' }}>
 <div style={{ fontSize: '10px', fontWeight: 700, color: '#a78bfa', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TEACHING STYLE</div>
 </div>
 <div className="style-grid">
 <div style={{ padding: '7px', borderRadius: '8px', textAlign: 'center', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)' }}>
 <div className="sg-top" style={{ color: '#a78bfa' }}>
 Adaptive
 </div>
 <div className="sg-sub">vs Rigid</div>
 </div>
 <div style={{ padding: '7px', borderRadius: '8px', textAlign: 'center', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.15)' }}>
 <div className="sg-top" style={{ color: '#f97316' }}>
 Auditory
 </div>
 <div className="sg-sub">Learning Style</div>
 </div>
 <div style={{ padding: '7px', borderRadius: '8px', textAlign: 'center', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
 <div className="sg-top" style={{ color: '#22c55e' }}>
 Coach
 </div>
 <div className="sg-sub">vs Lecturer</div>
 </div>
 <div style={{ padding: '7px', borderRadius: '8px', textAlign: 'center', background: 'rgba(232,75,138,0.08)', border: '1px solid rgba(232,75,138,0.15)' }}>
 <div className="sg-top" style={{ color: '#e84b8a' }}>
 High Energy
 </div>
 <div className="sg-sub">Delivery</div>
 </div>
 </div>
 </div>
 </div>

 {/* Row 2: Content Fingerprint + Audience Match */}
 <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px', marginBottom: '16px' }}>
 {/* Content Fingerprint */}
 <div className="icard">
 <div className="icard-title">
 Content Fingerprint <span className="ipill ip-or">Generated</span>
 </div>
 <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '10px' }}>
 Top Keywords & Phrases
 </div>
 <div className="tag-cloud" style={{ marginBottom: '16px' }}>
 {keywords.map((kw, idx) => (
 <div
 key={idx}
 className="ftag"
 style={{
 background: kw.color,
 color: kw.textColor,
 border: `1px solid ${kw.textColor}${40}`,
 }}
 >
 {kw.text}
 </div>
 ))}
 </div>
 <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '10px' }}>
 Recommended Content Formats
 </div>
 <div className="fmt-grid">
 <div style={{ padding: '12px 8px', borderRadius: '11px', textAlign: 'center', background: 'rgba(232,75,138,0.08)', border: '1px solid rgba(232,75,138,0.2)' }}>
 <div className="fmt-icon">¬</div>
 <div className="fmt-lbl" style={{ color: '#e84b8a' }}>
 Reels
 </div>
 <div className="fmt-sub">Best fit</div>
 </div>
 <div style={{ padding: '12px 8px', borderRadius: '11px', textAlign: 'center', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}>
 <div className="fmt-icon">±</div>
 <div className="fmt-lbl" style={{ color: '#f97316' }}>
 Lives
 </div>
 <div className="fmt-sub">High match</div>
 </div>
 <div style={{ padding: '12px 8px', borderRadius: '11px', textAlign: 'center', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
 <div className="fmt-icon"></div>
 <div className="fmt-lbl" style={{ color: '#3b82f6' }}>
 Posts
 </div>
 <div className="fmt-sub">Good fit</div>
 </div>
 </div>
 <div style={{ padding: '12px', borderRadius: '11px', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)' }}>
 <div style={{ fontSize: '10px', fontWeight: 700, color: '#a78bfa', marginBottom: '5px' }}>
 T.A.M.i CONTENT RECOMMENDATION
 </div>
 <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.55' }}>
 Post 3x/week on Reels. Lead with a 5-sec hook, feature a student win, close with your code. Your energy converts best in under 60 seconds.
 </div>
 </div>
 </div>

 {/* Audience Match Score */}
 <div className="icard">
 <div className="icard-title">
 ¯ Audience Match Score <span className="ipill ip-gr">Strong</span>
 </div>
 {audienceMatch.map((aud, idx) => (
 <div key={idx} className="aud-row">
 <div className="aud-lbl">{aud.label}</div>
 <div className="aud-bar">
 <div className="aud-fill" style={{ width: aud.width, background: aud.color }} />
 </div>
 <div className="aud-pct" style={{ color: aud.color }}>
 {aud.val}
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Row 3: Branding Kit + Collab Score */}
 <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
 {/* Branding Kit */}
 <div className="icard">
 <div className="icard-title">
 ¨ Ambassador Branding Kit <span className="ipill ip-or">Auto-Generated</span>
 </div>
 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
 <div>
 <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '8px' }}>
 Your Color Palette
 </div>
 <div className="kit-colors">
 {colorPalette.map((color, idx) => (
 <div key={idx} className="kit-swatch" style={{ background: color }} />
 ))}
 </div>
 <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '.08em', margin: '12px 0 8px' }}>
 Suggested Bio
 </div>
 <div className="kit-bio">
 "Musician & T.A.M.i Ambassador at School of Motesart. Helping students find their musical voice through ear training, theory, and real-world coaching. Use code MOTES2026 to join."
 </div>
 <div
 className="kit-btn"
 onClick={() => {
 navigator.clipboard.writeText(
 '"Musician & T.A.M.i Ambassador at School of Motesart. Helping students find their musical voice through ear training, theory, and real-world coaching. Use code MOTES2026 to join."'
 );
 console.log('Bio copied!');
 }}
 >
 Copy Bio
 </div>
 </div>
 <div>
 <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '8px' }}>
 Shareable Assets
 </div>
 {kitButtons.map((btn, idx) => (
 <div key={idx} className="kit-btn" onClick={btn.onClick}>
 {btn.label}
 </div>
 ))}
 <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)' }}>
 <div style={{ fontSize: '10px', fontWeight: 700, color: '#34d399', marginBottom: '4px' }}>
 YOUR REFERRAL PAGE
 </div>
 <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
 motesart.com/join/<strong style={{ color: '#a78bfa' }}>MOTES2026</strong>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Collab Score */}
 <div className="icard">
 <div className="icard-title">
 ¤ T.A.M.i Collab Score <span className="ipill ip-pu">94/100</span>
 </div>
 <div className="collab-ring-wrap">
 <svg width="120" height="120" viewBox="0 0 120 120">
 <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
 <circle
 cx="60"
 cy="60"
 r="50"
 fill="none"
 stroke="url(#tcg)"
 strokeWidth="8"
 strokeDasharray="314"
 strokeDashoffset="19"
 strokeLinecap="round"
 transform="rotate(-90 60 60)"
 />
 <defs>
 <linearGradient id="tcg" x1="0%" y1="0%" x2="100%" y2="100%">
 <stop offset="0%" stopColor="#a78bfa" />
 <stop offset="100%" stopColor="#e84b8a" />
 </linearGradient>
 </defs>
 <text x="60" y="56" textAnchor="middle" fill="#fff" fontFamily="Outfit" fontSize="24" fontWeight="800">
 94
 </text>
 <text x="60" y="72" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10">
 /100
 </text>
 </svg>
 </div>
 <div className="cs-grid">
 <div className="cs-box">
 <div className="cs-val" style={{ color: '#22c55e' }}>
 58
 </div>
 <div className="cs-lbl">T.A.M.i Chats</div>
 </div>
 <div className="cs-box">
 <div className="cs-val" style={{ color: '#a78bfa' }}>
 88%
 </div>
 <div className="cs-lbl">Engagement</div>
 </div>
 <div className="cs-box">
 <div className="cs-val" style={{ color: '#f97316' }}>
 66%
 </div>
 <div className="cs-lbl">Conv. via TAMi</div>
 </div>
 <div className="cs-box">
 <div className="cs-val" style={{ color: '#e84b8a' }}>
 Top 8%
 </div>
 <div className="cs-lbl">Platform-wide</div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
};

// Students Overlay
export const StudentsOverlay = ({ isOpen, onClose, onTamiClick, user }) => {
 const students = [
 { name: 'Marcus Thompson', instrument: 'Piano', classes: 12, level: 'Intermediate', status: 'Active', dpm: '78%', color: '#22c55e' },
 { name: 'Sofia Rivera', instrument: 'Guitar', classes: 8, level: 'Beginner', status: 'Active', dpm: '65%', color: '#3b82f6' },
 { name: 'Aaliyah Johnson', instrument: 'Vocals', classes: 15, level: 'Advanced', status: 'Active', dpm: '94%', color: '#e84b8a' },
 { name: 'James Okoro', instrument: 'Drums', classes: 6, level: 'Beginner', status: 'Active', dpm: '52%', color: '#f97316' },
 { name: 'Maya Chen', instrument: 'Piano', classes: 10, level: 'Intermediate', status: 'Inactive', dpm: '41%', color: '#a855f7' },
 { name: 'Dwayne Harris', instrument: 'Bass Guitar', classes: 4, level: 'Beginner', status: 'Active', dpm: '38%', color: '#14b8a6' },
 ];

 const summaryStats = [
 { label: 'Total Students', value: '47', color: '#22c55e' },
 { label: 'Active This Week', value: '31', color: '#3b82f6' },
 { label: 'Avg DPM Score', value: '61%', color: '#f97316' },
 { label: 'Total Classes Taken', value: '284', color: '#a855f7' },
 ];

 const instruments = [
 { name: 'Piano', count: 14, width: '30%', color: '#22c55e' },
 { name: 'Guitar', count: 11, width: '23%', color: '#3b82f6' },
 { name: 'Vocals', count: 9, width: '19%', color: '#e84b8a' },
 { name: 'Drums', count: 7, width: '15%', color: '#f97316' },
 { name: 'Bass', count: 4, width: '9%', color: '#a855f7' },
 { name: 'Other', count: 2, width: '4%', color: '#14b8a6' },
 ];

 return (
 <div className={`intel-overlay ${isOpen ? 'open' : ''}`}>
 <div className="intel-nav">
 <button className="intel-back-btn" onClick={onClose}>
 Back to Dashboard
 </button>
 <div className="intel-title-block">
 <div className="intel-title"> Students Dashboard</div>
 <div className="intel-sub">{user?.name || 'User'} · Your Referred Students</div>
 </div>
 <div className="intel-tami-pill" onClick={onTamiClick}>
 <div className="i-online" />
 <span style={{ fontSize: '13px', fontWeight: 800, color: '#e84b8a' }}>T.A.M.i</span>
 </div>
 </div>

 <div className="intel-body">
 {/* T.A.M.i Insight */}
 <div className="intel-insight">
 <img src={tamiImg} alt="T.A.M.i" style={{ width: '42px', height: '42px', borderRadius: '11px', objectFit: 'cover', border: '2px solid rgba(232,75,138,0.3)' }} />
 <div>
 <div className="ii-label">T.A.M.i Student Analysis</div>
 <div className="ii-text">
 Your referrals show strong engagement <strong style={{ color: '#22c55e' }}>31 of 47 students</strong> are active this week. Piano and Guitar are the most popular instruments. <strong style={{ color: '#a78bfa' }}>3 students</strong> are flagged for re-engagement outreach. Average DPM is trending up <strong style={{ color: '#f97316' }}>+8%</strong> this month. ¯
 </div>
 </div>
 </div>

 {/* Summary Stats */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
 {summaryStats.map((stat, idx) => (
 <div key={idx} className="icard" style={{ textAlign: 'center', padding: '18px 12px' }}>
 <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
 <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>{stat.label}</div>
 </div>
 ))}
 </div>

 <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px', marginBottom: '16px' }}>
 {/* Student List */}
 <div className="icard">
 <div className="icard-title">
 ¥ Your Students <span className="ipill ip-gr">{students.length} shown</span>
 </div>
 {students.map((s, idx) => (
 <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', marginBottom: '6px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
 <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: `${s.color}20`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '12px', flexShrink: 0 }}>
 {s.name.split(' ').map(w => w[0]).join('')}
 </div>
 <div style={{ flex: 1 }}>
 <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{s.name}</div>
 <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.36)', marginTop: '1px' }}>{s.instrument} · {s.level} · {s.classes} classes</div>
 </div>
 <div style={{ textAlign: 'right' }}>
 <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '14px', fontWeight: 800, color: s.color }}>{s.dpm}</div>
 <div style={{ fontSize: '10px', color: s.status === 'Active' ? '#22c55e' : '#ef4444' }}>{s.status}</div>
 </div>
 </div>
 ))}
 </div>

 {/* Instruments Breakdown */}
 <div className="icard">
 <div className="icard-title">
 µ Instruments <span className="ipill ip-or">Breakdown</span>
 </div>
 {instruments.map((inst, idx) => (
 <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '10px' }}>
 <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', width: '60px', flexShrink: 0 }}>{inst.name}</div>
 <div style={{ flex: 1, height: '7px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
 <div style={{ height: '100%', width: inst.width, background: inst.color, borderRadius: '3px' }} />
 </div>
 <div style={{ fontSize: '11px', fontWeight: 700, color: inst.color, width: '26px', textAlign: 'right' }}>{inst.count}</div>
 </div>
 ))}

 <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
 <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '10px' }}>
 Student Levels
 </div>
 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
 <div style={{ padding: '10px', borderRadius: '10px', textAlign: 'center', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
 <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '18px', fontWeight: 800, color: '#22c55e' }}>28</div>
 <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.38)', marginTop: '2px' }}>Beginner</div>
 </div>
 <div style={{ padding: '10px', borderRadius: '10px', textAlign: 'center', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
 <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '18px', fontWeight: 800, color: '#3b82f6' }}>14</div>
 <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.38)', marginTop: '2px' }}>Intermediate</div>
 </div>
 <div style={{ padding: '10px', borderRadius: '10px', textAlign: 'center', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.15)' }}>
 <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '18px', fontWeight: 800, color: '#a855f7' }}>5</div>
 <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.38)', marginTop: '2px' }}>Advanced</div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
};

// Main Component
const AmbassadorDashboard = () => {
 const { user } = useAuth();
 const [activeTab, setActiveTab] = useState('overview');
 const [intelOpen, setIntelOpen] = useState(false);
 const [studentsOpen, setStudentsOpen] = useState(false);
 const [tamiOpen, setTamiOpen] = useState(false);

 return (
 <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f0fdf9 0%, #f8fffc 30%, #f0f9ff 65%, #fafff8 100%)' }}>
 <TopNav
 user={user}
 activeTab={activeTab}
 setActiveTab={setActiveTab}
 onIntelClick={() => setIntelOpen(true)}
 onStudentsClick={() => setStudentsOpen(true)}
 />
 <ProfileHeader user={user} onTamiClick={() => window.dispatchEvent(new Event('open-tami-chat'))} />

 <div className="main">
 <OrbitalHero user={user} />
 <TypeCardsSection onIntelClick={() => setIntelOpen(true)} />
 <AnalyticsRow />
 </div>

 <IntelligenceOverlay
 user={user}
 isOpen={intelOpen}
 onClose={() => { setIntelOpen(false); setActiveTab('overview'); }}
 onTamiClick={() => window.dispatchEvent(new Event('open-tami-chat'))}
 />

 <StudentsOverlay
 user={user}
 isOpen={studentsOpen}
 onClose={() => { setStudentsOpen(false); setActiveTab('overview'); }}
 onTamiClick={() => window.dispatchEvent(new Event('open-tami-chat'))}
 />

 <TamiChat />
 </div>
 );
};

export default AmbassadorDashboard;
