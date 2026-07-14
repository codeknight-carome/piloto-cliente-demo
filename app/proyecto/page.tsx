import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function ProyectoPage() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // No se necesita en un componente de servidor de solo lectura
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Buscar el contacto vinculado a este usuario, y su proyecto
  const { data: contacto, error } = await supabase
    .from('contactos')
    .select('correo, proyectos(id, nombre, fecha_limite_acceso)')
    .eq('auth_user_id', user.id)
    .single()

   if (error || !contacto) {
    return (
      <div style={{ maxWidth: '600px', margin: '80px auto', padding: '20px' }}>
        <h1>Sin proyecto asignado</h1>
        <p>Tu cuenta no tiene ningún proyecto vinculado todavía. Contacta al desarrollador.</p>
      </div>
    )
  }

  const proyecto = Array.isArray(contacto.proyectos) ? contacto.proyectos[0] : contacto.proyectos

  return (
    <div style={{ maxWidth: '600px', margin: '80px auto', padding: '20px', position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: '#999',
          fontSize: '12px',
        }}
      >
        {contacto.correo}
      </div>
      <h1>{proyecto?.nombre}</h1>
      <p>Acceso vigente hasta: {proyecto?.fecha_limite_acceso}</p>
      <p style={{ marginTop: '40px', color: '#666' }}>
        Aquí se mostrará el desarrollo del proyecto (staging embebido).
      </p>
    </div>
  )
}