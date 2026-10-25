import { FormEvent, useEffect, useState } from 'react';
import { api, endpoints } from '../../api/client';
import type { Rol, Usuario } from '../../types';
import { useAuth } from '../../context/AuthContext';

const rolesDisponibles: Rol[] = ['estudiante', 'asesor', 'coordinador', 'administrador'];

const vacio = {
  nombre_usuario: '',
  correo: '',
  contrasena: '',
  rol: 'estudiante' as Rol,
  nombre_completo: '',
  carnet: '',
  carrera: 'Ingeniería en Sistemas',
  sede: 'Boca del Monte',
};

export default function GestionUsuarios() {
  const { usuario: yo } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevo, setNuevo] = useState(vacio);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarUsuarios();
  }, []);

  function cargarUsuarios() {
    setCargando(true);
    setErrorCarga(null);
    api
      .get(endpoints.usuarios)
      .then(({ data }) => setUsuarios(data.usuarios ?? data))
      .catch((err) => {
        setUsuarios([]);
        setErrorCarga(err?.response?.data?.mensaje || 'No se pudo cargar la lista de usuarios.');
      })
      .finally(() => setCargando(false));
  }

  async function crearUsuario(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    setGuardando(true);
    const cuerpo: Record<string, string> = {
      nombre_usuario: nuevo.nombre_usuario,
      correo: nuevo.correo,
      contrasena: nuevo.contrasena,
      rol: nuevo.rol,
    };
    if (nuevo.rol === 'estudiante') {
      cuerpo.nombre_completo = nuevo.nombre_completo;
      cuerpo.carnet = nuevo.carnet;
      cuerpo.carrera = nuevo.carrera;
      cuerpo.sede = nuevo.sede;
    }
    try {
      await api.post(endpoints.usuarios, cuerpo);
      setAviso(`Usuario ${nuevo.correo} creado.`);
      setNuevo(vacio);
      setMostrarFormulario(false);
      cargarUsuarios();
    } catch (err: any) {
      setError(err?.response?.data?.mensaje || 'No se pudo crear el usuario.');
    } finally {
      setGuardando(false);
    }
  }

  async function alternarEstado(u: Usuario) {
    const estado = u.estado === 'inactivo' ? 'activo' : 'inactivo';
    setAviso(null);
    try {
      await api.patch(`${endpoints.usuarios}/${u.id_usuario}/estado`, { estado });
      setUsuarios((lista) => lista.map((x) => (x.id_usuario === u.id_usuario ? { ...x, estado } : x)));
    } catch (err: any) {
      setAviso(err?.response?.data?.mensaje || 'No se pudo cambiar el estado.');
    }
  }

  const campo = (k: keyof typeof vacio) => ({
    value: nuevo[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setNuevo({ ...nuevo, [k]: e.target.value }),
  });

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-[13px] tracking-wide text-gold-dark mb-2">Administración</p>
          <h1 className="text-3xl">Usuarios del sistema</h1>
        </div>
        <button className="btn-primary" onClick={() => { setMostrarFormulario((v) => !v); setError(null); }}>
          {mostrarFormulario ? 'Cancelar' : 'Nuevo usuario'}
        </button>
      </div>

      {aviso && <p className="mb-4 text-[14px] text-ok">{aviso}</p>}

      {!cargando && usuarios.some((u) => u.estado === 'inactivo') && (
        <div className="folio px-5 py-4 mb-6 border-gold/40 bg-gold/5 text-[14.5px]">
          Hay {usuarios.filter((u) => u.estado === 'inactivo').length} cuenta(s) esperando aprobación. Revisa los datos y
          presiona <strong>Activar</strong> para darles acceso.
        </div>
      )}

      {mostrarFormulario && (
        <form onSubmit={crearUsuario} className="folio p-6 mb-6 grid grid-cols-2 gap-5">
          <div>
            <label className="label-field" htmlFor="nu-nombre">Nombre de usuario</label>
            <input id="nu-nombre" className="input-field" required minLength={3} {...campo('nombre_usuario')} />
          </div>
          <div>
            <label className="label-field" htmlFor="nu-correo">Correo</label>
            <input id="nu-correo" type="email" className="input-field" required {...campo('correo')} />
          </div>
          <div>
            <label className="label-field" htmlFor="nu-pass">Contraseña temporal</label>
            <input id="nu-pass" type="password" className="input-field" required minLength={8} {...campo('contrasena')} />
            <p className="mt-1 text-[12.5px] text-slate-soft">Mínimo 8 caracteres.</p>
          </div>
          <div>
            <label className="label-field" htmlFor="nu-rol">Rol</label>
            <select
              id="nu-rol"
              className="input-field"
              value={nuevo.rol}
              onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value as Rol })}
            >
              {rolesDisponibles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {nuevo.rol === 'estudiante' && (
            <>
              <div className="col-span-2 border-t border-paper-300 pt-4 text-[13px] text-slate-soft">
                Datos del estudiante (se necesitan para generar propuestas)
              </div>
              <div>
                <label className="label-field" htmlFor="nu-completo">Nombre completo</label>
                <input id="nu-completo" className="input-field" required {...campo('nombre_completo')} />
              </div>
              <div>
                <label className="label-field" htmlFor="nu-carnet">Carnet</label>
                <input id="nu-carnet" className="input-field" required {...campo('carnet')} />
              </div>
              <div>
                <label className="label-field" htmlFor="nu-carrera">Carrera</label>
                <input id="nu-carrera" className="input-field" required {...campo('carrera')} />
              </div>
              <div>
                <label className="label-field" htmlFor="nu-sede">Sede</label>
                <input id="nu-sede" className="input-field" {...campo('sede')} />
              </div>
            </>
          )}

          {error && <p className="col-span-2 text-[13.5px] text-danger">{error}</p>}
          <div className="col-span-2">
            <button type="submit" className="btn-gold" disabled={guardando}>
              {guardando ? 'Creando…' : 'Crear usuario'}
            </button>
          </div>
        </form>
      )}

      {cargando && <p className="text-slate-soft">Cargando usuarios…</p>}
      {!cargando && errorCarga && <p className="text-danger text-[14px]">{errorCarga}</p>}

      {!cargando && !errorCarga && (
        <div className="folio overflow-x-auto">
          <table className="w-full text-[14.5px]">
            <thead>
              <tr className="border-b border-paper-300 text-left text-slate-soft">
                <th className="px-6 py-3 font-medium">Usuario</th>
                <th className="px-6 py-3 font-medium">Correo</th>
                <th className="px-6 py-3 font-medium">Rol</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-5 text-slate-soft">Todavía no hay usuarios registrados.</td>
                </tr>
              )}
              {usuarios.map((u) => (
                <tr key={u.id_usuario} className="border-b border-paper-300 last:border-0">
                  <td className="px-6 py-3.5">
                    {u.nombre_usuario}
                    {u.nombre_completo && <div className="text-[12.5px] text-slate-soft">{u.nombre_completo}</div>}
                  </td>
                  <td className="px-6 py-3.5 text-slate-soft">{u.correo}</td>
                  <td className="px-6 py-3.5 capitalize">{u.rol}</td>
                  <td className="px-6 py-3.5">
                    <span className={u.estado === 'inactivo' ? 'text-danger' : 'text-ok'}>
                      {u.estado === 'inactivo' ? 'Pendiente o inactivo' : 'Activo'}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    {u.id_usuario === yo?.id_usuario ? (
                      <span className="text-[13px] text-slate-soft">Tu cuenta</span>
                    ) : (
                      <button className="text-[13px] underline text-slate-soft hover:text-ink" onClick={() => alternarEstado(u)}>
                        {u.estado === 'inactivo' ? 'Activar' : 'Desactivar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
