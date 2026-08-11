import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import usePracticeLogDashboard from '../hooks/usePracticeLogDashboard.js';

// ─── M1 R2-FE §D — Article XIII presentation helpers ─────────────────────────
// Student surfaces show TIER LANGUAGE and qualitative momentum words — never
// raw accuracy/mastery/DPM percentages (the demo data keeps numerics
// internally; these helpers are the ONLY way grading reaches the screen).
// Tier thresholds match the shared constitutional bands (95/85/70/40).
const ACC_TIER = (n) => (n >= 95 ? 'Mastered' : n >= 85 ? 'Owned it' : n >= 70 ? 'Almost there' : n >= 40 ? 'Growing' : 'Just starting');
const accLabel = (acc) => {
  if (acc == null) return '\u2014';
  if (typeof acc === 'string' && !/\d/.test(acc)) return acc;            // already a tier word
  const n = parseInt(acc, 10);
  return Number.isFinite(n) ? ACC_TIER(n) : '\u2014';
};
// Qualitative momentum words (no numeric scale, no hidden-% reconstruction).
const dpmWord = (n) => (n == null ? '\u2014' : n >= 80 ? 'Strong' : n >= 60 ? 'On Track' : n >= 40 ? 'Building' : 'Needs care');
// Discrete five-band bar widths — tier presentation, not a percentage readout.
const tierBandWidth = (n) => (n >= 95 ? 100 : n >= 85 ? 88 : n >= 70 ? 72 : n >= 40 ? 45 : 20);
const pieceMetaLabel = (meta) => String(meta || '').replace(/(\d+)% accuracy/, (_, n) => ACC_TIER(parseInt(n, 10)));

/* Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ T.A.M.i avatar base64 Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ */
const TAMI_AVATAR = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCABAAEADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD6nooqrqmoWuladc3+ozpb2luhkllc8Ko6mgCzXC+Kvix4M8Mu0Woa1BJcjgwW3718+hxwPxNfM3xg+M2ueL7qey0VrjTfDqsUEaZWS4x3kYdv9kceua8v03TZLmUtMyocZLSHAGf/ANVS5FqNz6e1H9qPQLeb/RtB1Oa3zjzHkjjY/Ref51618N/HekfEDQBqmimZFVtksMygPE3ocEj8RXxjpfw8XV7dLue5miR1zGqKPu+pz69a3fDviDxR4HvPl0yWK50ieVWnTywckDALA8j04Nc8cZSlPkT1OqeArQh7Rx0Pt2iuJ+FfxC034g6F9sscRXcQX7Rbk5KE5wR7HB/EEV21dSdzjasFfNv7W/jGSC0tfDVjKQGxcXW09T/Ap+n3se619DatfxaZp095cECKJSxya+C/H+rv4l8SXt5dviWdzM2e248D8F2D4KmT6FQXU42CefzUkaR2LNzk53dyMVo2UkN3qqxaneJAjtiRmcAj15PAwOPqfao7zT3Gn200bFd6nO32H/1q9G0vwbY6loGnvbMLK6CxSFxGHJZckdfcn26elc1evGklzaXO3CYWddtwV7W07nYeFZ7mAeRI8V7Zsv7ufASSPA4DY+VgexGKreLXsZrWayup4Fe4jZRG7gMwIxwDWnZaRp+iWYh0aK4S2VR8srbiGCgOcjoCQWx2ya808RanqLaRcavfadH/AGet19jaOcYl3kMeARyAAMkdN614lOk61V+z2XyPoalaNCmvaaN9Hd+ups/spanNpXxEsoTIRBqCzWTqe5C+Yp/76Qj/AIEa+16+Hf2a7F7r4kabICCLPa5GeSWbHA6njeT7CvuEdBX0qPkJHgf7V3iq503RNP0WxBAuHFxdyZxtjB2ovvubdx/sV8oBJnaRo287KE7lOcj1r6o/a30+NNDsNRkXzBPKloUVgJA6iRkZR/EPmk3enBr5IeBrdgFlKyZYYHHPb86TQ4vQ3ZJhb21oscu9JRtZey7gcY/WvZPDtzHLoFlLYBC/2eMlXJxv2jcPbnP5ivA9NvltSzXKq+M7UIJ2sRjd+HWu28KXV/pkBmsWW6dMedAZPlnX+Fg38L4GPfGDXn5hS56enRnrZVW5Kr80el6guGWW7tpraSdVVbq1fzFKt6noPfjNcl8UriG5sItHtij6g377Zn5/KjUsefU44HfB9qw9V+IsETvDpGny2NwSVkediyxN3IjBx1//AFVg6c7Wk17qt7ere6iY3aIIS5LujKHdiAAACSAOSQBwK58JgpKaqT0SOrH5jTcHSpat7+R1nwV1X/hC/HWnaxe7RaGX7NK5Gfkl4LD6Ahs+2O9fd4r87vCDxahqkVlcAusljPCkefvSGBljA995H5Z7V+gegRzQ6Hp0dySbhLaNZCepYIAf1r2Inz87dD5m/a58QzSeIdM0OJ8QW0HnsB3eQkfoq4/4Ea+d7qJpYQqxNIWOFwM44z/Lmva/2t7V7f4k285+5cWMTj4GdT/IfnXi1sxDXB3kMFDAA9V7/wBPypvRCWrKyWU0AEk6Mg77h1x/9b+deh/CPShfzarLBcwRwxkRRpM20PnnqeOPciuDuJ7m4Wa1gkkktEJKbQcHB+8faregXGp6Qv2zTbqa1ycNsfGSBnBB4PHrXPWg6lNx7nVh6qo1VPseg+PPh1a2+mJe2Etuuoq7vLGkgdZE4ILFSQrZ3D3HXpk4BpV7A7W9vd/LGoKH1I7D+YrT1TxNrOqW7Q3uoSPC33lVFQN9cAZrAubRJUwGKsOhAp0adSMbVH6f8PoLEVaUpKVNev8Aw13+Z3Pwd1A+EPHg1nyra402GCHeZN2yJnVWkHGVaPKscc7d3avvSPOxdzBmwMkDAPuK/NbSGnM0tvJOIiww0jZKMvfcB1GM+9foJ8ONXm1fwratfRLDqFqTaXUanKiSPAyp7qw2uD6MK2XY55Lqj//Z';

/* Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ Color/Data Constants Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ */
const TC = { hw: '#14b8a6', sm: '#85B7EB', gm: '#EF9F27', lp: '#e84b8a' };
const TN = { hw: 'Homework', sm: 'Sheet Music', gm: 'Games', lp: 'Live Practice' };
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW = ['S','M','T','W','T','F','S'];

// M1 R3.1-FE \u00a7D/\u00a7F \u2014 the hardcoded `sessions` array and `P` (period stats:
// DPM, accuracy%, pieces, insights, personal bests, dated session log) mocks
// were REMOVED. Every one of those fields is now read from
// usePracticeLogDashboard(), which fetches the real
// GET /practice-log/dashboard/{studentId} response (see
// src/services/practiceLogApi.js \u2014 already Article-XIII-safe: absent DPM/
// accuracy numerics stay null/absent, never a fabricated default). See
// buildPd()/buildSessions() below for the small shape adapter between the
// hook's field names and this page's existing render code.
const PIECE_COLORS = ['#14b8a6', '#EF9F27', '#85B7EB', '#e84b8a', '#a855f7'];
const TYPE_INDEX = { hw: 0, sm: 1, gm: 2, lp: 3 };

function buildPd(rawPd) {
  if (!rawPd) return null;
  const goalAll = rawPd.goalAll || { labels: ['Homework','Sheet Music','Games','Live Practice'], actual: [0,0,0,0], goal: [0,0,0,0] };
  const goalSingle = {};
  for (const key of ['hw','sm','gm','lp']) {
    goalSingle[key] = { actual: rawPd.trend?.[key] || [], goal: goalAll.goal?.[TYPE_INDEX[key]] || 0 };
  }
  return {
    xl: rawPd.chartLabels || [],
    ds: rawPd.trend || { all: [], hw: [], sm: [], gm: [], lp: [] },
    goalAll,
    goalSingle,
    bk: rawPd.breakdown || { hw: [0,0], sm: [0,0], gm: [0,0], lp: [0,0] },
    cons: { v: rawPd.consistency?.label || '0 of 0 days', days: rawPd.consistency?.days || [0,0,0,0,0,0,0] },
    // \u00a7K/Article XIII \u2014 student payloads carry dpm:null (withheld); it stays
    // null so the UI can render an honest "not available" state instead of
    // crashing or fabricating zeros.
    dpm: rawPd.dpm || null,
    pieces: (rawPd.pieces || []).map((p, i) => ({ n: p.name, s: p.meta, w: p.pct ?? 0, c: PIECE_COLORS[i % PIECE_COLORS.length] })),
    ins: rawPd.insight || '',
    pb: rawPd.personalBests || ['0','0','0'],
  };
}

function buildSessions(hookSessions) {
  return (hookSessions || []).map(s => ({
    ...s,
    t: s.title,
    // The real backend only distinguishes School vs Standalone \u2014 it does not
    // carry the old mock's fabricated "Teacher assigned"/"Motesart assigned"
    // distinction, so both view modes show the same real source.
    src_school: s.source,
    src_sa: s.source,
  }));
}

// M1 R3.1-FE \u00a7D/\u00a7F \u2014 the hardcoded MD (calendar heatmap) and dayDetails
// (fake per-day session details) mocks were removed. This page now reads
// calendarData from usePracticeLogDashboard, which transforms the REAL
// /practice-log/dashboard/{studentId} response (practiceLogApi.transformCalendar) \u2014
// no invented practice days, no fabricated piece names.

/* Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ CSS Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&family=Outfit:wght@500;600&display=swap');
.pl-shell *{box-sizing:border-box;margin:0;padding:0}
.pl-shell{display:flex;height:100vh;background:#0a0e1a;font-family:'DM Sans',sans-serif;position:relative;overflow:hidden}
.pl-sb{background:#0d1525;border-right:1px solid rgba(255,255,255,0.07);display:flex;flex-direction:column;transition:width .25s;width:210px;flex-shrink:0;overflow:hidden}
.pl-sb.c{width:46px}
.pl-sbtop{display:flex;align-items:center;justify-content:space-between;padding:11px 10px;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0}
.pl-sb.c .pl-sbtop{justify-content:center}
.pl-slogo{font-family:'Outfit',sans-serif;font-size:12px;font-weight:600;color:#14b8a6;white-space:nowrap;transition:opacity .2s}
.pl-sb.c .pl-slogo{opacity:0;width:0;overflow:hidden}
.pl-ttb{width:22px;height:22px;border-radius:5px;border:1.5px solid rgba(20,184,166,0.35);background:rgba(20,184,166,0.08);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.pl-tarr{font-size:12px;color:#14b8a6;font-weight:600}
.pl-sbid{padding:9px 10px;border-bottom:1px solid rgba(255,255,255,0.07);overflow:hidden;white-space:nowrap;transition:all .2s}
.pl-sb.c .pl-sbid{height:0;padding:0;opacity:0;border:none}
.pl-sbidm{display:none;align-items:center;justify-content:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.07)}
.pl-sb.c .pl-sbidm{display:flex}
.pl-mav{width:25px;height:25px;border-radius:50%;background:rgba(20,184,166,0.18);border:1.5px solid rgba(20,184,166,0.3);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:600;color:#14b8a6}
.pl-sbn{font-family:'Outfit',sans-serif;font-size:13px;font-weight:600;color:#fff;margin-bottom:1px}
.pl-sbr{font-size:11px;color:#14b8a6;font-weight:500;margin-bottom:1px}
.pl-sbctx{font-size:10px;color:rgba(255,255,255,0.28)}
.pl-sbnav{flex:1;padding:5px 3px;overflow-y:auto;display:flex;flex-direction:column}
.pl-sbnt{flex:1}
.pl-ssec{display:flex;align-items:center;gap:6px;padding:6px 7px;border-radius:7px;cursor:pointer;margin-bottom:2px;white-space:nowrap;transition:all .15s}
.pl-ssec:hover{background:rgba(255,255,255,0.04)}
.pl-ssec.a{background:rgba(20,184,166,0.1);border:1px solid rgba(20,184,166,0.15)}
.pl-sb.c .pl-ssec{justify-content:center;padding:7px 0}
.pl-sico{width:16px;text-align:center;flex-shrink:0}
.pl-sico svg{width:14px;height:14px;vertical-align:middle}
.pl-slbl{font-family:'Outfit',sans-serif;font-size:12px;font-weight:500;color:rgba(255,255,255,0.38)}
.pl-ssec.a .pl-slbl{color:#14b8a6}
.pl-sb.c .pl-slbl{opacity:0;width:0;overflow:hidden}
.pl-ssubs{padding-left:5px}
.pl-sb.c .pl-ssubs{display:none}
.pl-ssub{display:flex;align-items:center;justify-content:space-between;padding:4px 8px;border-radius:5px;font-size:11px;color:rgba(255,255,255,0.3);cursor:pointer;margin-bottom:1px;border-left:1px solid rgba(255,255,255,0.06);margin-left:3px;white-space:nowrap}
.pl-ssub.a{color:#14b8a6;font-weight:500;border-left-color:#14b8a6;background:rgba(20,184,166,0.05)}
.pl-sbdg{font-size:9px;padding:1px 4px;border-radius:7px;background:rgba(239,157,39,0.14);color:#EF9F27}
.pl-sbdiv{height:1px;background:rgba(255,255,255,0.07);margin:4px 4px}
.pl-qltit{font-size:9px;font-weight:500;color:rgba(255,255,255,0.2);text-transform:uppercase;letter-spacing:.07em;padding:3px 7px 2px;white-space:nowrap}
.pl-sb.c .pl-qltit{opacity:0;height:0;padding:0}
.pl-qlbtn{display:flex;align-items:center;gap:6px;padding:6px 7px;border-radius:7px;cursor:pointer;margin-bottom:3px;background:rgba(20,184,166,0.06);border:1px solid rgba(20,184,166,0.12);white-space:nowrap}
.pl-sb.c .pl-qlbtn{justify-content:center;padding:7px 0}
.pl-qlico{width:16px;text-align:center;flex-shrink:0}
.pl-qlico svg{width:13px;height:13px;vertical-align:middle}
.pl-qllbl{font-size:11px;font-weight:500;color:#14b8a6}
.pl-sb.c .pl-qllbl{opacity:0;width:0;overflow:hidden}
.pl-qlcoach{display:flex;align-items:center;gap:7px;padding:6px 7px;border-radius:7px;cursor:pointer;margin-bottom:3px;background:rgba(139,92,246,0.06);border:1px solid rgba(139,92,246,0.14);white-space:nowrap}
.pl-sb.c .pl-qlcoach{justify-content:center;padding:7px 0}
.pl-qlcav{width:18px;height:18px;border-radius:50%;overflow:hidden;flex-shrink:0;background:rgba(139,92,246,0.2);border:1px solid rgba(139,92,246,0.3);display:flex;align-items:center;justify-content:center}
.pl-qlclbl{font-size:11px;font-weight:500;color:#a78bfa}
.pl-sb.c .pl-qlclbl{opacity:0;width:0;overflow:hidden}
.pl-sutil{display:flex;align-items:center;gap:6px;padding:6px 7px;border-radius:7px;font-size:11px;color:rgba(255,255,255,0.28);cursor:pointer;margin-bottom:1px;white-space:nowrap}
.pl-sutil:hover{background:rgba(255,255,255,0.04)}
.pl-sb.c .pl-sutil{justify-content:center;padding:6px 0}
.pl-sb.c .pl-utl{opacity:0;width:0;overflow:hidden}
.pl-hci{width:14px;height:14px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:7px;color:rgba(255,255,255,0.28);flex-shrink:0}
.pl-sutilico{width:14px;text-align:center;flex-shrink:0}
.pl-sutilico svg{width:13px;height:13px;vertical-align:middle}
.pl-main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
.pl-topbar{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(255,255,255,0.02);border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0}
.pl-ptitle{font-family:'Outfit',sans-serif;font-size:14px;font-weight:600;color:#fff}
.pl-psub{font-size:11px;color:rgba(255,255,255,0.28);margin-top:1px}
.pl-tright{display:flex;align-items:center;gap:7px}
.pl-epill{font-size:10px;padding:3px 9px;border-radius:20px;font-weight:500;cursor:pointer;transition:all .15s}
.pl-esc{background:rgba(55,138,221,0.1);color:#85B7EB;border:1px solid rgba(55,138,221,0.2)}
.pl-esa{background:rgba(139,92,246,0.1);color:#a78bfa;border:1px solid rgba(139,92,246,0.2)}
.pl-nbell{width:26px;height:26px;border-radius:7px;border:1px solid rgba(255,255,255,0.09);background:rgba(255,255,255,0.03);display:flex;align-items:center;justify-content:center;position:relative;cursor:pointer}
.pl-nbell svg{width:14px;height:14px}
.pl-ndot{position:absolute;top:3px;right:3px;width:5px;height:5px;border-radius:50%;background:#e24b4a}
.pl-filterwrap{display:flex;flex-direction:column;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0}
.pl-filterrow{display:flex;align-items:center;justify-content:space-between;padding:7px 14px;gap:8px}
.pl-filters{display:flex;gap:4px}
.pl-fil{padding:3px 10px;font-size:11px;border-radius:20px;border:1px solid rgba(255,255,255,0.09);background:transparent;color:rgba(255,255,255,0.3);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s;white-space:nowrap}
.pl-fil.a{background:#14b8a6;border-color:#14b8a6;color:#fff;font-weight:500}
.pl-logbtn{padding:4px 11px;font-size:11px;font-weight:500;border-radius:20px;border:1.5px solid rgba(20,184,166,0.3);background:rgba(20,184,166,0.06);color:#14b8a6;cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap}
.pl-logbtn:hover{background:rgba(20,184,166,0.12)}
.pl-typerow{display:flex;gap:4px;padding:5px 14px 8px}
.pl-typ{padding:2px 9px;font-size:11px;border-radius:20px;border:1px solid rgba(255,255,255,0.07);background:transparent;color:rgba(255,255,255,0.28);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s;white-space:nowrap}
.pl-typ.ta{background:rgba(255,255,255,0.07);border-color:rgba(255,255,255,0.14);color:#fff;font-weight:500}
.pl-typ.th{background:rgba(20,184,166,0.1);border-color:rgba(20,184,166,0.22);color:#14b8a6;font-weight:500}
.pl-typ.ts{background:rgba(55,138,221,0.1);border-color:rgba(55,138,221,0.2);color:#85B7EB;font-weight:500}
.pl-typ.tg{background:rgba(239,157,39,0.1);border-color:rgba(239,157,39,0.2);color:#EF9F27;font-weight:500}
.pl-typ.tl{background:rgba(232,75,138,0.1);border-color:rgba(232,75,138,0.2);color:#e84b8a;font-weight:500}
.pl-body{flex:1;overflow-y:auto;padding:13px 14px;display:flex;flex-direction:column;gap:10px}
.pl-card{background:#131c2e;border:1px solid rgba(255,255,255,0.08);border-radius:11px;padding:12px 14px}
.pl-cardhd{font-family:'Outfit',sans-serif;font-size:12px;font-weight:600;color:rgba(255,255,255,0.85);display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.pl-chdsub{font-size:10px;font-weight:400;color:rgba(255,255,255,0.28)}
.pl-charttabs{display:flex;gap:4px;margin-bottom:8px}
.pl-ctab{padding:3px 10px;font-size:11px;border-radius:20px;border:1px solid rgba(255,255,255,0.09);background:transparent;color:rgba(255,255,255,0.3);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s}
.pl-ctab.a{background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.15);color:#fff;font-weight:500}
.pl-chartlegend{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px;min-height:16px}
.pl-cleg{display:flex;align-items:center;gap:5px;font-size:10px;color:rgba(255,255,255,0.4)}
.pl-clegsq{width:9px;height:9px;border-radius:2px;flex-shrink:0}
.pl-chart-card{transition:box-shadow .3s ease}
.pl-chart-card:hover{box-shadow:0 0 20px rgba(20,184,166,0.12),0 0 40px rgba(20,184,166,0.05)}
.pl-chart-wrap{position:relative;height:100px;transition:transform .3s ease}
.pl-chart-card:hover .pl-chart-wrap{transform:scaleY(1.02)}
.pl-twocol{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.pl-calsess-row{display:grid;grid-template-columns:300px 1fr;gap:10px;align-items:start}
.pl-brow{display:flex;align-items:center;gap:8px;margin-bottom:7px}
.pl-brow:last-child{margin-bottom:0}
.pl-blbl{font-size:11px;color:rgba(255,255,255,0.45);width:74px;flex-shrink:0}
.pl-btrack{flex:1;height:5px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden}
.pl-bfill{height:5px;border-radius:3px;transition:width .4s}
.pl-bval{font-family:'Outfit',sans-serif;font-size:11px;font-weight:600;width:34px;text-align:right;flex-shrink:0}
.pl-condays{display:flex;gap:4px;margin-top:4px}
.pl-conday{width:26px;height:26px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:500;transition:all .3s}
.pl-conday.on{background:#14b8a6;color:#fff}
.pl-conday.off{background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.2)}
.pl-calhead{display:flex;align-items:center;justify-content:space-between;margin-bottom:5px}
.pl-calnav{display:flex;align-items:center;gap:8px}
.pl-calarr{font-size:14px;color:rgba(255,255,255,0.45);cursor:pointer;padding:2px 7px;border-radius:5px;transition:all .15s;user-select:none;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03)}
.pl-calarr:hover{color:#14b8a6;background:rgba(20,184,166,0.08);border-color:rgba(20,184,166,0.2)}
.pl-calmth{font-family:'Outfit',sans-serif;font-size:12px;font-weight:600;color:rgba(255,255,255,0.7);min-width:110px;text-align:center}
.pl-calgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:1px}
.pl-cal-dow-cell{font-size:8px;font-weight:500;color:rgba(255,255,255,0.3);text-align:center;padding:2px 0}
.pl-calcell{aspect-ratio:1;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:500;cursor:pointer;transition:all .15s;position:relative;min-height:28px}
.pl-calcell.empty{cursor:default}
.pl-calcell.l0{background:rgba(255,255,255,0.03);color:rgba(255,255,255,0.2)}
.pl-calcell.l1{background:rgba(20,184,166,0.12);color:rgba(20,184,166,0.7)}
.pl-calcell.l2{background:rgba(20,184,166,0.3);color:#fff}
.pl-calcell.l3{background:#14b8a6;color:#fff;font-weight:600}
.pl-calcell.today{box-shadow:inset 0 0 0 1.5px #14b8a6}
.pl-calcell:not(.empty):hover{transform:scale(1.1);z-index:2;box-shadow:0 2px 8px rgba(0,0,0,0.3)}
.pl-daypop{position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:#131c2e;border:1px solid rgba(20,184,166,0.2);border-radius:8px;padding:8px 10px;min-width:140px;z-index:30;box-shadow:0 4px 16px rgba(0,0,0,0.4)}
.pl-daypop::after{content:'';position:absolute;top:100%;left:50%;transform:translateX(-50%);border:5px solid transparent;border-top-color:rgba(20,184,166,0.2)}
.pl-daypop-date{font-family:'Outfit',sans-serif;font-size:11px;font-weight:600;color:rgba(255,255,255,0.8);margin-bottom:4px}
.pl-daypop-mins{font-size:10px;color:#14b8a6;font-weight:500;margin-bottom:2px}
.pl-daypop-detail{font-size:9px;color:rgba(255,255,255,0.35);line-height:1.4}
.pl-dpmgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
.pl-dpmtile{border-radius:8px;padding:9px 10px;transition:transform .3s ease,box-shadow .4s ease;cursor:pointer}
.pl-dpmlbl{font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px}
.pl-dpmval{font-family:'Outfit',sans-serif;font-size:20px;font-weight:600;margin-bottom:2px;transition:transform .3s ease}
.pl-dpmsub{font-size:10px;line-height:1.3;margin-bottom:5px}
.pl-dpmbar{height:3px;border-radius:2px;background:rgba(255,255,255,0.08);overflow:hidden;position:relative}
.pl-dpmfill{height:3px;border-radius:2px;width:0%;transition:width 1.2s cubic-bezier(0.25,0.46,0.45,0.94)}
.pl-dpmtile.glow-d:hover{transform:translateY(-3px);box-shadow:0 4px 20px rgba(55,138,221,0.35),0 0 30px rgba(55,138,221,0.15)}
.pl-dpmtile.glow-d:hover .pl-dpmval{transform:scale(1.08)}
.pl-dpmtile.glow-p:hover{transform:translateY(-3px);box-shadow:0 4px 20px rgba(239,157,39,0.35),0 0 30px rgba(239,157,39,0.15)}
.pl-dpmtile.glow-p:hover .pl-dpmval{transform:scale(1.08)}
.pl-dpmtile.glow-m:hover{transform:translateY(-3px);box-shadow:0 4px 20px rgba(168,85,247,0.35),0 0 30px rgba(168,85,247,0.15)}
.pl-dpmtile.glow-m:hover .pl-dpmval{transform:scale(1.08)}
.pl-pbgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
.pl-pbtile{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:9px 10px;text-align:center}
.pl-pbval{font-family:'Outfit',sans-serif;font-size:16px;font-weight:600;color:#EF9F27;margin-bottom:2px}
.pl-pblbl{font-size:10px;color:rgba(255,255,255,0.28);line-height:1.3}
.pl-prow{margin-bottom:8px;padding:6px 8px;border-radius:8px;border:1px solid transparent;background:rgba(255,255,255,0.02);transition:all .25s ease;cursor:pointer}
.pl-prow:last-child{margin-bottom:0}
.pl-prow:hover{transform:translateY(-2px) scale(1.01);background:rgba(255,255,255,0.05);border-color:rgba(20,184,166,0.15);box-shadow:0 4px 16px rgba(0,0,0,0.25)}
.pl-prowlbls{display:flex;justify-content:space-between;margin-bottom:3px}
.pl-prowname{font-size:11px;color:rgba(255,255,255,0.55);transition:color .2s}
.pl-prow:hover .pl-prowname{color:rgba(255,255,255,0.85)}
.pl-prowmeta{font-size:10px;color:rgba(255,255,255,0.28);transition:color .2s}
.pl-prow:hover .pl-prowmeta{color:rgba(255,255,255,0.45)}
.pl-prowtrack{height:4px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden}
.pl-prowfill{height:4px;border-radius:2px;transition:box-shadow .25s}
.pl-prow:hover .pl-prowfill{box-shadow:0 0 8px rgba(20,184,166,0.4)}
.pl-slisthd{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px}
.pl-slisttitle{font-family:'Outfit',sans-serif;font-size:12px;font-weight:600;color:rgba(255,255,255,0.85)}
.pl-slistfilters{display:flex;gap:5px;align-items:center;flex-wrap:wrap}
.pl-sf{padding:2px 8px;font-size:10px;border-radius:20px;border:1px solid rgba(255,255,255,0.08);background:transparent;color:rgba(255,255,255,0.28);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s;white-space:nowrap}
.pl-sf.a{background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.15);color:#fff;font-weight:500}
.pl-sfsep{width:1px;height:14px;background:rgba(255,255,255,0.08)}
.pl-srow{display:flex;align-items:center;gap:8px;padding:7px 5px;border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;transition:all .15s;border-radius:6px}
.pl-srow:last-child{border:none;padding-bottom:0}
.pl-srow:hover{background:rgba(255,255,255,0.03)}
.pl-sdot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.pl-sdate{font-size:10px;color:rgba(255,255,255,0.25);width:50px;flex-shrink:0}
.pl-spiece{font-family:'Outfit',sans-serif;font-size:12px;font-weight:600;color:rgba(255,255,255,0.72);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pl-sdur{font-size:11px;font-weight:500;color:#14b8a6;flex-shrink:0}
.pl-schev{font-size:13px;color:rgba(255,255,255,0.18);flex-shrink:0}
.pl-ambnote{display:flex;gap:8px;align-items:flex-start;padding:9px 11px;border-radius:9px;background:rgba(20,184,166,0.04);border:1px solid rgba(20,184,166,0.1)}
.pl-ambav{width:22px;height:22px;border-radius:50%;overflow:hidden;flex-shrink:0;border:1px solid rgba(20,184,166,0.2);display:flex;align-items:center;justify-content:center;background:rgba(20,184,166,0.15)}
.pl-ambnm{font-size:10px;font-weight:500;color:#14b8a6;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px}
.pl-ambtx{font-size:11px;color:rgba(255,255,255,0.48);line-height:1.5}
.pl-visnote{font-size:10px;color:rgba(255,255,255,0.2);margin-top:7px;padding-top:7px;border-top:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;gap:5px}
.pl-visdot{width:4px;height:4px;border-radius:50%;background:rgba(20,184,166,0.5);flex-shrink:0}
.pl-sdet{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:50;align-items:center;justify-content:center}
.pl-sdet.show{display:flex}
.pl-sdetcard{background:#131c2e;border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:18px;width:300px;max-width:90%}
.pl-sdethd{font-family:'Outfit',sans-serif;font-size:14px;font-weight:600;color:#fff;margin-bottom:3px}
.pl-sdetmeta{font-size:11px;color:rgba(255,255,255,0.35);margin-bottom:13px}
.pl-sdetrow{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06)}
.pl-sdetrow:last-of-type{border:none}
.pl-sdetlbl{font-size:11px;color:rgba(255,255,255,0.35)}
.pl-sdetval{font-size:11px;font-weight:500;color:rgba(255,255,255,0.75)}
.pl-sdetdpm{display:flex;gap:7px;margin-top:11px;padding-top:11px;border-top:1px solid rgba(255,255,255,0.07)}
.pl-sdetdtile{flex:1;text-align:center;border-radius:7px;padding:7px 4px}
.pl-sdetdlbl{font-size:9px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px}
.pl-sdetdval{font-family:'Outfit',sans-serif;font-size:16px;font-weight:600}
.pl-sdetamb{margin-top:11px;padding:9px 11px;border-radius:8px;background:rgba(20,184,166,0.04);border:1px solid rgba(20,184,166,0.1)}
.pl-sdetclose{margin-top:12px;width:100%;padding:8px;border-radius:20px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:rgba(255,255,255,0.45);cursor:pointer;font-family:'DM Sans',sans-serif;font-size:12px}
.pl-logmod{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:50;align-items:center;justify-content:center}
.pl-logmod.show{display:flex}
@keyframes plSlideUp{from{opacity:0;transform:translateY(20px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
.pl-logcard{background:linear-gradient(165deg,#162033 0%,#111a2b 50%,#0f1623 100%);border:1px solid rgba(20,184,166,0.12);border-radius:20px;padding:28px;width:440px;max-width:92%;box-shadow:0 24px 80px rgba(0,0,0,0.5),0 0 60px rgba(20,184,166,0.06),inset 0 1px 0 rgba(255,255,255,0.04);animation:plSlideUp .35s cubic-bezier(0.16,1,0.3,1)}
.pl-loghd{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}
.pl-loghtitle{font-family:'Outfit',sans-serif;font-size:20px;font-weight:600;background:linear-gradient(135deg,#fff 0%,rgba(255,255,255,0.7) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.pl-logclose{width:30px;height:30px;border-radius:10px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.4);font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;font-family:'DM Sans',sans-serif}
.pl-logclose:hover{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.7);border-color:rgba(255,255,255,0.15)}
.pl-logfield{margin-bottom:16px}
.pl-logtwocol{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
.pl-loglbl{font-size:10px;font-weight:600;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px}
.pl-loginput{width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:13px 15px;color:#fff;font-size:14px;font-family:'Outfit',sans-serif;outline:none;transition:all .25s}
.pl-loginput:focus{border-color:rgba(20,184,166,0.4);background:rgba(20,184,166,0.04);box-shadow:0 0 20px rgba(20,184,166,0.08)}
.pl-loginput::placeholder{color:rgba(255,255,255,0.2)}
.pl-logselect{width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:13px 15px;color:#fff;font-size:14px;font-family:'Outfit',sans-serif;outline:none;appearance:none;-webkit-appearance:none;cursor:pointer;transition:all .25s;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='rgba(255,255,255,0.3)' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center}
.pl-logselect:focus{border-color:rgba(20,184,166,0.4);background-color:rgba(20,184,166,0.04)}
.pl-logselect option{background:#1a2438;color:#fff}
.pl-logfeel{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.pl-logfbtn{display:flex;flex-direction:column;align-items:center;gap:5px;padding:12px 6px;border-radius:14px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.03);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .25s;text-align:center;position:relative;overflow:hidden}
.pl-logfbtn:hover{border-color:rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);transform:translateY(-1px)}
.pl-logfemoji{font-size:20px;line-height:1;filter:grayscale(0.3);transition:filter .2s}
.pl-logfbtn.sel .pl-logfemoji,.pl-logfbtn:hover .pl-logfemoji{filter:grayscale(0)}
.pl-logflbl{font-size:10px;font-weight:500;color:rgba(255,255,255,0.3);transition:color .2s}
.pl-logfbtn.sel .pl-logflbl{color:rgba(20,184,166,0.9)}
.pl-logfbtn.sel{border-color:rgba(20,184,166,0.3);background:rgba(20,184,166,0.08);box-shadow:0 0 16px rgba(20,184,166,0.1)}


.pl-lognotes{width:100%;padding:13px 15px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;color:#fff;font-family:'Outfit',sans-serif;font-size:13px;outline:none;resize:none;height:56px;transition:all .25s}
.pl-lognotes:focus{border-color:rgba(20,184,166,0.4);background:rgba(20,184,166,0.04);box-shadow:0 0 20px rgba(20,184,166,0.08)}
.pl-lognotes::placeholder{color:rgba(255,255,255,0.18)}
.pl-logsubmit{width:100%;padding:15px;border-radius:14px;background:linear-gradient(135deg,#14b8a6 0%,#0d9488 100%);color:#fff;border:none;font-size:15px;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;margin-top:8px;box-shadow:0 4px 20px rgba(20,184,166,0.25);transition:all .3s;position:relative;overflow:hidden}
.pl-logsubmit:hover{transform:translateY(-1px);box-shadow:0 8px 30px rgba(20,184,166,0.35)}
.pl-logcancel{width:100%;padding:10px;border-radius:12px;background:transparent;color:rgba(255,255,255,0.35);border:none;font-size:13px;font-weight:500;cursor:pointer;font-family:'Outfit',sans-serif;margin-top:6px;transition:all .2s}
.pl-logcancel:hover{color:rgba(255,255,255,0.6);background:rgba(255,255,255,0.04)}
.pl-tamifl{position:absolute;bottom:13px;right:13px;display:flex;flex-direction:column;align-items:flex-end;gap:5px;z-index:20}
.pl-tamipi{opacity:0;transform:translateY(12px);transition:opacity .4s,transform .4s;pointer-events:none}
.pl-tamipi.show{opacity:1;transform:translateY(0);pointer-events:auto}
.pl-tamisp{background:rgba(8,3,18,0.97);border:1px solid rgba(232,75,138,0.22);border-radius:12px 12px 2px 12px;padding:10px 12px;max-width:200px;display:flex;gap:8px;align-items:flex-start}
.pl-tami-av-speech{width:30px;height:30px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,#e84b8a,#f97316);display:flex;align-items:center;justify-content:center;border:1.5px solid rgba(232,75,138,0.5);overflow:hidden}
.pl-tami-av-speech img{width:100%;height:100%;object-fit:cover;border-radius:50%}
.pl-tami-speech-body{flex:1}
.pl-tamisn{font-family:'Outfit',sans-serif;font-size:10px;font-weight:600;color:#e84b8a;margin-bottom:2px}
.pl-tamist{font-size:11px;color:rgba(255,255,255,0.68);line-height:1.45}
.pl-tamibtn{width:42px;height:42px;border-radius:50%;border:2px solid rgba(232,75,138,0.4);background:linear-gradient(135deg,#e84b8a,#f97316);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .2s ease,box-shadow .2s ease;box-shadow:0 2px 12px rgba(232,75,138,0.25)}
.pl-tamibtn:hover{transform:scale(1.08);box-shadow:0 4px 20px rgba(232,75,138,0.4)}
.pl-tamibtn svg{width:20px;height:20px}
`;

/* Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ SVG Icon Components Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ */
const IconHome = () => (<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>);
const IconBook = () => (<svg viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>);
const IconScreen = () => (<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>);
const IconGlobe = () => (<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>);
const IconBolt = () => (<svg viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>);
const IconGear = () => (<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>);
const IconBell = () => (<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>);
const IconMsg = () => (<svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>);

/* Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ Main Component Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ */
export default function PracticeLogPage() {
  const navigate = useNavigate();
  const { user, learningIdentity } = useAuth();
  const userName = user?.name?.split(' ')[0] || 'Student';
  const userFullName = user?.name || 'Student';
  const userInitials = (user?.name || 'S').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);

  // M1 R3.1-FE \u00a7D/\u00a7F \u2014 real canonical practice-log data (never fabricated).
  const studentId = learningIdentity?.student_instrument_id || learningIdentity?.selected_student_instrument_id || null;
  const dashboard = usePracticeLogDashboard(studentId);

  const [sbCol, setSbCol] = useState(false);
  const [isSch, setIsSch] = useState(true);
  const [curPeriod, setCurPeriod] = useState('week');
  const [curType, setCurType] = useState('all');
  const [chartView, setChartView] = useState('trend');
  const [calMonth, setCalMonth] = useState(0);
  const [tamiOpen, setTamiOpen] = useState(false);
  const [tamiMsg, setTamiMsg] = useState(`Welcome back, ${userName} \u2014 keep building your momentum!`);
  const [showSdet, setShowSdet] = useState(false);
  const [sdetIdx, setSdetIdx] = useState(0);
  const [showLog, setShowLog] = useState(false);
  const [logFeel, setLogFeel] = useState('ok');
  // M1 R3.1-FE — "Log a Session" now persists through the existing
  // authorized canonical write path (usePracticeLogDashboard.createSession
  // -> POST /practice-log/sessions). Controlled fields + submit status so
  // the UI never claims "logged" before the save is confirmed.
  const [logPieceName, setLogPieceName] = useState('');
  const [logType, setLogType] = useState('homework');
  const [logDuration, setLogDuration] = useState('20');
  const [logNotes, setLogNotes] = useState('');
  const [logStatus, setLogStatus] = useState('idle'); // idle|saving|error
  const [logError, setLogError] = useState(null);
  const [sfSort, setSfSort] = useState('date');
  const [sfType, setSfType] = useState('all');
  const [activePop, setActivePop] = useState(null);
  const [dpmAnimated, setDpmAnimated] = useState({ d: false, p: false, m: false });

  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const tamiTimeout = useRef(null);

  const pd = buildPd(dashboard.periodData?.[curPeriod]);
  const sessions = buildSessions(dashboard.sessions);
  const periodLabel = { week: 'this week', month: 'this month', quarter: 'this quarter', year: 'this year' }[curPeriod];
  const typeName = curType === 'all' ? 'all types' : TN[curType];

  /* Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ Chart Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ */
  const buildChart = useCallback(() => {
    if (!chartRef.current) return;
    if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null; }
    const ctx = chartRef.current;
    const p = buildPd(dashboard.periodData?.[curPeriod]);
    if (!p) return;
    const Chart = window.Chart;
    if (!Chart) return;

    if (chartView === 'trend') {
      if (curType === 'all') {
        const ds = ['hw','sm','gm','lp'].map(t => ({ label: TN[t], data: p.ds[t], borderColor: TC[t], backgroundColor: 'transparent', tension: .35, fill: false, pointBackgroundColor: TC[t], pointRadius: p.xl.length > 8 ? 2 : 3, borderWidth: 2 }));
        chartInstance.current = new Chart(ctx, { type: 'line', data: { labels: p.xl, datasets: ds }, options: { responsive: true, maintainAspectRatio: false, animation: { duration: 800, easing: 'easeInOutQuart' }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.dataset.label + ': ' + c.raw + ' min' } } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 9 }, maxRotation: 0 } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 9 }, callback: v => v + 'm' }, beginAtZero: true } } } });
      } else {
        const data = p.ds[curType], color = TC[curType];
        const mx = Math.max(...data);
        chartInstance.current = new Chart(ctx, { type: 'line', data: { labels: p.xl, datasets: [{ data, borderColor: color, backgroundColor: color + '33', tension: .35, fill: true, pointBackgroundColor: data.map(v => v === mx ? '#EF9F27' : color), pointRadius: data.map(v => v === mx ? 5 : p.xl.length > 8 ? 1 : 3), borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, animation: { duration: 800, easing: 'easeInOutQuart' }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.raw + ' min' } } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 9 }, maxRotation: 0 } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 9 }, callback: v => v + 'm' }, beginAtZero: true } } } });
      }
    } else {
      if (curType === 'all') {
        const ga = p.goalAll;
        const allDS = [];
        ['hw','sm','gm','lp'].forEach((t, i) => {
          allDS.push({ label: TN[t] + ' Actual', data: ga.labels.map((_, j) => i === j ? ga.actual[i] : 0), backgroundColor: TC[t], borderRadius: 3, barPercentage: .38, categoryPercentage: .9 });
          allDS.push({ label: TN[t] + ' Goal', data: ga.labels.map((_, j) => i === j ? ga.goal[i] : 0), backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, barPercentage: .38, categoryPercentage: .9 });
        });
        chartInstance.current = new Chart(ctx, { type: 'bar', data: { labels: ga.labels, datasets: allDS }, options: { responsive: true, maintainAspectRatio: false, animation: { duration: 800, easing: 'easeInOutQuart' }, plugins: { legend: { display: false }, tooltip: { mode: 'index', callbacks: { label: c => c.raw === 0 ? null : c.dataset.label + ': ' + c.raw + ' min' } } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 9 } } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 9 }, callback: v => v + 'm' }, beginAtZero: true } } } });
      } else {
        const sg = p.goalSingle[curType], color = TC[curType], gl = sg.actual.map(() => sg.goal);
        chartInstance.current = new Chart(ctx, { type: 'bar', data: { labels: p.xl, datasets: [{ label: 'Actual', data: sg.actual, backgroundColor: color, borderRadius: 3, barPercentage: .42, categoryPercentage: .8 }, { label: 'Goal', data: gl, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, barPercentage: .42, categoryPercentage: .8 }] }, options: { responsive: true, maintainAspectRatio: false, animation: { duration: 800, easing: 'easeInOutQuart' }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.dataset.label + ': ' + c.raw + ' min' } } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 9 }, maxRotation: 0 } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 9 }, callback: v => v + 'm' }, beginAtZero: true } } } });
      }
    }
  }, [curPeriod, curType, chartView, dashboard.periodData]);

  useEffect(() => { buildChart(); }, [buildChart]);

  /* DPM fill animation on period change */
  useEffect(() => {
    setDpmAnimated({ d: false, p: false, m: false });
    const t = setTimeout(() => setDpmAnimated({ d: true, p: true, m: true }), 300);
    return () => clearTimeout(t);
  }, [curPeriod]);

  /* T.A.M.i welcome popup */
  useEffect(() => {
    const t = setTimeout(() => { setTamiOpen(true); const t2 = setTimeout(() => setTamiOpen(false), 4500); tamiTimeout.current = t2; }, 900);
    return () => clearTimeout(t);
  }, []);

  const pop = (msg) => {
    setTamiMsg(msg);
    setTamiOpen(false);
    if (tamiTimeout.current) clearTimeout(tamiTimeout.current);
    setTimeout(() => {
      setTamiOpen(true);
      tamiTimeout.current = setTimeout(() => setTamiOpen(false), 4500);
    }, 400);
  };

  const toggleEnv = () => {
    const next = !isSch;
    setIsSch(next);
    if (next) pop(`Welcome back to School mode, ${userName} \u2014 keep building real momentum!`);
    else pop(`Keep going ${userName} \u2014 every session builds your musicianship!`);
  };

  /* Calendar — real month/year + intensity map from usePracticeLogDashboard
     (§D/§F: no invented practice days, no fabricated per-day piece names). */
  const now = new Date();
  const calMo = (dashboard.calMonth || now.getMonth() + 1) - 1;
  const calYr = dashboard.calYear || now.getFullYear();
  const daysInMonth = new Date(calYr, calMo + 1, 0).getDate();
  const firstDay = new Date(calYr, calMo, 1).getDay();
  const calData = dashboard.calendarData || {};
  const isCurrentOrFutureMonth = calYr > now.getFullYear() || (calYr === now.getFullYear() && calMo >= now.getMonth());

  /* Session filtering */
  const typeMap = { Homework: 'hw', 'Sheet Music': 'sm', Games: 'gm', 'Live Practice': 'lp' };
  let filteredSessions = sessions.filter(s => sfType === 'all' || typeMap[s.type] === sfType);
  if (sfSort === 'dur') filteredSessions = [...filteredSessions].sort((a, b) => b.dur - a.dur);

  const openSession = (i) => { setSdetIdx(i); setShowSdet(true); };

  // M1 R3.1-FE — real persistence via the existing canonical write path.
  // Shows "logged" ONLY after a confirmed save; 401/403/409/503/network all
  // render an honest error and leave the modal open (no silent success).
  const LOG_TYPE_TO_ACTIVITY = { Homework: 'homework', 'Sheet Music': 'sheet_music', Games: 'games', 'Live Practice': 'live_practice' };
  const LOG_FEEL_TO_RATING = { rough: 'hard', hard: 'hard', ok: 'ok', good: 'great', great: 'great' };
  const submitLogSession = async () => {
    if (logStatus === 'saving') return
    if (!studentId) {
      setLogStatus('error'); setLogError('Sign in to log a practice session.')
      return
    }
    setLogStatus('saving'); setLogError(null)
    const result = await dashboard.createSession({
      student_id: studentId,
      duration_min: Number(logDuration) || 1,
      activity_type: LOG_TYPE_TO_ACTIVITY[logType] || 'homework',
      piece_name: logPieceName.trim() || null,
      self_rating: LOG_FEEL_TO_RATING[logFeel] || 'ok',
      source: isSch ? 'school' : 'standalone',
      notes: logNotes.trim() || undefined,
    })
    if (result?.success) {
      setLogStatus('idle')
      setShowLog(false)
      setLogPieceName(''); setLogType('homework'); setLogDuration('20'); setLogNotes(''); setLogFeel('ok')
      pop('Session logged! Motesart is analyzing your practice...')
    } else {
      setLogStatus('error')
      setLogError(result?.error || 'Could not save your session — try again.')
    }
  }
  // Empty-session fallback so the (always-mounted, visibility-toggled) detail
  // modal never crashes on sessions[0] when a real student has zero sessions.
  const sdetSession = sessions[sdetIdx] || sessions[0] || { t: '', date: '', type: '', dur: 0, acc: null, feel: '—', src_school: '—', src_sa: '—', d: null, p: null, m: null, amb: '' };

  /* Chart legend items */
  const legendItems = [];
  if (chartView === 'trend') {
    if (curType === 'all') {
      ['hw','sm','gm','lp'].forEach(t => legendItems.push({ color: TC[t], label: TN[t] }));
    } else {
      legendItems.push({ color: TC[curType], label: TN[curType] });
    }
  } else {
    if (curType === 'all') {
      ['hw','sm','gm','lp'].forEach(t => legendItems.push({ color: TC[t], label: TN[t] + ' actual' }));
      legendItems.push({ color: 'rgba(255,255,255,0.2)', label: 'Goal' });
    } else {
      legendItems.push({ color: TC[curType], label: TN[curType] + ' actual' });
      legendItems.push({ color: 'rgba(255,255,255,0.2)', label: 'Goal' });
    }
  }

  // M1 R3.1-FE §D/§F — honest loading/outage states instead of ever
  // rendering fabricated period stats or session history.
  if (dashboard.status === 'loading') {
    return (
      <div data-testid="practice-log-loading" style={{ minHeight: '100vh', background: '#0a0e1a', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans',sans-serif", fontSize: 13 }}>
        Loading your practice log…
      </div>
    );
  }
  if (dashboard.status === 'error' || !pd) {
    return (
      <div data-testid="practice-log-unavailable" style={{ minHeight: '100vh', background: '#0a0e1a', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, fontFamily: "'DM Sans',sans-serif", padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>Your practice log is temporarily unavailable.</div>
        {dashboard.error?.retryable !== false && (
          <button onClick={dashboard.retry} style={{ padding: '8px 20px', borderRadius: 20, border: '1px solid rgba(20,184,166,0.4)', background: 'rgba(20,184,166,0.1)', color: '#14b8a6', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Try again</button>
        )}
      </div>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="pl-shell">
        {/* Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ SIDEBAR Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ */}
        <div className={`pl-sb${sbCol ? ' c' : ''}`}>
          <div className="pl-sbtop">
            <div className="pl-slogo">School of Motesart</div>
            <div className="pl-ttb" onClick={() => setSbCol(!sbCol)}><span className="pl-tarr">{sbCol ? '\u203A' : '\u2039'}</span></div>
          </div>
          <div className="pl-sbid">
            <div className="pl-sbn">{userFullName}</div>
            <div className="pl-sbr">Student</div>
            <div className="pl-sbctx">{[dashboard.student?.grade, dashboard.student?.instrument, isSch ? dashboard.student?.school : null].filter(Boolean).join(' \u00b7 ') || (dashboard.student?.instrument || 'Student')}</div>
          </div>
          <div className="pl-sbidm"><div className="pl-mav">{userInitials}</div></div>
          <div className="pl-sbnav">
            <div className="pl-sbnt">
              <div className="pl-ssec" onClick={() => navigate('/student')} style={{cursor:'pointer'}}><span className="pl-sico"><IconHome /></span><span className="pl-slbl">Home</span></div>
              <div className="pl-ssec a"><span className="pl-sico"><IconBook /></span><span className="pl-slbl">Learn</span></div>
              <div className="pl-ssubs">
                <div className="pl-ssub" onClick={() => navigate('/homework')} style={{cursor:'pointer'}}>Homework <span className="pl-sbdg">3</span></div>
                <div className="pl-ssub" onClick={() => navigate('/games')} style={{cursor:'pointer'}}>Games</div>
                <div className="pl-ssub a">Practice Log</div>
                <div className="pl-ssub" onClick={() => navigate('/student')} style={{cursor:'pointer'}}>My Progress</div>
                <div className="pl-ssub" onClick={() => navigate('/student')} style={{cursor:'pointer'}}>Resources</div>
              </div>
              <div className="pl-ssec" onClick={() => navigate('/student')} style={{cursor:'pointer'}}><span className="pl-sico"><IconScreen /></span><span className="pl-slbl">Perform</span></div>
              <div className="pl-ssec" onClick={() => navigate('/student')} style={{cursor:'pointer'}}><span className="pl-sico"><IconGlobe /></span><span className="pl-slbl">Connect</span></div>
            </div>
            <div className="pl-sbdiv" />
            <div className="pl-qltit">Quick Links</div>
            <div className="pl-qlbtn" onClick={() => navigate('/practice')} style={{cursor:'pointer'}}><span className="pl-qlico"><IconBolt /></span><span className="pl-qllbl">Start Practice</span></div>
            <div className="pl-qlcoach"><div className="pl-qlcav"><div style={{ fontSize: '8px', fontWeight: 600, color: '#a78bfa' }}>M</div></div><span className="pl-qlclbl">My Coach &mdash; Motesart</span></div>
            <div className="pl-sbdiv" />
            <div className="pl-sutil"><div className="pl-hci">?</div><span className="pl-utl">Help Center</span></div>
            <div className="pl-sutil" onClick={() => navigate('/settings')} style={{cursor:'pointer'}}><span className="pl-sutilico"><IconGear /></span><span className="pl-utl">Settings</span></div>
          </div>
        </div>

        {/* Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ MAIN Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ */}
        <div className="pl-main">
          <div className="pl-topbar">
            <div>
              <div className="pl-ptitle">Practice Log</div>
              <div className="pl-psub">{isSch ? 'Music Theory 101' : 'Academic Mode'}</div>
            </div>
            <div className="pl-tright">
              <div className={`pl-epill ${isSch ? 'pl-esc' : 'pl-esa'}`} onClick={toggleEnv}>{isSch ? 'School' : 'Standalone'}</div>
              <div className="pl-nbell"><IconBell /><div className="pl-ndot" /></div>
            </div>
          </div>

          <div className="pl-filterwrap">
            <div className="pl-filterrow">
              <div className="pl-filters">
                {['week','month','quarter','year'].map(p => (
                  <div key={p} className={`pl-fil${curPeriod === p ? ' a' : ''}`} onClick={() => setCurPeriod(p)}>
                    {{ week: 'This Week', month: 'This Month', quarter: 'Quarter', year: 'Year' }[p]}
                  </div>
                ))}
              </div>
              <button className="pl-logbtn" onClick={() => setShowLog(true)}>+ Log a Session</button>
            </div>
            <div className="pl-typerow">
              {[['all','ta'],['hw','th'],['sm','ts'],['gm','tg'],['lp','tl']].map(([t, cls]) => (
                <div key={t} className={`pl-typ${curType === t ? ' ' + cls : ''}`} onClick={() => setCurType(t)}>
                  {{ all: 'All', hw: 'Homework', sm: 'Sheet Music', gm: 'Games', lp: 'Live Practice' }[t]}
                </div>
              ))}
            </div>
          </div>

          <div className="pl-body">
            {/* Chart */}
            <div className="pl-card pl-chart-card">
              <div className="pl-cardhd"><span>Minutes Practiced <span className="pl-chdsub">{periodLabel} &middot; {typeName}</span></span></div>
              <div className="pl-charttabs">
                <div className={`pl-ctab${chartView === 'trend' ? ' a' : ''}`} onClick={() => setChartView('trend')}>Trend</div>
                <div className={`pl-ctab${chartView === 'goal' ? ' a' : ''}`} onClick={() => setChartView('goal')}>Goal vs Actual</div>
              </div>
              <div className="pl-chartlegend">
                {legendItems.map((l, i) => (
                  <div key={i} className="pl-cleg">
                    <div className="pl-clegsq" style={{ background: l.color, height: chartView === 'trend' ? '3px' : '9px', width: chartView === 'trend' ? '14px' : '9px' }} />
                    {l.label}
                  </div>
                ))}
              </div>
              <div className="pl-chart-wrap"><canvas ref={chartRef} /></div>
            </div>

            {/* Breakdown + Consistency */}
            <div className="pl-twocol">
              <div className="pl-card">
                <div className="pl-cardhd">Practice Breakdown <span className="pl-chdsub">{periodLabel}</span></div>
                {[['Homework','hw'],['Sheet Music','sm'],['Games','gm'],['Live Practice','lp']].map(([label, key]) => (
                  <div className="pl-brow" key={key}>
                    <div className="pl-blbl">{label}</div>
                    <div className="pl-btrack"><div className="pl-bfill" style={{ width: pd.bk[key][1] + '%', background: TC[key] }} /></div>
                    <div className="pl-bval" style={{ color: TC[key] }}>{pd.bk[key][0]}m</div>
                  </div>
                ))}
              </div>
              <div className="pl-card">
                <div className="pl-cardhd">Practice Consistency</div>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: '20px', fontWeight: 600, color: '#14b8a6', marginBottom: '2px' }}>
                  {pd.cons.v} <span style={{ fontSize: '12px', fontWeight: 400, color: 'rgba(255,255,255,0.28)' }}>this period</span>
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)', marginBottom: '8px' }}>this period</div>
                <div className="pl-condays">
                  {['M','T','W','T','F','S','S'].map((d, i) => (
                    <div key={i} className={`pl-conday ${pd.cons.days[i] ? 'on' : 'off'}`}>{d}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Personal Bests */}
            <div className="pl-card">
              <div className="pl-cardhd">Personal Bests</div>
              <div className="pl-pbgrid">
                <div className="pl-pbtile"><div className="pl-pbval">{pd.pb[0]}</div><div className="pl-pblbl">Longest session (min)</div></div>
                <div className="pl-pbtile"><div className="pl-pbval">{pd.pb[1]}</div><div className="pl-pblbl">Most sessions in a week</div></div>
                <div className="pl-pbtile"><div className="pl-pbval">{pd.pb[2]}</div><div className="pl-pblbl">Best month (min)</div></div>
              </div>
            </div>

            {/* DPM — Article XIII: student payloads withhold dpm (backend
                returns dpm:null); rendered honestly rather than crashing on
                a null lookup or fabricating a zero/"Building" verdict. */}
            <div className="pl-card">
              <div className="pl-cardhd">DPM Breakdown <span className="pl-chdsub">{periodLabel}</span></div>
              {!pd.dpm ? (
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0 }}>DPM breakdown isn't shown here — check your DPM Score on the dashboard.</p>
              ) : (
                <div className="pl-dpmgrid">
                  {[
                    { key: 'd', glow: 'glow-d', label: 'Drive', color: '#85B7EB', fill: '#378ADD', bg: 'rgba(55,138,221,0.08)', border: 'rgba(55,138,221,0.14)', subColor: 'rgba(133,183,235,0.6)', sub: 'Showing up consistently' },
                    { key: 'p', glow: 'glow-p', label: 'Passion', color: '#EF9F27', fill: '#EF9F27', bg: 'rgba(239,157,39,0.08)', border: 'rgba(239,157,39,0.14)', subColor: 'rgba(239,157,39,0.6)', sub: 'Engagement in sessions' },
                    { key: 'm', glow: 'glow-m', label: 'Motivation', color: '#a855f7', fill: '#a855f7', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.14)', subColor: 'rgba(168,85,247,0.6)', sub: 'Pushing through challenges' }
                  ].map(d => (
                    <div key={d.key} className={`pl-dpmtile ${d.glow}`} style={{ background: d.bg, border: `1px solid ${d.border}` }}
                      onMouseEnter={() => setDpmAnimated(prev => ({ ...prev, [d.key]: true }))}
                      onMouseLeave={() => setDpmAnimated(prev => ({ ...prev, [d.key]: false }))}>
                      <div className="pl-dpmlbl" style={{ color: d.color }}>{d.label}</div>
                      <div className="pl-dpmval" style={{ color: d.color }}>{dpmWord(pd.dpm[d.key])}</div>
                      <div className="pl-dpmsub" style={{ color: d.subColor }}>{d.sub}</div>
                      <div className="pl-dpmbar"><div className="pl-dpmfill" style={{ background: d.fill, width: dpmAnimated[d.key] ? tierBandWidth(pd.dpm[d.key]) + '%' : '0%' }} /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ambassador */}
            <div className="pl-ambnote">
              <div className="pl-ambav"><div style={{ fontSize: '8px', fontWeight: 600, color: '#14b8a6' }}>M</div></div>
              <div style={{ flex: 1 }}>
                <div className="pl-ambnm">Motesart</div>
                <div className="pl-ambtx">{pd.ins.replace('__USER__', userName)}</div>
              </div>
            </div>

            {/* Piece Progress */}
            <div className="pl-card">
              <div className="pl-cardhd">Piece Progress <span className="pl-chdsub">{periodLabel}</span></div>
              {pd.pieces.map((pc, i) => (
                <div className="pl-prow" key={i}>
                  <div className="pl-prowlbls"><span className="pl-prowname">{pc.n}</span><span className="pl-prowmeta">{pieceMetaLabel(pc.s)}</span></div>
                  <div className="pl-prowtrack"><div className="pl-prowfill" style={{ width: tierBandWidth(pc.w) + '%', background: pc.c }} /></div>
                </div>
              ))}
            </div>

            {/* Calendar + Sessions Row */}
            <div className="pl-calsess-row">
            <div className="pl-card">
              <div className="pl-calhead">
                <div className="pl-cardhd" style={{ marginBottom: 0 }}>Practice Calendar</div>
                <div className="pl-calnav">
                  <div className="pl-calarr" onClick={() => dashboard.navigateCalendar('prev')}>{'\u2039'}</div>
                  <div className="pl-calmth">{MONTHS[calMo]} {calYr}</div>
                  <div className="pl-calarr" onClick={() => !isCurrentOrFutureMonth && dashboard.navigateCalendar('next')}>{'\u203A'}</div>
                </div>
              </div>
              <div className="pl-calgrid">
                {DOW.map((d, i) => <div key={'dow' + i} className="pl-cal-dow-cell">{d}</div>)}
                {Array.from({ length: firstDay }).map((_, i) => <div key={'e' + i} className="pl-calcell empty" />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const lvl = calData[dayNum] || 0;
                  const isToday = calMo === now.getMonth() && calYr === now.getFullYear() && dayNum === now.getDate();
                  return (
                    <div key={dayNum} className={`pl-calcell l${lvl}${isToday ? ' today' : ''}${lvl === 0 ? '' : ''}`}
                      onClick={(e) => {
                        if (lvl === 0) return;
                        e.stopPropagation();
                        setActivePop(activePop === dayNum ? null : dayNum);
                      }}>
                      {dayNum}
                      {activePop === dayNum && lvl > 0 && (
                        <div className="pl-daypop" onClick={e => e.stopPropagation()}>
                          <div className="pl-daypop-date">{MONTHS[calMo]} {dayNum}, {calYr}</div>
                          {/* \u00a7D/\u00a7F \u2014 the calendar API returns an intensity band (0-4),
                              not exact minutes or a piece name, so only the honestly-
                              available qualitative label renders here. */}
                          <div className="pl-daypop-detail">{['','Light session','Good session','Strong session','Best session'][lvl] || 'Practiced'}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)' }}>Less</span>
                {[['rgba(255,255,255,0.03)'],['rgba(20,184,166,0.12)'],['rgba(20,184,166,0.3)'],['#14b8a6']].map((c, i) => (
                  <div key={i} style={{ width: '9px', height: '9px', borderRadius: '3px', background: c[0] }} />
                ))}
                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)' }}>More</span>
              </div>
            </div>

            {/* Sessions */}
            <div className="pl-card" style={{flex:1,minWidth:0}}>
              <div className="pl-slisthd">
                <div className="pl-slisttitle">Sessions <span className="pl-chdsub">{periodLabel}</span></div>
                <div className="pl-slistfilters">
                  <div className={`pl-sf${sfSort === 'date' ? ' a' : ''}`} onClick={() => setSfSort('date')}>Newest</div>
                  <div className={`pl-sf${sfSort === 'dur' ? ' a' : ''}`} onClick={() => setSfSort('dur')}>Longest</div>
                  <div className="pl-sfsep" />
                  {[['all','All'],['hw','Homework'],['sm','Sheet Music'],['gm','Games'],['lp','Live']].map(([t, label]) => (
                    <div key={t} className={`pl-sf${sfType === t ? ' a' : ''}`} onClick={() => setSfType(t)}>{label}</div>
                  ))}
                </div>
              </div>
              {filteredSessions.map((s, i) => (
                <div key={i} className="pl-srow" onClick={() => openSession(sessions.indexOf(s))}>
                  <div className="pl-sdot" style={{ background: TC[typeMap[s.type]] }} />
                  <div className="pl-sdate">{s.date}</div>
                  <div className="pl-spiece">{s.t}</div>
                  <div className="pl-sdur">{s.dur} min</div>
                  <div className="pl-schev">{'\u203A'}</div>
                </div>
              ))}
              {filteredSessions.length === 0 && (
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', padding: '10px 0', textAlign: 'center' }}>No sessions match this filter</div>
              )}
              <div className="pl-visnote">
                <div className="pl-visdot" />
                <span>{isSch ? 'Teacher can see your practice log' : 'Only you can see your practice log'}</span>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* T.A.M.i Float removed - global TamiChat provides this */}
      </div>

      {/* Session Detail Modal */}
      <div className={`pl-sdet${showSdet ? ' show' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setShowSdet(false); }}>
        <div className="pl-sdetcard">
          <div className="pl-sdethd">{sdetSession.t}</div>
          <div className="pl-sdetmeta">{sdetSession.date} &middot; {sdetSession.type} &middot; {sdetSession.dur} min</div>
          <div className="pl-sdetrow"><div className="pl-sdetlbl">Source</div><div className="pl-sdetval">{isSch ? sdetSession.src_school : sdetSession.src_sa}</div></div>
          <div className="pl-sdetrow"><div className="pl-sdetlbl">Accuracy</div><div className="pl-sdetval">{accLabel(sdetSession.acc)}</div></div>
          <div className="pl-sdetrow"><div className="pl-sdetlbl">How it felt</div><div className="pl-sdetval">{sdetSession.feel}</div></div>
          <div className="pl-sdetdpm">
            <div className="pl-sdetdtile" style={{ background: 'rgba(55,138,221,0.08)', border: '1px solid rgba(55,138,221,0.12)' }}><div className="pl-sdetdlbl" style={{ color: '#85B7EB' }}>Drive</div><div className="pl-sdetdval" style={{ color: '#85B7EB' }}>{dpmWord(sdetSession.d)}</div></div>
            <div className="pl-sdetdtile" style={{ background: 'rgba(239,157,39,0.08)', border: '1px solid rgba(239,157,39,0.12)' }}><div className="pl-sdetdlbl" style={{ color: '#EF9F27' }}>Passion</div><div className="pl-sdetdval" style={{ color: '#EF9F27' }}>{dpmWord(sdetSession.p)}</div></div>
            <div className="pl-sdetdtile" style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.12)' }}><div className="pl-sdetdlbl" style={{ color: '#a855f7' }}>Motivation</div><div className="pl-sdetdval" style={{ color: '#a855f7' }}>{dpmWord(sdetSession.m)}</div></div>
          </div>
          <div className="pl-sdetamb"><div style={{ fontSize: '10px', fontWeight: 500, color: '#14b8a6', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '3px' }}>Motesart</div><div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.48)', lineHeight: 1.5 }}>{sdetSession.amb}</div></div>
          <button className="pl-sdetclose" onClick={() => setShowSdet(false)}>Close</button>
        </div>
      </div>

      {/* Log Modal */}
      <div className={`pl-logmod${showLog ? ' show' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setShowLog(false); }}>
        <div className="pl-logcard">
          <div className="pl-loghd"><span className="pl-loghtitle">Log a Session</span><button className="pl-logclose" onClick={() => setShowLog(false)}>Ã¢ÂÂ</button></div>
          <div className="pl-logfield"><div className="pl-loglbl">What did you practice?</div><input className="pl-loginput" placeholder="e.g. C Major Scale" value={logPieceName} onChange={e => setLogPieceName(e.target.value)} /></div>

          <div className="pl-logtwocol"><div><div className="pl-loglbl">Type</div><select className="pl-logselect" value={logType} onChange={e => setLogType(e.target.value)}><option>Homework</option><option>Sheet Music</option><option>Games</option><option>Live Practice</option></select></div><div><div className="pl-loglbl">Duration</div><div style={{position:'relative'}}><input className="pl-loginput" type="number" value={logDuration} onChange={e => setLogDuration(e.target.value)} min="1" max="180" style={{paddingRight:'40px'}} /><span style={{position:'absolute',right:'15px',top:'50%',transform:'translateY(-50%)',fontSize:'12px',fontWeight:500,color:'rgba(255,255,255,0.25)',pointerEvents:'none'}}>min</span></div></div></div>
          <div className="pl-logfield">
            <div className="pl-loglbl">How did it feel?</div>
            <div className="pl-logfeel">
              {[{k:'rough',e:'\ud83d\ude23',l:'Rough'},{k:'hard',e:'\ud83d\ude10',l:'Hard'},{k:'ok',e:'\ud83d\ude42',l:'Ok'},{k:'good',e:'\ud83d\ude0a',l:'Good'},{k:'great',e:'\ud83d\udd25',l:'Great'}].map(f => (
                <div key={f.k} className={`pl-logfbtn${logFeel === f.k ? ' sel' : ''}`} onClick={() => setLogFeel(f.k)}><span className="pl-logfemoji">{f.e}</span><span className="pl-logflbl">{f.l}</span></div>
              ))}
            </div>
          </div>
          <div className="pl-logfield"><div className="pl-loglbl">Notes <span style={{fontWeight:400,letterSpacing:0,textTransform:'none',color:'rgba(255,255,255,0.2)'}}>(optional)</span></div><textarea className="pl-lognotes" placeholder="Struggled with left hand on bar 12..." value={logNotes} onChange={e => setLogNotes(e.target.value)} /></div>
          {logStatus === 'error' && (
            <div data-testid="log-session-error" style={{ color: '#f87171', fontSize: 12, margin: '4px 0 8px' }}>{logError}</div>
          )}
            <button className="pl-logsubmit" data-testid="log-session-submit" disabled={logStatus === 'saving'} style={logStatus === 'saving' ? { opacity: 0.6, cursor: 'not-allowed' } : undefined} onClick={submitLogSession}>{logStatus === 'saving' ? 'Saving\u2026' : 'Save Session'}</button>
          <button className="pl-logcancel" onClick={() => { setShowLog(false); setLogStatus('idle'); setLogError(null) }}>Cancel</button>
        </div>
      </div>
    </>
  );
}
