'use server'

import { createClient } from '@/app/lib/supabase-server'

export async function marcarResuelta({
  respuestaId,
  estado,
}: {
  respuestaId: string
  estado: 'pendiente' | 'resuelta'
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('No autenticado')
  }

  // Verificar que quien llama es admin
  const { data: admin } = await supabase
    .from('admins')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!admin) {
    throw new Error('No autorizado')
  }

  const { error } = await supabase
    .from('respuestas')
    .update({ estado })
    .eq('id', respuestaId)

  if (error) {
    throw new Error(error.message)
  }

  return { success: true }
}
