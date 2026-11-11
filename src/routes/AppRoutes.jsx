import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import MainLayout from "../layout/MainLayout";
import Login from "../pages/Login";
import Register from "../pages/Register";
import ForgotPassword from "../pages/ForgotPassword";
import NotFound from "../pages/NotFound";
import LoadingSpinner from "../components/LoadingSpinner";

const Dashboard = lazy(() => import("../pages/Dashboard"));
const Profile = lazy(() => import("../pages/Profile"));
const Courses = lazy(() => import("../pages/Courses"));
const Curriculum = lazy(() => import("../pages/Curriculum"));
const Schedule = lazy(() => import("../pages/Schedule"));
const Announcements = lazy(() => import("../pages/Announcements"));
const Reservations = lazy(() => import("../pages/Reservations"));
const Requests = lazy(() => import("../pages/Requests"));
const Help = lazy(() => import("../pages/Help"));

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default function AppRoutes() {
  const { currentUser, demo } = useAuth();

  return (
    <Suspense fallback={<LoadingSpinner />}>
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
        element={demo ? <Navigate to="/login" replace /> : currentUser ? <Navigate to="/" replace /> : <ForgotPassword />}
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
    </Suspense>
  );
}
