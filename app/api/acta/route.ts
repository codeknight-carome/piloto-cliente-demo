import { createClient } from '@/app/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import React from 'react'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  titulo: {
    fontSize: 18,
    marginBottom: 4,
    fontFamily: 'Helvetica-Bold',
  },
  subtitulo: {
    fontSize: 11,
    color: '#555',
    marginBottom: 2,
  },
  notaBox: {
    marginTop: 16,
    marginBottom: 16,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  seccionTitulo: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    marginTop: 16,
    marginBottom: 6,
    color: '#222',
  },
  preguntaBox: {
    marginBottom: 8,
    paddingBottom: 6,
    borderBottom: '1px solid #eee',
  },
  preguntaTexto: {
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  respuestaTexto: {
    color: '#333',
  },
  estadoBadge: {
    fontSize: 9,
    marginTop: 2,
    color: '#888',
  },
})

function formatearValor(r: any) {
  if (r.preguntas?.tipo_respuesta === 'si_no') {
    return r.valor_si_no ? 'Sí' : 'No'
  }
  if (r.preguntas?.tipo_respuesta === 'calificacion') {
    return `${r.valor_calificacion} / 10`
  }
  return r.valor_texto || '(sin respuesta)'
}

function agruparPorSeccion(respuestas: any[]) {
  const grupos: Record<string, any[]> = {}
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

function ActaDocument({ proyecto, visita, nota }: { proyecto: any; visita: any; nota: string }) {
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

  return React.createElement(
    Document,
    {},
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      React.createElement(Text, { style: styles.titulo }, 'Acta de Revisión'),
      React.createElement(Text, { style: styles.subtitulo }, `Proyecto: ${proyecto?.nombre ?? ''}`),
      React.createElement(Text, { style: styles.subtitulo }, `Visita del: ${fecha}`),
      React.createElement(
        Text,
        { style: styles.subtitulo },
        `Contacto: ${visita.contactos?.correo ?? 'Desconocido'}`
      ),
      nota
        ? React.createElement(
            View,
            { style: styles.notaBox },
            React.createElement(Text, { style: styles.preguntaTexto }, 'Nota del desarrollador:'),
            React.createElement(Text, {}, nota)
          )
        : null,
      ...secciones.map((seccion) =>
        React.createElement(
          View,
          { key: seccion.nombre },
          React.createElement(Text, { style: styles.seccionTitulo }, seccion.nombre),
          ...seccion.respuestas.map((r: any) =>
            React.createElement(
              View,
              { key: r.id, style: styles.preguntaBox },
              React.createElement(Text, { style: styles.preguntaTexto }, r.preguntas?.texto ?? ''),
              React.createElement(Text, { style: styles.respuestaTexto }, formatearValor(r)),
              React.createElement(
                Text,
                { style: styles.estadoBadge },
                r.estado === 'resuelta' ? 'Estado: Resuelta' : 'Estado: Pendiente'
              )
            )
          )
        )
      )
    )
  )
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: admin } = await supabase
    .from('admins')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { visitaId, nota } = await request.json()

  const { data: proyecto } = await supabase
    .from('proyectos')
    .select('*')
    .eq('id', (await supabase.from('visitas').select('proyecto_id').eq('id', visitaId).single()).data?.proyecto_id)
    .single()

  const { data: visitaRaw } = await supabase
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
    .eq('id', visitaId)
    .single()

  if (!visitaRaw) {
    return NextResponse.json({ error: 'Visita no encontrada' }, { status: 404 })
  }

  const v: any = visitaRaw
  const visita = {
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
              secciones: Array.isArray(pregunta.secciones) ? pregunta.secciones[0] ?? null : pregunta.secciones,
            }
          : null,
      }
    }),
  }

  const pdfBuffer = await renderToBuffer(
    ActaDocument({ proyecto, visita, nota: nota ?? '' }) as any
  )

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="acta-${visitaId}.pdf"`,
    },
  })
}
