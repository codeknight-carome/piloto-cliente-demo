import { createClient } from '@/app/lib/supabase-server'
import { redirect } from 'next/navigation'
import RevisionWizard from '@/components/RevisionWizard'

export default async function ProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: contacto } = await supabase
    .from('contactos')
    .select('id, correo')
    .eq('auth_user_id', user.id)
    .eq('proyecto_id', id)
    .single()

  if (!contacto) redirect('/login')

  const { data: proyecto } = await supabase
    .from('proyectos')
    .select('*')
    .eq('id', id)
    .single()

  const { data: secciones } = await supabase
    .from('secciones')
    .select('id, nombre, orden, preguntas(id, texto, tipo_respuesta, orden)')
    .order('orden', { ascending: true })

  const { data: visitaPrevia } = await supabase
    .from('visitas')
    .select('id, fecha_cierre')
    .eq('contacto_id', contacto.id)
    .eq('proyecto_id', id)
    .eq('estado', 'finalizada')
    .order('fecha_cierre', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Calcular estado de acceso según fecha_limite_acceso
  let estadoAcceso: 'vigente' | 'por_vencer' | 'vencido' = 'vigente'
  let diasRestantes: number | null = null

  if (proyecto?.fecha_limite_acceso) {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const limite = new Date(proyecto.fecha_limite_acceso)
    limite.setHours(0, 0, 0, 0)

    const msPorDia = 1000 * 60 * 60 * 24
    diasRestantes = Math.round((limite.getTime() - hoy.getTime()) / msPorDia)

    if (diasRestantes < 0) {
      estadoAcceso = 'vencido'
    } else if (diasRestantes <= 3) {
      estadoAcceso = 'por_vencer'
    }
  }

  // Si el acceso venció, traer todo el historial de visitas finalizadas (modo lectura)
  let historialVisitas: any[] = []
  if (estadoAcceso === 'vencido') {
    const { data } = await supabase
      .from('visitas')
      .select(`
        id,
        fecha_cierre,
        respuestas (
          id,
          valor_texto,
          valor_si_no,
          valor_calificacion,
          preguntas ( texto, tipo_respuesta, orden, secciones ( nombre, orden ) )
        )
      `)
      .eq('contacto_id', contacto.id)
      .eq('proyecto_id', id)
      .eq('estado', 'finalizada')
      .order('fecha_cierre', { ascending: false })

    historialVisitas = (data ?? []).map((v: any) => ({
      id: v.id,
      fecha_cierre: v.fecha_cierre,
      respuestas: (v.respuestas ?? []).map((r: any) => {
        const pregunta = Array.isArray(r.preguntas) ? r.preguntas[0] : r.preguntas
        return {
          id: r.id,
          valor_texto: r.valor_texto,
          valor_si_no: r.valor_si_no,
          valor_calificacion: r.valor_calificacion,
          preguntas: pregunta
            ? {
                texto: pregunta.texto,
                tipo_respuesta: pregunta.tipo_respuesta,
                orden: pregunta.orden,
                secciones: Array.isArray(pregunta.secciones)
                  ? pregunta.secciones[0] ?? null
                  : pregunta.secciones,
              }
            : null,
        }
      }),
    }))
  }

  return (
    <RevisionWizard
      proyectoId={id}
      contactoId={contacto.id}
      proyecto={proyecto}
      secciones={secciones ?? []}
      visitaPrevia={visitaPrevia}
      estadoAcceso={estadoAcceso}
      diasRestantes={diasRestantes}
      historialVisitas={historialVisitas}
    />
  )
}
