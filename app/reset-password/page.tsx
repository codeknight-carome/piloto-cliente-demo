'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [exito, setExito] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (password !== confirmar) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError('No se pudo actualizar la contraseña. El enlace pudo haber expirado, solicita uno nuevo.')
      return
    }

    setExito(true)
    setTimeout(() => router.push('/login'), 2000)
  }

  if (exito) {
    return (
      <div style={{ maxWidth: '400px', margin: '80px auto', padding: '20px', textAlign: 'center' }}>
        <h1>¡Contraseña actualizada!</h1>
        <p>Redirigiendo al inicio de sesión...</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '400px', margin: '80px auto', padding: '20px' }}>
      <h1>Definir nueva contraseña</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '12px' }}>
          <label>Nueva contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label>Confirmar contraseña</label>
          <input
            type="password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ padding: '10px 20px' }}>
          {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
        </button>
      </form>
    </div>
  )
}
