import { useState } from 'react';
import { CheckCircle2, Loader2, Upload } from 'lucide-react';
import { ACCEPT_ARCHIVOS, subirDocumento } from '../api/documentos';

interface Props {
  idPropuesta: number;
  texto: string;
  mensajeListo: string;
  onSubido?: () => void;
}

// Botón para subir un archivo con barra de avance, aviso de error y "Listo" en verde.
export function SubirDocumento({ idPropuesta, texto, mensajeListo, onSubido }: Props) {
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [listo, setListo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function subir(archivo?: File) {
    if (!archivo) return;
    setSubiendo(true);
    setProgreso(0);
    setListo(null);
    setError(null);
    try {
      await subirDocumento(idPropuesta, archivo, setProgreso);
      setListo(archivo.name);
      setTimeout(() => setListo(null), 6000);
      onSubido?.();
    } catch (err: any) {
      setError(err?.response?.data?.mensaje || err?.message || 'No se pudo subir el archivo.');
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div>
      <label className="btn-ghost !px-3.5 !py-1.5 text-[13px] inline-flex items-center gap-2 cursor-pointer">
        {subiendo ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        {subiendo ? 'Subiendo…' : texto}
        <input
          type="file"
          className="hidden"
          accept={ACCEPT_ARCHIVOS}
          disabled={subiendo}
          onChange={(e) => {
            subir(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </label>
      <p className="text-[12.5px] text-slate-soft mt-1.5">PDF, Word, Excel, PowerPoint o imagen (PNG, JPG). Máximo 5 MB.</p>

      {subiendo && (
        <div className="mt-2 max-w-sm aparecer" role="status" aria-live="polite">
          <div className="flex justify-between text-[12.5px] text-slate-soft mb-1">
            <span>{progreso < 100 ? 'Subiendo archivo…' : 'Verificando el archivo en el servidor…'}</span>
            <span className="tabular-nums">{progreso}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-200">
            <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${progreso}%` }} />
          </div>
        </div>
      )}
      {listo && (
        <p role="status" className="mt-2 inline-flex items-center gap-1.5 rounded-sm border border-ok/30 bg-ok/10 px-3 py-1.5 text-[13px] text-ok aparecer">
          <CheckCircle2 size={15} /> Listo: "{listo}" se subió. {mensajeListo}
        </p>
      )}
      {error && (
        <p className="mt-2 text-[13px] text-danger bg-danger/8 border border-danger/20 rounded-sm px-3 py-1.5">{error}</p>
      )}
    </div>
  );
}
