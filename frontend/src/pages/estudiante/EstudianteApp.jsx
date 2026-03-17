import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import UniversalSidebar from '../../components/UniversalSidebar';
import Dashboard from './Dashboard';
import HorarioPage from './pages/HorarioPage';
import NotasPage from './pages/NotasPage';
import EstatusPage from './pages/EstatusPage';
import AsistenciaPage from './pages/AsistenciaPage';
import EstadoCuentaPage from './pages/EstadoCuentaPage';
import MisMateriasPage from './pages/MisMateriasPage';
import EvaluacionesPage from './pages/EvaluacionesPage';
import PDFsPage from './pages/PDFsPage';

const EstudianteApp = () => {
  return (
    <MainLayout sidebar={<UniversalSidebar role="estudiante" />}>
      <Routes>
        <Route path="/"            element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"    element={<Dashboard />} />
        <Route path="horario"     element={<HorarioPage />} />
        <Route path="notas"        element={<NotasPage />} />
        <Route path="asistencia"   element={<AsistenciaPage />} />
        <Route path="materias"     element={<MisMateriasPage />} />
        <Route path="evaluaciones" element={<EvaluacionesPage />} />
        <Route path="pagos"        element={<EstadoCuentaPage />} />
        <Route path="estatus"      element={<EstatusPage />} />
        <Route path="documentos"   element={<PDFsPage />} />
        {/* Legacy redirects */}
        <Route path="estado-cuenta" element={<Navigate to="/estudiante/pagos" replace />} />
        <Route path="tareas"        element={<Navigate to="/estudiante/evaluaciones" replace />} />
        <Route path="*"            element={<Navigate to="dashboard" replace />} />
      </Routes>
    </MainLayout>
  );
};

export default EstudianteApp;
