"""
MÓDULO: Gestión Académica
Administración de carreras, materias, períodos lectivos y secciones
"""

from django.contrib import admin
from django.contrib import messages
from django.db.models import Count, Q
from portal.models import Carrera, Materia, PeriodoLectivo, Seccion


@admin.register(Carrera)
class CarreraAdmin(admin.ModelAdmin):
    """
    Administración de Carreras Universitarias
    Gestiona programas académicos y configuración financiera
    """
    
    list_display = (
        'codigo', 
        'nombre', 
        'precio_credito', 
        'dias_gracia_pago',
        'get_total_estudiantes',
        'get_total_materias'
    )
    
    list_filter = ('activo',)
    
    search_fields = ('nombre', 'codigo')
    
    ordering = ('codigo',)
    
    actions = ['activar_carreras', 'desactivar_carreras']
    
    fieldsets = (
        ('📚 Información Básica', {
            'fields': ('nombre', 'codigo', 'duracion_semestres')
        }),
        ('💰 Configuración Financiera', {
            'fields': ('precio_credito', 'dias_gracia_pago'),
            'description': 'Define el costo por crédito y período de gracia para pagos'
        }),
        ('⚙️ Estado', {
            'fields': ('activo',),
            'classes': ('collapse',)
        }),
    )
    
    # ==================== ACCIONES ====================
    
    def activar_carreras(self, request, queryset):
        """Activa carreras seleccionadas"""
        contador = queryset.update(activo=True)
        self.message_user(request, f"✅ {contador} carrera(s) activada(s)", messages.SUCCESS)
    
    activar_carreras.short_description = "✅ Activar Carreras"
    
    def desactivar_carreras(self, request, queryset):
        """Desactiva carreras seleccionadas"""
        contador = queryset.update(activo=False)
        self.message_user(request, f"🚫 {contador} carrera(s) desactivada(s)", messages.SUCCESS)
    
    desactivar_carreras.short_description = "🚫 Desactivar Carreras"
    
    # ==================== MÉTODOS DE DISPLAY ====================
    
    def get_total_estudiantes(self, obj):
        """Cuenta estudiantes activos en la carrera"""
        from portal.models import Usuario
        total = Usuario.objects.filter(carrera=obj, rol='estudiante', is_active=True).count()
        return f"👥 {total}"
    
    get_total_estudiantes.short_description = 'Estudiantes'
    
    def get_total_materias(self, obj):
        """Cuenta materias de la malla curricular"""
        total = obj.materias.filter(activo=True).count()
        return f"📖 {total}"
    
    get_total_materias.short_description = 'Materias'


@admin.register(Materia)
class MateriaAdmin(admin.ModelAdmin):
    """
    Administración de Materias
    Gestiona la malla curricular y prerequisitos
    """
    
    list_display = (
        'codigo', 
        'nombre', 
        'carrera', 
        'semestre', 
        'creditos', 
        'get_prerequisito',
        'get_total_secciones'
    )
    
    list_filter = (
        'carrera', 
        'semestre', 
        'creditos',
        'activo'
    )
    
    search_fields = ('nombre', 'codigo')
    
    ordering = ('carrera', 'semestre', 'codigo')
    
    actions = ['activar_materias', 'desactivar_materias', 'clonar_materias']
    
    fieldsets = (
        ('📖 Información Básica', {
            'fields': ('codigo', 'nombre', 'carrera')
        }),
        ('🎓 Configuración Académica', {
            'fields': ('semestre', 'creditos', 'prerequisito'),
            'description': 'Semestre: nivel donde se cursa | Créditos: peso académico | Prerequisito: materia requerida'
        }),
        ('⚙️ Estado', {
            'fields': ('activo',),
            'classes': ('collapse',)
        }),
    )
    
    # ==================== ACCIONES ====================
    
    def activar_materias(self, request, queryset):
        """Activa materias seleccionadas"""
        contador = queryset.update(activo=True)
        self.message_user(request, f"✅ {contador} materia(s) activada(s)", messages.SUCCESS)
    
    activar_materias.short_description = "✅ Activar Materias"
    
    def desactivar_materias(self, request, queryset):
        """Desactiva materias seleccionadas"""
        contador = queryset.update(activo=False)
        self.message_user(request, f"🚫 {contador} materia(s) desactivada(s)", messages.SUCCESS)
    
    desactivar_materias.short_description = "🚫 Desactivar Materias"
    
    def clonar_materias(self, request, queryset):
        """Clona materias para otra carrera (útil para mallas similares)"""
        # Esta acción requeriría un formulario intermedio
        self.message_user(
            request, 
            "⚠️ Funcionalidad en desarrollo - Contacta al administrador", 
            messages.WARNING
        )
    
    clonar_materias.short_description = "📋 Clonar Materias"
    
    # ==================== MÉTODOS DE DISPLAY ====================
    
    def get_prerequisito(self, obj):
        """Muestra código del prerequisito"""
        if obj.prerequisito:
            return f"📌 {obj.prerequisito.codigo}"
        return '-'
    
    get_prerequisito.short_description = 'Prerequisito'
    
    def get_total_secciones(self, obj):
        """Cuenta secciones activas de la materia"""
        total = obj.secciones.count()
        return f"🏫 {total}"
    
    get_total_secciones.short_description = 'Secciones'


@admin.register(PeriodoLectivo)
class PeriodoAdmin(admin.ModelAdmin):
    """
    Administración de Períodos Lectivos
    Gestiona semestres y ciclos académicos
    """
    
    list_display = (
        'codigo', 
        'nombre', 
        'fecha_inicio', 
        'fecha_fin', 
        'activo',
        'get_total_secciones',
        'get_total_inscripciones'
    )
    
    list_filter = ('activo',)
    
    search_fields = ('codigo', 'nombre')
    
    ordering = ('-codigo',)
    
    actions = ['activar_periodo', 'cerrar_periodo']
    
    fieldsets = (
        ('📅 Información del Período', {
            'fields': ('codigo', 'nombre')
        }),
        ('🗓️ Fechas', {
            'fields': ('fecha_inicio', 'fecha_fin'),
            'description': 'Define el rango de fechas del período lectivo'
        }),
        ('⚙️ Estado', {
            'fields': ('activo',),
            'description': '⚠️ Solo puede haber un período activo a la vez'
        }),
    )
    
    # ==================== ACCIONES ====================
    
    def activar_periodo(self, request, queryset):
        """Activa un período (desactiva automáticamente otros)"""
        if queryset.count() > 1:
            self.message_user(
                request, 
                "❌ Solo puedes activar un período a la vez", 
                messages.ERROR
            )
            return
        
        # Desactivar todos los períodos
        PeriodoLectivo.objects.all().update(activo=False)
        
        # Activar el seleccionado
        periodo = queryset.first()
        periodo.activo = True
        periodo.save()
        
        self.message_user(
            request, 
            f"✅ Período {periodo.codigo} activado", 
            messages.SUCCESS
        )
    
    activar_periodo.short_description = "✅ Activar Período (desactiva otros)"
    
    def cerrar_periodo(self, request, queryset):
        """Cierra períodos seleccionados"""
        contador = queryset.update(activo=False)
        self.message_user(
            request, 
            f"🔒 {contador} período(s) cerrado(s)", 
            messages.SUCCESS
        )
    
    cerrar_periodo.short_description = "🔒 Cerrar Período"
    
    # ==================== MÉTODOS DE DISPLAY ====================
    
    def get_total_secciones(self, obj):
        """Cuenta secciones del período"""
        total = obj.secciones.count()
        return f"🏫 {total}"
    
    get_total_secciones.short_description = 'Secciones'
    
    def get_total_inscripciones(self, obj):
        """Cuenta inscripciones del período"""
        from portal.models import Inscripcion
        total = Inscripcion.objects.filter(seccion__periodo=obj).count()
        return f"👥 {total}"
    
    get_total_inscripciones.short_description = 'Inscripciones'


@admin.register(Seccion)
class SeccionAdmin(admin.ModelAdmin):
    """
    Administración de Secciones
    Gestiona clases, horarios y profesores
    """
    
    list_display = (
        'codigo_seccion', 
        'materia', 
        'profesor', 
        'periodo',
        'get_horario',
        'get_cupo',
        'get_inscritos'
    )
    
    list_filter = (
        'periodo', 
        'materia__carrera',
        'dia'
    )
    
    search_fields = (
        'codigo_seccion', 
        'materia__nombre',
        'profesor__username',
        'aula'
    )
    
    ordering = ('-periodo', 'materia', 'codigo_seccion')
    
    actions = ['duplicar_secciones']
    
    fieldsets = (
        ('🏫 Configuración de la Sección', {
            'fields': ('codigo_seccion', 'materia', 'periodo')
        }),
        ('👨‍🏫 Asignación', {
            'fields': ('profesor',),
            'description': 'Profesor encargado de la sección'
        }),
        ('🕐 Horario', {
            'fields': ('dia', 'hora_inicio', 'hora_fin', 'aula'),
            'description': 'Define el horario de clases'
        }),
        ('👥 Cupo', {
            'fields': ('cupo_maximo',),
            'description': 'Número máximo de estudiantes'
        }),
    )
    
    # ==================== ACCIONES ====================
    
    def duplicar_secciones(self, request, queryset):
        """Duplica secciones para otro período"""
        self.message_user(
            request, 
            "⚠️ Funcionalidad en desarrollo", 
            messages.WARNING
        )
    
    duplicar_secciones.short_description = "📋 Duplicar para otro período"
    
    # ==================== MÉTODOS DE DISPLAY ====================
    
    def get_horario(self, obj):
        """Muestra horario completo"""
        return f"{obj.get_dia_display()} {obj.hora_inicio.strftime('%H:%M')}-{obj.hora_fin.strftime('%H:%M')}"
    
    get_horario.short_description = 'Horario'
    
    def get_cupo(self, obj):
        """Muestra cupo máximo"""
        return f"🪑 {obj.cupo_maximo}"
    
    get_cupo.short_description = 'Cupo'
    
    def get_inscritos(self, obj):
        """Muestra inscritos vs disponibles"""
        inscritos = obj.inscripciones.count()
        disponible = obj.cupo_maximo - inscritos
        
        if disponible <= 0:
            return f"🔴 {inscritos}/{obj.cupo_maximo} (LLENO)"
        elif disponible <= 5:
            return f"🟡 {inscritos}/{obj.cupo_maximo}"
        else:
            return f"🟢 {inscritos}/{obj.cupo_maximo}"
    
    get_inscritos.short_description = 'Inscritos'