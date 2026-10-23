import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { generarTemas, generarDesarrollo, mensajeError } from '../../api/propuestaFlujo';

type Opcion = 'no' | 'si';

export default function FormularioTesis() {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const [tieneTema, setTieneTema] = useState<Opcion>('no');
  const [area, setArea] = useState('');
  const [tema, setTema] = useState('');
  const [detalle, setDetalle] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarEnvio(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      if (tieneTema === 'no') {
        // Paso 1: el sistema propone temas; el estudiante elegirá uno en "Mi propuesta".
        await generarTemas(usuario, area, detalle);
      } else {
        // Ya trae tema: se salta directo al desarrollo completo.
        await generarDesarrollo(usuario, area, tema, detalle);
      }
      navigate('/estudiante/propuesta');
    } catch (err: any) {
      setError(
        mensajeError(err, 'No se pudo enviar el formulario. Intenta de nuevo en unos minutos.')
      );
    } finally {
      setEnviando(false);
    }
  }

  const tarjeta = (activa: boolean) =>
    `text-left w-full rounded-sm border px-4 py-3.5 transition-colors ${
      activa ? 'border-gold-dark bg-white' : 'border-paper-300 bg-transparent'
    }`;

  return (
    <div className="max-w-2xl">
      <p className="text-[13px] tracking-wide text-gold-dark mb-2">Fase de planificación</p>
      <h1 className="text-3xl mb-2">Formulario de anteproyecto</h1>
      <p className="text-slate-soft text-[15px] mb-8 leading-relaxed">
        Primero se define el tema y después se desarrolla todo lo demás. Si todavía no tienes
        un tema, el sistema te propondrá tres para que elijas uno. Si ya tienes uno, lo
        escribes y se genera directamente el planteamiento, los objetivos y la justificación.
      </p>

      <form onSubmit={manejarEnvio} className="folio p-7 space-y-6">
        <div>
          <label className="label-field">¿Ya tienes un tema de tesis?</label>
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              type="button"
              className={tarjeta(tieneTema === 'no')}
              onClick={() => setTieneTema('no')}
            >
              <span className="block text-[15px] font-medium">No, necesito que me propongan uno</span>
              <span className="block text-[13px] text-slate-soft mt-1">
                El sistema te dará tres temas para elegir.
              </span>
            </button>
            <button
              type="button"
              className={tarjeta(tieneTema === 'si')}
              onClick={() => setTieneTema('si')}
            >
              <span className="block text-[15px] font-medium">Sí, ya tengo mi tema</span>
              <span className="block text-[13px] text-slate-soft mt-1">
                Lo escribes y se genera todo el desarrollo.
              </span>
            </button>
          </div>
        </div>

        <div>
          <label className="label-field">Área de interés</label>
          <input
            className="input-field"
            placeholder="Ej. Inteligencia Artificial, redes, bases de datos..."
            value={area}
            onChange={(e) => setArea(e.target.value)}
            required
          />
        </div>

        {tieneTema === 'si' && (
          <div>
            <label className="label-field">Tu tema de tesis</label>
            <textarea
              className="input-field min-h-[80px]"
              placeholder="Escribe el título o la idea de tu tema tal como lo tienes."
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              required
            />
          </div>
        )}

        <div>
          <label className="label-field">
            {tieneTema === 'no'
              ? 'Algo que quieras contarnos (opcional)'
              : 'Contexto adicional (opcional)'}
          </label>
          <textarea
            className="input-field min-h-[80px]"
            placeholder={
              tieneTema === 'no'
                ? 'Ej. me interesa aplicarlo en empresas pequeñas, o en el sector salud...'
                : 'Ej. población, lugar o alcance que tienes en mente.'
            }
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
          />
        </div>

        {error && (
          <p className="text-[13.5px] text-danger bg-danger/8 border border-danger/20 rounded-sm px-3.5 py-2.5">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-paper-300">
          <p className="text-[13px] text-slate-soft">
            La generación con IA puede tardar entre 10 y 40 segundos.
          </p>
          <button type="submit" disabled={enviando} className="btn-gold">
            {enviando
              ? 'Generando…'
              : tieneTema === 'no'
              ? 'Proponer temas'
              : 'Generar propuesta'}
          </button>
        </div>
      </form>
    </div>
  );
}
