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
import FindItChapter from './pages/FindItChapter.jsx'
import PlayItChapter from './pages/PlayItChapter.jsx'
import MoveItChapter from './pages/MoveItChapter.jsx'
import OwnItChapter from './pages/OwnItChapter.jsx'
import PracticeChapterWrapper from './pages/PracticeChapterWrapper.jsx'
import DPMPlayground from './pages/DPMPlayground.jsx'

function TamiGate() {
  const { pathname } = useLocation()
  return null
}

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/" replace />
  return <ErrorBoundary>{children}<TamiGate /></ErrorBoundary>
}

function TeacherRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/" replace />
  const role = (user.role || '').toLowerCase()
  if (role !== 'teacher' && role !== 'admin') return <Navigate to="/student" replace />
  return <ErrorBoundary>{children}<TamiGate /></ErrorBoundary>
}

function AdminRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/" replace />
  const role = (user.role || '').toLowerCase()
  if (role !== 'admin') return <Navigate to="/student" replace />
  return <ErrorBoundary>{children}<TamiGate /></ErrorBoundary>
}

function AmbassadorRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/" replace />
  const role = (user.role || '').toLowerCase()
  if (role !== 'ambassador' && role !== 'admin') return <Navigate to="/student" replace />
  return <ErrorBoundary>{children}<TamiGate /></ErrorBoundary>
}

function ParentRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/" replace />
  const role = (user.role || '').toLowerCase()
  if (role !== 'parent' && role !== 'admin') return <Navigate to="/student" replace />
  return <ErrorBoundary>{children}<TamiGate /></ErrorBoundary>
}

function DashboardRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/" replace />
  const role = (user.role || 'User').toLowerCase()
  if (role === 'admin') return <Navigate to="/admin" replace />
  if (role === 'ambassador') return <Navigate to="/ambassador" replace />
  if (role === 'teacher') return <Navigate to="/teacher" replace />
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
      <Route path="/play-it" element={<ProtectedRoute><PlayItChapter /></ProtectedRoute>} />
      <Route path="/find-it" element={<ProtectedRoute><FindItChapter /></ProtectedRoute>} />
      <Route path="/move-it" element={<ProtectedRoute><MoveItChapter /></ProtectedRoute>} />
      <Route path="/own-it" element={<ProtectedRoute><OwnItChapter /></ProtectedRoute>} />
      <Route path="/concept-health" element={<TeacherRoute><ConceptHealth /></TeacherRoute>} />
      <Route path="/dpm-playground" element={<ProtectedRoute><DPMPlayground /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
