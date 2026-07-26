'use client'

import { useState } from 'react'
import { finalizarVisita } from '@/app/proyecto/[id]/actions'

type Pregunta = {
  id: string
  texto: string
  tipo_respuesta: 'texto' | 'si_no' | 'calificacion'
  orden: number
}

type Seccion = {
  id: string
  nombre: string
  orden: number
  preguntas: Pregunta[]
}

type Respuesta = {
  valor_texto?: string
  valor_si_no?: boolean
  valor_calificacion?: number
}

type VisitaPrevia = {
  id: string
  fecha_cierre: string
} | null

export default function RevisionWizard({
  proyectoId,
  contactoId,
  proyecto,
  secciones,
  visitaPrevia,
}: {
  proyectoId: string
  contactoId: string
  proyecto: any
  secciones: Seccion[]
  visitaPrevia: VisitaPrevia
}) {
  const seccionesOrdenadas = [...secciones].sort((a, b) => a.orden - b.orden)
  const [seccionActual, setSeccionActual] = useState(0)
  const [respuestas, setRespuestas] = useState<Record<string, Respuesta>>({})
  const [enviando, setEnviando] = useState(false)
  const [finalizado, setFinalizado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avisoConfirmado, setAvisoConfirmado] = useState(false)

  const seccion = seccionesOrdenadas[seccionActual]
  const esUltima = seccionActual === seccionesOrdenadas.length - 1

  function actualizarRespuesta(preguntaId: string, campo: keyof Respuesta, valor: any) {
    setRespuestas((prev) => ({
      ...prev,
      [preguntaId]: { ...prev[preguntaId], [campo]: valor },
    }))
  }

  async function handleFinalizar() {
    setEnviando(true)
    setError(null)
    try {
      await finalizarVisita({
        proyectoId,
        contactoId,
        respuestas,
      })
      setFinalizado(true)
    } catch (e) {
      setError('Hubo un error al enviar tus observaciones. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  if (finalizado) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">¡Gracias por tu revisión!</h1>
        <p>Tus observaciones fueron enviadas correctamente.</p>
      </div>
    )
  }

  if (visitaPrevia && !avisoConfirmado) {
    const fecha = new Date(visitaPrevia.fecha_cierre).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <h1 className="text-xl font-bold mb-3">{proyecto?.nombre}</h1>
        <p className="mb-6">
          Ya completaste una revisión de este proyecto el <strong>{fecha}</strong>.
          Si quieres, puedes dejar una nueva observación.
        </p>
        <button
          type="button"
          className="px-4 py-2 rounded bg-black text-white"
          onClick={() => setAvisoConfirmado(true)}
        >
          Continuar de todos modos
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-xl font-bold mb-1">{proyecto?.nombre}</h1>
      <p className="text-sm text-gray-500 mb-6">
        Sección {seccionActual + 1} de {seccionesOrdenadas.length}: {seccion.nombre}
      </p>

      <div className="space-y-6">
        {seccion.preguntas
          .sort((a, b) => a.orden - b.orden)
          .map((pregunta) => (
            <div key={pregunta.id}>
              <label className="block font-medium mb-2">{pregunta.texto}</label>

              {pregunta.tipo_respuesta === 'texto' && (
                <textarea
                  className="w-full border rounded p-2"
                  rows={3}
                  value={respuestas[pregunta.id]?.valor_texto ?? ''}
                  onChange={(e) =>
                    actualizarRespuesta(pregunta.id, 'valor_texto', e.target.value)
                  }
                />
              )}

              {pregunta.tipo_respuesta === 'si_no' && (
                <div className="flex gap-4">
                  <button
                    type="button"
                    className={`px-4 py-2 rounded border ${
                      respuestas[pregunta.id]?.valor_si_no === true
                        ? 'bg-green-600 text-white'
                        : ''
                    }`}
                    onClick={() => actualizarRespuesta(pregunta.id, 'valor_si_no', true)}
                  >
                    Sí
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 rounded border ${
                      respuestas[pregunta.id]?.valor_si_no === false
                        ? 'bg-red-600 text-white'
                        : ''
                    }`}
                    onClick={() => actualizarRespuesta(pregunta.id, 'valor_si_no', false)}
                  >
                    No
                  </button>
                </div>
              )}

              {pregunta.tipo_respuesta === 'calificacion' && (
                <div className="flex gap-2 flex-wrap">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`w-9 h-9 rounded border ${
                        respuestas[pregunta.id]?.valor_calificacion === n
                          ? 'bg-blue-600 text-white'
                          : ''
                      }`}
                      onClick={() =>
                        actualizarRespuesta(pregunta.id, 'valor_calificacion', n)
                      }
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>

      {error && <p className="text-red-600 mt-4">{error}</p>}

      <div className="flex justify-between mt-8">
        <button
          type="button"
          disabled={seccionActual === 0}
          className="px-4 py-2 rounded border disabled:opacity-40"
          onClick={() => setSeccionActual((s) => s - 1)}
        >
          Anterior
        </button>

        {esUltima ? (
          <button
            type="button"
            disabled={enviando}
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
            onClick={handleFinalizar}
          >
            {enviando ? 'Enviando...' : 'Finalizar visita y enviar observaciones'}
          </button>
        ) : (
          <button
            type="button"
            className="px-4 py-2 rounded bg-black text-white"
            onClick={() => setSeccionActual((s) => s + 1)}
          >
            Siguiente
          </button>
        )}
      </div>
    </div>
  )
}
