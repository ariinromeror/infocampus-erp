"""
VISTAS DE LÓGICA DE NEGOCIO - INFO CAMPUS
Manejo de API, Dashboards por Rol, Permisos y Autenticación
✅ VERSIÓN ACTUALIZADA - Con detalle_estudiante y cerrar_ciclo_lectivo
"""

from django.db.models import Sum, F, Q, DecimalField, ExpressionWrapper, Count, Avg
from django.http import FileResponse
from django.contrib.auth import authenticate
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal

# Imports Locales
from .models import Usuario, Materia, Inscripcion, Carrera, Seccion, Pago, PeriodoLectivo
from .serializers import UsuarioSerializer, InscripcionSerializer, MateriaSerializer
from .utils import generar_pdf_estado_cuenta


# ================================================================
# 1. DASHBOARDS DE GESTIÓN (DIRECTOR, TESORERO, COORDINADOR)
# ================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def metricas_institucionales(request):
    """
    Dashboard para Director y Coordinador.
    
    Retorna TODOS los datos que necesita el DirectorDashboard.jsx:
    - total_estudiantes
    - total_profesores
    - estudiantes_por_carrera (para la gráfica)
    - materias_totales
    - promedio_institucional (promedio de notas)
    - ingresos_totales (suma de todos los pagos)
    - alumnos_mora (lista de estudiantes con deuda)
    """
    if request.user.rol not in ['director', 'coordinador', 'administrativo']:
        return Response({"error": "No autorizado"}, status=403)

    # ---- Datos básicos ----
    total_estudiantes = Usuario.objects.filter(rol='estudiante').count()
    total_profesores = Usuario.objects.filter(rol='profesor').count()
    materias_totales = Materia.objects.count()

    # ---- Estudiantes por carrera (para la gráfica de barras) ----
    estudiantes_por_carrera = list(
        Carrera.objects.annotate(
            num_alumnos=Count('usuarios')  # related_name='usuarios' en el modelo
        ).values('nombre', 'num_alumnos')
    )

    # ---- Promedio institucional de notas ----
    promedio_institucional = Inscripcion.objects.aggregate(
        Avg('nota_final')
    )['nota_final__avg'] or 0

    # ---- Ingresos totales (suma de todos los pagos registrados) ----
    total_pagos = Pago.objects.aggregate(total=Sum('monto'))['total']
    ingresos_totales = float(total_pagos or 0)

    # ---- Lista de alumnos en mora ----
    # Buscamos estudiantes que tienen inscripciones sin pago asociado
    estudiantes_con_deuda = Usuario.objects.filter(
        rol='estudiante',
        inscripciones__pago__isnull=True
    ).distinct().select_related('carrera')

    alumnos_mora = []
    for est in estudiantes_con_deuda:
        # Calculamos la deuda de ese estudiante
        deuda = Decimal('0.00')
        inscripciones_sin_pagar = est.inscripciones.filter(pago__isnull=True).select_related(
            'seccion', 'seccion__materia'
        )
        for insc in inscripciones_sin_pagar:
            if est.carrera:
                costo = Decimal(str(insc.seccion.materia.creditos)) * est.carrera.precio_credito
                if est.es_becado and est.porcentaje_beca > 0:
                    descuento = costo * (Decimal(str(est.porcentaje_beca)) / Decimal('100'))
                    costo -= descuento
                deuda += costo

        alumnos_mora.append({
            'id': est.id,
            'username': est.username,
            'nombre_completo': f"{est.first_name} {est.last_name}".strip() or est.username,
            'nombre': f"{est.first_name} {est.last_name}".strip() or est.username,
            'deuda_total': str(deuda),
            'en_mora': True,
        })

    # ---- Respuesta final ----
    stats = {
        "total_estudiantes": total_estudiantes,
        "total_profesores": total_profesores,
        "estudiantes_por_carrera": estudiantes_por_carrera,
        "materias_totales": materias_totales,
        "promedio_institucional": round(float(promedio_institucional), 2),
        "ingresos_totales": ingresos_totales,
        "alumnos_mora": alumnos_mora,
    }
    return Response(stats)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_finanzas(request):
    """
    Dashboard de Tesorería - VERSIÓN CORREGIDA Y OPTIMIZADA
    """
    if request.user.rol != 'tesorero':
        return Response({"error": "No autorizado"}, status=403)

    try:
        # 1. CALCULAR INGRESO PROYECTADO
        estudiantes = Usuario.objects.filter(rol='estudiante').select_related('carrera')
        total_proyectado = Decimal('0.00')

        for est in estudiantes:
            if not est.carrera:
                continue
            inscripciones = Inscripcion.objects.filter(
                estudiante=est,
                pago__isnull=True
            ).select_related('seccion', 'seccion__materia')

            for insc in inscripciones:
                try:
                    creditos = insc.seccion.materia.creditos
                    precio = est.carrera.precio_credito
                    costo = Decimal(str(creditos)) * precio
                    if est.es_becado and est.porcentaje_beca > 0:
                        descuento = costo * (Decimal(str(est.porcentaje_beca)) / Decimal('100'))
                        costo -= descuento
                    total_proyectado += costo
                except Exception as e:
                    print(f"Error calculando inscripción {insc.id}: {e}")
                    continue

        # 2. CALCULAR INGRESO REAL
        total_pagos = Pago.objects.aggregate(total=Sum('monto'))['total']
        ingreso_real = Decimal(str(total_pagos or 0))

        # 3. TASA DE COBRANZA
        tasa_cobranza = Decimal('0.00')
        if total_proyectado > 0:
            tasa_cobranza = (ingreso_real / total_proyectado) * Decimal('100')

        # 4. LISTADO DE COBRANZA
        listado = []
        for est in estudiantes[:20]:
            try:
                listado.append({
                    'id': est.id,
                    'username': est.username,
                    'nombre_completo': f"{est.first_name} {est.last_name}".strip() or est.username,
                    'en_mora': est.en_mora,
                    'deuda_total': float(est.deuda_total)
                })
            except Exception as e:
                print(f"Error en listado: {e}")
                continue

        respuesta = {
            "ingreso_proyectado": float(total_proyectado),
            "ingreso_real": float(ingreso_real),
            "tasa_cobranza": float(tasa_cobranza),
            "listado_cobranza": listado
        }
        return Response(respuesta, status=200)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({
            "error": "Error interno del servidor",
            "detalles": str(e),
        }, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_tesoreria(request):
    """
    Versión alternativa (deprecada). Use dashboard_finanzas.
    """
    return Response({
        "mensaje": "Esta ruta está deprecada. Use /api/finanzas/dashboard/ en su lugar"
    }, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def registrar_pago_alumno(request, usuario_id):
    """
    Registrar pago de un estudiante.
    Solo tesorero o director puede hacer esto.
    """
    if request.user.rol not in ['tesorero', 'director']:
        return Response({"error": "No tiene permisos"}, status=403)

    try:
        estudiante = Usuario.objects.get(id=usuario_id, rol='estudiante')
        inscripciones_pendientes = estudiante.inscripciones.filter(pago__isnull=True)

        if not inscripciones_pendientes.exists():
            return Response({
                "message": "El estudiante no tiene deudas pendientes"
            }, status=200)

        pagos_creados = 0
        for inscripcion in inscripciones_pendientes:
            try:
                costo = Decimal(str(inscripcion.seccion.materia.creditos)) * estudiante.carrera.precio_credito
                if estudiante.es_becado:
                    descuento = costo * (Decimal(str(estudiante.porcentaje_beca)) / Decimal('100'))
                    costo -= descuento

                Pago.objects.create(
                    inscripcion=inscripcion,
                    monto=costo,
                    metodo_pago='transferencia',
                    procesado_por=request.user
                )
                pagos_creados += 1
            except Exception as e:
                print(f"Error creando pago para inscripción {inscripcion.id}: {e}")
                continue

        return Response({
            "message": f"Pago registrado con éxito. {pagos_creados} inscripciones procesadas.",
            "inscripciones_procesadas": pagos_creados
        })

    except Usuario.DoesNotExist:
        return Response({"error": "Estudiante no encontrado"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ================================================================
# 2. DASHBOARD DE PROFESOR
# ================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_profesor(request):
    """
    Dashboard para profesores.
    Retorna sus secciones y estadísticas.
    """
    if request.user.rol != 'profesor':
        return Response({"error": "Acceso restringido"}, status=403)

    secciones_queryset = Seccion.objects.filter(
        profesor=request.user
    ).select_related('materia', 'periodo')

    total_alumnos = Inscripcion.objects.filter(
        seccion__in=secciones_queryset
    ).count()

    promedio_grupal = Inscripcion.objects.filter(
        seccion__in=secciones_queryset
    ).aggregate(Avg('nota_final'))['nota_final__avg'] or 0

    return Response({
        "stats": {
            "secciones_activas": secciones_queryset.count(),
            "total_alumnos": total_alumnos,
            "rendimiento_promedio": round(promedio_grupal, 2)
        },
        "mis_clases": [{
            "id": s.id,
            "materia": s.materia.nombre,
            "codigo": s.codigo_seccion,
            "aula": s.aula,
            "alumnos_inscritos": s.inscripciones.count(),
            "horario": s.horario_str
        } for s in secciones_queryset]
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def gestion_notas_seccion(request, seccion_id):
    """
    Gestión de notas por sección.
    GET  → retorna la lista de alumnos y sus notas actuales
    POST → guarda las notas que envió el profesor
    """
    if request.user.rol not in ['profesor', 'director', 'coordinador']:
        return Response({"error": "No autorizado"}, status=403)

    try:
        seccion = Seccion.objects.get(id=seccion_id)

        if request.method == 'POST':
            notas_data = request.data.get('notas', [])
            for item in notas_data:
                Inscripcion.objects.filter(
                    id=item.get('inscripcion_id'),
                    seccion=seccion
                ).update(nota_final=item.get('nota'))
            return Response({"message": "Notas guardadas exitosamente"})

        # GET
        inscritos = Inscripcion.objects.filter(
            seccion=seccion
        ).select_related('estudiante')

        alumnos = [{
            "inscripcion_id": i.id,
            "alumno_nombre": f"{i.estudiante.first_name} {i.estudiante.last_name}",
            "alumno_carnet": i.estudiante.username,
            "nota_actual": i.nota_final or 0
        } for i in inscritos]

        return Response({
            "materia": seccion.materia.nombre,
            "codigo": seccion.codigo_seccion,
            "alumnos": alumnos
        })

    except Seccion.DoesNotExist:
        return Response({"error": "Sección no encontrada"}, status=404)


# ================================================================
# 3. VIEWSETS (INSCRIPCIONES Y MATERIAS)
# ================================================================

class InscripcionViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de inscripciones.
    Automáticamente crea las rutas:
      GET    /inscripciones/
      POST   /inscripciones/
      GET    /inscripciones/<id>/
      PUT    /inscripciones/<id>/
      DELETE /inscripciones/<id>/
    """
    serializer_class = InscripcionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Inscripcion.objects.select_related(
            'seccion',
            'seccion__materia',
            'estudiante'
        )
        if user.rol == 'estudiante':
            return qs.filter(estudiante=user)
        if user.rol == 'profesor':
            return qs.filter(seccion__profesor=user)
        return qs

    def perform_create(self, serializer):
        if self.request.user.en_mora:
            raise ValidationError({
                "error": "No puede inscribirse. Posee una deuda pendiente."
            })
        serializer.save(estudiante=self.request.user)

    @action(detail=False, methods=['get'])
    def mi_historial(self, request):
        inscripciones = self.get_queryset().filter(estado='finalizada')
        serializer = self.get_serializer(inscripciones, many=True)
        return Response(serializer.data)


class MateriaViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para consulta de materias (solo lectura).
    """
    serializer_class = MateriaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.rol == 'estudiante':
            return Materia.objects.filter(carrera=user.carrera)
        return Materia.objects.all()


# ================================================================
# 4. AUTENTICACIÓN Y PERFIL
# ================================================================

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    Autenticación de usuarios.
    Recibe username y password, retorna un token si son correctos.
    """
    username = request.data.get('username')
    password = request.data.get('password')

    user = authenticate(username=username, password=password)

    if user:
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'access': token.key,
            'user': UsuarioSerializer(user).data
        }, status=200)

    return Response({
        'detail': 'Credenciales inválidas'
    }, status=401)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def perfil_usuario(request):
    """
    Retorna los datos del usuario que está logueado.
    """
    return Response(UsuarioSerializer(request.user).data)


# ================================================================
# 5. REPORTES Y DOCUMENTOS
# ================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def descargar_estado_cuenta(request):
    """
    Descarga un PDF con el estado de cuenta del usuario logueado.
    """
    try:
        if request.user.en_mora:
            return Response({
                "error": "No puede descargar el reporte teniendo saldos pendientes."
            }, status=403)

        pdf = generar_pdf_estado_cuenta(request.user)
        response = FileResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="estado_cuenta.pdf"'
        return response

    except Exception as e:
        print(f"Error generando PDF: {e}")
        return Response({"error": str(e)}, status=500)


# ================================================================
# 6. ✅ NUEVAS VISTAS AGREGADAS
# ================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def detalle_estudiante(request, estudiante_id):
    """
    Retorna toda la información de UN estudiante específico.
    
    Quien puede verlo:
    - director
    - coordinador
    - tesorero
    - administrativo
    - el mismo estudiante (solo sus propios datos)
    
    El frontend (EstudianteDetalle.jsx) hace:
        GET /api/estudiante/5/
    Y esta función responde con los datos de ese estudiante.
    """
    # Solo roles administrativos o el mismo estudiante
    if request.user.rol not in ['director', 'coordinador', 'tesorero', 'administrativo']:
        if request.user.id != estudiante_id:
            return Response({"error": "No tiene permiso"}, status=403)

    try:
        estudiante = Usuario.objects.get(id=estudiante_id, rol='estudiante')
    except Usuario.DoesNotExist:
        return Response({"error": "Estudiante no encontrado"}, status=404)

    # ---- Inscripciones activas del estudiante ----
    inscripciones = Inscripcion.objects.filter(
        estudiante=estudiante
    ).select_related('seccion', 'seccion__materia', 'seccion__periodo', 'pago')

    lista_inscripciones = []
    for insc in inscripciones:
        lista_inscripciones.append({
            'id': insc.id,
            'materia_nombre': insc.seccion.materia.nombre,
            'materia_codigo': insc.seccion.materia.codigo,
            'seccion': insc.seccion.codigo_seccion,
            'periodo': insc.seccion.periodo.nombre,
            'nota_final': str(insc.nota_final) if insc.nota_final else None,
            'estado': insc.estado,
            'pagado': insc.pago is not None,
        })

    # ---- Respuesta ----
    respuesta = {
        'id': estudiante.id,
        'username': estudiante.username,
        'nombre_completo': f"{estudiante.first_name} {estudiante.last_name}".strip() or estudiante.username,
        'email': estudiante.email,
        'dni': estudiante.dni,
        'rol': estudiante.rol,
        'carrera_detalle': {
            'id': estudiante.carrera.id,
            'nombre': estudiante.carrera.nombre,
            'codigo': estudiante.carrera.codigo,
        } if estudiante.carrera else None,
        'es_becado': estudiante.es_becado,
        'porcentaje_beca': estudiante.porcentaje_beca,
        'en_mora': estudiante.en_mora,
        'deuda_total': str(estudiante.deuda_total),
        'inscripciones': lista_inscripciones,
    }

    return Response(respuesta)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cerrar_ciclo_lectivo(request):
    """
    Cierra el periodo lectivo que está activo.
    
    Esto hace:
    1. Busca el periodo que tiene activo=True
    2. Verifica que TODAS las inscripciones tengan nota
    3. Marca cada inscripción como 'aprobado' o 'reprobado' según la nota
    4. Pone activo=False al periodo
    
    Solo el Director puede hacer esto.
    """
    if request.user.rol != 'director':
        return Response({"error": "Solo el Director puede cerrar el ciclo"}, status=403)

    try:
        # Buscar el periodo activo
        periodo_activo = PeriodoLectivo.objects.filter(activo=True).first()

        if not periodo_activo:
            return Response({
                "error": "No hay un periodo activo para cerrar"
            }, status=400)

        # Verificar que todas las inscripciones tengan nota
        inscripciones_sin_nota = Inscripcion.objects.filter(
            seccion__periodo=periodo_activo,
            nota_final__isnull=True,
            estado='inscrito'  # solo las que están activas
        )

        cantidad_sin_nota = inscripciones_sin_nota.count()
        if cantidad_sin_nota > 0:
            # Retorna error y dice cuántas inscripciones les faltan nota
            return Response({
                "error": f"No se puede cerrar el ciclo. Quedan {cantidad_sin_nota} inscripciones sin nota.",
                "inscripciones_pendientes": cantidad_sin_nota
            }, status=400)

        # Actualizar el estado de cada inscripción
        inscripciones = Inscripcion.objects.filter(
            seccion__periodo=periodo_activo,
            estado='inscrito'
        )

        aprobados = 0
        reprobados = 0
        for inscripcion in inscripciones:
            if inscripcion.nota_final is not None:
                if inscripcion.nota_final >= Decimal('7.0'):
                    inscripcion.estado = 'aprobado'
                    aprobados += 1
                else:
                    inscripcion.estado = 'reprobado'
                    reprobados += 1
                inscripcion.save()

        # Desactivar el periodo
        periodo_activo.activo = False
        periodo_activo.save()

        return Response({
            "message": f"Ciclo '{periodo_activo.nombre}' cerrado exitosamente.",
            "periodo_cerrado": periodo_activo.codigo,
            "aprobados": aprobados,
            "reprobados": reprobados,
            "total_procesados": aprobados + reprobados,
        }, status=200)

    except Exception as e:
        print(f"Error cerrando ciclo: {e}")
        return Response({"error": str(e)}, status=500)