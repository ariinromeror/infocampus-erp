"""
Módulo de Administración - INFO CAMPUS
Exportaciones centralizadas de todos los admins
"""

# ==================== MÓDULO ACADÉMICO ====================
from .academico import (
    CarreraAdmin,
    MateriaAdmin,
    PeriodoAdmin,
    SeccionAdmin
)

# ==================== MÓDULO DE TESORERÍA ====================
from .tesoreria import (
    InscripcionAdmin,
    InscripcionInline,
    PagoAdmin,
    ValidarPagoForm
)

# ==================== MÓDULO DE USUARIOS ====================
from .usuarios import (
    UsuarioAdmin
)

# ==================== EXPORTACIONES ====================
__all__ = [
    # Académico
    'CarreraAdmin',
    'MateriaAdmin',
    'PeriodoAdmin',
    'SeccionAdmin',
    
    # Tesorería
    'InscripcionAdmin',
    'InscripcionInline',
    'PagoAdmin',
    'ValidarPagoForm',
    
    # Usuarios
    'UsuarioAdmin',
]