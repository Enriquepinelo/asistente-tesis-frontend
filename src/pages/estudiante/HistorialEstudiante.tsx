import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, endpoints } from '../../api/client';
import { EstadoPill } from '../../components/EstadoPill';
import { useAuth } from '../../context/AuthContext';
import { listarPropuestas, abrirPropuesta, type PropuestaGuardada } from '../../api/propuestaFlujo';
import type { HistorialFlujo } from '../../types';

function formatearFecha(iso: string) {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function HistorialEstudiante() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [registros, setRegistros] = useState<HistorialFlujo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [propuestas, setPropuestas] = useState<PropuestaGuardada[]>([]);

  useEffect(() => {
    setPropuestas(listarPropuestas(usuario?.correo));
  }, [usuario?.correo]);

  useEffect(() => {
    api
      .get(endpoints.historial)
      .then(({ data }) => setRegistros(data.historial ?? data))
      .catch(() => setRegistros([]))
      .finally(() => setCargando(false));
  }, []);

  function verPropuesta(p: PropuestaGuardada) {
    abrirPropuesta(usuario?.correo, p);
    navigate('/estudiante/propuesta');
  }

  return (
    <div>
      <p className="text-[13px] tracking-wide text-gold-dark mb-2">Seguimiento</p>
      <h1 className="text-3xl mb-8">Historial de solicitudes</h1>

      {/* ---------- Propuestas generadas (se pueden volver a abrir) ---------- */}
      <h2 className="text-xl mb-3">Propuestas generadas</h2>
      {propuestas.length === 0 ? (
        <div className="folio p-8 max-w-lg mb-10">
          <p className="text-slate-soft text-[15px]">
            Aún no hay propuestas guardadas. Cuando generes una desde "Nuevo formulario",
            podrás volver a verla desde aquí.
          </p>
        </div>
      ) : (
        <div className="folio overflow-hidden mb-10">
          <table className="w-full text-[14.5px]">
            <thead>
              <tr className="border-b border-paper-300 text-left text-slate-soft">
                <th className="px-6 py-3 font-medium">Fecha</th>
                <th className="px-6 py-3 font-medium">Contenido</th>
                <th className="px-6 py-3 font-medium">Tema / Área</th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {propuestas.map((p, i) => (
                <tr key={`${p.id_formulario ?? 'x'}-${i}`} className="border-b border-paper-300 last:border-0">
                  <td className="px-6 py-3.5 text-slate-soft whitespace-nowrap">
                    {formatearFecha(p.actualizado)}
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    {p.etapa === 'completa' ? 'Anteproyecto completo' : 'Temas sugeridos'}
                  </td>
                  <td className="px-6 py-3.5">
                    {p.etapa === 'completa' ? (
                      p.tema_elegido
                    ) : (
                      <span className="text-slate-soft">
                        {p.area_interes} · {p.temas.length} temas para elegir
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <button type="button" className="btn-primary" onClick={() => verPropuesta(p)}>
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------- Registro de solicitudes (lo que ya tenías) ---------- */}
      <h2 className="text-xl mb-3">Solicitudes al sistema</h2>

      {cargando && <p className="text-slate-soft">Cargando historial…</p>}

      {!cargando && registros.length === 0 && (
        <div className="folio p-8 max-w-lg">
          <p className="text-slate-soft text-[15px]">
            Todavía no tienes solicitudes registradas. Cuando envíes un formulario, cada
            intento de generación aparecerá aquí.
          </p>
        </div>
      )}

      {registros.length > 0 && (
        <div className="folio overflow-hidden">
          <table className="w-full text-[14.5px]">
            <thead>
              <tr className="border-b border-paper-300 text-left text-slate-soft">
                <th className="px-6 py-3 font-medium">Solicitud</th>
                <th className="px-6 py-3 font-medium">Flujo</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3 font-medium">Mensaje</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id_historial} className="border-b border-paper-300 last:border-0">
                  <td className="px-6 py-3.5 text-slate-soft">{r.identificador_solicitud}</td>
                  <td className="px-6 py-3.5">{r.nombre_flujo}</td>
                  <td className="px-6 py-3.5">
                    <EstadoPill estado={r.estado_flujo} />
                  </td>
                  <td className="px-6 py-3.5 text-slate-soft">{r.mensaje ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
