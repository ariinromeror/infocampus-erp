import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout       from '../../layouts/MainLayout';
import UniversalSidebar from '../../components/UniversalSidebar';

// ── PROPIAS ──────────────────────────────────────────────────────
import Dashboard          from './pages/Dashboard';
import SeccionesPage      from './pages/SeccionesPage';
import PeriodosPage       from './pages/PeriodosPage';
import EstudiantesPage    from './pages/EstudiantesPage';
import UsuariosPage       from './pages/UsuariosPage';
import ProfesoresPage     from './pages/ProfesoresPage';
import ReportesPage       from './pages/ReportesPage';
import EstadisticasPage   from './pages/EstadisticasPage';
import PerfilEstudiantePage from './pages/PerfilEstudiantePage';
import RendimientoProfesorPage from './pages/RendimientoProfesorPage';
import ConfiguracionPage  from './pages/ConfiguracionPage';
import AuditoriaNotasPage from './pages/AuditoriaNotasPage';

// ── DE COORDINADOR ────────────────────────────────────────────────
import CarrerasPage      from '../coordinador/pages/CarrerasPage';
import MateriasPage      from '../coordinador/pages/MateriasPage';
import HorariosPage      from '../coordinador/pages/HorariosPage';
import InscripcionesPage from '../coordinador/pages/InscripcionesPage';
import NotasPage         from '../coordinador/pages/NotasPage';
import BecasPage         from '../coordinador/pages/BecasPage';

// ── DE TESORERO ───────────────────────────────────────────────────
import TesoreroCobrarPage   from '../tesorero/pages/TesoreroCobrarPage';
import TesoreroMoraPage     from '../tesorero/pages/TesoreroMoraPage';
import TesoreroPagosPage    from '../tesorero/pages/TesoreroPagosPage';
import TesoreroIngresosPage from '../tesorero/pages/TesoreroIngresosPage';
import ConveniosPage        from '../tesorero/pages/ConveniosPage';
import TarifasPage          from '../tesorero/pages/TarifasPage';
import EstadosCuentaPage    from '../tesorero/pages/EstadosCuentaPage';
import CertificadosPage     from '../tesorero/pages/CertificadosPage';

const DirectorApp = () => (
  <MainLayout sidebar={<UniversalSidebar role="director" />}>
    <Routes>
      <Route path="/"                   element={<Navigate to="dashboard" replace />} />

      {/* ── PRINCIPAL ── */}
      <Route path="dashboard"           element={<Dashboard />} />
      <Route path="estadisticas"        element={<EstadisticasPage />} />

      {/* ── ACADÉMICO ── */}
      <Route path="periodos"            element={<PeriodosPage />} />
      <Route path="carreras"            element={<CarrerasPage />} />
      <Route path="materias"            element={<MateriasPage />} />
      <Route path="secciones"           element={<SeccionesPage />} />
      <Route path="horarios"            element={<HorariosPage />} />
      <Route path="inscripciones"       element={<InscripcionesPage />} />
      <Route path="notas"               element={<NotasPage />} />

      {/* ── PERSONAS ── */}
      <Route path="estudiantes"         element={<EstudiantesPage />} />
      <Route path="estudiantes/:id"     element={<PerfilEstudiantePage />} />
      <Route path="profesores"          element={<ProfesoresPage />} />
      <Route path="profesores/:id"      element={<RendimientoProfesorPage />} />
      <Route path="usuarios"            element={<UsuariosPage />} />

      {/* ── FINANZAS ── */}
      <Route path="cobrar"              element={<TesoreroCobrarPage />} />
      <Route path="mora"                element={<TesoreroMoraPage />} />
      <Route path="pagos"               element={<TesoreroPagosPage />} />
      <Route path="ingresos"            element={<TesoreroIngresosPage />} />
      <Route path="becas"               element={<BecasPage />} />
      <Route path="convenios"           element={<ConveniosPage />} />
      <Route path="tarifas"             element={<TarifasPage />} />

      {/* ── REPORTES & DOCS ── */}
      <Route path="reportes"            element={<ReportesPage />} />
      <Route path="estados-cuenta"      element={<EstadosCuentaPage />} />
      <Route path="certificados"        element={<CertificadosPage />} />

      {/* ── SISTEMA ── */}
      <Route path="auditoria"           element={<AuditoriaNotasPage />} />
      <Route path="configuracion"       element={<ConfiguracionPage />} />

      <Route path="*"                   element={<Navigate to="dashboard" replace />} />
    </Routes>
  </MainLayout>
);

export default DirectorApp;