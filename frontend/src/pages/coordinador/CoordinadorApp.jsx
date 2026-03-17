import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import UniversalSidebar from '../../components/UniversalSidebar';
import Dashboard from './Dashboard';
import CarrerasPage from './pages/CarrerasPage';
import MateriasPage from './pages/MateriasPage';
import SeccionesPage from './pages/SeccionesPage';
import PeriodosPage from './pages/PeriodosPage';
import HorariosPage from './pages/HorariosPage';
import EstudiantesPage from './pages/EstudiantesPage';
import ProfesoresPage from './pages/ProfesoresPage';
import InscripcionesPage from './pages/InscripcionesPage';
import BecasPage from './pages/BecasPage';
import ReportesPage from './pages/ReportesPage';
import UsuariosPage from './pages/UsuariosPage';

const CoordinadorApp = () => (
  <MainLayout sidebar={<UniversalSidebar role="coordinador" />}>
    <Routes>
      <Route path="/" element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="carreras" element={<CarrerasPage />} />
      <Route path="materias" element={<MateriasPage />} />
      <Route path="secciones" element={<SeccionesPage />} />
      <Route path="periodos" element={<PeriodosPage />} />
      <Route path="horarios" element={<HorariosPage />} />
      <Route path="estudiantes" element={<EstudiantesPage />} />
      <Route path="profesores" element={<ProfesoresPage />} />
      <Route path="inscripciones" element={<InscripcionesPage />} />
      <Route path="becas" element={<BecasPage />} />
      <Route path="reportes" element={<ReportesPage />} />
      <Route path="usuarios" element={<UsuariosPage />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  </MainLayout>
);

export default CoordinadorApp;
