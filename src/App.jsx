import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import BrowseJobs from './pages/BrowseJobs';
import JobDetails from './pages/JobDetails';
import Applications from './pages/Applications';
import IqTest from './pages/IqTest';
import Upload from './pages/Upload';

import './index.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />

            <Route path="jobs" element={<BrowseJobs />} />
            <Route path="jobs/:id" element={<JobDetails />} />
            <Route path="applications" element={<Applications />} />

            <Route path="iq-test" element={<IqTest />} />
            <Route path="cv/upload" element={<Upload />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
