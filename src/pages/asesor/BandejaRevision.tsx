import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FileDown, FileText, Search, Upload } from 'lucide-react';
import { api, endpoints } from '../../api/client';
import { EstadoPill } from '../../components/EstadoPill';
import type { PropuestaGenerada } from '../../types';
import { descargarDocumento, listarDocumentos, subirDocumento, tamano, type DocumentoRevision } from '../../api/documentos';

type Estado = PropuestaGenerada['estado'];
interface Observacion {
  id_recomendacion: number;
  contenido: string;
  fecha_creacion: string;
}
type PropuestaRevision = PropuestaGenerada & { observaciones?: Observacion[] };

const resumen: { estado: Estado; texto: string; color: string }[] = [
  { estado: 'generada', texto: 'Por revisar', color: 'text-ink-600' },
  { estado: 'revisada', texto: 'Revisadas', color: 'text-gold-dark' },
  { estado: 'ajustada', texto: 'Con ajustes', color: 'text-gold-dark' },
  { estado: 'aprobada', texto: 'Aprobadas', color: 'text-ok' },
];
const opcionesEstado: { estado: Estado; texto: string }[] = [
  { estado: 'revisada', texto: 'Marcar revisada' },
  { estado: 'ajustada', texto: 'Pedir ajustes' },
  { estado: 'aprobada', texto: 'Aprobar' },
];

// Rúbrica: cada criterio que no se cumple agrega su texto a la observación.
const RUBRICA = [
  { id: 'tema', texto: 'El tema está delimitado (población, lugar y tiempo)', falta: 'Delimitar el tema indicando población, lugar y periodo.' },
  { id: 'problema', texto: 'El problema está bien planteado y sustentado', falta: 'Fortalecer el planteamiento del problema con datos o antecedentes.' },
  { id: 'objetivos', texto: 'Los objetivos son claros y medibles', falta: 'Redactar los objetivos con verbos medibles y alineados al problema.' },
  { id: 'justificacion', texto: 'La justificación explica la relevancia', falta: 'Ampliar la justificación: a quién beneficia y por qué es relevante.' },
  { id: 'viable', texto: 'Es viable en tiempo y recursos', falta: 'Revisar la viabilidad del proyecto en tiempo y recursos disponibles.' },
];

const RAPIDAS = [
  'Delimita la población a una sola institución.',
  'Redacta el objetivo general con un verbo medible.',
  'Agrega antecedentes de estudios similares.',
  'Incluye datos que respalden el problema.',
  'Buen avance, puedes continuar con el marco teórico.',
];

function fechaLocal(f: string) {
  const d = new Date(f.includes('T') ? f : f.replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? f : d.toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' });
}
function diasDesde(f?: string) {
  if (!f) return 0;
  const d = new Date(f.includes('T') ? f : f.replace(' ', 'T') + 'Z');
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}
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

async function descargarWord(p: PropuestaRevision) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
  const T = (t: string, o: { bold?: boolean; size?: number; italics?: boolean } = {}) =>
    new Paragraph({ spacing: { after: 160, line: 360 }, children: [new TextRun({ text: t, font: 'Times New Roman', size: o.size ?? 24, bold: o.bold, italics: o.italics })] });
  const H = (t: string) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 }, children: [new TextRun({ text: t, font: 'Times New Roman', size: 26, bold: true, color: '000000' })] });
  const hijos = [
    T('Anteproyecto de tesis', { bold: true, size: 32 }),
    T(`Estudiante: ${p.nombre_estudiante ?? ''}${p.carnet ? `, carnet ${p.carnet}` : ''}`),
    T(`Área de interés: ${p.area_interes ?? ''}`),
    T(`Estado de revisión: ${({ generada: 'Por revisar', revisada: 'Revisada', ajustada: 'Con ajustes', aprobada: 'Aprobada' } as Record<string, string>)[p.estado] ?? p.estado}. Generada: ${p.fecha_generacion ? fechaLocal(p.fecha_generacion) : ''}`, { italics: true }),
    H('Tema de tesis'),
    T(p.propuesta_tema_1),
    H('Planteamiento del problema'),
    T(p.planteamiento_problema),
    H('Objetivo general'),
    T(p.objetivo_general),
    H('Objetivos específicos'),
    ...lista(p.objetivos_especificos).map((o, i) => T(`${i + 1}. ${o}`)),
    H('Justificación'),
    T(p.justificacion),
    H('Observaciones del asesor'),
    ...(p.observaciones?.length ? p.observaciones.map((o) => T(`${fechaLocal(o.fecha_creacion)}: ${o.contenido}`)) : [T('Sin observaciones todavía.', { italics: true })]),
  ];
  const doc = new Document({
    sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1417, bottom: 1417, left: 1701, right: 1417 } } }, children: hijos }],
  });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Propuesta_${(p.nombre_estudiante ?? 'estudiante').replace(/\s+/g, '_')}_${p.id_propuesta}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BandejaRevision() {
  const [propuestas, setPropuestas] = useState<PropuestaRevision[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Estado | 'todas'>('todas');
  const [buscar, setBuscar] = useState('');
  const [orden, setOrden] = useState<'antiguas' | 'recientes'>('antiguas');
  const [cerrados, setCerrados] = useState<Record<string, boolean>>({});
  const [abierta, setAbierta] = useState<number | null>(null);
  const [revisando, setRevisando] = useState<number | null>(null);
  const [criterios, setCriterios] = useState<Record<string, boolean>>({});
  const [estadoElegido, setEstadoElegido] = useState<Estado>('revisada');
  const [comentario, setComentario] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [docs, setDocs] = useState<Record<number, DocumentoRevision[] | string>>({});
  const [subiendo, setSubiendo] = useState<number | null>(null);

  useEffect(cargarLista, []);

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

  function cargarDocs(id: number) {
    listarDocumentos(id)
      .then((d) => setDocs((x) => ({ ...x, [id]: d })))
      .catch((err) => setDocs((x) => ({ ...x, [id]: err?.response?.data?.mensaje || 'No se pudieron cargar los documentos.' })));
  }

  function verDetalle(id: number) {
    const abrir = abierta !== id;
    setAbierta(abrir ? id : null);
    if (abrir && docs[id] === undefined) cargarDocs(id);
  }

  function abrirRevision(p: PropuestaRevision) {
    if (revisando === p.id_propuesta) return setRevisando(null);
    setRevisando(p.id_propuesta);
    setCriterios({});
    setEstadoElegido('revisada');
    setComentario('');
    setError(null);
    setAviso(null);
  }

  // Al marcar la rúbrica se sugiere el estado y se arma la observación.
  function marcar(id: string, valor: boolean) {
    const nuevos = { ...criterios, [id]: valor };
    setCriterios(nuevos);
    const cumple = RUBRICA.filter((c) => nuevos[c.id]).length;
    setEstadoElegido(cumple === RUBRICA.length ? 'aprobada' : cumple >= 3 ? 'revisada' : 'ajustada');
    const faltas = RUBRICA.filter((c) => !nuevos[c.id]).map((c) => `- ${c.falta}`);
    setComentario(
      faltas.length === 0
        ? 'La propuesta cumple todos los criterios de la rúbrica.'
        : `Cumple ${cumple} de ${RUBRICA.length} criterios. Para mejorar:\n${faltas.join('\n')}`,
    );
  }

  function agregarRapida(t: string) {
    setComentario((c) => (c.trim() ? `${c.trim()}\n${t}` : t));
  }

  async function guardar(p: PropuestaRevision) {
    if (estadoElegido === 'ajustada' && !comentario.trim()) return setError('Escribe qué debe ajustar el estudiante.');
    if (estadoElegido === p.estado && !comentario.trim()) return setError('Escribe la observación para el estudiante.');
    setGuardando(true);
    setError(null);
    try {
      await api.patch(endpoints.propuestaPorId(p.id_propuesta), { estado: estadoElegido, comentario: comentario.trim() });
      setRevisando(null);
      setAviso(`Revisión guardada. ${p.nombre_estudiante ?? 'El estudiante'} la verá en su sección Revisiones.`);
      cargarLista();
    } catch (err: any) {
      setError(err?.response?.data?.mensaje || 'No se pudo guardar la revisión.');
    } finally {
      setGuardando(false);
    }
  }

  async function subir(id: number, archivo?: File) {
    if (!archivo) return;
    setSubiendo(id);
    setAviso(null);
    setError(null);
    try {
      await subirDocumento(id, archivo);
      setAviso(`Documento "${archivo.name}" subido. El estudiante podrá descargarlo.`);
      cargarDocs(id);
    } catch (err: any) {
      setError(err?.response?.data?.mensaje || err?.message || 'No se pudo subir el documento.');
    } finally {
      setSubiendo(null);
    }
  }

  const conteo = (e: Estado) => propuestas.filter((p) => p.estado === e).length;
  const pendientes = propuestas.filter((p) => p.estado === 'generada');
  const masAntigua = pendientes.reduce((m, p) => Math.max(m, diasDesde(p.fecha_generacion)), 0);

  const grupos = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    const visibles = propuestas
      .filter((p) => filtro === 'todas' || p.estado === filtro)
      .filter((p) => `${p.nombre_estudiante ?? ''} ${p.carnet ?? ''} ${p.propuesta_tema_1}`.toLowerCase().includes(q))
      .sort((a, b) => {
        const fa = a.fecha_generacion ?? '';
        const fb = b.fecha_generacion ?? '';
        return orden === 'antiguas' ? fa.localeCompare(fb) : fb.localeCompare(fa);
      });
    const mapa = new Map<string, PropuestaRevision[]>();
    for (const p of visibles) {
      const k = `${p.nombre_estudiante ?? 'Sin nombre'}|${p.carnet ?? ''}`;
      mapa.set(k, [...(mapa.get(k) ?? []), p]);
    }
    return [...mapa.entries()];
  }, [propuestas, filtro, buscar, orden]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[13px] tracking-wide text-gold-dark mb-2">Asesoría</p>
        <h1 className="text-3xl">Bandeja de revisión</h1>
        <p className="text-slate-soft text-[15px] mt-1">Revisa las propuestas de tus estudiantes, deja observaciones y comparte documentos.</p>
      </div>

      {/* ---------- Resumen ---------- */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {resumen.map((r) => (
          <button
            key={r.estado}
            onClick={() => setFiltro(filtro === r.estado ? 'todas' : r.estado)}
            className={`folio px-5 py-4 text-left ${filtro === r.estado ? '!border-gold' : ''}`}
            title="Filtrar por este estado"
          >
            <p className="text-[13px] text-slate-soft">{r.texto}</p>
            <p className={`font-serif text-3xl tabular-nums ${r.color}`}>{conteo(r.estado)}</p>
          </button>
        ))}
        <div className="folio px-5 py-4 col-span-2 lg:col-span-1">
          <p className="text-[13px] text-slate-soft">Pendiente más antigua</p>
          <p className="font-serif text-3xl tabular-nums">{pendientes.length ? `${masAntigua} d` : '—'}</p>
          <p className="text-[12px] text-slate-soft">{pendientes.length ? 'días sin revisar' : 'Todo revisado'}</p>
        </div>
      </section>

      {/* ---------- Herramientas ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="relative" htmlFor="buscar-propuesta">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-soft" />
          <input
            id="buscar-propuesta"
            className="input-field !w-72 !py-1.5 !pl-9"
            placeholder="Buscar estudiante, carnet o tema"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <select id="filtro-estado" className="input-field !w-auto !py-1.5" value={filtro} onChange={(e) => setFiltro(e.target.value as Estado | 'todas')}>
            <option value="todas">Todos los estados</option>
            {resumen.map((r) => (
              <option key={r.estado} value={r.estado}>{r.texto}</option>
            ))}
          </select>
          <select id="orden" className="input-field !w-auto !py-1.5" value={orden} onChange={(e) => setOrden(e.target.value as 'antiguas' | 'recientes')}>
            <option value="antiguas">Más antiguas primero</option>
            <option value="recientes">Más recientes primero</option>
          </select>
        </div>
      </div>

      {error && revisando === null && <p className="text-danger text-[14px]">{error}</p>}
      {aviso && <p className="text-ok text-[14px]">{aviso}</p>}
      {cargando && <p className="text-slate-soft">Cargando propuestas…</p>}
      {!cargando && grupos.length === 0 && !error && (
        <div className="folio p-8 max-w-lg">
          <p className="text-slate-soft text-[15px]">No hay propuestas que coincidan.</p>
        </div>
      )}

      {/* ---------- Propuestas agrupadas por estudiante ---------- */}
      {grupos.map(([clave, lista_]) => {
        const [nombre, carnet] = clave.split('|');
        const cerrado = cerrados[clave];
        const porRev = lista_.filter((p) => p.estado === 'generada').length;
        return (
          <section key={clave} className="folio overflow-hidden">
            <button
              className="w-full flex items-center justify-between gap-3 px-6 py-4 border-b border-paper-300 text-left"
              onClick={() => setCerrados((c) => ({ ...c, [clave]: !cerrado }))}
            >
              <span className="flex items-center gap-3">
                {cerrado ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                <span>
                  <span className="block font-serif text-lg">{nombre}</span>
                  <span className="block text-[12.5px] text-slate-soft">{carnet ? `Carnet ${carnet}. ` : ''}{lista_.length} propuesta(s), {porRev} por revisar</span>
                </span>
              </span>
            </button>

            {!cerrado && (
              <ul className="divide-y divide-paper-300">
                {lista_.map((p) => {
                  const detalle = abierta === p.id_propuesta;
                  const enRevision = revisando === p.id_propuesta;
                  const misDocs = docs[p.id_propuesta];
                  return (
                    <li key={p.id_propuesta} className="px-6 py-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[12.5px] text-slate-soft">
                            {p.fecha_generacion ? fechaLocal(p.fecha_generacion) : ''}{p.area_interes ? `, área: ${p.area_interes}` : ''}
                          </p>
                          <h3 className="text-[16px] font-medium m-0">{p.propuesta_tema_1}</h3>
                        </div>
                        <EstadoPill estado={p.estado} />
                      </div>

                      {!detalle && <p className="mt-2 text-[14px] text-slate leading-relaxed line-clamp-2">{p.planteamiento_problema}</p>}

                      {detalle && (
                        <div className="mt-4 space-y-4 text-[14.5px] leading-relaxed">
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
                          <section>
                            <h4 className="font-semibold mb-2">Documentos de revisión</h4>
                            {misDocs === undefined && <p className="text-slate-soft text-[13.5px]">Cargando…</p>}
                            {typeof misDocs === 'string' && <p className="text-warn text-[13.5px]">{misDocs}</p>}
                            {Array.isArray(misDocs) && misDocs.length === 0 && <p className="text-slate-soft text-[13.5px]">Todavía no hay documentos.</p>}
                            {Array.isArray(misDocs) && misDocs.length > 0 && (
                              <ul className="space-y-1.5 mb-3">
                                {misDocs.map((d) => (
                                  <li key={d.id_documento} className="flex items-center gap-2 text-[14px]">
                                    <FileText size={15} className="text-slate-soft" />
                                    <button className="underline" onClick={() => descargarDocumento(d).catch(() => setError('No se pudo descargar el documento.'))}>
                                      {d.nombre_archivo}
                                    </button>
                                    <span className="text-[12.5px] text-slate-soft">{tamano(d.tamano_bytes)}, {fechaLocal(d.fecha_subida)}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                            <label className="btn-ghost !px-3.5 !py-1.5 text-[13px] inline-flex items-center gap-2 cursor-pointer mt-1">
                              <Upload size={14} /> {subiendo === p.id_propuesta ? 'Subiendo…' : 'Subir documento con observaciones (PDF o Word)'}
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                disabled={subiendo === p.id_propuesta}
                                onChange={(e) => {
                                  subir(p.id_propuesta, e.target.files?.[0]);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </section>
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button className="btn-gold !px-3.5 !py-1.5 text-[13px]" onClick={() => abrirRevision(p)}>
                          {enRevision ? 'Cerrar revisión' : 'Revisar'}
                        </button>
                        <button className="btn-ghost !px-3.5 !py-1.5 text-[13px]" onClick={() => verDetalle(p.id_propuesta)}>
                          {detalle ? 'Ocultar detalle' : 'Ver propuesta y documentos'}
                        </button>
                        <button
                          className="btn-ghost !px-3.5 !py-1.5 text-[13px] inline-flex items-center gap-1.5"
                          onClick={() => descargarWord(p).catch(() => setError('No se pudo generar el documento Word.'))}
                        >
                          <FileDown size={14} /> Descargar Word
                        </button>
                      </div>

                      {/* ---------- Panel de revisión ---------- */}
                      {enRevision && (
                        <div className="mt-5 border-t border-paper-300 pt-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-semibold mb-2 text-[14.5px]">Rúbrica de revisión</h4>
                            <ul className="space-y-2">
                              {RUBRICA.map((c) => (
                                <li key={c.id}>
                                  <label className="flex items-start gap-2.5 text-[14px] cursor-pointer" htmlFor={`rub-${p.id_propuesta}-${c.id}`}>
                                    <input
                                      id={`rub-${p.id_propuesta}-${c.id}`}
                                      type="checkbox"
                                      className="mt-1 accent-[#C98A2B]"
                                      checked={!!criterios[c.id]}
                                      onChange={(e) => marcar(c.id, e.target.checked)}
                                    />
                                    {c.texto}
                                  </label>
                                </li>
                              ))}
                            </ul>
                            <p className="mt-3 text-[13px] text-slate-soft">
                              Cumple {RUBRICA.filter((c) => criterios[c.id]).length} de {RUBRICA.length}. La observación y el estado se sugieren solos; puedes cambiarlos.
                            </p>
                            <h4 className="font-semibold mt-5 mb-2 text-[14.5px]">Estado</h4>
                            <div className="flex flex-wrap gap-2">
                              {opcionesEstado.map((o) => (
                                <button
                                  key={o.estado}
                                  onClick={() => setEstadoElegido(o.estado)}
                                  className={`btn-ghost !px-3.5 !py-1.5 text-[13px] ${estadoElegido === o.estado ? '!bg-ink !text-white' : ''}`}
                                >
                                  {o.texto}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="label-field" htmlFor={`obs-${p.id_propuesta}`}>
                              Observación para el estudiante{estadoElegido === 'ajustada' ? ' (obligatoria)' : ''}
                            </label>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {RAPIDAS.map((t) => (
                                <button
                                  key={t}
                                  onClick={() => agregarRapida(t)}
                                  className="text-[12px] px-2.5 py-1 rounded-full border border-paper-300 bg-paper-100 hover:border-gold"
                                >
                                  + {t}
                                </button>
                              ))}
                            </div>
                            <textarea
                              id={`obs-${p.id_propuesta}`}
                              className="input-field min-h-[150px]"
                              maxLength={2000}
                              value={comentario}
                              onChange={(e) => setComentario(e.target.value)}
                              placeholder="Escribe la observación o usa la rúbrica y los comentarios rápidos."
                            />
                            {error && <p className="mt-2 text-danger text-[13.5px]">{error}</p>}
                            <div className="mt-3 flex gap-2">
                              <button className="btn-gold" disabled={guardando} onClick={() => guardar(p)}>
                                {guardando ? 'Guardando…' : 'Guardar y avisar al estudiante'}
                              </button>
                              <button className="btn-ghost" onClick={() => setRevisando(null)}>Cancelar</button>
                            </div>
                          </div>
                        </div>
                      )}

                      {p.observaciones && p.observaciones.length > 0 && (
                        <div className="mt-4">
                          <p className="text-[13px] text-slate-soft mb-2">Observaciones enviadas</p>
                          <ul className="space-y-2">
                            {p.observaciones.map((o) => (
                              <li key={o.id_recomendacion} className="bg-paper-200 rounded-sm px-4 py-2.5 text-[14px] whitespace-pre-line">
                                <span className="text-slate-soft text-[12.5px] mr-2">{fechaLocal(o.fecha_creacion)}</span>
                                {o.contenido}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
