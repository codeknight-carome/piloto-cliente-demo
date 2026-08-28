'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [modo, setModo] = useState<'login' | 'recuperar'>('login')
  const [mensajeRecuperacion, setMensajeRecuperacion] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !authData.user) {
      setLoading(false)
      setError('Correo o contraseña incorrectos.')
      return
    }

    // ¿Es admin?
    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('auth_user_id', authData.user.id)
      .single()

    if (admin) {
      setLoading(false)
      router.push('/admin')
      return
    }

    // Si no es admin, buscar el proyecto vinculado como contacto
    const { data: contacto, error: contactoError } = await supabase
      .from('contactos')
      .select('proyecto_id')
      .eq('auth_user_id', authData.user.id)
      .single()

    setLoading(false)

    if (contactoError || !contacto) {
      setError('Tu cuenta no tiene ningún proyecto vinculado. Contacta al desarrollador.')
      return
    }

    router.push(`/proyecto/${contacto.proyecto_id}`)
  }

  async function handleRecuperar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMensajeRecuperacion('')
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)

    if (error) {
      setError('No se pudo enviar el correo de recuperación. Intenta de nuevo.')
      return
    }

    setMensajeRecuperacion('Te enviamos un enlace a tu correo para definir una nueva contraseña.')
  }

  if (modo === 'recuperar') {
    return (
      <div style={{ maxWidth: '400px', margin: '80px auto', padding: '20px' }}>
        <h1>Recuperar contraseña</h1>
        <form onSubmit={handleRecuperar}>
          <div style={{ marginBottom: '12px' }}>
            <label>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '8px', marginTop: '4px' }}
            />
          </div>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          {mensajeRecuperacion && <p style={{ color: 'green' }}>{mensajeRecuperacion}</p>}
          <button type="submit" disabled={loading} style={{ padding: '10px 20px' }}>
            {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
          </button>
        </form>
        <p style={{ marginTop: '16px' }}>
          <button
            type="button"
            onClick={() => {
              setModo('login')
              setError('')
              setMensajeRecuperacion('')
            }}
            style={{ background: 'none', border: 'none', color: '#0070f3', cursor: 'pointer', padding: 0 }}
          >
            Volver a iniciar sesión
          </button>
        </p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '400px', margin: '80px auto', padding: '20px' }}>
      <h1>Acceso al proyecto</h1>
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '12px' }}>
          <label>Correo electrónico</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ padding: '10px 20px' }}>
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
      <p style={{ marginTop: '16px' }}>
        <button
          type="button"
          onClick={() => {
            setModo('recuperar')
            setError('')
          }}
          style={{ background: 'none', border: 'none', color: '#0070f3', cursor: 'pointer', padding: 0 }}
        >
          ¿Olvidaste tu contraseña?
        </button>
      </p>
    </div>
  )
}
