"""
RUTAS DE API - INFO CAMPUS
Configuración de endpoints para el portal
✅ VERSIÓN ACTUALIZADA - Con rutas de estudiante y cerrar-ciclo
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MateriaViewSet,
    InscripcionViewSet,
    dashboard_tesoreria,
    dashboard_finanzas,
    registrar_pago_alumno,
    metricas_institucionales,
    dashboard_profesor,
    gestion_notas_seccion,
    descargar_estado_cuenta,
    login_view,
    perfil_usuario,
    detalle_estudiante,        # ✅ NUEVO: para ver datos de un estudiante
    cerrar_ciclo_lectivo,      # ✅ NUEVO: para cerrar el periodo activo
)

# El Router crea automáticamente las rutas de los ViewSets
router = DefaultRouter()
router.register(r'materias', MateriaViewSet, basename='materia')
router.register(r'inscripciones', InscripcionViewSet, basename='inscripcion')

urlpatterns = [
    # 1. Autenticación y Perfil
    path('login/', login_view, name='login'),
    path('user/me/', perfil_usuario, name='user-me'),

    # 2. Rutas Automáticas (ViewSets)
    path('', include(router.urls)),

    # 3. Dashboards de Gestión
    path('finanzas/dashboard/', dashboard_finanzas, name='dashboard-finanzas'),
    path('finanzas/tesoreria/', dashboard_tesoreria, name='dashboard-tesoreria'),
    path('finanzas/registrar-pago/<int:usuario_id>/', registrar_pago_alumno, name='registrar-pago'),
    path('institucional/dashboard/', metricas_institucionales, name='dashboard-institucional'),
    path('profesor/dashboard/', dashboard_profesor, name='dashboard-profesor'),

    # 4. Gestión de notas por sección
    path('profesor/seccion/<int:seccion_id>/notas/', gestion_notas_seccion, name='gestion-notas-seccion'),

    # 5. Reportes y Documentos
    path('finanzas/estado-cuenta/', descargar_estado_cuenta, name='descargar-estado-cuenta'),

    # 6. ✅ NUEVAS RUTAS
    # Cuando el frontend hace GET /api/estudiante/5/ → llama a detalle_estudiante con estudiante_id=5
    path('estudiante/<int:estudiante_id>/', detalle_estudiante, name='detalle-estudiante'),
    # Cuando el frontend hace POST /api/institucional/cerrar-ciclo/ → llama a cerrar_ciclo_lectivo
    path('institucional/cerrar-ciclo/', cerrar_ciclo_lectivo, name='cerrar-ciclo'),
]