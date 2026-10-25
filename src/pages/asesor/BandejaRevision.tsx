import { useEffect, useState } from 'react';
import { api, endpoints } from '../../api/client';
import { EstadoPill } from '../../components/EstadoPill';
import type { PropuestaGenerada } from '../../types';

type Estado = PropuestaGenerada['estado'];
interface Observacion {
  id_recomendacion: number;
  contenido: string;
  fecha_creacion: string;
}
type PropuestaRevision = PropuestaGenerada & { observaciones?: Observacion[] };
const acciones: { estado: Estado; texto: string }[] = [
  { estado: 'revisada', texto: 'Marcar revisada' },
  { estado: 'ajustada', texto: 'Pedir ajustes' },
  { estado: 'aprobada', texto: 'Aprobar' },
];
const filtros: { valor: Estado | 'todas'; texto: string }[] = [
  { valor: 'todas', texto: 'Todas' },
  { valor: 'generada', texto: 'Por revisar' },
  { valor: 'revisada', texto: 'Revisadas' },
  { valor: 'ajustada', texto: 'Con ajustes' },
  { valor: 'aprobada', texto: 'Aprobadas' },
];

function lista(texto: string[] | string) {
  if (Array.isArray(texto)) return texto;
  try {
    const v = JSON.parse(texto);
    if (Array.isArray(v)) return v as string[];
  } catch {
    /* texto plano */
  }
  return texto.split(/\n+/).filter(Boolean);
}

export default function BandejaRevision() {
  const [propuestas, setPropuestas] = useState<PropuestaRevision[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<number | null>(null);
  const [guardando, setGuardando] = useState<number | null>(null);
  const [filtro, setFiltro] = useState<Estado | 'todas'>('todas');
  const [accion, setAccion] = useState<{ id: number; estado: Estado } | null>(null);
  const [comentario, setComentario] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    cargarLista();
  }, []);

  function cargarLista() {
    setCargando(true);
    setError(null);
    api
      .get(endpoints.propuestas)
      .then(({ data }) => setPropuestas(data.propuestas ?? data))
      .catch((err) => {
        setPropuestas([]);
        setError(err?.response?.data?.mensaje || 'No se pudieron cargar las propuestas.');
      })
      .finally(() => setCargando(false));
  }

  function abrirAccion(id: number, estado: Estado) {
    setAccion({ id, estado });
    setComentario('');
    setError(null);
    setAviso(null);
  }

  async function confirmarAccion() {
    if (!accion) return;
    const { id, estado } = accion;
    if (estado === 'ajustada' && !comentario.trim()) {
      setError('Escribe qué debe ajustar el estudiante.');
      return;
    }
    setGuardando(id);
    setError(null);
    try {
      await api.patch(endpoints.propuestaPorId(id), { estado, comentario: comentario.trim() });
      setAccion(null);
      setAviso('Listo. El estudiante verá el cambio en su sección Revisiones.');
      cargarLista();
    } catch (err: any) {
      setError(err?.response?.data?.mensaje || 'No se pudo actualizar el estado.');
    } finally {
      setGuardando(null);
    }
  }

  const visibles = propuestas.filter((p) => filtro === 'todas' || p.estado === filtro);
  const porRevisar = propuestas.filter((p) => p.estado === 'generada').length;

  return (
    <div>
      <p className="text-[13px] tracking-wide text-gold-dark mb-2">Asesoría</p>
      <h1 className="text-3xl mb-2">Bandeja de revisión</h1>
      <p className="text-slate-soft mb-6 text-[15px]">
        {cargando ? 'Cargando…' : `${propuestas.length} propuestas en total, ${porRevisar} por revisar.`}
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {filtros.map((f) => (
          <button
            key={f.valor}
            onClick={() => setFiltro(f.valor)}
            className={`btn-ghost !px-3.5 !py-1.5 text-[13px] ${filtro === f.valor ? '!bg-ink !text-white' : ''}`}
          >
            {f.texto}
          </button>
        ))}
      </div>

      {error && !accion && <p className="mb-4 text-danger text-[14px]">{error}</p>}
      {aviso && <p className="mb-4 text-ok text-[14px]">{aviso}</p>}

      {!cargando && visibles.length === 0 && !error && (
        <div className="folio p-8 max-w-lg">
          <p className="text-slate-soft text-[15px]">No hay propuestas en esta categoría.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {visibles.map((p) => {
          const expandida = abierta === p.id_propuesta;
          return (
            <div key={p.id_propuesta} className="folio">
              <div className="folio-header">
                <div className="min-w-0">
                  <p className="text-[13px] text-slate-soft">
                    {p.nombre_estudiante ?? `Formulario #${p.id_formulario}`}
                    {p.carnet ? `, carnet ${p.carnet}` : ''}
                    {p.area_interes ? `. Área: ${p.area_interes}` : ''}
                  </p>
                  <h3 className="text-lg m-0">{p.propuesta_tema_1}</h3>
                </div>
                <EstadoPill estado={p.estado} />
              </div>
              <div className="p-6">
                {!expandida && (
                  <p className="text-[14.5px] text-slate leading-relaxed line-clamp-2">{p.planteamiento_problema}</p>
                )}
                {expandida && (
                  <div className="space-y-4 text-[14.5px] leading-relaxed">
                    <section>
                      <h4 className="font-semibold mb-1">Planteamiento del problema</h4>
                      <p>{p.planteamiento_problema}</p>
                    </section>
                    <section>
                      <h4 className="font-semibold mb-1">Objetivo general</h4>
                      <p>{p.objetivo_general}</p>
                    </section>
                    <section>
                      <h4 className="font-semibold mb-1">Objetivos específicos</h4>
                      <ul className="list-disc pl-5 space-y-1">
                        {lista(p.objetivos_especificos).map((o, i) => (
                          <li key={i}>{o}</li>
                        ))}
                      </ul>
                    </section>
                    <section>
                      <h4 className="font-semibold mb-1">Justificación</h4>
                      <p>{p.justificacion}</p>
                    </section>
                  </div>
                )}
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <button
                    className="text-[13px] underline text-slate-soft hover:text-ink mr-2"
                    onClick={() => setAbierta(expandida ? null : p.id_propuesta)}
                  >
                    {expandida ? 'Ocultar detalle' : 'Ver propuesta completa'}
                  </button>
                  {acciones.map((a) => (
                    <button
                      key={a.estado}
                      disabled={guardando === p.id_propuesta || a.estado === p.estado}
                      onClick={() => abrirAccion(p.id_propuesta, a.estado)}
                      className={`btn-ghost !px-3.5 !py-1.5 text-[13px] ${a.estado === p.estado ? 'opacity-40' : ''}`}
                    >
                      {a.texto}
                    </button>
                  ))}
                </div>

                {accion?.id === p.id_propuesta && (
                  <div className="mt-5 border-t border-paper-300 pt-5">
                    <label className="label-field" htmlFor={`obs-${p.id_propuesta}`}>
                      {accion.estado === 'ajustada'
                        ? 'Qué debe ajustar el estudiante (obligatorio)'
                        : 'Comentario para el estudiante (opcional)'}
                    </label>
                    <textarea
                      id={`obs-${p.id_propuesta}`}
                      className="input-field min-h-[110px]"
                      maxLength={2000}
                      value={comentario}
                      onChange={(e) => setComentario(e.target.value)}
                      placeholder={
                        accion.estado === 'ajustada'
                          ? 'Ej. Delimita la población a una institución y redacta el objetivo general con un verbo medible.'
                          : 'Ej. Buen planteamiento, puedes continuar con el marco teórico.'
                      }
                    />
                    {error && <p className="mt-2 text-danger text-[13.5px]">{error}</p>}
                    <div className="mt-3 flex gap-2">
                      <button className="btn-gold" disabled={guardando === p.id_propuesta} onClick={confirmarAccion}>
                        {guardando === p.id_propuesta ? 'Guardando…' : 'Guardar y avisar al estudiante'}
                      </button>
                      <button className="btn-ghost" onClick={() => setAccion(null)}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {p.observaciones && p.observaciones.length > 0 && (
                  <div className="mt-5">
                    <p className="text-[13px] text-slate-soft mb-2">Observaciones enviadas</p>
                    <ul className="space-y-2">
                      {p.observaciones.map((o) => (
                        <li key={o.id_recomendacion} className="bg-paper-200 rounded-sm px-4 py-2.5 text-[14px]">
                          <span className="text-slate-soft text-[12.5px] mr-2">{o.fecha_creacion}</span>
                          {o.contenido}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
