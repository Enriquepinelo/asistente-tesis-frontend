import { useState } from 'react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { enviarARevision, mensajeError } from '../api/propuestaFlujo';

interface Props {
  idFormulario: number | null;
  enviada?: string | null;
  estado?: string;
  onEnviada: (fecha: string) => void;
}

function fechaCorta(f: string) {
  const d = new Date(f.includes('T') ? f : f.replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime())
    ? f
    : d.toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guatemala' });
}

// El estudiante decide cuándo mandar su anteproyecto al asesor.
// Mientras no lo envíe, el asesor no lo ve en su bandeja.
export function EnviarRevision({ idFormulario, enviada, estado, onEnviada }: Props) {
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const puedeReenviar = !!enviada && estado === 'ajustada';
  const mostrarFormulario = !enviada || puedeReenviar;

  async function enviar() {
    if (!idFormulario) return;
    setEnviando(true);
    setError(null);
    try {
      const texto = await enviarARevision(idFormulario, mensaje);
      setListo(texto);
      setMensaje('');
      onEnviada(new Date().toISOString());
    } catch (err: any) {
      setError(mensajeError(err, 'No se pudo enviar la propuesta. Intenta de nuevo.'));
    } finally {
      setEnviando(false);
    }
  }

  if (listo) {
    return (
      <div role="status" className="flex items-center gap-3 rounded-sm border border-ok/30 bg-ok/10 px-4 py-3 text-ok aparecer mb-8">
        <CheckCircle2 size={22} className="shrink-0" />
        <div>
          <p className="font-medium text-[15px]">¡Listo!</p>
          <p className="text-[13.5px]">{listo} Te avisaremos en Revisiones cuando la revise.</p>
        </div>
      </div>
    );
  }

  if (!mostrarFormulario) {
    return (
      <p className="mb-8 flex items-center gap-2 rounded-sm border border-paper-300 bg-white px-4 py-3 text-[14px] text-slate-soft">
        <Send size={15} /> Enviada a tu asesor el {fechaCorta(enviada!)}. Sus observaciones aparecerán en Revisiones.
      </p>
    );
  }

  return (
    <section className="folio mb-8">
      <div className="folio-header">
        <h2 className="text-lg m-0">{puedeReenviar ? 'Enviar de nuevo a mi asesor' : 'Enviar a mi asesor para revisión'}</h2>
      </div>
      <div className="p-6 space-y-3">
        <p className="text-[14px] text-slate-soft leading-relaxed">
          {puedeReenviar
            ? 'Tu asesor pidió ajustes. Cuando hayas hecho los cambios (puedes subir tu archivo corregido en Revisiones), envíala otra vez.'
            : 'Esta propuesta todavía es un borrador: solo tú la ves. Revísala y, cuando estés de acuerdo, envíala a tu asesor.'}
        </p>
        <textarea
          className="input-field min-h-[70px]"
          maxLength={1000}
          placeholder="Mensaje para tu asesor (opcional). Ej. Elegí este tema porque trabajo en una pequeña empresa."
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          disabled={enviando}
        />
        {error && (
          <p className="text-[13.5px] text-danger bg-danger/8 border border-danger/20 rounded-sm px-3.5 py-2.5">{error}</p>
        )}
        <div className="flex justify-end">
          <button type="button" className="btn-gold inline-flex items-center gap-2" disabled={enviando || !idFormulario} onClick={enviar}>
            {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {enviando ? 'Enviando…' : puedeReenviar ? 'Enviar corrección' : 'Enviar a revisión'}
          </button>
        </div>
      </div>
    </section>
  );
}
