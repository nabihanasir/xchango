import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';

import DashboardLayout from './components/DashboardLayout';
import StudentDashboard from './pages/dashboard/StudentDashboard';
import UniversityProgrammes from './pages/dashboard/UniversityProgrammes';
import YourApplication from './pages/dashboard/YourApplication';
import Communicate from './pages/dashboard/Communicate';

import ApplicationWizard from './pages/dashboard/ApplicationWizard';

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

import { AdminUniversities, AdminCourses, AdminSettings } from './pages/admin/StubPages';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Dashboard Routes */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<StudentDashboard />} />
          <Route path="programmes" element={<UniversityProgrammes />} />
          <Route path="applications" element={<YourApplication />} />
          <Route path="applications/new" element={<ApplicationWizard />} />
          <Route path="communicate" element={<Communicate />} />
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
          <Route path="profile" element={<AdvisorProfile />} />
          <Route path="students" element={<div className="p-8"><h2 className="text-2xl font-bold">Assigned Students Page</h2><p className="mt-4">List of students assigned to you will appear here.</p></div>} />
        </Route>

        {/* Default route redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
