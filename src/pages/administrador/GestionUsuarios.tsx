import { FormEvent, useEffect, useState } from 'react';
import { api, endpoints } from '../../api/client';
import type { Rol, Usuario } from '../../types';

const rolesDisponibles: Rol[] = ['estudiante', 'asesor', 'coordinador', 'administrador'];

export default function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevo, setNuevo] = useState({ nombre_usuario: '', correo: '', contrasena: '', rol: 'estudiante' as Rol });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarUsuarios();
  }, []);

  function cargarUsuarios() {
    setCargando(true);
    api
      .get(endpoints.usuarios)
      .then(({ data }) => setUsuarios(data.usuarios ?? data))
      .catch(() => setUsuarios([]))
      .finally(() => setCargando(false));
  }

  async function crearUsuario(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(endpoints.usuarios, nuevo);
      setNuevo({ nombre_usuario: '', correo: '', contrasena: '', rol: 'estudiante' });
      setMostrarFormulario(false);
      cargarUsuarios();
    } catch (err: any) {
      setError(err?.response?.data?.mensaje || 'No se pudo crear el usuario.');
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-[13px] tracking-wide text-gold-dark mb-2">Administración</p>
          <h1 className="text-3xl">Usuarios del sistema</h1>
        </div>
        <button className="btn-primary" onClick={() => setMostrarFormulario((v) => !v)}>
          {mostrarFormulario ? 'Cancelar' : 'Nuevo usuario'}
        </button>
      </div>

      {mostrarFormulario && (
        <form onSubmit={crearUsuario} className="folio p-6 mb-6 grid grid-cols-2 gap-5">
          <div>
            <label className="label-field">Nombre de usuario</label>
            <input
              className="input-field"
              required
              value={nuevo.nombre_usuario}
              onChange={(e) => setNuevo({ ...nuevo, nombre_usuario: e.target.value })}
            />
          </div>
          <div>
            <label className="label-field">Correo</label>
            <input
              type="email"
              className="input-field"
              required
              value={nuevo.correo}
              onChange={(e) => setNuevo({ ...nuevo, correo: e.target.value })}
            />
          </div>
          <div>
            <label className="label-field">Contraseña temporal</label>
            <input
              type="password"
              className="input-field"
              required
              value={nuevo.contrasena}
              onChange={(e) => setNuevo({ ...nuevo, contrasena: e.target.value })}
            />
          </div>
          <div>
            <label className="label-field">Rol</label>
            <select
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
          {error && <p className="col-span-2 text-[13.5px] text-danger">{error}</p>}
          <div className="col-span-2">
            <button type="submit" className="btn-gold">
              Crear usuario
            </button>
          </div>
        </form>
      )}

      {cargando && <p className="text-slate-soft">Cargando usuarios…</p>}

      {!cargando && (
        <div className="folio overflow-hidden">
          <table className="w-full text-[14.5px]">
            <thead>
              <tr className="border-b border-paper-300 text-left text-slate-soft">
                <th className="px-6 py-3 font-medium">Usuario</th>
                <th className="px-6 py-3 font-medium">Correo</th>
                <th className="px-6 py-3 font-medium">Rol</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id_usuario} className="border-b border-paper-300 last:border-0">
                  <td className="px-6 py-3.5">{u.nombre_usuario}</td>
                  <td className="px-6 py-3.5 text-slate-soft">{u.correo}</td>
                  <td className="px-6 py-3.5 capitalize">{u.rol}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
