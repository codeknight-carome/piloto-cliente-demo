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

  // Buscar la visita finalizada más reciente de este contacto en este proyecto
  const { data: visitaPrevia } = await supabase
    .from('visitas')
    .select('id, fecha_cierre')
    .eq('contacto_id', contacto.id)
    .eq('proyecto_id', id)
    .eq('estado', 'finalizada')
    .order('fecha_cierre', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <RevisionWizard
      proyectoId={id}
      contactoId={contacto.id}
      proyecto={proyecto}
      secciones={secciones ?? []}
      visitaPrevia={visitaPrevia}
    />
  )
}
