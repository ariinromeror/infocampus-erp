import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import UniversalSidebar from '../../components/UniversalSidebar';
import SecretariaDashboard from './SecretariaDashboard';
import SecretariaEstudiantesPage from './SecretariaEstudiantesPage';
import SecretariaInscripcionesPage from './SecretariaInscripcionesPage';
import SecretariaSeccionesPage from './SecretariaSeccionesPage';
import SecretariaPrimeraMatriculaPage from './SecretariaPrimeraMatriculaPage';
import SecretariaMallasPage from './SecretariaMallasPage';
import SecretariaReinscripcionPage from './SecretariaReinscripcionPage';

const SecretariaApp = () => {
  return (
    <MainLayout sidebar={<UniversalSidebar role="secretaria" />}>
      <Routes>
        <Route path="/"                  element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"          element={<SecretariaDashboard />} />
        <Route path="estudiantes"        element={<SecretariaEstudiantesPage />} />
        <Route path="inscripciones"       element={<SecretariaInscripcionesPage />} />
        <Route path="primera-matricula"   element={<SecretariaPrimeraMatriculaPage />} />
        <Route path="reinscripcion"      element={<SecretariaReinscripcionPage />} />
        <Route path="secciones"          element={<SecretariaSeccionesPage />} />
        <Route path="mallas"             element={<SecretariaMallasPage />} />
        <Route path="*"                  element={<Navigate to="dashboard" replace />} />
      </Routes>
    </MainLayout>
  );
};

export default SecretariaApp;
