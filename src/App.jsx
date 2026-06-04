import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

// Pages
import Login from "./pages/Login";
import UserRegister from "./pages/Register";
import AdminRegister from "./compontes/Register";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import AddMember from "./pages/AddMember";
import MemberProfile from "./pages/MemberProfile";
import Payments from "./pages/Payments";
import AddPayment from "./pages/AddPayment";
import Attendance from "./pages/Attendance";
import DietPlans from "./pages/DietPlans";
import AddDietPlan from "./pages/AddDietPlan";
import Training from "./pages/Training";
import AddTrainer from "./pages/AddTrainer";
import Reports from "./pages/Reports";
import Expenses from "./pages/Expenses";
import About from "./pages/About";
import Leads from "./pages/Leads";
import ForgotPassword from "./pages/ForgotPassword";
import DietLog from "./pages/DietLog";

// Role-aware Protected Route
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem("token");
  const user  = JSON.parse(localStorage.getItem("user") || "{}");
  if (!token) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" />;
  }
  return children;
};

const Unauthorized = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
    <div className="text-center text-white">
      <div className="text-8xl font-bold text-red-500 mb-4">403</div>
      <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
      <p className="text-slate-400 mb-8">You don't have permission to view this page.</p>
      <a href="/dashboard" className="bg-red-600 px-6 py-2.5 rounded-lg hover:bg-red-700 transition font-semibold">
        Back to Dashboard
      </a>
    </div>
  </div>
);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  }, []);

  return (
    <Router>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login"           element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Admin-only: create member / trainer accounts */}
        <Route path="/signup" element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <UserRegister />
          </ProtectedRoute>
        } />

        {/* Unauthorized */}
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["admin","trainer","member"]}><Dashboard /></ProtectedRoute>} />

        {/* Members */}
        <Route path="/register"      element={<ProtectedRoute allowedRoles={["admin","trainer"]}><AdminRegister /></ProtectedRoute>} />
        <Route path="/members"       element={<ProtectedRoute allowedRoles={["admin","trainer"]}><Members /></ProtectedRoute>} />
        <Route path="/members/new"   element={<ProtectedRoute allowedRoles={["admin","trainer"]}><AddMember /></ProtectedRoute>} />
        <Route path="/members/:id"   element={<ProtectedRoute allowedRoles={["admin","trainer","member"]}><MemberProfile /></ProtectedRoute>} />

        {/* Payments */}
        <Route path="/payments"      element={<ProtectedRoute allowedRoles={["admin","trainer"]}><Payments /></ProtectedRoute>} />
        <Route path="/payments/new"  element={<ProtectedRoute allowedRoles={["admin","trainer"]}><AddPayment /></ProtectedRoute>} />

        {/* Attendance */}
        <Route path="/attendance"    element={<ProtectedRoute allowedRoles={["admin","trainer","member"]}><Attendance /></ProtectedRoute>} />

        {/* Diet Plans */}
        <Route path="/diet-plans"    element={<ProtectedRoute allowedRoles={["admin","trainer","member"]}><DietPlans /></ProtectedRoute>} />
        <Route path="/diet-plans/new" element={<ProtectedRoute allowedRoles={["admin","trainer"]}><AddDietPlan /></ProtectedRoute>} />
        <Route path="/diet-log"      element={<ProtectedRoute allowedRoles={["member"]}><DietLog /></ProtectedRoute>} />

        {/* Training */}
        <Route path="/training"      element={<ProtectedRoute allowedRoles={["admin","trainer"]}><Training /></ProtectedRoute>} />
        <Route path="/training/new"  element={<ProtectedRoute allowedRoles={["admin","trainer"]}><AddTrainer /></ProtectedRoute>} />

        {/* Leads */}
        <Route path="/leads"         element={<ProtectedRoute allowedRoles={["admin","trainer"]}><Leads /></ProtectedRoute>} />

        {/* Reports, Expenses & About */}
        <Route path="/reports"       element={<ProtectedRoute allowedRoles={["admin"]}><Reports /></ProtectedRoute>} />
        <Route path="/expenses"      element={<ProtectedRoute allowedRoles={["admin"]}><Expenses /></ProtectedRoute>} />
        <Route path="/about"         element={<ProtectedRoute allowedRoles={["admin","trainer","member"]}><About /></ProtectedRoute>} />

        {/* Default Route */}
        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;