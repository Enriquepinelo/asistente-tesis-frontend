import { useEffect, useState } from 'react';
import { api, endpoints } from '../../api/client';
import { EstadoPill } from '../../components/EstadoPill';
import type { Formulario } from '../../types';

export default function PanelGeneral() {
  const [formularios, setFormularios] = useState<Formulario[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api
      .get(endpoints.formularios)
      .then(({ data }) => setFormularios(data.formularios ?? data))
      .catch(() => setFormularios([]))
      .finally(() => setCargando(false));
  }, []);

  const totales = {
    total: formularios.length,
    procesados: formularios.filter((f) => f.estado === 'procesado').length,
    borradores: formularios.filter((f) => f.estado === 'borrador').length,
    errores: formularios.filter((f) => f.estado === 'error').length,
  };

  return (
    <div>
      <p className="text-[13px] tracking-wide text-gold-dark mb-2">Coordinación</p>
      <h1 className="text-3xl mb-8">Panel general</h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { etiqueta: 'Formularios totales', valor: totales.total },
          { etiqueta: 'Procesados', valor: totales.procesados },
          { etiqueta: 'En borrador', valor: totales.borradores },
          { etiqueta: 'Con error', valor: totales.errores },
        ].map((stat) => (
          <div key={stat.etiqueta} className="folio px-5 py-5">
            <p className="text-[13px] text-slate-soft mb-1.5">{stat.etiqueta}</p>
            <p className="font-serif text-3xl text-ink">{stat.valor}</p>
          </div>
        ))}
      </div>

      {cargando && <p className="text-slate-soft">Cargando formularios…</p>}

      {!cargando && formularios.length > 0 && (
        <div className="folio overflow-hidden">
          <table className="w-full text-[14.5px]">
            <thead>
              <tr className="border-b border-paper-300 text-left text-slate-soft">
                <th className="px-6 py-3 font-medium">Estudiante</th>
                <th className="px-6 py-3 font-medium">Carrera</th>
                <th className="px-6 py-3 font-medium">Área de interés</th>
                <th className="px-6 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {formularios.map((f) => (
                <tr key={f.id_formulario} className="border-b border-paper-300 last:border-0">
                  <td className="px-6 py-3.5">{f.nombre_estudiante ?? `#${f.id_estudiante}`}</td>
                  <td className="px-6 py-3.5 text-slate-soft">{f.carrera ?? '—'}</td>
                  <td className="px-6 py-3.5 text-slate-soft">{f.area_interes}</td>
                  <td className="px-6 py-3.5">
                    <EstadoPill estado={f.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
