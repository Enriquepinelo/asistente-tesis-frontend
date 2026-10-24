export type Rol = 'estudiante' | 'asesor' | 'coordinador' | 'administrador';

export interface Usuario {
  id_usuario: number;
  nombre_usuario: string;
  correo: string;
  rol: Rol;
  nombre_completo?: string | null;
  estado?: "activo" | "inactivo";
}

export interface Formulario {
  id_formulario: number;
  id_estudiante: number;
  nombre_estudiante?: string;
  carrera?: string;
  sede?: string;
  area_interes: string;
  descripcion_problema: string;
  estado: 'borrador' | 'procesado' | 'error';
  fecha_creacion?: string;
}

export interface PropuestaGenerada {
  id_propuesta: number;
  id_formulario: number;
  propuesta_tema_1: string;
  propuesta_tema_2: string;
  propuesta_tema_3: string;
  planteamiento_problema: string;
  objetivo_general: string;
  objetivos_especificos: string[] | string;
  justificacion: string;
  modelo_ia?: string;
  version: number;
  estado: 'generada' | 'revisada' | 'ajustada' | 'aprobada';
}

export interface HistorialFlujo {
  id_historial: number;
  id_formulario: number | null;
  id_propuesta: number | null;
  identificador_solicitud: string;
  nombre_flujo: string;
  estado_flujo: 'exitoso' | 'fallido' | 'validacion_error' | 'ia_error' | 'bd_error';
  mensaje?: string;
  tiempo_respuesta_ms?: number;
  fecha_creacion?: string;
}

export interface RecomendacionApoyo {
  id_recomendacion: number;
  id_formulario: number;
  tipo_recomendacion: string;
  contenido: string;
  fuente: string;
}
