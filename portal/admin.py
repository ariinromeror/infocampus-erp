
from django.contrib import admin
from .admin_modules.usuarios import UsuarioAdmin
from .admin_modules.academico import (
    CarreraAdmin,
    MateriaAdmin,
    PeriodoAdmin,
    SeccionAdmin
)
from .admin_modules.tesoreria import (
    InscripcionAdmin,
    PagoAdmin
)



admin.site.site_header = "INFO CAMPUS - Sistema de Gestión Académica"
admin.site.site_title = "Portal Administrativo"
admin.site.index_title = "Panel de Control Institucional"



