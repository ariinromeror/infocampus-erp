"""
SISTEMA ACADÉMICO PROFESIONAL - INFO CAMPUS
Modelos optimizados con Gestión Financiera Inteligente
"""

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal


# ==================== INFRAESTRUCTURA ====================

class Carrera(models.Model):
    """
    Carreras universitarias disponibles
    """
    nombre = models.CharField(max_length=100, verbose_name="Nombre de la Carrera")
    codigo = models.CharField(max_length=10, unique=True, verbose_name="Código")
    precio_credito = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('50.00'),
        verbose_name="Precio por Crédito"
    )
    duracion_semestres = models.IntegerField(default=6, verbose_name="Duración en Semestres")
    
    # ✅ NUEVO: Días de gracia para pago
    dias_gracia_pago = models.IntegerField(
        default=15,
        verbose_name="Días de Gracia para Pago",
        help_text="Días desde la inscripción antes de entrar en mora"
    )
    
    activo = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = "Carrera"
        verbose_name_plural = "Carreras"
        ordering = ['nombre']
    
    def __str__(self):
        return f"{self.nombre} ({self.codigo})"


# ==================== USUARIOS Y RBAC ====================

class Usuario(AbstractUser):
    """
    Usuario extendido con Sistema Financiero Inteligente
    """
    ROLES = (
        ('estudiante', 'Estudiante'),
        ('profesor', 'Profesor'),
        ('coordinador', 'Coordinador'),
        ('director', 'Director'),
        ('tesorero', 'Tesorero'),
        ('administrativo', 'Administrativo'),
    )
    
    rol = models.CharField(max_length=20, choices=ROLES, default='estudiante', verbose_name="Rol del Usuario")
    dni = models.CharField(max_length=20, unique=True, null=True, blank=True, verbose_name="Cédula/DNI")
    carrera = models.ForeignKey(Carrera, on_delete=models.SET_NULL, null=True, blank=True, related_name='usuarios', verbose_name="Carrera")
    
    
    es_becado = models.BooleanField(default=False, verbose_name="¿Tiene Beca?")
    porcentaje_beca = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name="Porcentaje de Beca"
    )
    
    
    convenio_activo = models.BooleanField(
        default=False,
        verbose_name="Convenio de Pago Activo",
        help_text="Si tiene convenio, no se bloquea aunque tenga deuda"
    )
    
    fecha_limite_convenio = models.DateField(
        null=True,
        blank=True,
        verbose_name="Fecha Límite del Convenio",
        help_text="Hasta cuándo está vigente el convenio"
    )
    
    comprobante_convenio = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Número de Convenio",
        help_text="Número del documento del convenio firmado"
    )
    
    class Meta:
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"
    
    def __str__(self):
        return f"{self.username} - {self.get_rol_display()}"
    
    @property
    def nombre_completo(self):
        return f"{self.first_name} {self.last_name}".strip() or self.username
    
    @property
    def en_mora(self):
        """
        ✅ LÓGICA DE MORA INTELIGENTE
        
        Un estudiante está en mora si:
        1. Tiene inscripciones sin pagar de PERÍODOS ANTERIORES
        2. O tiene inscripciones del período actual que superaron el período de gracia
        3. EXCEPTO si tiene un convenio de pago activo y vigente
        """
        if self.rol != 'estudiante':
            return False
        
        # ✅ REGLA 1: Si tiene convenio activo y vigente, NO está en mora
        if self.convenio_activo and self.fecha_limite_convenio:
            if self.fecha_limite_convenio >= timezone.now().date():
                return False
        
        # Obtener período actual
        try:
            from .models import PeriodoLectivo
            periodo_actual = PeriodoLectivo.objects.filter(activo=True).first()
        except:
            periodo_actual = None
        
        if not periodo_actual:
            # Si no hay período activo, usar lógica simple
            return self.inscripciones.filter(pago__isnull=True).exists()
        
        # ✅ REGLA 2: Inscripciones de períodos ANTERIORES sin pagar → MORA INMEDIATA
        inscripciones_periodos_anteriores = self.inscripciones.filter(
            pago__isnull=True,
            seccion__periodo__fecha_fin__lt=periodo_actual.fecha_inicio
        )
        
        if inscripciones_periodos_anteriores.exists():
            return True
        
        # ✅ REGLA 3: Inscripciones del período ACTUAL → Verificar días de gracia
        if not self.carrera:
            return False
        
        dias_gracia = self.carrera.dias_gracia_pago
        fecha_limite_pago = timezone.now() - timedelta(days=dias_gracia)
        
        inscripciones_vencidas = self.inscripciones.filter(
            pago__isnull=True,
            seccion__periodo=periodo_actual,
            fecha_inscripcion__lt=fecha_limite_pago
        )
        
        return inscripciones_vencidas.exists()
    
    @property
    def deuda_total(self):
        """
        ✅ CÁLCULO INTELIGENTE DE DEUDA
        Solo cuenta inscripciones sin pagar
        """
        if self.rol != 'estudiante' or not self.carrera:
            return Decimal('0.00')
        
        inscripciones_pendientes = self.inscripciones.filter(pago__isnull=True)
        
        total = Decimal('0.00')
        for inscripcion in inscripciones_pendientes:
            costo_materia = Decimal(str(inscripcion.seccion.materia.creditos)) * self.carrera.precio_credito
            
            if self.es_becado:
                descuento = costo_materia * (Decimal(str(self.porcentaje_beca)) / Decimal('100'))
                costo_materia -= descuento
            
            total += costo_materia
        
        return total
    
    @property
    def deuda_vencida(self):
        """
        ✅ NUEVO: Deuda que ya superó el período de gracia
        """
        if self.rol != 'estudiante' or not self.carrera:
            return Decimal('0.00')
        
        try:
            from .models import PeriodoLectivo
            periodo_actual = PeriodoLectivo.objects.filter(activo=True).first()
        except:
            return self.deuda_total
        
        if not periodo_actual:
            return self.deuda_total
        
        dias_gracia = self.carrera.dias_gracia_pago
        fecha_limite = timezone.now() - timedelta(days=dias_gracia)
        
        # Deuda de períodos anteriores + deuda vencida del actual
        inscripciones_vencidas = self.inscripciones.filter(
            pago__isnull=True
        ).filter(
            models.Q(seccion__periodo__fecha_fin__lt=periodo_actual.fecha_inicio) |
            models.Q(seccion__periodo=periodo_actual, fecha_inscripcion__lt=fecha_limite)
        )
        
        total = Decimal('0.00')
        for insc in inscripciones_vencidas:
            costo = Decimal(str(insc.seccion.materia.creditos)) * self.carrera.precio_credito
            if self.es_becado:
                costo -= costo * (Decimal(str(self.porcentaje_beca)) / Decimal('100'))
            total += costo
        
        return total


# ==================== MALLA CURRICULAR ====================

class Materia(models.Model):
    """Materias de la malla curricular"""
    nombre = models.CharField(max_length=100, verbose_name="Nombre de la Materia")
    codigo = models.CharField(max_length=20, unique=True, verbose_name="Código")
    carrera = models.ForeignKey(Carrera, on_delete=models.CASCADE, related_name='materias', verbose_name="Carrera")
    semestre = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)], verbose_name="Semestre")
    creditos = models.IntegerField(default=3, validators=[MinValueValidator(1), MaxValueValidator(6)], verbose_name="Créditos")
    prerequisito = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='sucesores', verbose_name="Prerequisito")
    activo = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = "Materia"
        verbose_name_plural = "Materias"
        ordering = ['carrera', 'semestre', 'codigo']
        unique_together = ['carrera', 'codigo']
    
    def __str__(self):
        return f"[{self.codigo}] {self.nombre} - Sem {self.semestre}"


# ==================== GESTIÓN ACADÉMICA ====================

class PeriodoLectivo(models.Model):
    """Periodos académicos"""
    codigo = models.CharField(max_length=10, unique=True, verbose_name="Código del Periodo")
    nombre = models.CharField(max_length=50, verbose_name="Nombre")
    fecha_inicio = models.DateField(verbose_name="Fecha de Inicio")
    fecha_fin = models.DateField(verbose_name="Fecha de Fin")
    activo = models.BooleanField(default=False, verbose_name="Periodo Activo")
    
    class Meta:
        verbose_name = "Periodo Lectivo"
        verbose_name_plural = "Periodos Lectivos"
        ordering = ['-codigo']
    
    def __str__(self):
        return f"{self.nombre} ({self.codigo})"


class Seccion(models.Model):
    """Secciones de materias"""
    DIAS_SEMANA = (
        ('LU', 'Lunes'), ('MA', 'Martes'), ('MI', 'Miércoles'),
        ('JU', 'Jueves'), ('VI', 'Viernes'), ('SA', 'Sábado'),
    )
    
    materia = models.ForeignKey(Materia, on_delete=models.CASCADE, related_name='secciones', verbose_name="Materia")
    profesor = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'rol': 'profesor'}, related_name='secciones_dictadas', verbose_name="Profesor")
    periodo = models.ForeignKey(PeriodoLectivo, on_delete=models.CASCADE, related_name='secciones', verbose_name="Periodo Lectivo")
    codigo_seccion = models.CharField(max_length=5, verbose_name="Código de Sección")
    dia = models.CharField(max_length=2, choices=DIAS_SEMANA, verbose_name="Día de la Semana")
    hora_inicio = models.TimeField(verbose_name="Hora de Inicio")
    hora_fin = models.TimeField(verbose_name="Hora de Fin")
    aula = models.CharField(max_length=20, verbose_name="Aula")
    cupo_maximo = models.IntegerField(default=30, verbose_name="Cupo Máximo")
    
    class Meta:
        verbose_name = "Sección"
        verbose_name_plural = "Secciones"
        ordering = ['periodo', 'materia', 'codigo_seccion']
        unique_together = ['materia', 'periodo', 'codigo_seccion']
    
    def __str__(self):
        return f"{self.materia.codigo} - Sec {self.codigo_seccion} - {self.periodo.codigo}"
    
    @property
    def cupo_disponible(self):
        return self.cupo_maximo - self.inscripciones.count()
    
    @property
    def horario_str(self):
        return f"{self.get_dia_display()} {self.hora_inicio.strftime('%H:%M')}-{self.hora_fin.strftime('%H:%M')}"


class Inscripcion(models.Model):
    """Inscripciones de estudiantes"""
    ESTADOS = (
        ('inscrito', 'Inscrito'),
        ('aprobado', 'Aprobado'),
        ('reprobado', 'Reprobado'),
        ('retirado', 'Retirado'),
    )
    
    estudiante = models.ForeignKey(Usuario, on_delete=models.CASCADE, limit_choices_to={'rol': 'estudiante'}, related_name='inscripciones', verbose_name="Estudiante")
    seccion = models.ForeignKey(Seccion, on_delete=models.CASCADE, related_name='inscripciones', verbose_name="Sección")
    nota_final = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(10)], verbose_name="Nota Final")
    estado = models.CharField(max_length=20, choices=ESTADOS, default='inscrito', verbose_name="Estado")
    fecha_inscripcion = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Inscripción")
    nota_puesta_por = models.ForeignKey(Usuario, null=True, blank=True, on_delete=models.SET_NULL, related_name='notas_puestas', verbose_name="Nota Puesta Por")
    fecha_nota_puesta = models.DateTimeField(null=True, blank=True, verbose_name="Fecha en que se Puso la Nota")
    nota_modificada_por = models.ForeignKey(Usuario, null=True, blank=True, on_delete=models.SET_NULL, related_name='notas_modificadas', verbose_name="Última Modificación Por")

    
    class Meta:
        verbose_name = "Inscripción"
        verbose_name_plural = "Inscripciones"
        ordering = ['-fecha_inscripcion']
        unique_together = ['estudiante', 'seccion']
    
    def __str__(self):
        return f"{self.estudiante.username} - {self.seccion}"
    
    @property
    def aprobado(self):
        if self.nota_final:
            return self.nota_final >= Decimal('7.0')
        return False
    
@property
def dias_desde_inscripcion(self):
    """Calcula cuántos días han pasado desde la inscripción"""
    if not self.fecha_inscripcion:
        return 0
    return (timezone.now() - self.fecha_inscripcion).days


class Pago(models.Model):
    """Sistema de pagos con auditoría"""
    METODOS = (
        ('efectivo', 'Efectivo'),
        ('transferencia', 'Transferencia'),
        ('tarjeta', 'Tarjeta'),
        ('cheque', 'Cheque'),
    )
    
    inscripcion = models.OneToOneField(Inscripcion, on_delete=models.CASCADE, related_name='pago', verbose_name="Inscripción")
    monto = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Monto Pagado")
    metodo_pago = models.CharField(max_length=20, choices=METODOS, verbose_name="Método de Pago")
    fecha_pago = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Pago")
    comprobante = models.CharField(max_length=50, blank=True, verbose_name="Número de Comprobante")
    procesado_por = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, limit_choices_to={'rol__in': ['tesorero', 'administrativo']}, related_name='pagos_procesados', verbose_name="Procesado Por")
    
    class Meta:
        verbose_name = "Pago"
        verbose_name_plural = "Pagos"
        ordering = ['-fecha_pago']
    
    def __str__(self):
        return f"Pago {self.inscripcion.estudiante.username} - ${self.monto}"