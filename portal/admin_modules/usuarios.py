"""
MÓDULO: Gestión de Usuarios y RBAC
Administración de usuarios, roles, becas y convenios de pago
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib import messages
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from portal.models import Usuario
from .tesoreria import InscripcionInline


@admin.register(Usuario)
class UsuarioAdmin(BaseUserAdmin):
    """
    Administración completa de usuarios del sistema
    Incluye: RBAC, becas, convenios de pago, historial académico
    """
    
    # ==================== CONFIGURACIÓN BÁSICA ====================
    
    inlines = [InscripcionInline]
    
    list_display = (
        'username', 
        'get_nombre_completo', 
        'rol', 
        'carrera', 
        'get_estado_mora', 
        'get_deuda',
        'get_convenio_activo'
    )
    
    list_filter = (
        'rol', 
        'carrera', 
        'es_becado', 
        'convenio_activo',
        'is_staff', 
        'is_active'
    )
    
    search_fields = (
        'username', 
        'first_name', 
        'last_name', 
        'dni', 
        'email'
    )
    
    ordering = ('username',)
    
    # ==================== ACCIONES MASIVAS ====================
    
    actions = [
        'establecer_convenio_pago',
        'renovar_convenio',
        'cancelar_convenio',
        'activar_usuarios',
        'desactivar_usuarios'
    ]
    
    def establecer_convenio_pago(self, request, queryset):
        """Establece convenio de pago por 30 días"""
        if request.user.rol not in ['tesorero', 'director']:
            self.message_user(
                request, 
                "❌ Solo tesoreros y directores pueden establecer convenios", 
                messages.ERROR
            )
            return
        
        estudiantes = queryset.filter(rol='estudiante')
        if not estudiantes.exists():
            self.message_user(
                request, 
                "❌ Selecciona al menos un estudiante", 
                messages.ERROR
            )
            return
        
        fecha_limite = timezone.now().date() + timedelta(days=30)
        contador = 0
        
        for estudiante in estudiantes:
            estudiante.convenio_activo = True
            estudiante.fecha_limite_convenio = fecha_limite
            estudiante.comprobante_convenio = f"CONV-{estudiante.id}-{timezone.now().strftime('%Y%m%d')}"
            estudiante.save()
            contador += 1
        
        self.message_user(
            request,
            f"✅ Convenio establecido para {contador} estudiante(s) hasta {fecha_limite}",
            messages.SUCCESS
        )
    
    establecer_convenio_pago.short_description = "💰 Establecer Convenio (30 días)"
    
    def renovar_convenio(self, request, queryset):
        """Renueva convenio existente por 30 días más"""
        if request.user.rol not in ['tesorero', 'director']:
            self.message_user(request, "❌ Sin permisos", messages.ERROR)
            return
        
        estudiantes = queryset.filter(rol='estudiante', convenio_activo=True)
        if not estudiantes.exists():
            self.message_user(request, "❌ Ningún estudiante tiene convenio activo", messages.WARNING)
            return
        
        contador = 0
        for estudiante in estudiantes:
            nueva_fecha = timezone.now().date() + timedelta(days=30)
            estudiante.fecha_limite_convenio = nueva_fecha
            estudiante.save()
            contador += 1
        
        self.message_user(
            request,
            f"✅ Convenio renovado para {contador} estudiante(s)",
            messages.SUCCESS
        )
    
    renovar_convenio.short_description = "🔄 Renovar Convenio (30 días más)"
    
    def cancelar_convenio(self, request, queryset):
        """Cancela convenios activos"""
        if request.user.rol not in ['tesorero', 'director']:
            self.message_user(request, "❌ Sin permisos", messages.ERROR)
            return
        
        estudiantes = queryset.filter(rol='estudiante', convenio_activo=True)
        contador = estudiantes.count()
        
        estudiantes.update(
            convenio_activo=False,
            fecha_limite_convenio=None
        )
        
        self.message_user(
            request,
            f"✅ Convenio cancelado para {contador} estudiante(s)",
            messages.SUCCESS
        )
    
    cancelar_convenio.short_description = "❌ Cancelar Convenio"
    
    def activar_usuarios(self, request, queryset):
        """Activa usuarios seleccionados"""
        if not request.user.is_superuser:
            self.message_user(request, "❌ Solo superusuarios", messages.ERROR)
            return
        
        contador = queryset.update(is_active=True)
        self.message_user(request, f"✅ {contador} usuario(s) activado(s)", messages.SUCCESS)
    
    activar_usuarios.short_description = "✅ Activar Usuarios"
    
    def desactivar_usuarios(self, request, queryset):
        """Desactiva usuarios seleccionados"""
        if not request.user.is_superuser:
            self.message_user(request, "❌ Solo superusuarios", messages.ERROR)
            return
        
        contador = queryset.update(is_active=False)
        self.message_user(request, f"✅ {contador} usuario(s) desactivado(s)", messages.SUCCESS)
    
    desactivar_usuarios.short_description = "🚫 Desactivar Usuarios"
    
    # ==================== MÉTODOS DE DISPLAY ====================
    
    def get_nombre_completo(self, obj):
        """Retorna nombre completo o username"""
        nombre = f"{obj.first_name} {obj.last_name}".strip()
        return nombre if nombre else obj.username
    
    get_nombre_completo.short_description = 'Nombre Completo'
    get_nombre_completo.admin_order_field = 'first_name'
    
    def get_estado_mora(self, obj):
        """Muestra estado financiero del estudiante"""
        if obj.rol != 'estudiante':
            return "-"
        
        # Verificar convenio vigente
        if obj.convenio_activo and obj.fecha_limite_convenio:
            if obj.fecha_limite_convenio >= timezone.now().date():
                return "🤝 CONVENIO"
        
        # Verificar mora
        try:
            if obj.en_mora:
                return "🔴 MORA"
            return "✅ AL DÍA"
        except Exception:
            return "⚠️ ERROR"
    
    get_estado_mora.short_description = 'Estado'
    
    def get_deuda(self, obj):
        """Muestra deuda total del estudiante"""
        if obj.rol != 'estudiante':
            return '-'
        
        try:
            deuda = obj.deuda_total
            if deuda > 0:
                return f"${deuda:.2f}"
            return "$0.00"
        except Exception:
            return "⚠️"
    
    get_deuda.short_description = 'Deuda Total'
    get_deuda.admin_order_field = 'deuda_total'
    
    def get_convenio_activo(self, obj):
        """Muestra si tiene convenio y hasta cuándo"""
        if obj.rol != 'estudiante':
            return '-'
        
        if obj.convenio_activo and obj.fecha_limite_convenio:
            fecha = obj.fecha_limite_convenio.strftime('%d/%m/%Y')
            
            # Verificar si está vencido
            if obj.fecha_limite_convenio < timezone.now().date():
                return f"⚠️ Vencido ({fecha})"
            
            # Calcular días restantes
            dias_restantes = (obj.fecha_limite_convenio - timezone.now().date()).days
            return f"✅ {dias_restantes} días"
        
        return '-'
    
    get_convenio_activo.short_description = 'Convenio'
    
    # ==================== FIELDSETS ====================
    
    fieldsets = (
        ('🔐 Credenciales', {
            'fields': ('username', 'password')
        }),
        ('👤 Información Personal', {
            'fields': ('first_name', 'last_name', 'email', 'dni')
        }),
        ('🎓 Rol y Carrera', {
            'fields': ('rol', 'carrera'),
            'description': 'Define el rol del usuario en el sistema'
        }),
        ('💰 Sistema de Becas', {
            'fields': ('es_becado', 'porcentaje_beca'),
            'classes': ('collapse',),
            'description': 'Configuración de descuentos por beca'
        }),
        ('🤝 Convenio de Pago', {
            'fields': ('convenio_activo', 'fecha_limite_convenio', 'comprobante_convenio'),
            'classes': ('collapse',),
            'description': 'Convenios especiales para estudiantes con dificultades de pago'
        }),
        ('🔧 Permisos del Sistema', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
            'classes': ('collapse',),
        }),
        ('📅 Fechas', {
            'fields': ('last_login', 'date_joined'),
            'classes': ('collapse',),
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'password1', 'password2', 'rol', 'carrera'),
        }),
    )
    
    # ==================== PERMISOS ====================
    
    def get_readonly_fields(self, request, obj=None):
        """Define campos de solo lectura según el rol"""
        if request.user.is_superuser:
            return []
        
        readonly = ['date_joined', 'last_login']
        
        if request.user.rol not in ['director', 'tesorero']:
            readonly.extend(['convenio_activo', 'fecha_limite_convenio', 'comprobante_convenio'])
        
        return readonly
    
    def get_queryset(self, request):
        """Filtra usuarios según el rol del usuario logueado"""
        qs = super().get_queryset(request)
        
        if request.user.is_superuser:
            return qs
        
        if request.user.rol == 'coordinador':
            # Coordinador solo ve usuarios de su carrera
            if request.user.carrera:
                return qs.filter(carrera=request.user.carrera)
        
        return qs