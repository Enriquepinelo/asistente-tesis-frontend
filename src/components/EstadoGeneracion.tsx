import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

// Mensajes que se van mostrando mientras la IA trabaja, para que el
// estudiante sepa que el sistema sigue avanzando.
const ETAPAS = [
  'Enviando tu solicitud al servidor…',
  'La inteligencia artificial está redactando la respuesta…',
  'Ordenando y revisando el resultado…',
  'Guardando tu propuesta…',
];

interface Props {
  estado: 'generando' | 'listo';
  titulo?: string;
  mensajeListo?: string;
}

export function EstadoGeneracion({
  estado,
  titulo = 'Generando respuesta',
  mensajeListo = 'Tu propuesta se generó correctamente.',
}: Props) {
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    if (estado !== 'generando') return;
    setSegundos(0);
    const reloj = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(reloj);
  }, [estado]);

  if (estado === 'listo') {
    return (
      <div
        role="status"
        className="flex items-center gap-3 rounded-sm border border-ok/30 bg-ok/10 px-4 py-3 text-ok aparecer"
      >
        <CheckCircle2 size={22} className="shrink-0" />
        <div>
          <p className="font-medium text-[15px]">¡Listo!</p>
          <p className="text-[13.5px]">{mensajeListo}</p>
        </div>
      </div>
    );
  }

  // Cambia de mensaje cada 6 segundos y se queda en el último.
  const etapa = ETAPAS[Math.min(Math.floor(segundos / 6), ETAPAS.length - 1)];

  return (
    <div role="status" aria-live="polite" className="rounded-sm border border-paper-300 bg-white px-4 py-3.5 aparecer">
      <div className="flex items-center gap-3">
        <Loader2 size={22} className="animate-spin text-gold-dark shrink-0" />
        <div className="flex-1">
          <p className="font-medium text-[15px]">{titulo}…</p>
          <p className="text-[13.5px] text-slate-soft">{etapa}</p>
        </div>
        <span className="text-[13px] text-slate-soft tabular-nums">{segundos} s</span>
      </div>
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-paper-200">
        <div className="barra-indeterminada h-full w-1/3 rounded-full bg-gold" />
      </div>
    </div>
  );
}
