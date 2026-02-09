// supabase/functions/chat/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, history } = await req.json()
    
    // Validar autorización
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Crear cliente Supabase con auth del usuario
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Obtener usuario actual
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Usuario no autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Obtener datos del usuario desde tabla usuarios
    const { data: usuario, error: usuarioError } = await supabaseClient
      .from('usuarios')
      .select('*')
      .eq('supabase_id', user.id)
      .single()

    if (usuarioError) {
      return new Response(JSON.stringify({ error: 'Error obteniendo datos de usuario' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Construir contexto académico
    let contexto = `Información del usuario:\n`
    contexto += `- Nombre: ${usuario.first_name} ${usuario.last_name}\n`
    contexto += `- Rol: ${usuario.rol}\n`
    contexto += `- Username: ${usuario.username}\n`

    if (usuario.rol === 'estudiante') {
      // Obtener inscripciones del estudiante
      const { data: inscripciones } = await supabaseClient
        .from('inscripciones')
        .select(`
          id,
          nota_final,
          estado,
          secciones (
            codigo_seccion,
            materias (nombre, codigo, creditos)
          )
        `)
        .eq('estudiante_id', usuario.id)

      const notasValidas = inscripciones?.filter(i => i.nota_final && i.nota_final > 0) || []
      const promedio = notasValidas.length > 0
        ? (notasValidas.reduce((sum, i) => sum + parseFloat(i.nota_final), 0) / notasValidas.length).toFixed(2)
        : '0.00'

      contexto += `- Promedio académico: ${promedio}\n`
      contexto += `- Materias cursadas: ${inscripciones?.length || 0}\n`
      contexto += `- Materias aprobadas: ${notasValidas.filter(i => parseFloat(i.nota_final) >= 7).length}\n`
      contexto += `- Deuda pendiente: $${usuario.deuda_total || '0.00'}\n`
      contexto += `- En mora: ${usuario.en_mora ? 'Sí' : 'No'}\n`
      contexto += `- Es becado: ${usuario.es_becado ? `Sí (${usuario.porcentaje_beca}%)` : 'No'}\n`

      if (inscripciones && inscripciones.length > 0) {
        contexto += `\nMaterias actuales:\n`
        inscripciones.slice(0, 8).forEach(insc => {
          const materia = insc.secciones?.materias
          if (materia) {
            contexto += `- ${materia.nombre} (${materia.codigo})`
            contexto += insc.nota_final ? `: Nota ${insc.nota_final}` : ': En curso'
            contexto += `\n`
          }
        })
      }
    }

    // Llamar a Groq API (Llama 3.1)
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    if (!groqApiKey) {
      throw new Error('GROQ_API_KEY no configurada')
    }
    
    const systemPrompt = `Eres un asistente académico de Campus Elite ERP.
Ayudas a estudiantes con consultas sobre sus notas, pagos, horarios y estado académico.
Sé conciso, amable y profesional. Si no tienes información específica, dilo claramente.

${contexto}

Responde de manera conversacional y útil basándote en esta información.
IMPORTANTE: Siempre responde en español.`

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          ...(history || []).map(h => ({ role: h.role, content: h.content })),
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 600,
        top_p: 0.9
      })
    })

    if (!groqResponse.ok) {
      const errorData = await groqResponse.json()
      throw new Error(`Groq API error: ${errorData.error?.message || 'Unknown error'}`)
    }

    const groqData = await groqResponse.json()
    const aiResponse = groqData.choices?.[0]?.message?.content || 'Lo siento, no pude generar una respuesta.'

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error en chat function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Error interno del servidor',
        details: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})