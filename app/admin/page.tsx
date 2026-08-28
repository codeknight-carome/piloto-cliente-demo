import { createClient } from '@/app/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function AdminHomePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: admin } = await supabase
    .from('admins')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!admin) redirect('/login')

  const { data: proyectos } = await supabase
    .from('proyectos')
    .select('id, nombre')
    .order('nombre', { ascending: true })

  return (
    <div style={{ maxWidth: '600px', margin: '80px auto', padding: '20px' }}>
      <h1>Panel de administrador</h1>
      <p style={{ color: '#666', marginBottom: '24px' }}>Selecciona un proyecto:</p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {(proyectos ?? []).map((p) => (
          <li key={p.id} style={{ marginBottom: '10px' }}>
            <a href={`/admin/proyecto/${p.id}`} style={{ color: '#0070f3', textDecoration: 'underline' }}>
              {p.nombre}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
