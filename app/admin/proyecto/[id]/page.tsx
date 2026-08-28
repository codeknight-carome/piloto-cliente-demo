import { createClient } from '@/app/lib/supabase-server'
import { redirect } from 'next/navigation'
import PanelObservaciones from '@/components/PanelObservaciones'

export default async function AdminProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: admin } = await supabase
    .from('admins')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!admin) redirect('/login')

  const { data: proyecto } = await supabase
    .from('proyectos')
    .select('*')
    .eq('id', id)
    .single()

  const { data: visitasRaw } = await supabase
    .from('visitas')
    .select(`
      id,
      fecha_inicio,
      fecha_cierre,
      estado,
      contactos ( correo ),
      respuestas (
        id,
        valor_texto,
        valor_si_no,
        valor_calificacion,
        estado,
        preguntas (
          texto,
          tipo_respuesta,
          orden,
          secciones ( nombre, orden )
        )
      )
    `)
    .eq('proyecto_id', id)
    .order('fecha_cierre', { ascending: false })

  // Normalizar: Supabase devuelve las relaciones anidadas como arreglos,
  // aunque sean relaciones de uno-a-uno. Las convertimos a objeto simple.
  const visitas = (visitasRaw ?? []).map((v: any) => ({
    id: v.id,
    fecha_inicio: v.fecha_inicio,
    fecha_cierre: v.fecha_cierre,
    estado: v.estado,
    contactos: Array.isArray(v.contactos) ? v.contactos[0] ?? null : v.contactos,
    respuestas: (v.respuestas ?? []).map((r: any) => {
      const pregunta = Array.isArray(r.preguntas) ? r.preguntas[0] : r.preguntas
      return {
        id: r.id,
        valor_texto: r.valor_texto,
        valor_si_no: r.valor_si_no,
        valor_calificacion: r.valor_calificacion,
        estado: r.estado,
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

  return (
    <PanelObservaciones
      proyecto={proyecto}
      visitas={visitas}
    />
  )
}
