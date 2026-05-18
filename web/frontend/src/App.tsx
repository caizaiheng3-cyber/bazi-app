import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import SubjectListPage from "./pages/SubjectListPage";
import SubjectCreatePage from "./pages/SubjectCreatePage";
import SubjectDetailPage from "./pages/SubjectDetailPage";

function isLoggedIn(): boolean {
  return !!localStorage.getItem("token");
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/subjects" element={<ProtectedRoute><SubjectListPage /></ProtectedRoute>} />
        <Route path="/subjects/new" element={<ProtectedRoute><SubjectCreatePage /></ProtectedRoute>} />
        <Route path="/subjects/:id" element={<ProtectedRoute><SubjectDetailPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
