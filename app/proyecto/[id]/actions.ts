'use server'

import { createClient } from '@/app/lib/supabase-server'

type Respuesta = {
  valor_texto?: string
  valor_si_no?: boolean
  valor_calificacion?: number
}

export async function finalizarVisita({
  proyectoId,
  contactoId,
  respuestas,
}: {
  proyectoId: string
  contactoId: string
  respuestas: Record<string, Respuesta>
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('No autenticado')
  }

  // 1. Crear la visita, ya finalizada
  const { data: visita, error: errorVisita } = await supabase
    .from('visitas')
    .insert({
      proyecto_id: proyectoId,
      contacto_id: contactoId,
      estado: 'finalizada',
      fecha_cierre: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (errorVisita || !visita) {
    throw new Error(errorVisita?.message ?? 'No se pudo crear la visita')
  }

  // 2. Insertar todas las respuestas vinculadas a esa visita
  const filas = Object.entries(respuestas)
    .filter(([, r]) => r.valor_texto || r.valor_si_no !== undefined || r.valor_calificacion)
    .map(([preguntaId, r]) => ({
      visita_id: visita.id,
      pregunta_id: preguntaId,
      valor_texto: r.valor_texto ?? null,
      valor_si_no: r.valor_si_no ?? null,
      valor_calificacion: r.valor_calificacion ?? null,
    }))

  if (filas.length > 0) {
    const { error: errorRespuestas } = await supabase
      .from('respuestas')
      .insert(filas)

    if (errorRespuestas) {
      throw new Error(errorRespuestas.message)
    }
  }

  return { visitaId: visita.id }
}
