import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RideSummary from './pages/RideSummary';
import RideHistory from './pages/RideHistory';

const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans selection:bg-neonBlue selection:text-gray-900">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><BikeProfile /></ProtectedRoute>} />
        <Route path="/summary" element={<ProtectedRoute><RideSummary /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><RideHistory /></ProtectedRoute>} />
      </Routes>
    </div>
  );
}

export default App;
