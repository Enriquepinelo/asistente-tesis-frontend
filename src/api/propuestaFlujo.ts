import { api, endpoints } from './client';

/* ------------------------------------------------------------------ *
 *  Tipos
 * ------------------------------------------------------------------ */

export interface Desarrollo {
  planteamiento_problema: string;
  objetivo_general: string;
  objetivos_especificos: string[];
  justificacion: string;
}

export interface PropuestaGuardada {
  // 'temas'    = el sistema ya propuso temas y el estudiante debe elegir uno.
  // 'completa' = ya hay un tema elegido y su desarrollo completo.
  etapa: 'temas' | 'completa';
  area_interes: string;
  temas: string[];
  tema_elegido: string | null;
  desarrollo: Desarrollo | null;
  id_formulario: number | null;
  actualizado: string;
}

/* ------------------------------------------------------------------ *
 *  Guardado en el navegador (para que "Mi propuesta" no quede vacío)
 * ------------------------------------------------------------------ */

const PREFIJO = 'propuesta_actual:';

function clave(correo?: string | null) {
  return `${PREFIJO}${(correo ?? 'anonimo').toLowerCase()}`;
}

export function leerPropuesta(correo?: string | null): PropuestaGuardada | null {
  try {
    const crudo = localStorage.getItem(clave(correo));
    return crudo ? (JSON.parse(crudo) as PropuestaGuardada) : null;
  } catch {
    return null;
  }
}

export function guardarPropuesta(correo: string | null | undefined, propuesta: PropuestaGuardada) {
  try {
    localStorage.setItem(clave(correo), JSON.stringify(propuesta));
  } catch {
    /* si el navegador no deja guardar, la pantalla igual funciona en esta sesión */
  }
}

/* ------------------------------------------------------------------ *
 *  Lista de todas las propuestas generadas (para verlas desde Historial)
 * ------------------------------------------------------------------ */

const PREFIJO_LISTA = 'propuestas_historial:';
const MAXIMO_EN_LISTA = 50;

function claveLista(correo?: string | null) {
  return `${PREFIJO_LISTA}${(correo ?? 'anonimo').toLowerCase()}`;
}

function mismaPropuesta(a: PropuestaGuardada, b: PropuestaGuardada) {
  return a.id_formulario !== null && a.id_formulario === b.id_formulario;
}

function leerLista(correo?: string | null): PropuestaGuardada[] {
  try {
    const crudo = localStorage.getItem(claveLista(correo));
    const lista = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(lista) ? (lista as PropuestaGuardada[]) : [];
  } catch {
    return [];
  }
}

// Se llama cada vez que se genera algo nuevo. Si ya existía esa generación, la reemplaza.
function registrarEnLista(correo: string | null | undefined, propuesta: PropuestaGuardada) {
  try {
    const resto = leerLista(correo).filter((p) => !mismaPropuesta(p, propuesta));
    const nueva = [propuesta, ...resto].slice(0, MAXIMO_EN_LISTA);
    localStorage.setItem(claveLista(correo), JSON.stringify(nueva));
  } catch {
    /* si no se puede guardar, no se interrumpe el flujo */
  }
}

// Devuelve todas las propuestas generadas, de la más reciente a la más antigua.
// Incluye la propuesta actual aunque se haya generado antes de existir esta lista.
export function listarPropuestas(correo?: string | null): PropuestaGuardada[] {
  const lista = leerLista(correo);
  const actual = leerPropuesta(correo);
  if (actual && !lista.some((p) => mismaPropuesta(p, actual))) {
    lista.push(actual);
  }
  return lista.sort((a, b) => (b.actualizado ?? '').localeCompare(a.actualizado ?? ''));
}

// Deja una propuesta antigua como la "actual" para verla en "Mi propuesta".
export function abrirPropuesta(correo: string | null | undefined, propuesta: PropuestaGuardada) {
  guardarPropuesta(correo, propuesta);
}

/* ------------------------------------------------------------------ *
 *  Lectura tolerante de la respuesta del backend / n8n
 * ------------------------------------------------------------------ */

function aTexto(x: any): string {
  if (typeof x === 'string') return x.trim();
  if (x && typeof x === 'object') return String(x.tema ?? x.titulo ?? x.title ?? x.texto ?? '').trim();
  return '';
}

export function extraerTemas(r: any): string[] {
  const base = r?.propuesta ?? r?.data ?? r;
  const lista = base?.propuestas_tema ?? r?.propuestas_tema ?? base?.temas ?? r?.temas;
  const temas = Array.isArray(lista)
    ? lista.map(aTexto)
    : [base?.propuesta_tema_1, base?.propuesta_tema_2, base?.propuesta_tema_3].map(aTexto);
  return temas.filter(Boolean).slice(0, 3);
}

function aLista(v: any): string[] {
  if (Array.isArray(v)) return v.map(aTexto).filter(Boolean);
  if (typeof v === 'string' && v.trim()) {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.map(aTexto).filter(Boolean);
    } catch {
      /* no era JSON: se separa por líneas */
    }
    return v
      .split(/\r?\n/)
      .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
      .filter(Boolean);
  }
  return [];
}

export function extraerDesarrollo(r: any): Desarrollo | null {
  const base = r?.propuesta ?? r?.data ?? r;
  const planteamiento = aTexto(base?.planteamiento_problema ?? r?.planteamiento_problema);
  const general = aTexto(base?.objetivo_general ?? r?.objetivo_general);
  const especificos = aLista(base?.objetivos_especificos ?? r?.objetivos_especificos);
  const justificacion = aTexto(base?.justificacion ?? r?.justificacion);
  if (!planteamiento && !general) return null;
  return {
    planteamiento_problema: planteamiento,
    objetivo_general: general,
    objetivos_especificos: especificos,
    justificacion,
  };
}

export function mensajeError(err: any, porDefecto: string): string {
  const delServidor = err?.response?.data?.mensaje;
  if (delServidor) return delServidor;
  if (err?.isAxiosError) return porDefecto;
  return err?.message || porDefecto;
}

/* ------------------------------------------------------------------ *
 *  Llamada al backend (mismos dos pasos que ya funcionaban)
 * ------------------------------------------------------------------ */

interface DatosFormulario {
  area_interes: string;
  descripcion_problema: string;
  objetivo_proyecto: string;
}

async function generarConIA(usuario: any, datos: DatosFormulario) {
  // Paso A: crear el formulario.
  const { data } = await api.post(endpoints.formularios, {
    ...datos,
    carrera: usuario?.carrera ?? '',
    sede: usuario?.sede ?? '',
    nombre_estudiante: usuario?.nombre_completo,
    correo: usuario?.correo,
  });

  const idFormulario = data.formulario?.id_formulario;
  if (!idFormulario) {
    throw new Error('No se recibió el id del formulario creado.');
  }

  // Paso B: pedir la generación con IA.
  const { data: resultado } = await api.post(endpoints.generarPropuesta(idFormulario), {
    ...datos,
    linea_investigacion: datos.area_interes,
    tipo_problema: 'Exploratorio',
    poblacion_beneficiada: 'Por definir según el análisis de la propuesta.',
  });

  return { idFormulario: Number(idFormulario), resultado };
}

/* ------------------------------------------------------------------ *
 *  ETAPA 1: el estudiante NO tiene tema -> el sistema propone temas
 * ------------------------------------------------------------------ */

export async function generarTemas(
  usuario: any,
  areaInteres: string,
  detalle?: string
): Promise<PropuestaGuardada> {
  const area = areaInteres.trim();
  const extra = detalle?.trim();

  const { idFormulario, resultado } = await generarConIA(usuario, {
    area_interes: area,
    descripcion_problema:
      `No tengo un tema definido. Me interesa el área de ${area}. ` +
      `Necesito que el sistema me proponga temas de tesis viables y bien enfocados.` +
      (extra ? ` Contexto adicional: ${extra}` : ''),
    objetivo_proyecto: 'Encontrar un tema de tesis viable y bien enfocado en esta área.',
  });

  const temas = extraerTemas(resultado);
  if (temas.length === 0) {
    throw new Error(
      'El sistema respondió, pero no devolvió temas. Verifica que n8n esté activo y vuelve a intentarlo.'
    );
  }

  const propuesta: PropuestaGuardada = {
    etapa: 'temas',
    area_interes: area,
    temas,
    tema_elegido: null,
    desarrollo: null,
    id_formulario: idFormulario,
    actualizado: new Date().toISOString(),
  };
  guardarPropuesta(usuario?.correo, propuesta);
  registrarEnLista(usuario?.correo, propuesta);
  return propuesta;
}

/* ------------------------------------------------------------------ *
 *  ETAPA 2: ya hay un tema (propio o elegido) -> se genera todo lo demás
 * ------------------------------------------------------------------ */

export async function generarDesarrollo(
  usuario: any,
  areaInteres: string,
  tema: string,
  detalle?: string,
  temasSugeridos: string[] = []
): Promise<PropuestaGuardada> {
  const area = areaInteres.trim();
  const temaLimpio = tema.trim();
  const extra = detalle?.trim();

  const { idFormulario, resultado } = await generarConIA(usuario, {
    area_interes: area,
    descripcion_problema:
      `Mi tema de tesis ya está definido: "${temaLimpio}". Área de interés: ${area}. ` +
      `Desarrolla el planteamiento del problema, los objetivos y la justificación ` +
      `específicamente para este tema.` +
      (extra ? ` Contexto adicional: ${extra}` : ''),
    objetivo_proyecto: `Desarrollar el anteproyecto del tema: ${temaLimpio}`,
  });

  const desarrollo = extraerDesarrollo(resultado);
  if (!desarrollo) {
    throw new Error(
      'El sistema respondió, pero no devolvió el desarrollo del tema. Verifica que n8n esté activo y vuelve a intentarlo.'
    );
  }

  const propuesta: PropuestaGuardada = {
    etapa: 'completa',
    area_interes: area,
    temas: temasSugeridos,
    tema_elegido: temaLimpio,
    desarrollo,
    id_formulario: idFormulario,
    actualizado: new Date().toISOString(),
  };
  guardarPropuesta(usuario?.correo, propuesta);
  registrarEnLista(usuario?.correo, propuesta);
  return propuesta;
}
