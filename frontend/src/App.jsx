import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/auth/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import ChatIA from "./components/ChatIA";
import ToastContainer from "./components/shared/ToastContainer";
import ErrorBoundary from "./components/ErrorBoundary";
import { Loader2 } from "lucide-react";



// ==========================================
// LAZY LOADING DE SUB-APPS POR ROL
// ==========================================

const EstudianteApp = lazy(() => import("./pages/estudiante/EstudianteApp"));
const ProfesorApp = lazy(() => import("./pages/profesor/ProfesorApp"));
const TesoreroApp = lazy(() => import("./pages/tesorero/TesoreroApp"));
const DirectorApp = lazy(() => import("./pages/director/DirectorApp"));
const CoordinadorApp = lazy(() => import("./pages/coordinador/CoordinadorApp"));
const SecretariaApp = lazy(() => import("./pages/secretaria/SecretariaApp"));

// ==========================================
// LOADING FALLBACK
// ==========================================
const LoadingFallback = () => (
  <div className="flex h-screen items-center justify-center">
    <Loader2 className="animate-spin text-indigo-600" size={48} />
  </div>
);

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
function App() {
  const auth = useAuth(); 

  
  if (!auth || auth.loading) {
    return <LoadingFallback />;
  }

  const { user } = auth;

  return (
    <ErrorBoundary>
    <Router>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* LOGIN */}
          <Route path="/login" element={<Login />} />

          {/* ESTUDIANTE - Sub-App completa */}
          <Route
            path="/estudiante/*"
            element={
              <ProtectedRoute allowedRoles={['estudiante']}>
                <EstudianteApp />
              </ProtectedRoute>
            }
          />

          {/* PROFESOR - Sub-App completa */}
          <Route
            path="/profesor/*"
            element={
              <ProtectedRoute allowedRoles={['profesor', 'director', 'coordinador']}>
                <ProfesorApp />
              </ProtectedRoute>
            }
          />

          {/* TESORERO - Sub-App completa */}
          <Route
            path="/tesorero/*"
            element={
              <ProtectedRoute allowedRoles={['tesorero', 'director']}>
                <TesoreroApp />
              </ProtectedRoute>
            }
          />

          {/* DIRECTOR - Sub-App completa */}
          <Route
            path="/director/*"
            element={
              <ProtectedRoute allowedRoles={['director', 'admin']}>
                <DirectorApp />
              </ProtectedRoute>
            }
          />

          {/* COORDINADOR - Sub-App completa */}
          <Route
            path="/coordinador/*"
            element={
              <ProtectedRoute allowedRoles={['coordinador', 'director']}>
                <CoordinadorApp />
              </ProtectedRoute>
            }
          />

          <Route
            path="/secretaria/*"
            element={
              <ProtectedRoute allowedRoles={['administrativo', 'director']}>
                <SecretariaApp />
              </ProtectedRoute>
            }
          />

          {/* REDIRECT RAÍZ → DASHBOARD DEL ROL */}
          <Route 
            path="/" 
            element={<RoleDashboardRedirect user={user} />} 
          />

          {/* CATCH ALL → LOGIN */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
      
      {/* Toast notifications - fuera de Suspense para que funcione incluso si hay errores de carga */}
      <ToastContainer />
      
      {/* CHAT IA - BOTÓN FLOTANTE GLOBAL */}
      <ChatIA />
    </Router>
    </ErrorBoundary>
  );
}

/**
 * Componente helper: Redirige al dashboard según el rol del usuario
 */
const RoleDashboardRedirect = ({ user }) => {
  if (!user?.rol) return <Navigate to="/login" replace />;
  
  const dashboardPaths = {
    estudiante: '/estudiante/dashboard',
    profesor: '/profesor/dashboard',
    tesorero: '/tesorero/dashboard',
    director: '/director/dashboard',
    coordinador: '/coordinador/dashboard',
    admin: '/director/dashboard',
    administrativo: '/secretaria/dashboard'
  };
  
  const path = dashboardPaths[user.rol] || '/login';
  return <Navigate to={path} replace />;
};

export default App;