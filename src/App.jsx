import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import Login from './pages/Login.jsx'
import Registration from './pages/Registration.jsx'
import StudentDashboard from './pages/StudentDashboard.jsx'
import TeacherDashboard from './pages/TeacherDashboard.jsx'
import TeacherTamiDashboard from './pages/TeacherTamiDashboard.jsx'
import ParentDashboard from './pages/ParentDashboard.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import AmbassadorDashboard from './pages/AmbassadorDashboard.jsx'
import GamePage from './pages/GamePage.jsx'
import GamesDashboard from './pages/GamesDashboard.jsx'
import HomeworkDashboard from './pages/HomeworkDashboard.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import PracticeTracking from './pages/PracticeTracking.jsx'
import PracticeLogPage from './pages/PracticeLogPage.jsx'
import SessionSummary from './pages/SessionSummary.jsx'
import Settings from './pages/Settings.jsx'
import MyCoachPage from './pages/MyCoachPage.jsx'
import TamiChat from './components/TamiChat.jsx'
import TamiDashboard from './pages/TamiDashboard.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import WYLPracticeLive from './pages/WYLPracticeLive.jsx'
import WYLPracticeStaff from './pages/WYLPracticeStaff.jsx'
import CurriculumPath from './pages/CurriculumPath.jsx'
import ConceptHealth from './pages/ConceptHealth.jsx'
// M1 R2-FE.1 — legacy proof-loop chapters (FindIt/PlayIt/MoveIt/OwnIt and
// families) are QUARANTINED: they carried a competing learning authority
// (browser-derived confidence/mastery + Converter /api/practice-events +
// /api/concept-state writes). They are no longer imported by live routing;
// PracticeChapterWrapper now routes gates + canonical Practice Live only.
import PracticeChapterWrapper from './pages/PracticeChapterWrapper.jsx'
import DPMPlayground from './pages/DPMPlayground.jsx'
import RhythmRacer from './pages/RhythmRacerV2.jsx'

function TamiGate() {
  const { pathname } = useLocation()
  return null
}

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/" replace />
  return <ErrorBoundary>{children}<TamiGate /></ErrorBoundary>
}

// M1 R3.2 (Codex MEDIUM-1): neutral, non-privileged placeholder shown while the
// backend verifies the role. The privileged child is NEVER mounted until
// verification resolves, so cached/forged localStorage role cannot briefly
// render privileged UI.
function AccessVerifying() {
  return (
    <div
      data-testid="access-verifying"
      style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0a0e1a', color: '#9ca3af', fontFamily: "'Inter',-apple-system,sans-serif",
        fontSize: 13,
      }}
    >
      Verifying access…
    </div>
  )
}

// M1 R3.2 (Codex MEDIUM-1): single privileged guard. Order of checks:
//   no user                     → redirect to login (unauthenticated)
//   role not yet backend-verified → render placeholder, do NOT mount child
//   backend-verified & allowed   → mount
//   backend-verified & denied    → redirect (deny)
// A 401/403/outage during verification triggers logout() in AuthContext, which
// clears user → this guard then redirects to "/" (fail closed).
function PrivilegedRoute({ allow, children }) {
  const { user, roleVerified } = useAuth()
  if (!user) return <Navigate to="/" replace />
  if (!roleVerified) return <AccessVerifying />
  const role = (user.role || '').toLowerCase()
  if (!allow.includes(role)) return <Navigate to="/student" replace />
  return <ErrorBoundary>{children}<TamiGate /></ErrorBoundary>
}

// M1 R3-FE — founder is a legitimate elevated role (matches the backend's
// central ELEVATED_ROLES policy).
function TeacherRoute({ children }) {
  return <PrivilegedRoute allow={['teacher', 'admin', 'founder']}>{children}</PrivilegedRoute>
}

function AdminRoute({ children }) {
  return <PrivilegedRoute allow={['admin']}>{children}</PrivilegedRoute>
}

function AmbassadorRoute({ children }) {
  return <PrivilegedRoute allow={['ambassador', 'admin']}>{children}</PrivilegedRoute>
}

function ParentRoute({ children }) {
  return <PrivilegedRoute allow={['parent', 'admin']}>{children}</PrivilegedRoute>
}

function DashboardRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/" replace />
  const role = (user.role || 'User').toLowerCase()
  if (role === 'admin') return <Navigate to="/admin" replace />
  if (role === 'ambassador') return <Navigate to="/ambassador" replace />
  // M1 R3.1-FE §H — founder is an elevated role (matches TeacherRoute above
  // and the backend's ELEVATED_ROLES policy); /dashboard previously had no
  // case for it and silently fell through to the student dashboard.
  if (role === 'teacher' || role === 'founder') return <Navigate to="/teacher" replace />
  if (role === 'parent') return <Navigate to="/parent" replace />
  return <Navigate to="/student" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Registration />} />
      <Route path="/dashboard" element={<DashboardRedirect />} />
      <Route path="/student" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
      <Route path="/tami" element={<ProtectedRoute><TamiDashboard /></ProtectedRoute>} />
      <Route path="/teacher" element={<TeacherRoute><TeacherDashboard /></TeacherRoute>} />
      <Route path="/teacher-tami" element={<TeacherRoute><TeacherTamiDashboard /></TeacherRoute>} />
      <Route path="/parent" element={<ParentRoute><ParentDashboard /></ParentRoute>} />
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/ambassador" element={<AmbassadorRoute><AmbassadorDashboard /></AmbassadorRoute>} />
      <Route path="/game" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
      <Route path="/games" element={<ProtectedRoute><GamesDashboard /></ProtectedRoute>} />
      <Route path="/homework" element={<ProtectedRoute><HomeworkDashboard /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
      <Route path="/practice" element={<ProtectedRoute><PracticeTracking /></ProtectedRoute>} />
      <Route path="/practice-log" element={<ProtectedRoute><PracticeLogPage /></ProtectedRoute>} />
      <Route path="/session-summary" element={<ProtectedRoute><SessionSummary /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/my-coach" element={<ProtectedRoute><MyCoachPage /></ProtectedRoute>} />
      <Route path="/practice-live" element={<ProtectedRoute><WYLPracticeLive /></ProtectedRoute>} />
      <Route path="/wyl-practice" element={<Navigate to="/practice-live" replace />} />
      <Route path="/live-practice" element={<Navigate to="/practice-live" replace />} />
      <Route path="/wyl-practice-staff" element={<TeacherRoute><WYLPracticeStaff /></TeacherRoute>} />
      <Route path="/curriculum" element={<TeacherRoute><CurriculumPath /></TeacherRoute>} />
      <Route path="/practice/:conceptId" element={<ProtectedRoute><PracticeChapterWrapper /></ProtectedRoute>} />
      {/* M1 R2-FE.1 — obsolete legacy proof-loop routes. The old chapter
          system was a competing learning authority (local confidence writes +
          Converter evidence/state calls) and is decommissioned from student
          runtime. Direct visits land on the canonical Homework entry. */}
      <Route path="/play-it" element={<Navigate to="/homework" replace />} />
      <Route path="/find-it" element={<Navigate to="/homework" replace />} />
      <Route path="/move-it" element={<Navigate to="/homework" replace />} />
      <Route path="/own-it" element={<Navigate to="/homework" replace />} />
      <Route path="/concept-health" element={<TeacherRoute><ConceptHealth /></TeacherRoute>} />
      {/* M1 R3-FE §G — internal DPM simulator: raw numeric analytics are
          teacher/admin/founder tooling; ordinary students are redirected. */}
      <Route path="/dpm-playground" element={<TeacherRoute><DPMPlayground /></TeacherRoute>} />
      <Route path="/rhythm-racer" element={<ProtectedRoute><RhythmRacer /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
