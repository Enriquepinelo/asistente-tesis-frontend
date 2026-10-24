import { useEffect, useState } from 'react';
import { api, endpoints } from '../../api/client';
import { EstadoPill } from '../../components/EstadoPill';
import type { PropuestaGenerada } from '../../types';

type Estado = PropuestaGenerada['estado'];
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
  const [propuestas, setPropuestas] = useState<PropuestaGenerada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<number | null>(null);
  const [guardando, setGuardando] = useState<number | null>(null);
  const [filtro, setFiltro] = useState<Estado | 'todas'>('todas');

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

  async function actualizarEstado(id: number, estado: Estado) {
    setGuardando(id);
    setError(null);
    try {
      await api.patch(endpoints.propuestaPorId(id), { estado });
      setPropuestas((ps) => ps.map((p) => (p.id_propuesta === id ? { ...p, estado } : p)));
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

      {error && <p className="mb-4 text-danger text-[14px]">{error}</p>}

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
                      onClick={() => actualizarEstado(p.id_propuesta, a.estado)}
                      className={`btn-ghost !px-3.5 !py-1.5 text-[13px] ${a.estado === p.estado ? 'opacity-40' : ''}`}
                    >
                      {a.texto}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
