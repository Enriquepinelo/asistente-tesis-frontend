import { useEffect, useState } from 'react';
import { api, endpoints } from '../../api/client';
import { EstadoPill } from '../../components/EstadoPill';
import type { PropuestaGenerada } from '../../types';

const opcionesEstado: PropuestaGenerada['estado'][] = ['generada', 'revisada', 'ajustada', 'aprobada'];

export default function BandejaRevision() {
  const [propuestas, setPropuestas] = useState<PropuestaGenerada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seleccionada, setSeleccionada] = useState<PropuestaGenerada | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarLista();
  }, []);

  function cargarLista() {
    setCargando(true);
    api
      .get(endpoints.propuestas)
      .then(({ data }) => setPropuestas(data.propuestas ?? data))
      .catch(() => setPropuestas([]))
      .finally(() => setCargando(false));
  }

  async function actualizarEstado(id: number, estado: PropuestaGenerada['estado']) {
    setGuardando(true);
    try {
      await api.patch(endpoints.propuestaPorId(id), { estado });
      cargarLista();
      setSeleccionada(null);
    } catch {
      // el mensaje de error se puede refinar cuando conectemos con el backend real
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <p className="text-[13px] tracking-wide text-gold-dark mb-2">Asesoría</p>
      <h1 className="text-3xl mb-8">Bandeja de revisión</h1>

      {cargando && <p className="text-slate-soft">Cargando propuestas…</p>}

      {!cargando && propuestas.length === 0 && (
        <div className="folio p-8 max-w-lg">
          <p className="text-slate-soft text-[15px]">
            No hay propuestas pendientes de revisión por el momento.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {propuestas.map((p) => (
          <div key={p.id_propuesta} className="folio">
            <div className="folio-header">
              <div>
                <p className="text-[13px] text-slate-soft">Formulario #{p.id_formulario}</p>
                <h3 className="text-lg m-0">{p.propuesta_tema_1}</h3>
              </div>
              <EstadoPill estado={p.estado} />
            </div>
            <div className="p-6">
              <p className="text-[14.5px] text-slate leading-relaxed line-clamp-2">
                {p.planteamiento_problema}
              </p>
              <div className="mt-5 flex items-center gap-2">
                {opcionesEstado.map((op) => (
                  <button
                    key={op}
                    disabled={guardando || op === p.estado}
                    onClick={() => actualizarEstado(p.id_propuesta, op)}
                    className={`btn-ghost !px-3.5 !py-1.5 text-[13px] ${
                      op === p.estado ? 'opacity-40' : ''
                    }`}
                  >
                    Marcar {op}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
