import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import UniversalSidebar from '../../components/UniversalSidebar';
import TesoreroDashboard from './TesoreroDashboard';
import TesoreroPagosPage from './pages/TesoreroPagosPage';
import TesoreroMoraPage from './pages/TesoreroMoraPage';
import TesoreroEstudiantePage from './pages/TesoreroEstudiantePage';
import TesoreroIngresosPage from './pages/TesoreroIngresosPage';
import TesoreroCobrarPage from './pages/TesoreroCobrarPage';
import ConveniosPage from './pages/ConveniosPage';
import BecasPage from './pages/BecasPage';
import TarifasPage from './pages/TarifasPage';
import ReportesPage from './pages/ReportesPage';
import EstadosCuentaPage from './pages/EstadosCuentaPage';
import CertificadosPage from './pages/CertificadosPage';

const TesoreroApp = () => (
  <MainLayout sidebar={<UniversalSidebar role="tesorero" />}>
    <Routes>
      <Route path="/" element={<Navigate to="dashboard" replace />} />
      
      {/* Menú Principal */}
      <Route path="dashboard" element={<TesoreroDashboard />} />
      <Route path="estudiante" element={<TesoreroCobrarPage />} />
      <Route path="estudiante/:estudianteId" element={<TesoreroEstudiantePage />} />
      <Route path="mora" element={<TesoreroMoraPage />} />
      <Route path="pagos" element={<TesoreroPagosPage />} />
      
      {/* Gestión */}
      <Route path="cobrar" element={<TesoreroCobrarPage />} />
      <Route path="convenios" element={<ConveniosPage />} />
      <Route path="becas" element={<BecasPage />} />
      <Route path="tarifas" element={<TarifasPage />} />
      
      {/* Reportes */}
      <Route path="ingresos" element={<TesoreroIngresosPage />} />
      <Route path="reportes" element={<ReportesPage />} />
      <Route path="estados-cuenta" element={<EstadosCuentaPage />} />
      <Route path="certificados" element={<CertificadosPage />} />
      
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  </MainLayout>
);

export default TesoreroApp;
