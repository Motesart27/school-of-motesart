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

// ─── A. Full page hydration ────────────────────────

/**
 * Fetch the entire dashboard payload in one call.
 * Returns: { student, periods, sessions, calendar }
 */
export async function fetchDashboard(studentId, opts = {}) {
  const params = new URLSearchParams();
  if (opts.calMonth) params.set("cal_month", opts.calMonth);
  if (opts.calYear) params.set("cal_year", opts.calYear);

  const qs = params.toString();
  const path = `/practice-log/dashboard/${studentId}${qs ? `?${qs}` : ""}`;

  return apiFetch(path);
}

// ─── B. Paginated sessions ─────────────────────────

/**
 * Fetch paginated session list with sort + type filter.
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

// ─── C. Create session ─────────────────────────────

/**
 * Log a new practice session.
 */
export async function createSession(data) {
  return apiFetch("/practice-log/sessions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ─── Transform helpers (backend shape → component shape) ───

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
    acc: apiSession.accuracy_pct != null ? `${apiSession.accuracy_pct}%` : "—",
    feel: ratingToFeel[apiSession.self_rating] || "—",
    d: apiSession.dpm?.drive ?? 0,
    p: apiSession.dpm?.passion ?? 0,
    m: apiSession.dpm?.motivation ?? 0,
    amb: apiSession.ambassador_note || "",
    source: apiSession.source === "school" ? "School" : "Standalone",
  };
}

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
    dpm: {
      d: apiPeriod.dpm?.drive || 0,
      p: apiPeriod.dpm?.passion || 0,
      m: apiPeriod.dpm?.motivation || 0,
    },
    pieces: (apiPeriod.piece_progress || []).map((p) => ({
      name: p.name,
      meta: `${p.sessions} sessions · ${p.accuracy_pct}% accuracy`,
      pct: p.mastery_pct,
    })),
    insight: apiPeriod.insight_text || "",
    personalBests: [
      String(apiPeriod.personal_bests?.longest_session_min || 0),
      String(apiPeriod.personal_bests?.most_sessions_week || 0),
      String(apiPeriod.personal_bests?.best_month_min || 0),
    ],
  };
}

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

// ─── Utility ───────────────────────────────────

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
  const dots = [0, 0, 0, 0, 0, 0, 0];
  const fill = Math.min(activeDays, 7);
  for (let i = 0; i < fill; i++) dots[i] = 1;
  return dots;
}
