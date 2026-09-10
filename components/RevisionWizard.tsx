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

type PreguntaHistorial = {
  texto: string
  tipo_respuesta: 'texto' | 'si_no' | 'calificacion'
  orden: number
  secciones: { nombre: string; orden: number } | null
}

type RespuestaHistorial = {
  id: string
  valor_texto: string | null
  valor_si_no: boolean | null
  valor_calificacion: number | null
  preguntas: PreguntaHistorial | null
}

type VisitaHistorial = {
  id: string
  fecha_cierre: string | null
  respuestas: RespuestaHistorial[]
}

function formatearValorHistorial(r: RespuestaHistorial) {
  if (r.preguntas?.tipo_respuesta === 'si_no') {
    return r.valor_si_no ? 'Sí' : 'No'
  }
  if (r.preguntas?.tipo_respuesta === 'calificacion') {
    return `${r.valor_calificacion} / 10`
  }
  return r.valor_texto || '(sin respuesta)'
}

function agruparPorSeccionHistorial(respuestas: RespuestaHistorial[]) {
  const grupos: Record<string, RespuestaHistorial[]> = {}
  const orden: Record<string, number> = {}
  for (const r of respuestas) {
    const nombre = r.preguntas?.secciones?.nombre ?? 'Sin sección'
    if (!grupos[nombre]) grupos[nombre] = []
    grupos[nombre].push(r)
    orden[nombre] = r.preguntas?.secciones?.orden ?? 999
  }
  return Object.entries(grupos)
    .sort(([a], [b]) => orden[a] - orden[b])
    .map(([nombre, respuestas]) => ({
      nombre,
      respuestas: respuestas.sort((a, b) => (a.preguntas?.orden ?? 0) - (b.preguntas?.orden ?? 0)),
    }))
}

export default function RevisionWizard({
  proyectoId,
  contactoId,
  proyecto,
  secciones,
  visitaPrevia,
  estadoAcceso,
  diasRestantes,
  historialVisitas,
}: {
  proyectoId: string
  contactoId: string
  proyecto: any
  secciones: Seccion[]
  visitaPrevia: VisitaPrevia
  estadoAcceso: 'vigente' | 'por_vencer' | 'vencido'
  diasRestantes: number | null
  historialVisitas: VisitaHistorial[]
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

  const bannerAcceso =
    estadoAcceso === 'por_vencer' ? (
      <div className="max-w-2xl mx-auto px-8 pt-6">
        <div className="bg-amber-50 border border-amber-300 text-amber-800 text-sm rounded p-3">
          Tu acceso a este proyecto vence en {diasRestantes === 0 ? 'menos de un día' : `${diasRestantes} día(s)`}
          {' '}({proyecto?.fecha_limite_acceso}).
        </div>
      </div>
    ) : null

  if (estadoAcceso === 'vencido') {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <h1 className="text-xl font-bold mb-1">{proyecto?.nombre}</h1>
        <div className="bg-red-50 border border-red-300 text-red-800 text-sm rounded p-3 mb-6">
          Tu acceso para nuevas revisiones venció el {proyecto?.fecha_limite_acceso}. Puedes
          consultar tus revisiones anteriores a continuación.
        </div>

        {historialVisitas.length === 0 && (
          <p className="text-gray-500">No hay revisiones anteriores registradas.</p>
        )}

        <div className="space-y-8">
          {historialVisitas.map((v) => {
            const fecha = v.fecha_cierre
              ? new Date(v.fecha_cierre).toLocaleDateString('es-CO', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : ''
            const secciones = agruparPorSeccionHistorial(v.respuestas)
            return (
              <div key={v.id} className="border rounded-lg p-4">
                <h2 className="font-semibold mb-3">Revisión del {fecha}</h2>
                <div className="space-y-4">
                  {secciones.map((s) => (
                    <div key={s.nombre}>
                      <h3 className="text-xs uppercase text-gray-500 font-medium mb-1">
                        {s.nombre}
                      </h3>
                      <div className="space-y-2">
                        {s.respuestas.map((r) => (
                          <div key={r.id} className="text-sm">
                            <p className="font-medium">{r.preguntas?.texto}</p>
                            <p className="text-gray-600">{formatearValorHistorial(r)}</p>
                          </div>
                        ))}
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
      <>
        {bannerAcceso}
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
      </>
    )
  }

  return (
    <>
      {bannerAcceso}
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
    </>
  )
}
