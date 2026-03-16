import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';

import DashboardLayout from './components/DashboardLayout';
import StudentDashboard from './pages/dashboard/StudentDashboard';
import UniversityProgrammes from './pages/dashboard/UniversityProgrammes';
import YourApplication from './pages/dashboard/YourApplication';
import Communicate from './pages/dashboard/Communicate';

import ApplicationWizard from './pages/dashboard/ApplicationWizard';

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

        {/* Default route redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
