import { Fragment, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { api } from '../../api/client';
import { EstadoPill } from '../../components/EstadoPill';

/* ------------------------------------------------------------------ *
 *  Tipos de las respuestas de /api/coordinacion
 * ------------------------------------------------------------------ */
interface Conteo { estado: string; total: number }
interface Resumen {
  propuestas: Conteo[];
  formularios: Conteo[];
  areas: { area: string; total: number }[];
  ia: {
    por_estado: Conteo[];
    tiempo_promedio_ms: number | null;
    ultimos_errores: { fecha: string; estado: string; mensaje: string | null }[];
  };
}
interface EstudianteFila {
  id_estudiante: number;
  nombre_completo: string;
  correo: string;
  carnet: string;
  carrera: string;
  sede: string | null;
  estado_cuenta: string | null;
  formularios: number;
  propuestas: number;
  por_revisar: number;
  ajustadas: number;
  aprobadas: number;
  ultima_actividad: string | null;
}
interface Detalle {
  propuestas: {
    id_propuesta: number;
    propuesta_tema_1: string;
    estado: string;
    fecha_generacion: string;
    area_interes: string;
    observaciones: { contenido: string; fecha_creacion: string }[];
  }[];
}
interface Cuenta {
  id_usuario: number;
  correo: string;
  fecha_creacion: string;
  nombre_completo: string | null;
  carnet: string | null;
  carrera: string | null;
}

/* La base de datos guarda la hora en UTC sin zona: se muestra en hora local. */
function fecha(f?: string | null, conHora = false) {
  if (!f) return 'Sin actividad';
  const d = new Date(f.includes('T') ? f : f.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return f;
  return d.toLocaleString('es-GT', conHora ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' });
}

const nombreEstado: Record<string, string> = {
  generada: 'Por revisar',
  revisada: 'Revisadas',
  ajustada: 'Con ajustes',
  aprobada: 'Aprobadas',
};
const colorEstado: Record<string, string> = {
  generada: 'bg-ink-600',
  revisada: 'bg-gold-light',
  ajustada: 'bg-gold',
  aprobada: 'bg-ok',
};

function Barras({ datos, color }: { datos: { etiqueta: string; total: number; color?: string }[]; color?: string }) {
  const max = Math.max(1, ...datos.map((d) => d.total));
  if (datos.length === 0) return <p className="text-slate-soft text-[14px]">Sin datos todavía.</p>;
  return (
    <ul className="space-y-3">
      {datos.map((d) => (
        <li key={d.etiqueta} className="grid grid-cols-[minmax(110px,40%)_1fr_36px] items-center gap-3 text-[14px]">
          <span className="truncate" title={d.etiqueta}>{d.etiqueta.charAt(0).toUpperCase() + d.etiqueta.slice(1)}</span>
          <span className="h-3 rounded-sm bg-paper-200 overflow-hidden">
            <span className={`block h-full ${d.color ?? color ?? 'bg-ink-600'}`} style={{ width: `${(d.total / max) * 100}%` }} />
          </span>
          <span className="text-right tabular-nums text-slate-soft">{d.total}</span>
        </li>
      ))}
    </ul>
  );
}

function descargarCSV(filas: EstudianteFila[]) {
  const enc = ['Nombre', 'Carnet', 'Correo', 'Carrera', 'Sede', 'Cuenta', 'Formularios', 'Propuestas', 'Por revisar', 'Con ajustes', 'Aprobadas', 'Última actividad'];
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lineas = filas.map((e) =>
    [e.nombre_completo, e.carnet, e.correo, e.carrera, e.sede, e.estado_cuenta ?? 'sin cuenta', e.formularios, e.propuestas, e.por_revisar, e.ajustadas, e.aprobadas, fecha(e.ultima_actividad)]
      .map(esc)
      .join(','),
  );
  // El BOM al inicio hace que Excel lea bien las tildes.
  const blob = new Blob(['﻿' + [enc.map(esc).join(','), ...lineas].join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reporte_estudiantes_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PanelGeneral() {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [estudiantes, setEstudiantes] = useState<EstudianteFila[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<Record<number, Detalle>>({});
  const [buscar, setBuscar] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);

  function cargar() {
    setCargando(true);
    setError(null);
    Promise.all([
      api.get('/coordinacion/resumen'),
      api.get('/coordinacion/estudiantes'),
      api.get('/coordinacion/cuentas-pendientes'),
    ])
      .then(([r, e, c]) => {
        setResumen(r.data);
        setEstudiantes(e.data.estudiantes ?? []);
        setCuentas(c.data.cuentas ?? []);
      })
      .catch((err) => setError(err?.response?.data?.mensaje || 'No se pudo cargar el panel.'))
      .finally(() => setCargando(false));
  }

  useEffect(cargar, []);

  async function abrir(id: number) {
    if (abierto === id) return setAbierto(null);
    setAbierto(id);
    if (!detalle[id]) {
      try {
        const { data } = await api.get(`/coordinacion/estudiantes/${id}`);
        setDetalle((d) => ({ ...d, [id]: data }));
      } catch {
        setDetalle((d) => ({ ...d, [id]: { propuestas: [] } }));
      }
    }
  }

  async function activar(c: Cuenta) {
    setAviso(null);
    try {
      await api.patch(`/coordinacion/cuentas/${c.id_usuario}/activar`);
      setAviso(`Cuenta de ${c.nombre_completo ?? c.correo} activada. Ya puede ingresar.`);
      cargar();
    } catch (err: any) {
      setAviso(err?.response?.data?.mensaje || 'No se pudo activar la cuenta.');
    }
  }

  if (cargando && !resumen) return <p className="text-slate-soft">Cargando panel…</p>;
  if (error) return <p className="text-danger">{error}</p>;
  if (!resumen) return null;

  const totalProp = resumen.propuestas.reduce((a, p) => a + p.total, 0);
  const totalForm = resumen.formularios.reduce((a, p) => a + p.total, 0);
  const aprobadas = resumen.propuestas.find((p) => p.estado === 'aprobada')?.total ?? 0;
  const exitos = resumen.ia.por_estado.find((p) => p.estado === 'exitoso')?.total ?? 0;
  const totalIA = resumen.ia.por_estado.reduce((a, p) => a + p.total, 0);
  const tasa = totalIA ? Math.round((exitos / totalIA) * 100) : null;
  const filtrados = estudiantes.filter((e) =>
    `${e.nombre_completo} ${e.carnet} ${e.correo}`.toLowerCase().includes(buscar.trim().toLowerCase()),
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[13px] tracking-wide text-gold-dark mb-2">Coordinación</p>
          <h1 className="text-3xl">Panel general</h1>
          <p className="text-slate-soft text-[15px] mt-1">Seguimiento del avance de los estudiantes y del funcionamiento del asistente.</p>
        </div>
        <button className="btn-ghost inline-flex items-center gap-2" onClick={() => descargarCSV(estudiantes)}>
          <Download size={16} /> Descargar reporte (Excel)
        </button>
      </div>

      {aviso && <p className="text-[14px] text-ok">{aviso}</p>}

      {/* ---------- Cuentas por aprobar ---------- */}
      {cuentas.length > 0 && (
        <section className="folio">
          <div className="folio-header">
            <h2 className="text-lg m-0">Cuentas de estudiantes por aprobar ({cuentas.length})</h2>
          </div>
          <ul className="divide-y divide-paper-300">
            {cuentas.map((c) => (
              <li key={c.id_usuario} className="px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 text-[14.5px]">
                <div>
                  <p className="font-medium">{c.nombre_completo ?? c.correo}</p>
                  <p className="text-slate-soft text-[13px]">
                    {c.correo}{c.carnet ? `, carnet ${c.carnet}` : ''}{c.carrera ? `. ${c.carrera}` : ''}. Se registró el {fecha(c.fecha_creacion)}
                  </p>
                </div>
                <button className="btn-gold !px-4 !py-1.5 text-[13px]" onClick={() => activar(c)}>Activar cuenta</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------- Indicadores ---------- */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { etiqueta: 'Estudiantes', valor: estudiantes.length, nota: `${estudiantes.filter((e) => e.formularios > 0).length} con actividad` },
          { etiqueta: 'Formularios', valor: totalForm, nota: `${resumen.formularios.find((f) => f.estado === 'procesado')?.total ?? 0} procesados` },
          { etiqueta: 'Propuestas generadas', valor: totalProp, nota: `${resumen.propuestas.find((p) => p.estado === 'generada')?.total ?? 0} por revisar` },
          { etiqueta: 'Propuestas aprobadas', valor: aprobadas, nota: totalProp ? `${Math.round((aprobadas / totalProp) * 100)} % del total` : 'Sin propuestas' },
        ].map((s) => (
          <div key={s.etiqueta} className="folio px-5 py-5">
            <p className="text-[13px] text-slate-soft mb-1.5">{s.etiqueta}</p>
            <p className="font-serif text-3xl text-ink tabular-nums">{s.valor}</p>
            <p className="text-[12.5px] text-slate-soft mt-1">{s.nota}</p>
          </div>
        ))}
      </section>

      {/* ---------- Gráficas ---------- */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="folio p-6">
          <h2 className="text-lg mb-1">Propuestas por estado de revisión</h2>
          <p className="text-[13px] text-slate-soft mb-5">Cómo van las revisiones de los asesores.</p>
          <Barras
            datos={['generada', 'revisada', 'ajustada', 'aprobada'].map((e) => ({
              etiqueta: nombreEstado[e],
              total: resumen.propuestas.find((p) => p.estado === e)?.total ?? 0,
              color: colorEstado[e],
            }))}
          />
        </div>
        <div className="folio p-6">
          <h2 className="text-lg mb-1">Áreas de interés más solicitadas</h2>
          <p className="text-[13px] text-slate-soft mb-5">Temas que más buscan los estudiantes.</p>
          <Barras datos={resumen.areas.map((a) => ({ etiqueta: a.area, total: a.total }))} color="bg-gold" />
        </div>
      </section>

      {/* ---------- Rendimiento de la IA ---------- */}
      <section className="folio p-6">
        <h2 className="text-lg mb-1">Rendimiento del asistente de IA</h2>
        <p className="text-[13px] text-slate-soft mb-5">Según el historial de solicitudes de generación de propuestas.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-[13px] text-slate-soft">Solicitudes</p>
            <p className="font-serif text-2xl tabular-nums">{totalIA}</p>
          </div>
          <div>
            <p className="text-[13px] text-slate-soft">Exitosas</p>
            <p className="font-serif text-2xl tabular-nums text-ok">{tasa === null ? '—' : `${tasa} %`}</p>
          </div>
          <div>
            <p className="text-[13px] text-slate-soft">Con error</p>
            <p className="font-serif text-2xl tabular-nums text-danger">{totalIA - exitos}</p>
          </div>
          <div>
            <p className="text-[13px] text-slate-soft">Tiempo promedio</p>
            <p className="font-serif text-2xl tabular-nums">
              {resumen.ia.tiempo_promedio_ms == null ? '—' : `${(resumen.ia.tiempo_promedio_ms / 1000).toFixed(1)} s`}
            </p>
            {resumen.ia.tiempo_promedio_ms == null && (
              <p className="text-[12px] text-slate-soft">Se mide desde las próximas generaciones.</p>
            )}
          </div>
        </div>
        <h3 className="text-[14px] font-semibold mb-2">Últimos errores</h3>
        {resumen.ia.ultimos_errores.length === 0 ? (
          <p className="text-[14px] text-slate-soft">No hay errores registrados.</p>
        ) : (
          <ul className="space-y-2">
            {resumen.ia.ultimos_errores.map((e, i) => (
              <li key={i} className="flex flex-wrap items-center gap-3 text-[13.5px] bg-paper-200 rounded-sm px-4 py-2.5">
                <span className="text-slate-soft whitespace-nowrap">{fecha(e.fecha, true)}</span>
                <EstadoPill estado={e.estado} />
                <span className="min-w-0 flex-1">{e.mensaje ?? 'Sin detalle'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---------- Estudiantes ---------- */}
      <section className="folio overflow-hidden">
        <div className="folio-header flex-wrap gap-3">
          <h2 className="text-lg m-0">Avance por estudiante</h2>
          <input
            id="buscar-estudiante"
            className="input-field !w-64 !py-1.5"
            placeholder="Buscar por nombre, carnet o correo"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[14.5px]">
            <thead>
              <tr className="border-b border-paper-300 text-left text-slate-soft">
                <th className="px-6 py-3 font-medium">Estudiante</th>
                <th className="px-4 py-3 font-medium text-right">Formularios</th>
                <th className="px-4 py-3 font-medium text-right">Propuestas</th>
                <th className="px-4 py-3 font-medium">Revisión</th>
                <th className="px-4 py-3 font-medium">Última actividad</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-5 text-slate-soft">No hay estudiantes que coincidan.</td></tr>
              )}
              {filtrados.map((e) => (
                <Fragment key={e.id_estudiante}>
                  <tr className="border-b border-paper-300">
                    <td className="px-6 py-3.5">
                      <p className="font-medium">{e.nombre_completo}</p>
                      <p className="text-[12.5px] text-slate-soft">
                        {e.carnet}, {e.carrera}
                        {e.estado_cuenta === 'inactivo' && <span className="text-danger">. Cuenta pendiente</span>}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums">{e.formularios}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums">{e.propuestas}</td>
                    <td className="px-4 py-3.5 text-[13px]">
                      {e.propuestas === 0 ? (
                        <span className="text-slate-soft">Sin propuestas</span>
                      ) : (
                        <span className="flex flex-wrap gap-x-3">
                          {e.por_revisar > 0 && <span>{e.por_revisar} por revisar</span>}
                          {e.ajustadas > 0 && <span className="text-gold-dark">{e.ajustadas} con ajustes</span>}
                          {e.aprobadas > 0 && <span className="text-ok">{e.aprobadas} {e.aprobadas === 1 ? 'aprobada' : 'aprobadas'}</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-soft whitespace-nowrap">{fecha(e.ultima_actividad)}</td>
                    <td className="px-4 py-3.5 text-right">
                      {e.propuestas > 0 && (
                        <button className="text-[13px] underline text-slate-soft hover:text-ink" onClick={() => abrir(e.id_estudiante)}>
                          {abierto === e.id_estudiante ? 'Ocultar' : 'Ver detalle'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {abierto === e.id_estudiante && (
                    <tr className="border-b border-paper-300 bg-paper-200/40">
                      <td colSpan={6} className="px-6 py-4">
                        {!detalle[e.id_estudiante] ? (
                          <p className="text-slate-soft text-[14px]">Cargando…</p>
                        ) : (
                          <ul className="space-y-3">
                            {detalle[e.id_estudiante].propuestas.map((p) => (
                              <li key={p.id_propuesta} className="bg-paper-100 border border-paper-300 rounded-sm px-4 py-3">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-[12.5px] text-slate-soft">{fecha(p.fecha_generacion, true)}, área: {p.area_interes}</p>
                                    <p className="text-[14.5px]">{p.propuesta_tema_1}</p>
                                  </div>
                                  <EstadoPill estado={p.estado} />
                                </div>
                                {p.observaciones.map((o, i) => (
                                  <p key={i} className="mt-2 text-[13.5px] text-slate">
                                    <span className="text-slate-soft">Observación del asesor ({fecha(o.fecha_creacion)}): </span>
                                    {o.contenido}
                                  </p>
                                ))}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
