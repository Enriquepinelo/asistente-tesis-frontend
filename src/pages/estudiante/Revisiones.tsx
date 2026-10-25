import { useEffect, useState } from 'react';
import { api, endpoints } from '../../api/client';
import { EstadoPill } from '../../components/EstadoPill';
import { useAuth } from '../../context/AuthContext';
import { cargarObservaciones, marcarVistas, ultimaVista, type Observacion } from '../../api/revisiones';
import type { PropuestaGenerada } from '../../types';

// La base de datos guarda la hora en UTC sin zona: se agrega "Z" para mostrarla en hora local.
function fecha(iso: string) {
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' });
}

const explicacion: Record<string, string> = {
  revisada: 'Tu asesor ya leyó esta propuesta.',
  ajustada: 'Tu asesor pide que hagas cambios. Lee sus observaciones.',
  aprobada: 'Tu asesor aprobó esta propuesta.',
};

export default function Revisiones() {
  const { usuario } = useAuth();
  const [propuestas, setPropuestas] = useState<PropuestaGenerada[]>([]);
  const [obs, setObs] = useState<Observacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vistaAnterior] = useState(() => ultimaVista(usuario?.correo));

  useEffect(() => {
    Promise.all([api.get(endpoints.propuestas), cargarObservaciones()])
      .then(([{ data }, o]) => {
        setPropuestas(data.propuestas ?? data);
        setObs(o);
        marcarVistas(usuario?.correo, o);
      })
      .catch((err) => setError(err?.response?.data?.mensaje || 'No se pudieron cargar tus revisiones.'))
      .finally(() => setCargando(false));
  }, [usuario?.correo]);

  const revisadas = propuestas.filter(
    (p) => p.estado !== 'generada' || obs.some((o) => o.id_formulario === p.id_formulario)
  );

  return (
    <div>
      <p className="text-[13px] tracking-wide text-gold-dark mb-2">Seguimiento</p>
      <h1 className="text-3xl mb-2">Revisiones de mi asesor</h1>
      <p className="text-slate-soft mb-8 text-[15px]">
        Aquí ves el estado que tu asesor le dio a cada propuesta y lo que te pide ajustar.
      </p>

      {cargando && <p className="text-slate-soft">Cargando…</p>}
      {error && <p className="text-danger text-[14px]">{error}</p>}

      {!cargando && !error && revisadas.length === 0 && (
        <div className="folio p-8 max-w-lg">
          <p className="text-slate-soft text-[15px]">
            Tu asesor todavía no ha revisado tus propuestas. Cuando lo haga, verás aquí su respuesta.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {revisadas.map((p) => {
          const suyas = obs.filter((o) => o.id_formulario === p.id_formulario);
          return (
            <div key={p.id_propuesta} className="folio">
              <div className="folio-header">
                <div className="min-w-0">
                  <p className="text-[13px] text-slate-soft">{explicacion[p.estado] ?? 'Pendiente de revisión.'}</p>
                  <h3 className="text-lg m-0">{p.propuesta_tema_1}</h3>
                </div>
                <EstadoPill estado={p.estado} />
              </div>
              <div className="p-6">
                {suyas.length === 0 ? (
                  <p className="text-[14px] text-slate-soft">Sin observaciones escritas.</p>
                ) : (
                  <ul className="space-y-3">
                    {suyas.map((o) => (
                      <li key={o.id_recomendacion} className="border-l-0 bg-paper-200 rounded-sm px-4 py-3">
                        <div className="flex items-center gap-2 text-[12.5px] text-slate-soft mb-1">
                          <span>{fecha(o.fecha_creacion)}</span>
                          {o.id_recomendacion > vistaAnterior && (
                            <span className="pill bg-gold/15 text-gold-dark">Nuevo</span>
                          )}
                        </div>
                        <p className="text-[14.5px] leading-relaxed whitespace-pre-line">{o.contenido}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
