const estilos: Record<string, string> = {
  procesado: 'bg-ok/10 text-ok',
  generada: 'bg-ink-600/10 text-ink-600',
  revisada: 'bg-gold/15 text-gold-dark',
  ajustada: 'bg-gold/15 text-gold-dark',
  aprobada: 'bg-ok/10 text-ok',
  borrador: 'bg-paper-300 text-slate-soft',
  error: 'bg-danger/10 text-danger',
  exitoso: 'bg-ok/10 text-ok',
  fallido: 'bg-danger/10 text-danger',
  validacion_error: 'bg-danger/10 text-danger',
  ia_error: 'bg-danger/10 text-danger',
  bd_error: 'bg-danger/10 text-danger',
};

const etiquetas: Record<string, string> = {
  procesado: 'Procesado',
  generada: 'Generada',
  revisada: 'Revisada',
  ajustada: 'Ajustada',
  aprobada: 'Aprobada',
  borrador: 'Borrador',
  error: 'Error',
  exitoso: 'Exitoso',
  fallido: 'Fallido',
  validacion_error: 'Error de validación',
  ia_error: 'Error de IA',
  bd_error: 'Error de base de datos',
};

export function EstadoPill({ estado }: { estado: string }) {
  return (
    <span className={`pill ${estilos[estado] ?? 'bg-paper-300 text-slate-soft'}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {etiquetas[estado] ?? estado}
    </span>
  );
}
