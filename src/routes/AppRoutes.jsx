import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import MainLayout from "../layout/MainLayout";
import Login from "../pages/Login";
import Register from "../pages/Register";
import ForgotPassword from "../pages/ForgotPassword";
import Dashboard from "../pages/Dashboard";
import Profile from "../pages/Profile";
import Courses from "../pages/Courses";
import Curriculum from "../pages/Curriculum";
import Schedule from "../pages/Schedule";
import Announcements from "../pages/Announcements";
import Reservations from "../pages/Reservations";
import Requests from "../pages/Requests";
import NotFound from "../pages/NotFound";
import Help from "../pages/Help";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default function AppRoutes() {
  const { currentUser } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={currentUser ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={currentUser ? <Navigate to="/" replace /> : <Register />}
      />
      <Route
        path="/forgot-password"
        element={currentUser ? <Navigate to="/" replace /> : <ForgotPassword />}
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="curriculum" element={<Curriculum />} />
        <Route path="courses" element={<Courses />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="reservations" element={<Reservations />} />
        <Route path="requests" element={<Requests />} />
        <Route path="help" element={<Help />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
