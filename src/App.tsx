import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/layout/Layout';
import { StaffLayout } from './components/layout/StaffLayout';
import { ForgotPasswordPage, OtpVerificationPage } from './components/auth';
import { ToastProvider } from './components/ui';

import Landing from './pages/Landing';
import StudentLogin from './pages/student/Login';
import StudentSignup from './pages/student/Signup';
import StaffLogin from './pages/staff/Login';
import StaffSignup from './pages/staff/Signup';

// Existing Student Pages
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Skills = lazy(() => import('./pages/Skills').then(m => ({ default: m.Skills })));
const Projects = lazy(() => import('./pages/Projects').then(m => ({ default: m.Projects })));
const Certificates = lazy(() => import('./pages/Certificates').then(m => ({ default: m.Certificates })));
const Internships = lazy(() => import('./pages/Internships').then(m => ({ default: m.Internships })));
const Hackathons = lazy(() => import('./pages/Hackathons').then(m => ({ default: m.Hackathons })));
const Workshops = lazy(() => import('./pages/Workshops').then(m => ({ default: m.Workshops })));
const Compare = lazy(() => import('./pages/Compare').then(m => ({ default: m.Compare })));
const AISuggestions = lazy(() => import('./pages/AISuggestions').then(m => ({ default: m.AISuggestions })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const AIAssistant = lazy(() => import('./pages/AIAssistant').then(m => ({ default: m.AIAssistant })));
const SemesterResults = lazy(() => import('./pages/SemesterResults').then(m => ({ default: m.SemesterResults })));
const StudentDNA = lazy(() => import('./pages/StudentDNA').then(m => ({ default: m.StudentDNA })));
const PlacementPrediction = lazy(() => import('./pages/PlacementPrediction').then(m => ({ default: m.PlacementPrediction })));
const Messages = lazy(() => import('./pages/Messages').then(m => ({ default: m.Messages })));

// New Staff Pages
const StaffDashboard = lazy(() => import('./pages/staff/StaffDashboard'));
const StaffStudents = lazy(() => import('./pages/staff/StaffStudents'));
const StaffStudentProfile = lazy(() => import('./pages/staff/StaffStudentProfile'));
const StaffStudentDNA = lazy(() => import('./pages/staff/StaffStudentDNA'));
const StaffSemesterResults = lazy(() => import('./pages/staff/StaffSemesterResults'));
const StaffCertificates = lazy(() => import('./pages/staff/StaffCertificates'));
const StaffInternships = lazy(() => import('./pages/staff/StaffInternships'));
const StaffProjects = lazy(() => import('./pages/staff/StaffProjects'));
const StaffHackathons = lazy(() => import('./pages/staff/StaffHackathons'));
const StaffWorkshops = lazy(() => import('./pages/staff/StaffWorkshops'));
const StaffSkills = lazy(() => import('./pages/staff/StaffSkills'));
const StaffAIRiskAnalysis = lazy(() => import('./pages/staff/StaffAIRiskAnalysis'));
const StaffReports = lazy(() => import('./pages/staff/StaffReports'));
const StaffNotifications = lazy(() => import('./pages/staff/StaffNotifications'));
const StaffSettings = lazy(() => import('./pages/staff/StaffSettings'));

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
          <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        </div>
        <p className="text-gray-400 animate-pulse">Loading...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            {/* Entry Flow */}
            <Route path="/" element={<Landing />} />
            
            {/* Student Auth */}
            <Route path="/student/login" element={<StudentLogin />} />
            <Route path="/student/signup" element={<StudentSignup />} />
            
            {/* Staff Auth */}
            <Route path="/staff/login" element={<StaffLogin />} />
            <Route path="/staff/signup" element={<StaffSignup />} />

            {/* Other Auth Routes */}
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/verify-otp" element={<OtpVerificationPage />} />
            
            {/* Staff App Layout */}
            <Route path="/staff" element={<StaffLayout />}>
              <Route path="dashboard" element={<Suspense fallback={<LoadingScreen />}><StaffDashboard /></Suspense>} />
              <Route path="students" element={<Suspense fallback={<LoadingScreen />}><StaffStudents /></Suspense>} />
              <Route path="students/:id" element={<Suspense fallback={<LoadingScreen />}><StaffStudentProfile /></Suspense>} />
              <Route path="student-dna" element={<Suspense fallback={<LoadingScreen />}><StaffStudentDNA /></Suspense>} />
              <Route path="semester-results" element={<Suspense fallback={<LoadingScreen />}><StaffSemesterResults /></Suspense>} />
              <Route path="academic-verification" element={<Suspense fallback={<LoadingScreen />}><StaffSemesterResults /></Suspense>} />
              <Route path="certificates" element={<Suspense fallback={<LoadingScreen />}><StaffCertificates /></Suspense>} />
              <Route path="internships" element={<Suspense fallback={<LoadingScreen />}><StaffInternships /></Suspense>} />
              <Route path="projects" element={<Suspense fallback={<LoadingScreen />}><StaffProjects /></Suspense>} />
              <Route path="hackathons" element={<Suspense fallback={<LoadingScreen />}><StaffHackathons /></Suspense>} />
              <Route path="workshops" element={<Suspense fallback={<LoadingScreen />}><StaffWorkshops /></Suspense>} />
              <Route path="skills" element={<Suspense fallback={<LoadingScreen />}><StaffSkills /></Suspense>} />
              <Route path="placement-analytics" element={<Navigate to="/staff/dashboard" replace />} />
              <Route path="ai-risk-analysis" element={<Suspense fallback={<LoadingScreen />}><StaffAIRiskAnalysis /></Suspense>} />
              <Route path="leaderboard" element={<Navigate to="/staff/dashboard" replace />} />
              <Route path="reports" element={<Suspense fallback={<LoadingScreen />}><StaffReports /></Suspense>} />
              <Route path="notifications" element={<Suspense fallback={<LoadingScreen />}><StaffNotifications /></Suspense>} />
              <Route path="settings" element={<Suspense fallback={<LoadingScreen />}><StaffSettings /></Suspense>} />
            </Route>

            {/* Existing Student App Layout */}
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Suspense fallback={<LoadingScreen />}><Dashboard /></Suspense>} />
              <Route path="/student-dna" element={<Suspense fallback={<LoadingScreen />}><StudentDNA /></Suspense>} />
              <Route path="/placement-prediction" element={<Suspense fallback={<LoadingScreen />}><PlacementPrediction /></Suspense>} />
              <Route path="/profile" element={<Suspense fallback={<LoadingScreen />}><Profile /></Suspense>} />
              <Route path="/academic-verification" element={<Navigate to="/dashboard" replace />} />
              <Route path="/semester-results" element={<Suspense fallback={<LoadingScreen />}><SemesterResults /></Suspense>} />
              <Route path="/skills" element={<Suspense fallback={<LoadingScreen />}><Skills /></Suspense>} />
              <Route path="/projects" element={<Suspense fallback={<LoadingScreen />}><Projects /></Suspense>} />
              <Route path="/certificates" element={<Suspense fallback={<LoadingScreen />}><Certificates /></Suspense>} />
              <Route path="/internships" element={<Suspense fallback={<LoadingScreen />}><Internships /></Suspense>} />
              <Route path="/hackathons" element={<Suspense fallback={<LoadingScreen />}><Hackathons /></Suspense>} />
              <Route path="/workshops" element={<Suspense fallback={<LoadingScreen />}><Workshops /></Suspense>} />
              <Route path="/compare" element={<Suspense fallback={<LoadingScreen />}><Compare /></Suspense>} />
              <Route path="/ai-suggestions" element={<Suspense fallback={<LoadingScreen />}><AISuggestions /></Suspense>} />
              <Route path="/settings" element={<Suspense fallback={<LoadingScreen />}><Settings /></Suspense>} />
              <Route path="/ai-assistant" element={<Suspense fallback={<LoadingScreen />}><AIAssistant /></Suspense>} />
              <Route path="/messages" element={<Suspense fallback={<LoadingScreen />}><Messages /></Suspense>} />
              <Route path="/student/messages" element={<Suspense fallback={<LoadingScreen />}><Messages /></Suspense>} />
            </Route>
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
