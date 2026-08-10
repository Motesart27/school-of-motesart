/**
 * practiceLogApi.js
 * SOM — Practice Log API Service
 *
 * Talks to Railway FastAPI backend.
 * Three calls map 1:1 to the backend endpoints:
 *   fetchDashboard()  → GET  /practice-log/dashboard/{studentId}
 *   fetchSessions()   → GET  /practice-log/sessions/{studentId}
 *   createSession()   → POST /practice-log/sessions
 *
 * Field names are FROZEN per PRACTICE_LOG_SCHEMA.md.
 */

import { updateWYLFromBehavior } from "./wylEvolution.js"

const API_URL = import.meta.env.VITE_API_URL || "https://deployable-python-codebase-som-production.up.railway.app";

/**
 * Shared fetch wrapper with auth token injection.
 * Throws on non-2xx responses with structured error info.
 */
async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("som_token"); // matches existing auth pattern

  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.detail || `API error ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return res.json();
}

// ─── Frozen enum maps (match backend + UI) ─────────────────────

export const ACTIVITY_TYPES = {
  homework: "homework",
  sheet_music: "sheet_music",
  games: "games",
  live_practice: "live_practice",
};

export const PERIOD_TYPES = {
  week: "week",
  month: "month",
  quarter: "quarter",
  semester: "semester",
};

// Map from backend enum → UI display labels
export const ACTIVITY_LABELS = {
  homework: "Homework",
  sheet_music: "Sheet Music",
  games: "Games",
  live_practice: "Live Practice",
};

// Map from backend enum → design token keys (for typeColor lookups)
export const ACTIVITY_TO_TOKEN_KEY = {
  homework: "homework",
  sheet_music: "sheetMusic",
  games: "games",
  live_practice: "livePractice",
};

// Map from UI type key (hw/sm/gm/lp) → backend enum
export const UI_KEY_TO_ACTIVITY = {
  hw: "homework",
  sm: "sheet_music",
  gm: "games",
  lp: "live_practice",
};

export const SELF_RATINGS = {
  hard: "hard",
  ok: "ok",
  great: "great",
};

// ─── A. Full page hydration ────────────────────────────────────

/**
 * Fetch the entire dashboard payload in one call.
 * Returns: { student, periods, sessions, calendar }
 *
 * @param {string} studentId  — Airtable record ID
 * @param {object} opts       — { calMonth, calYear } for calendar
 */
export async function fetchDashboard(studentId, opts = {}) {
  const params = new URLSearchParams();
  if (opts.calMonth) params.set("cal_month", opts.calMonth);
  if (opts.calYear) params.set("cal_year", opts.calYear);

  const qs = params.toString();
  const path = `/practice-log/dashboard/${studentId}${qs ? `?${qs}` : ""}`;

  return apiFetch(path);
}

// ─── B. Paginated sessions ─────────────────────────────────────

/**
 * Fetch paginated session list with sort + type filter.
 * Returns: { sessions, pagination: { page, per_page, total, total_pages } }
 *
 * @param {string} studentId
 * @param {object} opts — { sort: "date"|"dur", type: "homework"|..., page, perPage }
 */
export async function fetchSessions(studentId, opts = {}) {
  const params = new URLSearchParams();
  if (opts.sort) params.set("sort", opts.sort);
  if (opts.type && opts.type !== "all") params.set("type", opts.type);
  if (opts.page) params.set("page", opts.page);
  if (opts.perPage) params.set("per_page", opts.perPage);

  const qs = params.toString();
  const path = `/practice-log/sessions/${studentId}${qs ? `?${qs}` : ""}`;

  return apiFetch(path);
}

// ─── C. Create session ─────────────────────────────────────────

/**
 * Log a new practice session.
 * Returns: { session, updated_period }
 *
 * @param {object} data — { student_id, duration_min, activity_type, piece_name, self_rating, source }
 */
export async function createSession(data) {
  const result = await apiFetch("/practice-log/sessions", {
    method: "POST",
    body: JSON.stringify(data),
  })
  try {
    const eventMap = {
      "games": "ear_training_session",
      "live_practice": "live_practice",
      "sheet_music": "sheet_music",
      "homework": "homework",
    }

    const mappedEvent = eventMap[data?.activity_type] || "live_practice"

    // M1 R2-FE §K — no fabricated numerics: accuracy is included ONLY when a
    // real numeric exists (student-safe payloads carry accuracy_tier instead,
    // and a missing forbidden numeric is NOT a failure and NOT a default 70).
    const wylPayload = { duration: data?.duration || 0 }
    const rawAccuracy = data?.accuracy ?? data?.accuracy_pct
    if (typeof rawAccuracy === 'number') wylPayload.accuracy = rawAccuracy
    updateWYLFromBehavior(mappedEvent, wylPayload)
  } catch {}
  return result
}

// ─── Transform helpers (backend shape → component shape) ───────

/**
 * Transform a backend session object to the shape the component expects.
 * Backend uses snake_case activity_type enums; component uses typeKey shortcodes.
 */
// ─── M1 R2-FE §K — Article XIII tier presentation (BE.2 student shapes) ─────
// Student payloads carry accuracy_tier (no accuracy_pct) and dpm: null.
// Tiers render as Motesart language; absent numerics stay absent — never 0.
const TIER_LABELS = {
  mastered: "Mastered",
  owned: "Owned it",
  almost_owned: "Almost there",
  developing: "Growing",
  not_ready: "Just starting",
};
// Discrete five-band bar widths — tier presentation, not a hidden-% readout.
const TIER_BAND_WIDTH = {
  mastered: 100, owned: 88, almost_owned: 72, developing: 45, not_ready: 20,
};

export function transformSession(apiSession) {
  const activityToTypeKey = {
    homework: "hw",
    sheet_music: "sm",
    games: "gm",
    live_practice: "lp",
  };

  const ratingToFeel = {
    hard: "Hard",
    ok: "OK",
    great: "Great",
  };

  return {
    id: apiSession.log_id,
    title: apiSession.title,
    date: formatRelativeDate(apiSession.practiced_at),
    type: ACTIVITY_LABELS[apiSession.activity_type] || apiSession.activity_type,
    typeKey: activityToTypeKey[apiSession.activity_type] || "hw",
    dur: apiSession.duration_min,
    // M1 R2-FE §K — prefer the student-safe accuracy_tier; raw percentages
    // only ever appear when an elevated payload actually supplies them.
    acc: apiSession.accuracy_tier != null
      ? (TIER_LABELS[apiSession.accuracy_tier] || apiSession.accuracy_tier)
      : (apiSession.accuracy_pct != null ? `${apiSession.accuracy_pct}%` : "—"),
    feel: ratingToFeel[apiSession.self_rating] || "—",
    // Absent DPM numerics stay absent (null) — never reconstructed as 0.
    d: apiSession.dpm?.drive ?? null,
    p: apiSession.dpm?.passion ?? null,
    m: apiSession.dpm?.motivation ?? null,
    amb: apiSession.ambassador_note || "",
    source: apiSession.source === "school" ? "School" : "Standalone",
  };
}

/**
 * Transform a backend period analytics object to the shape PERIOD_DATA expects.
 */
export function transformPeriod(apiPeriod) {
  if (!apiPeriod) return null;

  const bk = apiPeriod.breakdown || {};
  return {
    chartLabels: apiPeriod.trend?.labels || [],
    trend: {
      all: apiPeriod.trend?.all || [],
      hw: apiPeriod.trend?.homework || [],
      sm: apiPeriod.trend?.sheet_music || [],
      gm: apiPeriod.trend?.games || [],
      lp: apiPeriod.trend?.live_practice || [],
    },
    goalAll: apiPeriod.goal_vs_actual
      ? {
          labels: apiPeriod.goal_vs_actual.labels || [],
          actual: apiPeriod.goal_vs_actual.actual || [],
          goal: apiPeriod.goal_vs_actual.goal || [],
        }
      : { labels: ["Homework", "Sheet Music", "Games", "Live Practice"], actual: [0, 0, 0, 0], goal: [0, 0, 0, 0] },
    breakdown: {
      hw: [bk.homework?.minutes || 0, bk.homework?.pct || 0],
      sm: [bk.sheet_music?.minutes || 0, bk.sheet_music?.pct || 0],
      gm: [bk.games?.minutes || 0, bk.games?.pct || 0],
      lp: [bk.live_practice?.minutes || 0, bk.live_practice?.pct || 0],
    },
    consistency: {
      label: `${apiPeriod.consistency_days} of ${apiPeriod.consistency_total} days`,
      count: apiPeriod.consistency_days,
      days: buildConsistencyDots(apiPeriod.consistency_days, apiPeriod.consistency_total),
    },
    // M1 R2-FE §K — student periods carry dpm: null (withheld); it stays
    // null rather than becoming fake zeros. Elevated payloads keep numbers.
    dpm: apiPeriod.dpm
      ? {
          d: apiPeriod.dpm.drive ?? null,
          p: apiPeriod.dpm.passion ?? null,
          m: apiPeriod.dpm.motivation ?? null,
        }
      : null,
    pieces: (apiPeriod.piece_progress || []).map((p) => ({
      name: p.name,
      // Tier language first (student shape); % only when elevated supplies it.
      meta: p.accuracy_tier != null
        ? `${p.sessions} sessions · ${TIER_LABELS[p.accuracy_tier] || p.accuracy_tier}`
        : `${p.sessions} sessions · ${p.accuracy_pct != null ? p.accuracy_pct + "% accuracy" : "—"}`,
      // mastery_pct no longer exists anywhere (backend §J); bars use the
      // discrete tier band, or the elevated accuracy when present.
      pct: p.accuracy_tier != null
        ? (TIER_BAND_WIDTH[p.accuracy_tier] ?? 20)
        : (p.accuracy_pct ?? null),
    })),
    insight: apiPeriod.insight_text || "",
    personalBests: [
      String(apiPeriod.personal_bests?.longest_session_min || 0),
      String(apiPeriod.personal_bests?.most_sessions_week || 0),
      String(apiPeriod.personal_bests?.best_month_min || 0),
    ],
  };
}

/**
 * Transform calendar API data to the heatColor function's expected shape.
 * Returns a map: dayNumber → intensity (0–4)
 */
export function transformCalendar(apiCalendar) {
  if (!apiCalendar?.days) return {};
  const maxMin = Math.max(1, ...Object.values(apiCalendar.days));
  const result = {};
  for (const [day, minutes] of Object.entries(apiCalendar.days)) {
    if (minutes === 0) result[day] = 0;
    else if (minutes < maxMin * 0.25) result[day] = 1;
    else if (minutes < maxMin * 0.6) result[day] = 2;
    else if (minutes < maxMin * 0.85) result[day] = 3;
    else result[day] = 4;
  }
  return result;
}

// ─── Utility ───────────────────────────────────────────────────

function formatRelativeDate(isoString) {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) {
      return d.toLocaleDateString("en-US", { weekday: "short" });
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

function buildConsistencyDots(activeDays, totalDays) {
  // Always show 7 dots (M-S week view)
  const dots = [0, 0, 0, 0, 0, 0, 0];
  const fill = Math.min(activeDays, 7);
  for (let i = 0; i < fill; i++) dots[i] = 1;
  return dots;
}
