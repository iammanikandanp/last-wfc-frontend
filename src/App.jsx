import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

// Pages
import Login from "./pages/Login";
import Register from "./compontes/Register";
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
import About from "./pages/About";
import Leads from "./pages/Leads";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" />;
};

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
        <Route path="/login"    element={<Login />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

        {/* Members */}
        <Route path="/register"      element={<ProtectedRoute><Register /></ProtectedRoute>} />
        <Route path="/members"       element={<ProtectedRoute><Members /></ProtectedRoute>} />
        <Route path="/members/new"   element={<ProtectedRoute><AddMember /></ProtectedRoute>} />
        <Route path="/members/:id"   element={<ProtectedRoute><MemberProfile /></ProtectedRoute>} />

        {/* Payments */}
        <Route path="/payments"      element={<ProtectedRoute><Payments /></ProtectedRoute>} />
        <Route path="/payments/new"  element={<ProtectedRoute><AddPayment /></ProtectedRoute>} />

        {/* Attendance */}
        <Route path="/attendance"    element={<ProtectedRoute><Attendance /></ProtectedRoute>} />

        {/* Diet Plans */}
        <Route path="/diet-plans"    element={<ProtectedRoute><DietPlans /></ProtectedRoute>} />
        <Route path="/diet-plans/new" element={<ProtectedRoute><AddDietPlan /></ProtectedRoute>} />

        {/* Training */}
        <Route path="/training"      element={<ProtectedRoute><Training /></ProtectedRoute>} />
        <Route path="/training/new"  element={<ProtectedRoute><AddTrainer /></ProtectedRoute>} />

        {/* Leads */}
        <Route path="/leads"         element={<ProtectedRoute><Leads /></ProtectedRoute>} />

        {/* Reports & About */}
        <Route path="/reports"       element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/about"         element={<ProtectedRoute><About /></ProtectedRoute>} />

        {/* Default Route */}
        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;