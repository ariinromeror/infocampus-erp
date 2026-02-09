import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/auth/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./layout/MainLayout";
import ChatIA from "./components/ChatIA";  

// Dashboards por rol
import EstudianteDashboard from "./pages/dashboards/EstudianteDashboard";
import ProfesorDashboard from "./pages/dashboards/ProfesorDashboard";
import TesoreroDashboard from "./pages/dashboards/TesoreroDashboard";
import DirectorDashboard from "./pages/dashboards/DirectorDashboard";
import CoordinadorDashboard from "./pages/dashboards/CoordinadorDashboard";

// Vistas del Profesor
import ProfesorSecciones from "./pages/dashboards/ProfesorSecciones";
import GestionNotas from "./pages/dashboards/GestionNotas";

// Vistas del Tesorero
import ValidarPagos from "./pages/dashboards/ValidarPagos";
import ListaMora from "./pages/dashboards/ListaMora";

// Vistas específicas del estudiante
import MisNotas from "./pages/dashboards/MisNotas";
import Horarios from "./pages/dashboards/Horarios";
import EstadoCuenta from "./pages/dashboards/EstadoCuenta";

// Vistas adicionales
import EstudianteDetalle from "./pages/estudiante/EstudianteDetalle";
import MallaCurricular from "./pages/admin/MallaCurricular";

const DashboardRouter = () => {
  const { user } = useAuth();

  switch (user?.rol) {
    case 'estudiante':
      return <EstudianteDashboard />;
    case 'profesor':
      return <ProfesorDashboard />;
    case 'tesorero':
      return <TesoreroDashboard />;
    case 'director':
      return <DirectorDashboard />;
    case 'coordinador':
      return <CoordinadorDashboard />;
    case 'administrativo':
      return <DirectorDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<DashboardRouter />} />

          <Route path="secciones" element={<ProfesorSecciones />} />
          <Route path="gestion-notas/:seccionId" element={<GestionNotas />} />

          <Route path="validar-pagos" element={<ValidarPagos />} />
          <Route path="lista-mora" element={<ListaMora />} />

          <Route path="notas" element={<MisNotas />} />
          <Route path="horarios" element={<Horarios />} />
          <Route path="estado-cuenta" element={<EstadoCuenta />} />

          <Route path="estudiante/:id" element={<EstudianteDetalle />} />
          <Route path="malla-curricular" element={<MallaCurricular />} />

          <Route index element={<Navigate to="/dashboard" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      
      {/* ✅ CHATIA - BOTÓN FLOTANTE GLOBAL */}
      <ChatIA />
    </Router>
  );
}

export default App;