// supabase/functions/chat/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// 1. Configuración de CORS Robusta
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Helper para respuestas consistentes
const createResponse = (body: any, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  // 2. Manejo de Preflight (OPTIONS) - Crucial para evitar "Status 0"
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // VALIDACIÓN TEMPRANA: Verificar GROQ_API_KEY
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    if (!groqApiKey) {
      console.error('❌ GROQ_API_KEY no configurada')
      return createResponse({ 
        error: 'Configuración de IA incompleta. Contacta al administrador.',
        code: 'GROQ_KEY_MISSING',
        suggestion: 'La API Key de Groq no está configurada en las variables de entorno de Supabase.'
      }, 503)
    }

    // 3. Obtener Auth Token y Body
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Falta cabecera de autorización')
    }

    const { message, history } = await req.json()

    // 4. Inicializar Cliente Supabase (Con contexto del usuario)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // 5. Verificar Usuario
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Usuario no autenticado')

    // 6. Recopilar Datos Académicos (Contexto para la IA)
    // Buscamos datos del usuario en public.usuarios
    const { data: usuario, error: dbError } = await supabaseClient
      .from('usuarios')
      .select('*')
      .eq('supabase_id', user.id) // Asegúrate que este campo linkea con auth.users
      .single()
    
    // Si no está en tabla usuarios, usamos datos básicos de auth
    const userData = usuario || { first_name: 'Estudiante', rol: 'estudiante' }

    let contextoSistema = `Eres Eva, asistente académica de Info Campus. 
    Eres amable, profesional y siempre respondes en español.
    
    Información del usuario:
    - Nombre: ${userData.first_name} ${userData.last_name || ''}
    - Rol: ${userData.rol}
    
    Instrucciones: Responde de manera breve, clara y útil. Si el usuario tiene preguntas sobre notas, horarios o pagos, usa el contexto proporcionado.`

    // Validación CRÍTICA: Solo buscar datos si userData.id existe
    if (userData.rol === 'estudiante' && userData.id) {
       console.log(`🔍 Buscando datos para estudiante ID: ${userData.id}`)
       
       try {
         // Buscar inscripciones/notas
         const { data: inscripciones, error: inscError } = await supabaseClient
          .from('inscripciones')
          .select(`nota_final, estado, secciones(materias(nombre))`)
          .eq('estudiante_id', userData.id)
         
         if (inscError) {
           console.error('Error consultando inscripciones:', inscError)
         }
         
         // Buscar deudas
         const { count: deudas, error: deudaError } = await supabaseClient
          .from('pagos')
          .select('*', { count: 'exact', head: true })
          .eq('estudiante_id', userData.id)
         
         if (deudaError) {
           console.error('Error consultando pagos:', deudaError)
         }
         
         contextoSistema += `\nNotas actuales: ${JSON.stringify(inscripciones || [])}`
         contextoSistema += `\nDeudas pendientes: ${deudas && deudas > 0 ? 'Sí' : 'No'}`
       } catch (dbError) {
         console.error('Error consultando base de datos:', dbError)
         contextoSistema += `\nNotas: No disponibles en este momento`
       }
    } else if (userData.rol === 'estudiante' && !userData.id) {
      console.warn('⚠️ Usuario estudiante sin ID válido en tabla usuarios')
      contextoSistema += `\nNota: No se encontraron datos académicos completos para este usuario.`
    }

    // 7. Llamada a Groq AI (La API Key ya fue validada al inicio)
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // Modelo rápido y eficiente
        messages: [
          { role: 'system', content: contextoSistema + "\nResponde breve, amable y en español." },
          ...(history || []),
          { role: 'user', content: message }
        ],
        temperature: 0.6,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const errData = await response.json()
      throw new Error(`Error Groq: ${errData.error?.message}`)
    }

    const aiData = await response.json()
    const aiMessage = aiData.choices?.[0]?.message?.content || 'No pude procesar tu solicitud.'

    // 8. Respuesta Exitosa
    return createResponse({ response: aiMessage })

  } catch (error: any) {
    console.error('Error en Edge Function:', error)
    // Retornamos JSON incluso en error, con headers CORS
    return createResponse({ 
      error: error.message || 'Error interno del servidor',
      suggestion: 'Intenta recargar la página.'
    }, 500)
  }
})