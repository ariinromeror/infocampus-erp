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
  const { user, loading } = useAuth();

  // FIX: Prevenir rebote al login esperando a que termine el loading de AuthContext
  if (loading) return null;

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

          {/* Rutas de Profesor */}
          <Route 
            path="secciones" 
            element={
              <ProtectedRoute allowedRoles={['profesor', 'director', 'coordinador']}>
                <ProfesorSecciones />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="gestion-notas/:seccionId" 
            element={
              <ProtectedRoute allowedRoles={['profesor', 'director', 'coordinador']}>
                <GestionNotas />
              </ProtectedRoute>
            } 
          />

          {/* Rutas de Tesorería */}
          <Route 
            path="validar-pagos" 
            element={
              <ProtectedRoute allowedRoles={['tesorero', 'director']}>
                <ValidarPagos />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="lista-mora" 
            element={
              <ProtectedRoute allowedRoles={['tesorero', 'director', 'coordinador']}>
                <ListaMora />
              </ProtectedRoute>
            } 
          />

          {/* Rutas de Estudiante */}
          <Route 
            path="notas" 
            element={
              <ProtectedRoute allowedRoles={['estudiante']}>
                <MisNotas />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="horarios" 
            element={
              <ProtectedRoute allowedRoles={['estudiante']}>
                <Horarios />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="estado-cuenta" 
            element={
              <ProtectedRoute allowedRoles={['estudiante']}>
                <EstadoCuenta />
              </ProtectedRoute>
            } 
          />

          {/* Rutas de Admin/Gestión */}
          <Route 
            path="estudiante/:id" 
            element={
              <ProtectedRoute allowedRoles={['director', 'coordinador', 'tesorero', 'administrativo']}>
                <EstudianteDetalle />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="malla-curricular" 
            element={
              <ProtectedRoute allowedRoles={['director', 'coordinador', 'administrativo']}>
                <MallaCurricular />
              </ProtectedRoute>
            } 
          />

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