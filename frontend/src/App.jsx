import { Navigate, Route, Routes } from "react-router";
import { useAuth } from "./auth";
import Layout from "./components/Layout";
import Assignments from "./pages/Assignments";
import AuthPage from "./pages/AuthPage";
import EducatorDashboard from "./pages/EducatorDashboard";
import EssayDetail from "./pages/EssayDetail";
import Landing from "./pages/Landing";
import StudentDashboard from "./pages/StudentDashboard";
import SubmitEssay from "./pages/SubmitEssay";

// UI-side guard only; the API enforces the same roles on every request
function Protected({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/dashboard" replace />;
  return children;
}

function Dashboard() {
  const { user } = useAuth();
  return user.role === "educator" ? <EducatorDashboard /> : <StudentDashboard />;
}

export default function App() {
  const { user } = useAuth();
  const guestOnly = (page) => (user ? <Navigate to="/dashboard" replace /> : page);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={guestOnly(<Landing />)} />
        <Route path="/login" element={guestOnly(<AuthPage mode="login" />)} />
        <Route path="/register" element={guestOnly(<AuthPage mode="register" />)} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/submit" element={<Protected role="student"><SubmitEssay /></Protected>} />
        <Route path="/assignments" element={<Protected role="educator"><Assignments /></Protected>} />
        <Route path="/essays/:id" element={<Protected><EssayDetail /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
