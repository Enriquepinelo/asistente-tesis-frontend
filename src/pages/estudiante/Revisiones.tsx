import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, FileText, MessageSquare } from 'lucide-react';
import { api, endpoints } from '../../api/client';
import { EstadoPill } from '../../components/EstadoPill';
import { useAuth } from '../../context/AuthContext';
import { cargarObservaciones, marcarVistas, ultimaVista, type Observacion } from '../../api/revisiones';
import { abrirPropuesta, desdeBaseDeDatos } from '../../api/propuestaFlujo';
import type { PropuestaGenerada } from '../../types';
import { descargarDocumento, misDocumentos, tamano, type DocumentoRevision } from '../../api/documentos';

type Estado = PropuestaGenerada['estado'];
type Pestana = Estado | 'todas';

// La base de datos guarda la hora en UTC sin zona: se agrega "Z" para mostrarla en hora local.
function fecha(iso?: string, conHora = true) {
  if (!iso) return '';
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-GT', conHora ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' });
}

const explicacion: Record<string, string> = {
  generada: 'Tu asesor todavía no la revisa.',
  revisada: 'Tu asesor ya leyó esta propuesta.',
  ajustada: 'Tu asesor pide que hagas cambios. Lee sus observaciones.',
  aprobada: 'Tu asesor aprobó esta propuesta.',
};

const PESTANAS: { valor: Pestana; texto: string; color: string }[] = [
  { valor: 'ajustada', texto: 'Con ajustes', color: 'text-gold-dark' },
  { valor: 'aprobada', texto: 'Aprobadas', color: 'text-ok' },
  { valor: 'revisada', texto: 'Revisadas', color: 'text-gold-dark' },
  { valor: 'generada', texto: 'Por revisar', color: 'text-ink-600' },
  { valor: 'todas', texto: 'Todas', color: 'text-ink' },
];

export default function Revisiones() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [propuestas, setPropuestas] = useState<PropuestaGenerada[]>([]);
  const [obs, setObs] = useState<Observacion[]>([]);
  const [docs, setDocs] = useState<Record<number, DocumentoRevision[]>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vistaAnterior] = useState(() => ultimaVista(usuario?.correo));
  const [pestana, setPestana] = useState<Pestana | null>(null);
  const [abierta, setAbierta] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([api.get(endpoints.propuestas), cargarObservaciones()])
      .then(([{ data }, o]) => {
        const lista: PropuestaGenerada[] = data.propuestas ?? data;
        setPropuestas(lista);
        setObs(o);
        // Si hay propuestas con ajustes, se abre esa pestaña primero porque es lo que necesita atención.
        setPestana((p) => p ?? (lista.some((x) => x.estado === 'ajustada') ? 'ajustada' : 'todas'));
        misDocumentos()
          .then((todos) => {
            const porPropuesta: Record<number, DocumentoRevision[]> = {};
            for (const d of todos) (porPropuesta[d.id_propuesta] ??= []).push(d);
            setDocs(porPropuesta);
          })
          .catch(() => undefined);
        marcarVistas(usuario?.correo, o);
      })
      .catch((err) => setError(err?.response?.data?.mensaje || 'No se pudieron cargar tus revisiones.'))
      .finally(() => setCargando(false));
  }, [usuario?.correo]);

  const obsDe = (p: PropuestaGenerada) => obs.filter((o) => o.id_formulario === p.id_formulario);
  const conteo = (v: Pestana) => (v === 'todas' ? propuestas.length : propuestas.filter((p) => p.estado === v).length);
  const visibles = propuestas.filter((p) => !pestana || pestana === 'todas' || p.estado === pestana);
  const nuevas = obs.filter((o) => o.id_recomendacion > vistaAnterior).length;
  const totalDocs = Object.values(docs).reduce((a, l) => a + l.length, 0);

  function verCompleta(p: PropuestaGenerada) {
    abrirPropuesta(usuario?.correo, desdeBaseDeDatos(p));
    navigate('/estudiante/propuesta');
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[13px] tracking-wide text-gold-dark mb-2">Seguimiento</p>
        <h1 className="text-3xl">Revisiones de mi asesor</h1>
        <p className="text-slate-soft text-[15px] mt-1">El estado de cada propuesta, lo que tu asesor te pide y los documentos que te compartió.</p>
      </div>

      {error && <p className="text-danger text-[14px]">{error}</p>}
      {cargando && <p className="text-slate-soft">Cargando…</p>}

      {!cargando && !error && (
        <>
          {/* ---------- Resumen ---------- */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {PESTANAS.slice(0, 3).map((t) => (
              <button
                key={t.valor}
                onClick={() => setPestana(t.valor)}
                className={`folio px-5 py-4 text-left ${pestana === t.valor ? '!border-gold' : ''}`}
              >
                <p className="text-[13px] text-slate-soft">{t.texto}</p>
                <p className={`font-serif text-3xl tabular-nums ${t.color}`}>{conteo(t.valor)}</p>
              </button>
            ))}
            <div className="folio px-5 py-4">
              <p className="text-[13px] text-slate-soft">Novedades</p>
              <p className="font-serif text-3xl tabular-nums">{nuevas}</p>
              <p className="text-[12px] text-slate-soft">
                {nuevas === 1 ? 'observación nueva' : 'observaciones nuevas'}, {totalDocs} {totalDocs === 1 ? 'documento' : 'documentos'}
              </p>
            </div>
          </section>

          {/* ---------- Pestañas ---------- */}
          <div className="flex flex-wrap gap-2 border-b border-paper-300 pb-3">
            {PESTANAS.map((t) => (
              <button
                key={t.valor}
                onClick={() => setPestana(t.valor)}
                className={`btn-ghost !px-3.5 !py-1.5 text-[13px] ${pestana === t.valor ? '!bg-ink !text-white' : ''}`}
              >
                {t.texto} <span className="ml-1 opacity-70 tabular-nums">{conteo(t.valor)}</span>
              </button>
            ))}
          </div>

          {visibles.length === 0 && (
            <div className="folio p-8 max-w-lg">
              <p className="text-slate-soft text-[15px]">
                {pestana === 'ajustada'
                  ? 'No tienes ajustes pendientes.'
                  : pestana === 'aprobada'
                    ? 'Todavía no tienes propuestas aprobadas.'
                    : 'No hay propuestas en esta categoría.'}
              </p>
            </div>
          )}

          {/* ---------- Lista compacta ---------- */}
          {visibles.length > 0 && (
            <ul className="folio divide-y divide-paper-300 overflow-hidden">
              {visibles.map((p) => {
                const suyas = obsDe(p);
                const susDocs = docs[p.id_propuesta] ?? [];
                const hayNuevo = suyas.some((o) => o.id_recomendacion > vistaAnterior);
                const abierto = abierta === p.id_propuesta;
                return (
                  <li key={p.id_propuesta}>
                    <button
                      className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-paper-200/40"
                      onClick={() => setAbierta(abierto ? null : p.id_propuesta)}
                    >
                      <span className="mt-1 text-slate-soft">{abierto ? <ChevronDown size={17} /> : <ChevronRight size={17} />}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] leading-snug">{p.propuesta_tema_1}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-slate-soft">
                          <span>{fecha(p.fecha_generacion, false)}</span>
                          {suyas.length > 0 && (
                            <span className="inline-flex items-center gap-1"><MessageSquare size={13} /> {suyas.length} {suyas.length === 1 ? 'observación' : 'observaciones'}</span>
                          )}
                          {susDocs.length > 0 && (
                            <span className="inline-flex items-center gap-1"><FileText size={13} /> {susDocs.length} {susDocs.length === 1 ? 'documento' : 'documentos'}</span>
                          )}
                          {hayNuevo && <span className="pill bg-gold/15 text-gold-dark">Nuevo</span>}
                        </span>
                      </span>
                      <EstadoPill estado={p.estado} />
                    </button>

                    {abierto && (
                      <div className="px-5 pb-5 pl-12 space-y-4">
                        <p className="text-[13.5px] text-slate-soft">{explicacion[p.estado]}</p>

                        {susDocs.length > 0 && (
                          <div>
                            <p className="text-[13px] font-semibold mb-1.5">Documentos de tu asesor</p>
                            <ul className="space-y-1.5">
                              {susDocs.map((d) => (
                                <li key={d.id_documento} className="flex flex-wrap items-center gap-2 text-[14px]">
                                  <FileText size={15} className="text-slate-soft" />
                                  <button className="underline" onClick={() => descargarDocumento(d).catch(() => undefined)}>{d.nombre_archivo}</button>
                                  <span className="text-[12.5px] text-slate-soft">{tamano(d.tamano_bytes)}, {fecha(d.fecha_subida)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div>
                          <p className="text-[13px] font-semibold mb-1.5">Observaciones</p>
                          {suyas.length === 0 ? (
                            <p className="text-[14px] text-slate-soft">Sin observaciones escritas.</p>
                          ) : (
                            <ul className="space-y-2">
                              {suyas.map((o) => (
                                <li key={o.id_recomendacion} className="bg-paper-200 rounded-sm px-4 py-3">
                                  <div className="flex items-center gap-2 text-[12.5px] text-slate-soft mb-1">
                                    <span>{fecha(o.fecha_creacion)}</span>
                                    {o.id_recomendacion > vistaAnterior && <span className="pill bg-gold/15 text-gold-dark">Nuevo</span>}
                                  </div>
                                  <p className="text-[14.5px] leading-relaxed whitespace-pre-line">{o.contenido}</p>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <button className="btn-ghost !px-3.5 !py-1.5 text-[13px]" onClick={() => verCompleta(p)}>
                          Ver propuesta completa
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
