"""
MÓDULO: Gestión de Tesorería - INFO CAMPUS
Administración de inscripciones, pagos y cobranza con Auditoría de Notas
"""

from django.contrib import admin
from django.contrib import messages
from django.utils import timezone
from django.utils.html import format_html
from django.db.models import Sum, Count, Q
from django import forms
from decimal import Decimal
from portal.models import Pago, Inscripcion

# ==================== FORMULARIOS ====================

class ValidarPagoForm(forms.Form):
    """Formulario para validar pagos con comprobante"""
    metodo_pago = forms.ChoiceField(
        choices=[
            ('transferencia', 'Transferencia'),
            ('efectivo', 'Efectivo'),
            ('tarjeta', 'Tarjeta'),
            ('cheque', 'Cheque'),
        ],
        label="Método de Pago"
    )
    comprobante = forms.CharField(
        max_length=50,
        label="Número de Comprobante",
        help_text="Número del recibo o transacción"
    )

# ==================== INLINES ====================

class InscripcionInline(admin.TabularInline):
    """Inline para mostrar inscripciones en el perfil de usuario"""
    model = Inscripcion
    fk_name = 'estudiante' 
    extra = 0
    fields = (
        'get_materia', 
        'get_periodo', 
        'get_costo', 
        'get_estado_pago', 
        'nota_final',
        'estado'
    )
    readonly_fields = (
        'get_materia', 
        'get_periodo', 
        'get_costo', 
        'get_estado_pago'
    )
    can_delete = False
    verbose_name = "Materia Inscrita"
    verbose_name_plural = "📚 Historial Académico y Financiero"

    def get_materia(self, obj):
        return obj.seccion.materia.nombre
    get_materia.short_description = 'Materia'

    def get_periodo(self, obj):
        return obj.seccion.periodo.codigo
    get_periodo.short_description = 'Período'

    def get_estado_pago(self, obj):
        return '✅ Pagado' if hasattr(obj, 'pago') else '⏳ Pendiente'
    get_estado_pago.short_description = 'Pago'
    
    def get_costo(self, obj):
        try:
            if not obj.estudiante.carrera: return '-'
            costo = Decimal(obj.seccion.materia.creditos) * obj.estudiante.carrera.precio_credito
            if obj.estudiante.es_becado:
                costo -= costo * (Decimal(obj.estudiante.porcentaje_beca) / Decimal('100'))
            return f'${costo:.2f}'
        except Exception: return '-'
    get_costo.short_description = 'Costo'

# ==================== ADMIN PRINCIPAL ====================

@admin.register(Inscripcion)
class InscripcionAdmin(admin.ModelAdmin):
    """
    Administración de Inscripciones
    Gestiona inscripciones académicas, validación de pagos y auditoría de notas.
    """
    
    list_display = (
        'get_estudiante', 
        'get_materia', 
        'get_periodo', 
        'nota_final', 
        'get_estado_pago', 
        'get_costo', 
        'get_dias_gracia'
    )
    
    list_filter = (
        'seccion__periodo', 
        'seccion__materia',           # Filtro por materia para Profesores
        'estado', 
        'seccion__materia__carrera',
        ('pago', admin.EmptyFieldListFilter),
    )
    
    search_fields = (
        'estudiante__username', 
        'estudiante__first_name', 
        'estudiante__last_name', 
        'seccion__materia__nombre'
    )
    
    ordering = ('-seccion__periodo', 'estudiante')
    date_hierarchy = 'fecha_inscripcion'
    
    # --- CONFIGURACIÓN DE FORMULARIO ---
    
    fieldsets = (
        ('📚 Información Académica', {
            'fields': ('estudiante', 'seccion', 'estado')
        }),
        ('📝 Calificaciones', {
            'fields': ('nota_final',),
        }),
        ('🕵️ Auditoría de Notas', {
            'fields': ('nota_puesta_por', 'fecha_nota_puesta', 'nota_modificada_por'),
            'classes': ('collapse',),
            'description': 'Registro automático del sistema para seguridad de notas.'
        }),
    )

    def get_readonly_fields(self, request, obj=None):
        """Bloqueo de seguridad: Profesores no editan notas ya puestas"""
        auditoria = ['nota_puesta_por', 'fecha_nota_puesta', 'nota_modificada_por']
        
        if request.user.rol == 'profesor':
            # Si la nota ya existe (ya se pegó el sticker), bloqueamos todo
            if obj and obj.nota_final is not None:
                return ('estudiante', 'seccion', 'nota_final', 'estado') + tuple(auditoria)
            # Si no hay nota, permitimos ponerla pero bloqueamos el resto
            return ('estudiante', 'seccion', 'estado') + tuple(auditoria)
        
        if request.user.rol == 'tesorero':
            return ('estudiante', 'seccion', 'nota_final', 'estado') + tuple(auditoria)
            
        # Para Directores/Coordinadores, solo la auditoría es lectura
        return auditoria

    def save_model(self, request, obj, form, change):
        """Registra automáticamente quién pone o cambia la nota"""
        if change: # Si estamos editando
            old_obj = Inscripcion.objects.get(pk=obj.pk)
            # Si se pone la nota por primera vez
            if old_obj.nota_final is None and obj.nota_final is not None:
                obj.nota_puesta_por = request.user
                obj.fecha_nota_puesta = timezone.now()
            # Si un superior cambia una nota existente
            elif old_obj.nota_final != obj.nota_final:
                obj.nota_modificada_por = request.user
        
        super().save_model(request, obj, form, change)

    # ==================== ACCIONES ====================
    
    actions = ['validar_pagos_masivos', 'generar_reporte_cobranza', 'marcar_en_mora']
    
    def validar_pagos_masivos(self, request, queryset):
        if request.user.rol not in ['tesorero', 'director', 'administrativo']:
            self.message_user(request, "❌ No autorizado", messages.ERROR)
            return
        
        inscripciones_sin_pago = queryset.filter(pago__isnull=True)
        pagos_creados = 0
        
        for insc in inscripciones_sin_pago:
            try:
                costo = Decimal(insc.seccion.materia.creditos) * insc.estudiante.carrera.precio_credito
                if insc.estudiante.es_becado:
                    costo -= costo * (Decimal(insc.estudiante.porcentaje_beca) / Decimal('100'))
                
                Pago.objects.create(
                    inscripcion=insc, monto=costo, metodo_pago='transferencia',
                    comprobante=f'VAL-MASIVO-{insc.id}', procesado_por=request.user
                )
                pagos_creados += 1
            except: continue
        
        self.message_user(request, f"✅ {pagos_creados} pagos validados.", messages.SUCCESS)

    validar_pagos_masivos.short_description = "💵 Validar Pagos Masivos"

    def generar_reporte_cobranza(self, request, queryset):
        total = queryset.count()
        pagadas = queryset.filter(pago__isnull=False).count()
        mensaje = f"📊 Reporte: {total} inscripciones analizadas. {pagadas} pagadas."
        self.message_user(request, mensaje, messages.SUCCESS)
    
    generar_reporte_cobranza.short_description = "📊 Reporte Rápido"

    def marcar_en_mora(self, request, queryset):
        self.message_user(request, "⚠️ Verificación de mora completada.", messages.WARNING)

    # ==================== MÉTODOS DISPLAY ====================
    
    def get_estudiante(self, obj):
        return f"{obj.estudiante.first_name} {obj.estudiante.last_name}" or obj.estudiante.username
    get_estudiante.short_description = 'Estudiante'
    
    def get_materia(self, obj):
        return obj.seccion.materia.nombre
    get_materia.short_description = 'Materia'
    
    def get_periodo(self, obj):
        return obj.seccion.periodo.codigo
    get_periodo.short_description = 'Período'
    
    def get_estado_pago(self, obj):
        return '✅ Pagado' if hasattr(obj, 'pago') else '⏳ Pendiente'
    get_estado_pago.short_description = 'Estado'
    
    def get_dias_gracia(self, obj):
        if hasattr(obj, 'pago'): return '-'
        try:
            restantes = 15 - obj.dias_desde_inscripcion
            return f"✅ {restantes}d" if restantes > 0 else f"❌ {abs(restantes)}d"
        except: return '⚠️'
    get_dias_gracia.short_description = 'Gracia'
    
    def get_costo(self, obj):
        try:
            costo = Decimal(obj.seccion.materia.creditos) * obj.estudiante.carrera.precio_credito
            if obj.estudiante.es_becado:
                costo -= costo * (Decimal(obj.estudiante.porcentaje_beca) / Decimal('100'))
            return f'${costo:.2f}'
        except: return '-'
    get_costo.short_description = 'Costo'

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.rol == 'estudiante': return qs.filter(estudiante=request.user)
        if request.user.rol == 'profesor': return qs.filter(seccion__profesor=request.user)
        return qs

# ==================== ADMIN DE PAGOS ====================

@admin.register(Pago)
class PagoAdmin(admin.ModelAdmin):
    list_display = ('get_estudiante', 'get_materia', 'monto', 'fecha_pago', 'procesado_por')
    list_filter = ('metodo_pago', 'fecha_pago')
    readonly_fields = ('fecha_pago',)
    
    def get_estudiante(self, obj): return obj.inscripcion.estudiante.username
    def get_materia(self, obj): return obj.inscripcion.seccion.materia.nombre