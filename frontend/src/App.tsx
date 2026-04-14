import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';

import DashboardLayout from './components/DashboardLayout';
import StudentDashboard from './pages/dashboard/StudentDashboard';
import UniversityProgrammes from './pages/dashboard/UniversityProgrammes';
import StudentApplicationsPage from './pages/dashboard/StudentApplicationsPage';
import Communicate from './pages/dashboard/Communicate';
import CourseEquivalencyBrowse from './pages/dashboard/CourseEquivalencyBrowse';
import CourseEquivalencyRequests from './pages/dashboard/CourseEquivalencyRequests';
import StudentProfile from './pages/dashboard/StudentProfile';
import ApplicationWorkflowPage from './pages/dashboard/ApplicationWorkflowPage';

// Admin Imports
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminApplications from './pages/admin/AdminApplications';
// Advisor Imports
import AdvisorLayout from './components/advisor/AdvisorLayout';
import AdvisorDashboard from './pages/advisor/AdvisorDashboard';
import AdvisorApplications from './pages/advisor/AdvisorApplications';
import AdvisorProfile from './pages/advisor/AdvisorProfile';
import AdvisorEquivalencyRequests from './pages/advisor/AdvisorEquivalencyRequests';
import AdvisorEquivalencyRequestDetail from './pages/advisor/AdvisorEquivalencyRequestDetail';
import AdvisorStudents from './pages/advisor/AdvisorStudents';

import AdminUniversities from './pages/admin/AdminUniversities';
import AdminCourses from './pages/admin/AdminCourses';
import { AdminSettings } from './pages/admin/StubPages';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Dashboard Routes */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<StudentDashboard />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="programmes" element={<UniversityProgrammes />} />
          <Route path="applications" element={<StudentApplicationsPage />} />
          <Route path="applications/new" element={<ApplicationWorkflowPage />} />
          <Route path="applications/:id" element={<ApplicationWorkflowPage />} />
          <Route path="communicate" element={<Communicate />} />
          <Route path="equivalency/courses" element={<CourseEquivalencyBrowse />} />
          <Route path="equivalency/requests" element={<CourseEquivalencyRequests />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="applications" element={<AdminApplications />} />
          <Route path="universities" element={<AdminUniversities />} />
          <Route path="courses" element={<AdminCourses />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Advisor Routes */}
        <Route path="/advisor" element={<AdvisorLayout />}>
          <Route index element={<AdvisorDashboard />} />
          <Route path="applications" element={<AdvisorApplications />} />
          <Route path="requests" element={<AdvisorEquivalencyRequests />} />
          <Route path="requests/:id" element={<AdvisorEquivalencyRequestDetail />} />
          <Route path="profile" element={<AdvisorProfile />} />
          <Route path="students" element={<AdvisorStudents />} />
          <Route path="communicate" element={<Communicate />} />
        </Route>

        {/* Default route redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
