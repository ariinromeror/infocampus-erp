from rest_framework import serializers
from .models import Usuario, Materia, Inscripcion, Seccion, Carrera, Pago

# 1. Carreras (La base)
class CarreraSerializer(serializers.ModelSerializer):
    class Meta:
        model = Carrera
        fields = ['id', 'nombre', 'codigo', 'precio_credito']

# 2. Materias
class MateriaSerializer(serializers.ModelSerializer):
    carrera_nombre = serializers.CharField(source='carrera.nombre', read_only=True)
    class Meta:
        model = Materia
        fields = ['id', 'codigo', 'nombre', 'semestre', 'creditos', 'carrera_nombre', 'activo']

# 3. Usuarios (El más inteligente)
class UsuarioSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.CharField(read_only=True)
    carrera_detalle = CarreraSerializer(source='carrera', read_only=True)
    deuda_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    en_mora = serializers.BooleanField(read_only=True)

    class Meta:
        model = Usuario
        fields = [
            'id', 'username', 'nombre_completo', 'email', 'rol', 
            'dni', 'carrera_detalle', 'es_becado', 'porcentaje_beca', 
            'en_mora', 'deuda_total'
        ]
        extra_kwargs = {'password': {'write_only': True}}

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            user_logueado = request.user
            # Filtros de privacidad de la Biblia
            if user_logueado.rol not in ['tesorero', 'director'] and user_logueado.id != instance.id:
                for campo in ['en_mora', 'deuda_total', 'es_becado', 'porcentaje_beca']:
                    data.pop(campo, None)
            if user_logueado.rol not in ['director', 'coordinador'] and user_logueado.id != instance.id:
                data.pop('dni', None)
        return data

# 4. Secciones (Las clases)
class SeccionSerializer(serializers.ModelSerializer):
    materia_detalle = MateriaSerializer(source='materia', read_only=True)
    class Meta:
        model = Seccion
        fields = ['id', 'codigo_seccion', 'materia_detalle', 'aula', 'periodo']

# 5. Inscripciones (CON VALIDACIÓN DE NOTA AGREGADA)
class InscripcionSerializer(serializers.ModelSerializer):
    seccion_detalle = SeccionSerializer(source='seccion', read_only=True)
    costo_materia = serializers.SerializerMethodField()

    class Meta:
        model = Inscripcion
        fields = ['id', 'seccion_detalle', 'nota_final', 'estado', 'costo_materia']

    # ✅ NUEVA VALIDACIÓN: Asegura que el profesor no ingrese notas fuera de rango
    def validate_nota_final(self, value):
        """
        Valida que la nota esté entre 0 y 10.
        """
        if value is not None:
            if value < 0 or value > 10:
                raise serializers.ValidationError("La nota debe estar en un rango de 0.00 a 10.00")
        return value

    def get_costo_materia(self, obj):
        from decimal import Decimal
        estudiante = obj.estudiante
        if not estudiante.carrera: return "0.00"
        materia = obj.seccion.materia
        costo = Decimal(materia.creditos) * estudiante.carrera.precio_credito
        if estudiante.es_becado:
            descuento = costo * (Decimal(estudiante.porcentaje_beca) / Decimal('100'))
            costo -= descuento
        return f"{costo:.2f}"