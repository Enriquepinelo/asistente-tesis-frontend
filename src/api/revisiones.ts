import { api, endpoints } from './client';

export interface Observacion {
  id_recomendacion: number;
  id_formulario: number;
  tipo_recomendacion: string;
  contenido: string;
  fuente: string;
  fecha_creacion: string;
}

const clave = (correo?: string) => `revisiones_vistas_${correo ?? ''}`;

// Observaciones que el asesor dejo sobre las propuestas del estudiante.
export async function cargarObservaciones(): Promise<Observacion[]> {
  const { data } = await api.get(endpoints.misRecomendaciones);
  const lista: Observacion[] = data.recomendaciones ?? data ?? [];
  return lista.filter((r) => r.fuente === 'asesor');
}

export function ultimaVista(correo?: string): number {
  try {
    return Number(localStorage.getItem(clave(correo)) ?? 0) || 0;
  } catch {
    return 0;
  }
}

export function marcarVistas(correo: string | undefined, obs: Observacion[]) {
  const max = obs.reduce((m, o) => Math.max(m, o.id_recomendacion), 0);
  try {
    localStorage.setItem(clave(correo), String(max));
  } catch {
    /* sin almacenamiento: el aviso solo se vuelve a mostrar */
  }
  window.dispatchEvent(new Event('revisiones-vistas'));
}
