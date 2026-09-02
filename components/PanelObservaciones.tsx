'use client'

import { useState } from 'react'
import { marcarResuelta } from '@/app/admin/proyecto/[id]/actions'

type Pregunta = {
  texto: string
  tipo_respuesta: 'texto' | 'si_no' | 'calificacion'
  orden: number
  secciones: { nombre: string; orden: number } | null
}

type Respuesta = {
  id: string
  valor_texto: string | null
  valor_si_no: boolean | null
  valor_calificacion: number | null
  estado: 'pendiente' | 'resuelta'
  preguntas: Pregunta | null
}

type Visita = {
  id: string
  fecha_inicio: string
  fecha_cierre: string | null
  estado: string
  contactos: { correo: string } | null
  respuestas: Respuesta[]
}

function formatearValor(r: Respuesta) {
  if (r.preguntas?.tipo_respuesta === 'si_no') {
    return r.valor_si_no ? 'Sí' : 'No'
  }
  if (r.preguntas?.tipo_respuesta === 'calificacion') {
    return `${r.valor_calificacion} / 10`
  }
  return r.valor_texto || '(sin respuesta)'
}

function agruparPorSeccion(respuestas: Respuesta[]) {
  const grupos: Record<string, Respuesta[]> = {}
  const ordenSeccion: Record<string, number> = {}

  for (const r of respuestas) {
    const nombreSeccion = r.preguntas?.secciones?.nombre ?? 'Sin sección'
    if (!grupos[nombreSeccion]) grupos[nombreSeccion] = []
    grupos[nombreSeccion].push(r)
    ordenSeccion[nombreSeccion] = r.preguntas?.secciones?.orden ?? 999
  }

  return Object.entries(grupos)
    .sort(([a], [b]) => ordenSeccion[a] - ordenSeccion[b])
    .map(([nombre, respuestas]) => ({
      nombre,
      respuestas: respuestas.sort(
        (a, b) => (a.preguntas?.orden ?? 0) - (b.preguntas?.orden ?? 0)
      ),
    }))
}

export default function PanelObservaciones({
  proyecto,
  visitas,
}: {
  proyecto: any
  visitas: Visita[]
}) {
  const [estados, setEstados] = useState<Record<string, 'pendiente' | 'resuelta'>>(
    () => {
      const inicial: Record<string, 'pendiente' | 'resuelta'> = {}
      visitas.forEach((v) =>
        v.respuestas.forEach((r) => {
          inicial[r.id] = r.estado
        })
      )
      return inicial
    }
  )
  const [actualizando, setActualizando] = useState<string | null>(null)

  async function handleToggle(respuestaId: string, estadoActual: 'pendiente' | 'resuelta') {
    const nuevoEstado = estadoActual === 'pendiente' ? 'resuelta' : 'pendiente'
    setActualizando(respuestaId)
    try {
      await marcarResuelta({ respuestaId, estado: nuevoEstado })
      setEstados((prev) => ({ ...prev, [respuestaId]: nuevoEstado }))
    } catch (e) {
      alert('No se pudo actualizar el estado. Intenta de nuevo.')
    } finally {
      setActualizando(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-1">{proyecto?.nombre}</h1>
      <p className="text-sm text-gray-500 mb-8">Panel de observaciones (administrador)</p>

      {visitas.length === 0 && (
        <p className="text-gray-500">Todavía no hay visitas registradas para este proyecto.</p>
      )}

      <div className="space-y-10">
        {visitas.map((visita) => {
          const fecha = visita.fecha_cierre
            ? new Date(visita.fecha_cierre).toLocaleDateString('es-CO', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'En curso'

          const secciones = agruparPorSeccion(visita.respuestas)

          return (
            <div key={visita.id} className="border rounded-lg p-5">
              <h2 className="font-semibold mb-1">Visita del {fecha}</h2>
              <p className="text-sm text-gray-500 mb-4">
                {visita.contactos?.correo ?? 'Contacto desconocido'}
              </p>

              <div className="space-y-6">
                {secciones.map((seccion) => (
                  <div key={seccion.nombre}>
                    <h3 className="font-medium text-sm uppercase text-gray-500 mb-2">
                      {seccion.nombre}
                    </h3>
                    <div className="space-y-3">
                      {seccion.respuestas.map((r) => {
                        const estado = estados[r.id] ?? r.estado
                        const esPendiente = estado === 'pendiente'
                        return (
                          <div
                            key={r.id}
                            className={`flex items-start justify-between gap-4 p-3 rounded border ${
                              esPendiente ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50'
                            }`}
                          >
                            <div>
                              <p className="text-sm font-medium">{r.preguntas?.texto}</p>
                              <p className="text-sm text-gray-700">{formatearValor(r)}</p>
                            </div>
                            <button
                              type="button"
                              disabled={actualizando === r.id}
                              onClick={() => handleToggle(r.id, estado)}
                              className={`shrink-0 text-xs px-3 py-1.5 rounded whitespace-nowrap ${
                                esPendiente
                                  ? 'bg-black text-white'
                                  : 'border text-gray-600'
                              } disabled:opacity-50`}
                            >
                              {actualizando === r.id
                                ? '...'
                                : esPendiente
                                ? 'Marcar resuelta'
                                : 'Resuelta ✓'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
