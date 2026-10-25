import { api } from './client';

export interface DocumentoRevision {
  id_documento: number;
  id_propuesta: number;
  nombre_archivo: string;
  tipo_mime: string;
  tamano_bytes: number;
  fecha_subida: string;
  subido_por: string | null;
}

export async function listarDocumentos(idPropuesta: number): Promise<DocumentoRevision[]> {
  const { data } = await api.get(`/propuestas/${idPropuesta}/documentos`);
  return data.documentos ?? [];
}

// Lee el archivo elegido y lo envía en base64 (máximo 5 MB, PDF o Word).
export async function subirDocumento(idPropuesta: number, archivo: File) {
  if (archivo.size > 5 * 1024 * 1024) throw new Error('El archivo no puede pasar de 5 MB.');
  const base64 = await new Promise<string>((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(String(lector.result).split(',')[1] ?? '');
    lector.onerror = () => rechazar(new Error('No se pudo leer el archivo.'));
    lector.readAsDataURL(archivo);
  });
  await api.post(`/propuestas/${idPropuesta}/documentos`, { nombre: archivo.name, tipo: archivo.type, base64 });
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
