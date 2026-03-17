import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Role-to-dashboard mapping. Aligns with backend require_roles in auth/dependencies.py.
 * Roles: estudiante, profesor, tesorero, director, coordinador, administrativo, admin
 */
const ROLE_DASHBOARDS = {
    estudiante:    '/estudiante/dashboard',
    profesor:      '/profesor/dashboard',
    tesorero:      '/tesorero/dashboard',
    director:      '/director/dashboard',
    coordinador:   '/coordinador/dashboard',
    administrativo:'/secretaria/dashboard',
    admin:         '/director/dashboard',
};

/**
 * Protects routes by role. Redirects to login if unauthenticated,
 * or to the user's dashboard if they lack the required role.
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();

    // Mientras se restaura la sesión de localStorage, no renderizar nada.
    // Esto evita el flash de "redirigiendo a login" antes de que cargue el user.
    if (loading) return null;

    // Sin usuario → login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Rol incorrecto → redirigir al dashboard del rol del usuario
    // ANTES redirigía a "/dashboard" que no existe → bucle infinito.
    if (allowedRoles && !allowedRoles.includes(user.rol)) {
        const destino = ROLE_DASHBOARDS[user.rol] || '/login';
        return <Navigate to={destino} replace />;
    }

    return children;
};

export default ProtectedRoute;