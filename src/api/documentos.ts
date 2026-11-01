import { api } from './client';

export interface DocumentoRevision {
  id_documento: number;
  id_propuesta: number;
  nombre_archivo: string;
  tipo_mime: string;
  tamano_bytes: number;
  fecha_subida: string;
  subido_por: string | null;
  rol_subio?: string | null;
}

export async function listarDocumentos(idPropuesta: number): Promise<DocumentoRevision[]> {
  const { data } = await api.get(`/propuestas/${idPropuesta}/documentos`);
  return data.documentos ?? [];
}

// Todos los documentos que el asesor subió a las propuestas del estudiante.
export async function misDocumentos(): Promise<DocumentoRevision[]> {
  const { data } = await api.get('/propuestas/mis-documentos');
  return data.documentos ?? [];
}

// Tipos que acepta el sistema. El backend vuelve a revisar el contenido real del archivo.
export const EXTENSIONES_PERMITIDAS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'png', 'jpg', 'jpeg'];
export const ACCEPT_ARCHIVOS = EXTENSIONES_PERMITIDAS.map((e) => '.' + e).join(',');
export const MAX_BYTES = 10 * 1024 * 1024;

// Revisión rápida antes de enviar, para avisar sin esperar al servidor.
export function revisarArchivo(archivo: File): string | null {
  const extension = (archivo.name.split('.').pop() ?? '').toLowerCase();
  if (!archivo.name.includes('.') || !EXTENSIONES_PERMITIDAS.includes(extension)) {
    return 'Tipo de archivo no permitido. Se aceptan PDF, Word, Excel, PowerPoint e imágenes PNG o JPG.';
  }
  if (archivo.size === 0) return 'El archivo está vacío.';
  if (archivo.size > MAX_BYTES) return `El archivo pesa ${tamano(archivo.size)}; el máximo es 10 MB.`;
  return null;
}

// Lee el archivo elegido y lo envía en base64, informando el avance de la subida (0 a 100).
export async function subirDocumento(idPropuesta: number, archivo: File, alAvanzar?: (porcentaje: number) => void) {
  const problema = revisarArchivo(archivo);
  if (problema) throw new Error(problema);
  const base64 = await new Promise<string>((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(String(lector.result).split(',')[1] ?? '');
    lector.onerror = () => rechazar(new Error('No se pudo leer el archivo.'));
    lector.readAsDataURL(archivo);
  });
  await api.post(
    `/propuestas/${idPropuesta}/documentos`,
    { nombre: archivo.name, tipo: archivo.type, base64 },
    {
      onUploadProgress: (e) => {
        if (alAvanzar && e.total) alAvanzar(Math.min(100, Math.round((e.loaded / e.total) * 100)));
      },
    }
  );
}

// La descarga pasa por el backend con el token, por eso se baja como blob.
export async function descargarDocumento(doc: DocumentoRevision) {
  const { data } = await api.get(`/propuestas/documentos/${doc.id_documento}/descargar`, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = doc.nombre_archivo;
  a.click();
  URL.revokeObjectURL(url);
}

export function tamano(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/* ---------- Avisos para el asesor: archivos nuevos de los estudiantes ---------- */

export interface ArchivoEstudiante {
  id_documento: number;
  id_propuesta: number;
  nombre_archivo: string;
  tamano_bytes: number;
  fecha_subida: string;
  nombre_estudiante: string | null;
  tema: string | null;
}

export async function archivosDeEstudiantes(): Promise<ArchivoEstudiante[]> {
  const { data } = await api.get('/propuestas/documentos-estudiantes');
  return data.documentos ?? [];
}

const claveVistos = (correo?: string) => `archivos_estudiantes_vistos_${correo ?? ''}`;

// Último archivo de estudiante que el asesor ya vio (por número de documento).
export function ultimoArchivoVisto(correo?: string): number {
  try {
    return Number(localStorage.getItem(claveVistos(correo)) ?? 0) || 0;
  } catch {
    return 0;
  }
}

export function marcarArchivosVistos(correo: string | undefined, lista: ArchivoEstudiante[]) {
  const max = lista.reduce((m, d) => Math.max(m, d.id_documento), 0);
  try {
    localStorage.setItem(claveVistos(correo), String(Math.max(max, ultimoArchivoVisto(correo))));
  } catch {
    /* sin almacenamiento: el aviso solo se vuelve a mostrar */
  }
  window.dispatchEvent(new Event('archivos-vistos'));
}

/* ---------- Avisos para el estudiante: documentos nuevos de su asesor ---------- */

const claveDocsAsesor = (correo?: string) => `docs_asesor_vistos_${correo ?? ''}`;

export function ultimoDocAsesorVisto(correo?: string): number {
  try {
    return Number(localStorage.getItem(claveDocsAsesor(correo)) ?? 0) || 0;
  } catch {
    return 0;
  }
}

export const esDelAsesor = (d: DocumentoRevision) => d.rol_subio !== 'estudiante';

export function marcarDocsAsesorVistos(correo: string | undefined, lista: DocumentoRevision[]) {
  const max = lista.filter(esDelAsesor).reduce((m, d) => Math.max(m, d.id_documento), 0);
  try {
    localStorage.setItem(claveDocsAsesor(correo), String(Math.max(max, ultimoDocAsesorVisto(correo))));
  } catch {
    /* sin almacenamiento: el aviso solo se vuelve a mostrar */
  }
  window.dispatchEvent(new Event('docs-asesor-vistos'));
}
