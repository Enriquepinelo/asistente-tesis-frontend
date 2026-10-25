import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, CheckCircle2 } from 'lucide-react';
import { api, endpoints } from '../api/client';

const DOMINIOS = ['miumg.edu.gt', 'umg.edu.gt'];

export default function Registro() {
  const [datos, setDatos] = useState({
    nombre_completo: '',
    carnet: '',
    carrera: 'Ingeniería en Sistemas',
    sede: 'Boca del Monte',
    correo: '',
    contrasena: '',
    confirmar: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  const campo = (k: keyof typeof datos) => ({
    value: datos[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDatos({ ...datos, [k]: e.target.value }),
  });

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const dominio = datos.correo.trim().toLowerCase().split('@')[1] ?? '';
    if (!DOMINIOS.includes(dominio)) {
      setError('Usa tu correo institucional (@miumg.edu.gt o @umg.edu.gt).');
      return;
    }
    if (datos.contrasena.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (datos.contrasena !== datos.confirmar) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setEnviando(true);
    try {
      const { confirmar: _omitir, ...cuerpo } = datos;
      await api.post(endpoints.registro, cuerpo);
      setListo(true);
    } catch (err: any) {
      setError(err?.response?.data?.mensaje || 'No se pudo crear la cuenta. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6 py-14">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-9 w-9 rounded-full border border-gold/60 flex items-center justify-center">
            <GraduationCap size={18} className="text-gold-dark" />
          </div>
          <span className="font-serif text-lg text-ink">Asistente de Tesis</span>
        </div>

        {listo ? (
          <div className="folio p-8">
            <CheckCircle2 className="text-ok mb-4" size={32} />
            <h1 className="text-2xl mb-2">Cuenta creada</h1>
            <p className="text-slate-soft text-[15px] leading-relaxed">
              Tu solicitud quedó registrada. La coordinación revisará tus datos y activará tu cuenta.
              Cuando esté activa podrás ingresar con <strong>{datos.correo}</strong> y la contraseña que elegiste.
            </p>
            <Link to="/login" className="btn-primary inline-block mt-6">Ir a iniciar sesión</Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl mb-1">Crea tu cuenta de estudiante</h1>
            <p className="text-slate-soft text-[14.5px] mb-8">
              Usa tu correo institucional. Tu cuenta se activa cuando la coordinación la aprueba.
            </p>
            <form onSubmit={enviar} className="folio p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className="label-field" htmlFor="r-nombre">Nombre completo</label>
                <input id="r-nombre" className="input-field" required {...campo('nombre_completo')} />
              </div>
              <div>
                <label className="label-field" htmlFor="r-carnet">Carnet</label>
                <input id="r-carnet" className="input-field" required {...campo('carnet')} />
              </div>
              <div>
                <label className="label-field" htmlFor="r-sede">Sede</label>
                <input id="r-sede" className="input-field" {...campo('sede')} />
              </div>
              <div className="sm:col-span-2">
                <label className="label-field" htmlFor="r-carrera">Carrera</label>
                <input id="r-carrera" className="input-field" required {...campo('carrera')} />
              </div>
              <div className="sm:col-span-2">
                <label className="label-field" htmlFor="r-correo">Correo institucional</label>
                <input id="r-correo" type="email" className="input-field" required placeholder="nombre@miumg.edu.gt" {...campo('correo')} />
              </div>
              <div>
                <label className="label-field" htmlFor="r-pass">Contraseña</label>
                <input id="r-pass" type="password" className="input-field" required minLength={8} {...campo('contrasena')} />
                <p className="mt-1 text-[12.5px] text-slate-soft">Mínimo 8 caracteres.</p>
              </div>
              <div>
                <label className="label-field" htmlFor="r-conf">Repite la contraseña</label>
                <input id="r-conf" type="password" className="input-field" required {...campo('confirmar')} />
              </div>
              {error && (
                <p className="sm:col-span-2 text-[13.5px] text-danger bg-danger/8 border border-danger/20 rounded-sm px-3.5 py-2.5">
                  {error}
                </p>
              )}
              <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
                <button type="submit" className="btn-primary" disabled={enviando}>
                  {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
                </button>
                <Link to="/login" className="text-[14px] text-slate-soft underline">Ya tengo cuenta</Link>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
