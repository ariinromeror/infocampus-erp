import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const createResponse = (body: any, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ─── JWT verification ─────────────────────────────────────────────────────────
function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4 !== 0) str += "=";
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function verifyJWT(token: string, secret: string): Promise<any> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const data = new TextEncoder().encode(`${header}.${payload}`);
    const sig = base64UrlDecode(signature);
    const valid = await crypto.subtle.verify("HMAC", key, sig, data);
    if (!valid) return null;
    const decoded = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payload)),
    );
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
}

// ─── Context builders per role ────────────────────────────────────────────────

async function buildContextoEstudiante(db: any, userId: number): Promise<any> {
  const { data: perfil } = await db
    .from("usuarios")
    .select(
      `
      id, first_name, last_name, cedula, email, semestre_actual,
      promedio_acumulado, creditos_aprobados,
      es_becado, porcentaje_beca, tipo_beca,
      convenio_activo, fecha_limite_convenio,
      carreras(nombre, creditos_totales, precio_credito, dias_gracia_pago)
    `,
    )
    .eq("id", userId)
    .single();

  const { data: inscripciones } = await db
    .from("inscripciones")
    .select(
      `
      id, estado, nota_final, fecha_inscripcion, pago_id,
      secciones(
        codigo, aula, horario,
        materias(nombre, codigo, creditos, semestre),
        periodos_lectivos(nombre, codigo, activo, fecha_inicio, fecha_fin),
        usuarios(first_name, last_name)
      )
    `,
    )
    .eq("estudiante_id", userId)
    .order("created_at", { ascending: false });

  const { data: evaluaciones } = await db
    .from("evaluaciones_parciales")
    .select(
      `
      tipo_evaluacion, nota, peso_porcentual, fecha_evaluacion,
      inscripciones!inner(
        estudiante_id,
        secciones(materias(nombre), periodos_lectivos(activo))
      )
    `,
    )
    .eq("inscripciones.estudiante_id", userId);

  const { data: asistencias } = await db
    .from("asistencias")
    .select(
      "fecha, estado, inscripciones!inner(estudiante_id, secciones(materias(nombre)))",
    )
    .eq("inscripciones.estudiante_id", userId)
    .order("fecha", { ascending: false })
    .limit(60);

  const { data: pagos } = await db
    .from("pagos")
    .select("id, monto, fecha_pago, metodo_pago, estado, concepto, periodo_id")
    .eq("estudiante_id", userId)
    .order("fecha_pago", { ascending: false });

  const porPeriodo: Record<string, any[]> = {};
  for (const ins of inscripciones || []) {
    const periodo = ins.secciones?.periodos_lectivos?.codigo || "Desconocido";
    if (!porPeriodo[periodo]) porPeriodo[periodo] = [];
    porPeriodo[periodo].push({
      materia: ins.secciones?.materias?.nombre,
      codigo_materia: ins.secciones?.materias?.codigo,
      creditos: ins.secciones?.materias?.creditos,
      semestre_materia: ins.secciones?.materias?.semestre,
      seccion: ins.secciones?.codigo,
      aula: ins.secciones?.aula,
      horario: ins.secciones?.horario,
      profesor: ins.secciones?.usuarios
        ? `${ins.secciones.usuarios.first_name} ${ins.secciones.usuarios.last_name}`
        : null,
      nota_final: ins.nota_final != null ? Number(ins.nota_final) : null,
      estado: ins.estado,
      pagado: ins.pago_id != null,
      periodo_activo: ins.secciones?.periodos_lectivos?.activo,
    });
  }

  const totalAsist = (asistencias || []).length;
  const presentes = (asistencias || []).filter(
    (a: any) => a.estado === "presente",
  ).length;
  const ausentes = (asistencias || []).filter(
    (a: any) => a.estado === "ausente",
  ).length;
  const tardanzas = (asistencias || []).filter(
    (a: any) => a.estado === "tardanza",
  ).length;

  const sinPagar = (inscripciones || []).filter((i: any) => !i.pago_id);
  const precioCredito = perfil?.carreras?.precio_credito || 50;
  const pctBeca = perfil?.porcentaje_beca || 0;
  let deudaTotal = 0;
  for (const ins of sinPagar) {
    const creditos = ins.secciones?.materias?.creditos || 0;
    let costo = creditos * precioCredito;
    if (perfil?.es_becado && pctBeca > 0) costo -= costo * (pctBeca / 100);
    deudaTotal += costo;
  }

  const totalPagado = (pagos || [])
    .filter((p: any) => p.estado === "completado")
    .reduce((sum: number, p: any) => sum + Number(p.monto), 0);

  return {
    perfil: {
      nombre: `${perfil?.first_name} ${perfil?.last_name}`,
      cedula: perfil?.cedula,
      carrera: perfil?.carreras?.nombre,
      semestre_actual: perfil?.semestre_actual,
      promedio_acumulado:
        perfil?.promedio_acumulado != null
          ? Number(perfil.promedio_acumulado)
          : null,
      creditos_aprobados: perfil?.creditos_aprobados,
      creditos_totales: perfil?.carreras?.creditos_totales,
      es_becado: perfil?.es_becado,
      porcentaje_beca: perfil?.porcentaje_beca,
      tipo_beca: perfil?.tipo_beca,
      convenio_activo: perfil?.convenio_activo,
      fecha_limite_convenio: perfil?.fecha_limite_convenio,
      precio_credito: precioCredito,
      dias_gracia_pago: perfil?.carreras?.dias_gracia_pago,
    },
    estado_financiero: {
      deuda_total: Math.round(deudaTotal * 100) / 100,
      materias_sin_pagar: sinPagar.length,
      total_pagado: Math.round(totalPagado * 100) / 100,
      pagos: (pagos || []).map((p: any) => ({
        monto: Number(p.monto),
        estado: p.estado,
        fecha: p.fecha_pago,
        metodo: p.metodo_pago,
        concepto: p.concepto,
      })),
    },
    asistencia: {
      total_clases: totalAsist,
      presentes,
      ausentes,
      tardanzas,
      porcentaje:
        totalAsist > 0
          ? Math.round((presentes / totalAsist) * 100 * 10) / 10
          : 0,
    },
    historial_por_periodo: porPeriodo,
    evaluaciones_periodo_activo: (evaluaciones || [])
      .filter((e: any) => e.inscripciones?.secciones?.periodos_lectivos?.activo)
      .map((e: any) => ({
        materia: e.inscripciones?.secciones?.materias?.nombre,
        tipo: e.tipo_evaluacion,
        nota: e.nota != null ? Number(e.nota) : null,
        peso_pct: e.peso_porcentual,
        fecha: e.fecha_evaluacion,
      })),
  };
}

async function buildContextoProfesor(db: any, userId: number): Promise<any> {
  const { data: secciones } = await db
    .from("secciones")
    .select(
      `
      id, codigo, aula, horario, cupo_maximo, cupo_actual,
      materias(nombre, codigo, creditos),
      periodos_lectivos(nombre, codigo, activo),
      inscripciones(
        id, estado, nota_final,
        usuarios(first_name, last_name, cedula)
      )
    `,
    )
    .eq("docente_id", userId)
    .order("created_at", { ascending: false });

  const resumen = (secciones || []).map((s: any) => {
    const inscritos = s.inscripciones || [];
    const notas = inscritos
      .map((i: any) => i.nota_final)
      .filter((n: any) => n != null)
      .map(Number);
    const promedio =
      notas.length > 0
        ? Math.round(
            (notas.reduce((a: number, b: number) => a + b, 0) / notas.length) *
              100,
          ) / 100
        : null;
    const aprobados = notas.filter((n: number) => n >= 7).length;
    const reprobados = notas.filter((n: number) => n < 7).length;

    return {
      materia: s.materias?.nombre,
      codigo_materia: s.materias?.codigo,
      seccion: s.codigo,
      aula: s.aula,
      horario: s.horario,
      periodo: s.periodos_lectivos?.codigo,
      periodo_activo: s.periodos_lectivos?.activo,
      cupo_maximo: s.cupo_maximo,
      total_inscritos: inscritos.length,
      promedio_seccion: promedio,
      aprobados,
      reprobados,
      alumnos: inscritos.map((i: any) => ({
        nombre: `${i.usuarios?.first_name} ${i.usuarios?.last_name}`,
        cedula: i.usuarios?.cedula,
        nota_final: i.nota_final != null ? Number(i.nota_final) : null,
        estado: i.estado,
      })),
    };
  });

  const activas = resumen.filter((s: any) => s.periodo_activo);
  return {
    resumen_general: {
      total_secciones: resumen.length,
      secciones_activas: activas.length,
      total_alumnos_activos: activas.reduce(
        (sum: number, s: any) => sum + s.total_inscritos,
        0,
      ),
    },
    secciones: resumen,
  };
}

async function buildContextoTesorero(db: any): Promise<any> {
  const { data: kpisRow } = await db.from("pagos").select("monto, estado");

  const pagos = kpisRow || [];
  const recaudado = pagos
    .filter((p: any) => p.estado === "completado")
    .reduce((s: number, p: any) => s + Number(p.monto), 0);
  const pendiente = pagos
    .filter((p: any) => p.estado === "pendiente")
    .reduce((s: number, p: any) => s + Number(p.monto), 0);

  const { data: conDeuda } = await db
    .from("inscripciones")
    .select(
      `
      estudiante_id, pago_id,
      secciones(materias(creditos), periodos_lectivos(activo)),
      usuarios!inscripciones_estudiante_id_fkey(first_name, last_name, cedula, carrera_id,
        carreras(nombre, precio_credito))
    `,
    )
    .is("pago_id", null);

  const deudaPorEst: Record<number, any> = {};
  for (const ins of conDeuda || []) {
    const eid = ins.estudiante_id;
    if (!deudaPorEst[eid]) {
      deudaPorEst[eid] = {
        nombre: `${ins.usuarios?.first_name} ${ins.usuarios?.last_name}`,
        cedula: ins.usuarios?.cedula,
        carrera: ins.usuarios?.carreras?.nombre,
        precio_credito: ins.usuarios?.carreras?.precio_credito || 50,
        materias_pendientes: 0,
        deuda: 0,
        en_periodo_activo: false,
      };
    }
    const cred = ins.secciones?.materias?.creditos || 0;
    deudaPorEst[eid].deuda += cred * deudaPorEst[eid].precio_credito;
    deudaPorEst[eid].materias_pendientes += 1;
    if (ins.secciones?.periodos_lectivos?.activo)
      deudaPorEst[eid].en_periodo_activo = true;
  }
  const moraLista = Object.values(deudaPorEst)
    .map((e: any) => ({ ...e, deuda: Math.round(e.deuda * 100) / 100 }))
    .sort((a: any, b: any) => b.deuda - a.deuda);

  const { data: ingresosPeriodo } = await db
    .from("pagos")
    .select("monto, estado, periodo_id, periodos_lectivos(nombre, codigo)")
    .eq("estado", "completado");

  const porPeriodo: Record<string, number> = {};
  for (const p of ingresosPeriodo || []) {
    const k = p.periodos_lectivos?.codigo || "Sin período";
    porPeriodo[k] = (porPeriodo[k] || 0) + Number(p.monto);
  }

  const total = recaudado + pendiente;
  return {
    kpis: {
      recaudado_total: Math.round(recaudado * 100) / 100,
      pendiente_cobro: Math.round(pendiente * 100) / 100,
      tasa_cobranza_pct:
        total > 0 ? Math.round((recaudado / total) * 100 * 10) / 10 : 0,
      total_pagos: pagos.length,
      pagos_completados: pagos.filter((p: any) => p.estado === "completado")
        .length,
      pagos_pendientes: pagos.filter((p: any) => p.estado === "pendiente")
        .length,
    },
    mora: {
      total_en_mora: moraLista.filter((e: any) => e.en_periodo_activo).length,
      deuda_total_institucional:
        Math.round(
          moraLista.reduce((s: number, e: any) => s + e.deuda, 0) * 100,
        ) / 100,
      listado_top20: moraLista.slice(0, 20),
    },
    ingresos_por_periodo: Object.entries(porPeriodo)
      .map(([periodo, monto]) => ({
        periodo,
        monto: Math.round(monto * 100) / 100,
      }))
      .sort((a, b) => b.periodo.localeCompare(a.periodo)),
  };
}

async function buildContextoDirector(db: any): Promise<any> {
  const [
    { count: totalEstudiantes },
    { count: totalProfesores },
    { count: totalMaterias },
    { count: totalSecciones },
    { data: promedioRow },
    { data: ingresosRow },
  ] = await Promise.all([
    db
      .from("usuarios")
      .select("*", { count: "exact", head: true })
      .eq("rol", "estudiante"),
    db
      .from("usuarios")
      .select("*", { count: "exact", head: true })
      .eq("rol", "profesor"),
    db.from("materias").select("*", { count: "exact", head: true }),
    db.from("secciones").select("*", { count: "exact", head: true }),
    db.from("inscripciones").select("nota_final").not("nota_final", "is", null),
    db.from("pagos").select("monto, estado"),
  ]);

  const notas = (promedioRow || []).map((r: any) => Number(r.nota_final));
  const promedioInst =
    notas.length > 0
      ? Math.round(
          (notas.reduce((a: number, b: number) => a + b, 0) / notas.length) *
            100,
        ) / 100
      : 0;

  const pagos = ingresosRow || [];
  const recaudado = pagos
    .filter((p: any) => p.estado === "completado")
    .reduce((s: number, p: any) => s + Number(p.monto), 0);

  const { data: porCarrera } = await db
    .from("carreras")
    .select("nombre, codigo, precio_credito, usuarios(count)");

  const { data: inscPorCarrera } = await db
    .from("inscripciones")
    .select(
      `
      nota_final, estado,
      secciones(materias(carrera_id, carreras(nombre)))
    `,
    )
    .not("nota_final", "is", null);

  const rendimientoPorCarrera: Record<
    string,
    { notas: number[]; aprobados: number; reprobados: number }
  > = {};
  for (const ins of inscPorCarrera || []) {
    const carrera = ins.secciones?.materias?.carreras?.nombre;
    if (!carrera) continue;
    if (!rendimientoPorCarrera[carrera])
      rendimientoPorCarrera[carrera] = {
        notas: [],
        aprobados: 0,
        reprobados: 0,
      };
    rendimientoPorCarrera[carrera].notas.push(Number(ins.nota_final));
    if (ins.estado === "aprobado") rendimientoPorCarrera[carrera].aprobados++;
    else if (ins.estado === "reprobado")
      rendimientoPorCarrera[carrera].reprobados++;
  }

  const rendimiento = Object.entries(rendimientoPorCarrera)
    .map(([carrera, data]) => ({
      carrera,
      promedio:
        data.notas.length > 0
          ? Math.round(
              (data.notas.reduce((a, b) => a + b, 0) / data.notas.length) * 100,
            ) / 100
          : 0,
      aprobados: data.aprobados,
      reprobados: data.reprobados,
      tasa_aprobacion_pct:
        data.aprobados + data.reprobados > 0
          ? Math.round(
              (data.aprobados / (data.aprobados + data.reprobados)) * 100 * 10,
            ) / 10
          : 0,
    }))
    .sort((a, b) => b.promedio - a.promedio);

  const { count: enMora } = await db
    .from("inscripciones")
    .select("*", { count: "exact", head: true })
    .is("pago_id", null)
    .not("estudiante_id", "is", null);

  const { count: becados } = await db
    .from("usuarios")
    .select("*", { count: "exact", head: true })
    .eq("rol", "estudiante")
    .eq("es_becado", true);

  const { data: periodoActivo } = await db
    .from("periodos_lectivos")
    .select("nombre, codigo, fecha_inicio, fecha_fin")
    .eq("activo", true)
    .single();

  const { data: periodos } = await db
    .from("periodos_lectivos")
    .select("nombre, codigo, activo")
    .order("codigo", { ascending: false })
    .limit(5);

  return {
    estadisticas_generales: {
      total_estudiantes: totalEstudiantes,
      total_profesores: totalProfesores,
      total_materias: totalMaterias,
      total_secciones: totalSecciones,
      promedio_institucional: promedioInst,
      recaudado_total: Math.round(recaudado * 100) / 100,
      estudiantes_becados: becados,
      inscripciones_sin_pago: enMora,
    },
    periodo_activo: periodoActivo
      ? {
          nombre: periodoActivo.nombre,
          codigo: periodoActivo.codigo,
          fecha_inicio: periodoActivo.fecha_inicio,
          fecha_fin: periodoActivo.fecha_fin,
        }
      : null,
    rendimiento_por_carrera: rendimiento,
    distribucion_por_carrera: (porCarrera || []).map((c: any) => ({
      carrera: c.nombre,
      codigo: c.codigo,
      estudiantes: Array.isArray(c.usuarios) ? c.usuarios.length : 0,
      precio_credito: c.precio_credito,
    })),
    ultimos_periodos: (periodos || []).map((p: any) => ({
      nombre: p.nombre,
      codigo: p.codigo,
      activo: p.activo,
    })),
  };
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(usuario: any, contexto: any): string {
  const nombre =
    `${usuario.first_name || ""} ${usuario.last_name || ""}`.trim();
  const hoy = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const base = `Eres Eva, asistente académica inteligente de InfoCampus ERP. Hoy es ${hoy}.
Atiendes a: ${nombre} (${usuario.rol.toUpperCase()}).

IDENTIDAD:
Eres la colega más inteligente del sistema. No eres un bot de FAQ. Analizas, calculas, comparas y das recomendaciones basadas en datos reales. Hablas como una persona real — directa, cálida, precisa.

REGLAS ABSOLUTAS:
- Responde SIEMPRE en español, de forma natural y directa.
- NUNCA inventes datos. Solo usa los datos del contexto que recibes abajo.
- Si un dato no está en el contexto, di: "No tengo ese dato disponible en este momento."
- No uses términos técnicos como "null", "undefined", "array". Usa lenguaje natural.
- Si el usuario pregunta por otra persona, di: "Solo puedo consultar tu información personal."
- Para listas usa saltos de línea simples, sin markdown complejo.
- Notas: formato → Materia: X.X (Estado)
- Montos: formato → $X.XX

CÓMO RAZONAS:
- Cuando te pregunten por datos, no solo los repites — los INTERPRETAS. 
  Ejemplo: si la asistencia es 68%, no digas solo "tu asistencia es 68%". Di "tu asistencia es 68%, estás por debajo del mínimo requerido del 75%. Te faltan X clases para regularizarte, y con el ritmo actual corres riesgo de perder la materia."
- Cuando hay múltiples datos relacionados, los CONECTAS.
  Ejemplo: si hay mora Y baja asistencia Y nota en riesgo, los mencionas juntos como un panorama completo.
- Cuando te piden comparaciones (carreras, períodos, materias), haces el análisis tú mismo con los datos disponibles.
- Cuando detectas algo preocupante en los datos (mora, riesgo académico, baja asistencia), lo mencionas proactivamente aunque no te lo hayan preguntado directamente.
- Si te piden un resumen general, das un análisis ejecutivo con los puntos más importantes, no una lista de datos crudos.

FORMATO:
- Respuestas cortas para preguntas simples (1-3 líneas).
- Respuestas largas y detalladas cuando el usuario pide análisis, resúmenes o comparaciones.
- Nunca termines con "¿hay algo más en lo que pueda ayudarte?" — confías en que el usuario preguntará.
- No empieces con "¡Claro!", "Por supuesto", "Entendido". Ve directo al punto.`;

  const rolInstrucciones: Record<string, string> = {
    estudiante: `
ERES EL ASISTENTE PERSONAL DE ESTE ESTUDIANTE. Puedes responder sobre:
- Notas finales y parciales por materia y período
- Materias inscritas, horarios, aulas y profesores
- Estado de cuenta: deuda total, pagos, mora
- Asistencia: porcentaje, faltas, tardanzas
- Perfil: semestre, carrera, créditos, beca
- Historial académico completo`,

    profesor: `
ERES EL ASISTENTE DEL PROFESOR. Puedes responder sobre:
- Secciones y materias asignadas (activas e históricas)
- Lista de alumnos por sección con notas y estado
- Estadísticas: promedio, aprobados, reprobados
- Horarios y aulas`,

    tesorero: `
ERES EL ASISTENTE DE TESORERÍA. Puedes responder sobre:
- KPIs financieros: recaudado, pendiente, tasa de cobranza
- Estudiantes en mora con montos exactos
- Ingresos por período
- Pagos completados vs pendientes`,

    director: `
ERES EL ASISTENTE DE DIRECCIÓN. Puedes responder sobre:
- Estadísticas institucionales completas
- Rendimiento académico por carrera (promedio, tasa de aprobación)
- Distribución de estudiantes por carrera
- Estado financiero institucional
- Período activo y períodos anteriores
- Becados y estudiantes en mora`,

    coordinador: `
ERES EL ASISTENTE DE COORDINACIÓN. Puedes responder sobre:
- Estadísticas académicas institucionales
- Rendimiento por carrera
- Distribución de estudiantes`,

    administrativo: `
ERES EL ASISTENTE ADMINISTRATIVO. Responde sobre estadísticas generales de la institución.`,
  };

  const instruccion =
    rolInstrucciones[usuario.rol] ||
    "Responde consultas generales sobre InfoCampus.";

  return `${base}
${instruccion}

════════════════════════════════════════
DATOS EN TIEMPO REAL (${hoy}):
════════════════════════════════════════
${JSON.stringify(contexto, null, 2)}
════════════════════════════════════════`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    const jwtSecret = Deno.env.get("JWT_SECRET_KEY");

    // ✅ FIX: usar SUPABASE_SERVICE_ROLE_KEY (el correcto) y SUPABASE_URL
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";

    if (!groqApiKey)
      return createResponse({ error: "Configuración de IA incompleta." }, 503);
    if (!jwtSecret)
      return createResponse(
        { error: "Configuración de seguridad incompleta." },
        503,
      );
    if (!serviceRoleKey)
      return createResponse(
        { error: "Configuración de base de datos incompleta." },
        503,
      );
    if (!supabaseUrl)
      return createResponse(
        { error: "URL de base de datos no configurada." },
        503,
      );

    // Verificar JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer "))
      return createResponse({ error: "Token requerido." }, 401);

    const token = authHeader.replace("Bearer ", "");
    const jwtPayload = await verifyJWT(token, jwtSecret);
    if (!jwtPayload?.user_id)
      return createResponse({ error: "Token inválido o expirado." }, 401);

    const { message, history } = await req.json();
    if (!message?.trim())
      return createResponse({ error: "Mensaje vacío." }, 400);

    // ✅ Usar SUPABASE_SERVICE_ROLE_KEY para acceso completo a la BD
    const db = createClient(supabaseUrl, serviceRoleKey);

    // Obtener datos del usuario
    const { data: usuario } = await db
      .from("usuarios")
      .select("id, first_name, last_name, rol, cedula, carrera_id")
      .eq("id", jwtPayload.user_id)
      .single();

    if (!usuario) {
      return createResponse({ error: "Usuario no encontrado." }, 404);
    }

    // Construir contexto según rol
    let contexto: any = {};
    try {
      switch (usuario.rol) {
        case "estudiante":
          contexto = await buildContextoEstudiante(db, usuario.id);
          break;
        case "profesor":
          contexto = await buildContextoProfesor(db, usuario.id);
          break;
        case "tesorero":
          contexto = await buildContextoTesorero(db);
          break;
        case "director":
        case "coordinador":
        case "administrativo":
          contexto = await buildContextoDirector(db);
          break;
        default:
          contexto = { mensaje: "Rol no reconocido." };
      }
    } catch (ctxError: any) {
      console.error("Error construyendo contexto:", ctxError?.message);
      contexto = {
        aviso: "Algunos datos no pudieron cargarse en este momento.",
      };
    }

    const systemPrompt = buildSystemPrompt(usuario, contexto);

    // Llamar a Groq
    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            ...(history || []).slice(-20),
            { role: "user", content: message },
          ],
          temperature: 0.2,
          max_tokens: 4000,
        }),
      },
    );

    if (!groqRes.ok) {
      const errData = await groqRes.json();
      throw new Error(`Groq: ${errData.error?.message || "Error desconocido"}`);
    }

    const aiData = await groqRes.json();
    const aiMessage =
      aiData.choices?.[0]?.message?.content?.trim() ||
      "No pude procesar tu solicitud.";

    return createResponse({ response: aiMessage });
  } catch (error: any) {
    console.error("Error en Edge Function:", error?.message);
    return createResponse(
      { error: error.message || "Error interno del servidor." },
      500,
    );
  }
});
