import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import UniversalSidebar from '../../components/UniversalSidebar';
import Dashboard from './pages/Dashboard';
import SeccionesPage from './pages/SeccionesPage';
import SeccionDetallePage from './pages/SeccionDetallePage';
import AsistenciaPage from './pages/AsistenciaPage';
import EvaluacionesPage from './pages/EvaluacionesPage';
import LibroCalificacionesPage from './pages/LibroCalificacionesPage';
import AnaliticasPage from './pages/AnaliticasPage';
import AsistenciaHistoricaPage from './pages/AsistenciaHistoricaPage';
import PerfilAlumnoPage from './pages/PerfilAlumnoPage';

const ProfesorApp = () => {
  return (
    <MainLayout sidebar={<UniversalSidebar role="profesor" />}>
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="secciones" element={<SeccionesPage />} />
        <Route path="secciones/:seccionId" element={<SeccionDetallePage />} />
        <Route path="asistencia" element={<AsistenciaPage />} />
        <Route path="evaluaciones" element={<EvaluacionesPage />} />
        <Route path="libro" element={<LibroCalificacionesPage />} />
        <Route path="analiticas" element={<AnaliticasPage />} />
        <Route path="asistencia-historica" element={<AsistenciaHistoricaPage />} />
        <Route path="alumnos" element={<PerfilAlumnoPage />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </MainLayout>
  );
};

export default ProfesorApp;
