/**
 * usePracticeLogDashboard.js
 * SOM — React hook for Practice Log page data
 *
 * Single hook that manages:
 *   - Initial hydration from API
 *   - Period switching
 *   - Calendar month navigation
 *   - Session creation + optimistic update
 *   - Loading / error / retry states
 *
 * No demo fallback in production. Shows skeleton + retry + degraded-state message.
 * Dev mode uses DEMO_DATA for local development without backend.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchDashboard,
  fetchSessions,
  createSession as apiCreateSession,
  transformSession,
  transformPeriod,
  transformCalendar,
  UI_KEY_TO_ACTIVITY,
} from "../services/practiceLogApi";

// ─── Dev detection ──────────────────────────────────────────────
const IS_DEV = import.meta.env.DEV || import.meta.env.MODE === "development";

// ─── State machine ──────────────────────────────────────────────
// loading → ready | error
// ready   → (stays ready, sub-fetches don't block page)
// error   → loading (on retry)

/**
 * @param {string} studentId  — Airtable record ID for the student
 * @param {object} opts       — { devMode: bool } force dev fallback
 */
export default function usePracticeLogDashboard(studentId, opts = {}) {
  const devMode = opts.devMode ?? IS_DEV;

  // ─── Core state ───
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // ─── Data state ───
  const [student, setStudent] = useState(null);
  const [periodData, setPeriodData] = useState({});
  const [sessions, setSessions] = useState([]);
  const [calendarData, setCalendarData] = useState({});
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  // ─── Pagination state ───
  const [sessionPage, setSessionPage] = useState(1);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Track mounted state
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Initial hydration ────────────────────────────────────────

  useEffect(() => {
    if (!studentId) return;

    let cancelled = false;
    setStatus("loading");
    setError(null);

    (async () => {
      // Dev mode: use demo data, skip API
      if (devMode && !studentId.startsWith("rec")) {
        if (!cancelled && mountedRef.current) {
          loadDemoData();
          setStatus("ready");
        }
        return;
      }

      try {
        const data = await fetchDashboard(studentId, {
          calMonth,
          calYear,
        });

        if (cancelled || !mountedRef.current) return;

        // Transform and store
        setStudent(data.student);

        const transformed = {};
        for (const [key, val] of Object.entries(data.periods || {})) {
          transformed[key] = transformPeriod(val);
        }
        setPeriodData(transformed);

        setSessions((data.sessions || []).map(transformSession));
        setSessionTotal(data.sessions?.length || 0);
        setCalendarData(transformCalendar(data.calendar));
        setStatus("ready");
      } catch (err) {
        if (cancelled || !mountedRef.current) return;

        // In dev mode, fall back to demo data on API failure
        if (devMode) {
          console.warn("[PracticeLog] API unavailable, using demo data:", err.message);
          loadDemoData();
          setStatus("ready");
          return;
        }

        setError({
          message: err.message || "Failed to load practice log",
          status: err.status,
          retryable: err.status !== 403 && err.status !== 404,
        });
        setStatus("error");
      }
    })();

    return () => { cancelled = true; };
  }, [studentId, retryCount]);

  // ─── Calendar month change (doesn't re-hydrate everything) ────

  useEffect(() => {
    if (status !== "ready" || !studentId || devMode) return;

    let cancelled = false;
    (async () => {
      try {
        const data = await fetchDashboard(studentId, { calMonth, calYear });
        if (!cancelled && mountedRef.current) {
          setCalendarData(transformCalendar(data.calendar));
        }
      } catch {
        // Calendar refresh failure is non-blocking
      }
    })();

    return () => { cancelled = true; };
  }, [calMonth, calYear]);

  // ─── Actions ──────────────────────────────────────────────────

  const retry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  const loadMoreSessions = useCallback(
    async (sort = "date", type = "all") => {
      if (!studentId || sessionsLoading) return;
      setSessionsLoading(true);

      try {
        const backendType = type !== "all" ? UI_KEY_TO_ACTIVITY[type] : undefined;
        const data = await fetchSessions(studentId, {
          sort,
          type: backendType,
          page: sessionPage + 1,
          perPage: 20,
        });

        if (mountedRef.current) {
          const newSessions = (data.sessions || []).map(transformSession);
          setSessions((prev) => [...prev, ...newSessions]);
          setSessionPage((p) => p + 1);
          setSessionTotal(data.pagination?.total || 0);
        }
      } catch {
        // Pagination failure is non-blocking
      } finally {
        if (mountedRef.current) setSessionsLoading(false);
      }
    },
    [studentId, sessionPage, sessionsLoading]
  );

  const createSession = useCallback(
    async (sessionData) => {
      // Optimistic: add to local state immediately
      const optimisticSession = {
        id: Date.now(),
        title: sessionData.piece_name || "Untitled Session",
        date: "Just now",
        type: sessionData.activity_type,
        typeKey:
          { homework: "hw", sheet_music: "sm", games: "gm", live_practice: "lp" }[
            sessionData.activity_type
          ] || "hw",
        dur: sessionData.duration_min,
        acc: "—",
        feel: { hard: "Hard", ok: "OK", great: "Great" }[sessionData.self_rating] || "—",
        d: 0,
        p: 0,
        m: 0,
        amb: "",
        source: sessionData.source === "school" ? "School" : "Standalone",
      };

      setSessions((prev) => [optimisticSession, ...prev]);

      try {
        const result = await apiCreateSession(sessionData);

        if (mountedRef.current) {
          // Replace optimistic entry with real data
          if (result.session) {
            const realSession = transformSession(result.session);
            setSessions((prev) =>
              prev.map((s) => (s.id === optimisticSession.id ? realSession : s))
            );
          }

          // Update the current period analytics if returned
          if (result.updated_period) {
            setPeriodData((prev) => ({
              ...prev,
              week: transformPeriod(result.updated_period),
            }));
          }
        }

        return { success: true };
      } catch (err) {
        // Rollback optimistic update
        if (mountedRef.current) {
          setSessions((prev) => prev.filter((s) => s.id !== optimisticSession.id));
        }
        return { success: false, error: err.message };
      }
    },
    [studentId]
  );

  const navigateCalendar = useCallback((direction) => {
    if (direction === "prev") {
      setCalMonth((m) => {
        if (m === 1) {
          setCalYear((y) => y - 1);
          return 12;
        }
        return m - 1;
      });
    } else {
      setCalMonth((m) => {
        if (m === 12) {
          setCalYear((y) => y + 1);
          return 1;
        }
        return m + 1;
      });
    }
  }, []);

  // ─── Demo data loader (dev only) ─────────────────────────────

  function loadDemoData() {
    setStudent({
      id: "demo",
      name: "Demo Student",
      instrument: "Piano",
      grade: "6th Grade",
      school: "Westside Music",
      level: 4,
    });
    setPeriodData(DEMO_PERIOD_DATA);
    setSessions(DEMO_SESSIONS);
    setCalendarData({});
  }

  // ─── Return ───────────────────────────────────────────────────

  return {
    // Status
    status,
    error,
    retry,
    isDevMode: devMode,

    // Data
    student,
    periodData,
    sessions,
    setSessions,
    calendarData,

    // Calendar
    calMonth,
    calYear,
    navigateCalendar,

    // Session actions
    createSession,
    loadMoreSessions,
    sessionsLoading,
    sessionTotal,
  };
}


// ═══════════════════════════════════════════════════════════════════
// DEMO DATA (dev mode only — never shown in production)
// Matches the exact shape of transformed API data
// ═══════════════════════════════════════════════════════════════════

const DEMO_PERIOD_DATA = {
  week: {
    chartLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    trend: { all: [11, 0, 13, 35, 0, 0, 0], hw: [11, 0, 0, 22, 0, 0, 0], sm: [0, 0, 13, 0, 0, 0, 0], gm: [0, 0, 0, 8, 0, 0, 0], lp: [0, 0, 0, 5, 0, 0, 0] },
    goalAll: { labels: ["Homework", "Sheet Music", "Games", "Live Practice"], actual: [33, 13, 8, 5], goal: [60, 30, 15, 10] },
    breakdown: { hw: [39, 46], sm: [22, 26], gm: [13, 15], lp: [12, 14] },
    consistency: { label: "4 of 7 days", count: 4, days: [1, 1, 1, 1, 0, 0, 0] },
    dpm: { d: 78, p: 65, m: 82 },
    pieces: [
      { name: "C Major Scale", meta: "8 sessions · 92% accuracy", pct: 92 },
      { name: "Hanon Exercise No. 1", meta: "5 sessions · 74% accuracy", pct: 74 },
      { name: "Scale Recognition", meta: "3 sessions · 61% accuracy", pct: 61 },
    ],
    insight: "Thursday was your strongest session this week. Drive and Motivation are both strong — let's work on Passion by exploring a piece you personally love.",
    personalBests: ["35", "4", "312"],
  },
  month: {
    chartLabels: ["W1", "W2", "W3", "W4"],
    trend: { all: [52, 78, 89, 93], hw: [30, 40, 45, 50], sm: [12, 20, 24, 28], gm: [6, 10, 12, 9], lp: [4, 8, 8, 6] },
    goalAll: { labels: ["Homework", "Sheet Music", "Games", "Live Practice"], actual: [165, 84, 37, 26], goal: [120, 60, 40, 32] },
    breakdown: { hw: [155, 50], sm: [84, 27], gm: [37, 12], lp: [26, 8] },
    consistency: { label: "18 of 31 days", count: 18, days: [1, 1, 0, 1, 1, 0, 1] },
    dpm: { d: 81, p: 70, m: 85 },
    pieces: [
      { name: "C Major Scale", meta: "22 sessions · 94% accuracy", pct: 94 },
      { name: "Hanon Exercise No. 1", meta: "16 sessions · 79% accuracy", pct: 79 },
      { name: "Scale Recognition", meta: "10 sessions · 68% accuracy", pct: 68 },
    ],
    insight: "Week 3 was your best month yet — 89 minutes! You are most consistent mid-week. Games sessions have been dropping — even 10 minutes sharpens your ear training.",
    personalBests: ["35", "6", "312"],
  },
  quarter: {
    chartLabels: ["Oct", "Nov", "Dec", "Jan"],
    trend: { all: [180, 220, 265, 312], hw: [90, 110, 130, 160], sm: [45, 60, 75, 90], gm: [25, 30, 35, 38], lp: [20, 20, 25, 24] },
    goalAll: { labels: ["Homework", "Sheet Music", "Games", "Live Practice"], actual: [490, 270, 128, 89], goal: [400, 160, 120, 80] },
    breakdown: { hw: [490, 50], sm: [270, 28], gm: [128, 13], lp: [89, 9] },
    consistency: { label: "62 of 92 days", count: 62, days: [1, 1, 1, 0, 1, 1, 0] },
    dpm: { d: 83, p: 72, m: 87 },
    pieces: [
      { name: "C Major Scale", meta: "55 sessions · 95% accuracy", pct: 95 },
      { name: "Hanon Exercise No. 1", meta: "38 sessions · 83% accuracy", pct: 83 },
      { name: "Scale Recognition", meta: "28 sessions · 74% accuracy", pct: 74 },
    ],
    insight: "You've improved 73% in practice minutes from October to January. Sheet Music is your biggest growth area this quarter.",
    personalBests: ["42", "8", "312"],
  },
  semester: {
    chartLabels: ["Sep", "Oct", "Nov", "Dec", "Jan"],
    trend: { all: [120, 180, 220, 265, 312], hw: [60, 90, 110, 130, 160], sm: [30, 45, 60, 75, 90], gm: [18, 25, 30, 35, 38], lp: [12, 20, 20, 25, 24] },
    goalAll: { labels: ["Homework", "Sheet Music", "Games", "Live Practice"], actual: [550, 300, 146, 101], goal: [375, 200, 100, 75] },
    breakdown: { hw: [550, 52], sm: [300, 28], gm: [146, 14], lp: [101, 10] },
    consistency: { label: "78 of 150 days", count: 78, days: [1, 0, 1, 1, 1, 0, 1] },
    dpm: { d: 79, p: 68, m: 83 },
    pieces: [
      { name: "C Major Scale", meta: "80 sessions · 95% accuracy", pct: 95 },
      { name: "Hanon Exercise No. 1", meta: "52 sessions · 86% accuracy", pct: 86 },
      { name: "Scale Recognition", meta: "35 sessions · 77% accuracy", pct: 77 },
    ],
    insight: "September to January shows 160% growth. You're most productive on Tuesdays and Thursdays. Live Practice is your next growth opportunity.",
    personalBests: ["42", "8", "312"],
  },
};

const DEMO_SESSIONS = [
  { id: 0, title: "C Major — Hands Together", date: "Today", type: "Homework", typeKey: "hw", dur: 22, acc: "87%", feel: "OK", d: 82, p: 71, m: 88, amb: "Your left hand timing improved this session — great consistency! Try slowing to 60bpm next time.", source: "School" },
  { id: 1, title: "Hanon Exercise No. 1", date: "Yesterday", type: "Sheet Music", typeKey: "sm", dur: 18, acc: "74%", feel: "OK", d: 75, p: 68, m: 79, amb: "Solid session. Your fourth finger is still the weakest link — try isolating fingers 3 and 4.", source: "School" },
  { id: 2, title: "Find the Note — Level 3", date: "Tue", type: "Games", typeKey: "gm", dur: 13, acc: "91%", feel: "Great", d: 88, p: 90, m: 85, amb: "91% accuracy on Level 3 — that's your personal best! Your ear training is really clicking.", source: "Standalone" },
  { id: 3, title: "Scale Recognition Practice", date: "Mon", type: "Homework", typeKey: "hw", dur: 11, acc: "62%", feel: "Hard", d: 65, p: 55, m: 70, amb: "Short but focused — that counts. Minor scale recognition is still developing.", source: "School" },
  { id: 4, title: "Live Practice Session", date: "Mon", type: "Live Practice", typeKey: "lp", dur: 12, acc: "79%", feel: "OK", d: 78, p: 72, m: 80, amb: "Good energy in this session. You're building real consistency.", source: "Standalone" },
];
