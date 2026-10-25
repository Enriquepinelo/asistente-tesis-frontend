import { FormEvent, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, FileText, Sparkles, ClipboardCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const destinoPorRol: Record<string, string> = {
  estudiante: '/estudiante/formulario',
  asesor: '/asesor/bandeja',
  coordinador: '/coordinador/panel',
  administrador: '/administrador/usuarios',
};

export default function Login() {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const { iniciarSesion, cargando, error } = useAuth();
  const navigate = useNavigate();

  async function manejarEnvio(e: FormEvent) {
    e.preventDefault();
    const ok = await iniciarSesion(correo, contrasena);
    if (ok) {
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
      navigate(destinoPorRol[usuario.rol] ?? '/');
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-paper">
      {/* Panel de identidad */}
      <div className="textura-papel hidden lg:flex flex-col justify-between bg-ink text-paper-100 px-16 py-14 relative overflow-hidden">
        {/* Sello académico decorativo, apenas visible */}
        <svg
          className="absolute -right-24 -top-24 opacity-[0.07]"
          width="360"
          height="360"
          viewBox="0 0 200 200"
        >
          <circle cx="100" cy="100" r="98" fill="none" stroke="#E7B565" strokeWidth="1" />
          <circle cx="100" cy="100" r="86" fill="none" stroke="#E7B565" strokeWidth="1" />
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i / 24) * Math.PI * 2;
            const x1 = 100 + Math.cos(angle) * 86;
            const y1 = 100 + Math.sin(angle) * 86;
            const x2 = 100 + Math.cos(angle) * 98;
            const y2 = 100 + Math.sin(angle) * 98;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#E7B565" strokeWidth="1" />;
          })}
        </svg>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full border border-gold/60 flex items-center justify-center">
            <GraduationCap size={20} className="text-gold-light" />
          </div>
          <span className="font-serif text-lg">Asistente de Tesis</span>
        </div>

        <div className="max-w-md">
          <h1 className="font-serif text-[2.75rem] leading-[1.1] text-white">
            Del formulario a la propuesta, en un solo expediente.
          </h1>
          <p className="mt-5 text-paper-200/80 text-[15px] leading-relaxed">
            Ingeniería en Sistemas · Universidad Mariano Gálvez de Guatemala. Estructura tu
            anteproyecto de graduación con apoyo de inteligencia artificial y seguimiento por
            asesoría.
          </p>

          {/* Diagrama del proceso: esto sí es una secuencia real, por eso lleva numeración */}
          <div className="mt-10 space-y-0">
            {[
              { icon: FileText, texto: 'El estudiante completa el formulario de anteproyecto' },
              { icon: Sparkles, texto: 'La IA redacta tema, objetivos y justificación' },
              { icon: ClipboardCheck, texto: 'El asesor revisa y ajusta la propuesta' },
              { icon: CheckCircle2, texto: 'Coordinación da seguimiento hasta su aprobación' },
            ].map((paso, i, arr) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-8 w-8 rounded-full bg-white/5 border border-gold/40 flex items-center justify-center shrink-0">
                    <paso.icon size={14} className="text-gold-light" />
                  </div>
                  {i < arr.length - 1 && <div className="w-px flex-1 bg-white/10 my-1" />}
                </div>
                <p className="text-[14px] text-paper-200/75 pb-6 pt-1.5 leading-snug">
                  {paso.texto}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[13px] text-paper-200/50">
          Planificación de Tesis · Sede Boca del Monte
        </p>
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="h-9 w-9 rounded-full border border-gold/60 flex items-center justify-center">
              <GraduationCap size={18} className="text-gold-dark" />
            </div>
            <span className="font-serif text-lg text-ink">Asistente de Tesis</span>
          </div>

          <h2 className="text-2xl mb-1">Inicia sesión</h2>
          <p className="text-slate-soft text-[14.5px] mb-8">
            Usa tu correo institucional y tu contraseña.
          </p>

          <form onSubmit={manejarEnvio} className="space-y-5">
            <div>
              <label className="label-field" htmlFor="correo">
                Correo
              </label>
              <input
                id="correo"
                type="email"
                required
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className="input-field"
                placeholder="nombre@umg.edu.gt"
              />
            </div>
            <div>
              <label className="label-field" htmlFor="contrasena">
                Contraseña
              </label>
              <input
                id="contrasena"
                type="password"
                required
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                className="input-field"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-[13.5px] text-danger bg-danger/8 border border-danger/20 rounded-sm px-3.5 py-2.5">
                {error}
              </p>
            )}

            <button type="submit" disabled={cargando} className="btn-primary w-full">
              {cargando ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
          <p className="mt-8 text-[14px] text-slate-soft">
            ¿Eres estudiante y no tienes cuenta?{' '}
            <Link to="/registro" className="text-ink font-medium underline">Crea tu cuenta</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
