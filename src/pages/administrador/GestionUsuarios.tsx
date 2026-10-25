import { FormEvent, Fragment, useEffect, useState } from 'react';
import { RefreshCw, Search, UserPlus } from 'lucide-react';
import { api, endpoints } from '../../api/client';
import type { Rol, Usuario } from '../../types';
import { useAuth } from '../../context/AuthContext';

const rolesDisponibles: Rol[] = ['estudiante', 'asesor', 'coordinador', 'administrador'];

const etiquetaRol: Record<Rol, string> = {
  estudiante: 'Estudiante',
  asesor: 'Docente asesor',
  coordinador: 'Coordinador',
  administrador: 'Administrador',
};
const plural: Record<Rol, string> = {
  estudiante: 'Estudiantes',
  asesor: 'Docentes asesores',
  coordinador: 'Coordinadores',
  administrador: 'Administradores',
};
// Un color por rol, para las iniciales y las etiquetas.
const colorRol: Record<Rol, string> = {
  estudiante: 'bg-ink-600 text-white',
  asesor: 'bg-gold text-ink',
  coordinador: 'bg-ok text-white',
  administrador: 'bg-ink text-gold-light',
};

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

interface Servicio { ok: boolean; ms?: number }
interface EstadoSistema {
  servidor: Servicio;
  base_datos: Servicio;
  servicio_ia: Servicio;
  actividad: { fecha: string; tipo: string; estado: string; detalle: string; estudiante: string | null }[];
}

function iniciales(u: Usuario) {
  const base = (u.nombre_completo || u.nombre_usuario || u.correo).trim();
  const partes = base.split(/\s+/).filter(Boolean);
  const txt = partes.length > 1 ? partes[0][0] + partes[1][0] : base.slice(0, 2);
  return txt.toUpperCase();
}

function fecha(f?: string | null) {
  if (!f) return '';
  const d = new Date(f.includes('T') ? f : f.replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? f : d.toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' });
}

function textoActividad(a: EstadoSistema['actividad'][number]) {
  const quien = a.estudiante ? ` de ${a.estudiante}` : '';
  if (a.tipo === 'observacion') return `Observación del asesor${quien}: ${a.detalle}`;
  if (a.estado === 'exitoso') return `Propuesta generada con IA${quien}`;
  return `Falló la generación de propuesta${quien}`;
}

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
  const [buscar, setBuscar] = useState('');
  const [filtroRol, setFiltroRol] = useState<Rol | 'todos'>('todos');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activo' | 'inactivo'>('todos');
  const [editando, setEditando] = useState<number | null>(null);
  const [rolEdit, setRolEdit] = useState<Rol>('estudiante');
  const [temporal, setTemporal] = useState<{ id: number; clave: string } | null>(null);
  const [estado, setEstado] = useState<EstadoSistema | null>(null);
  const [revisando, setRevisando] = useState(false);

  useEffect(() => {
    cargarUsuarios();
    revisarSistema();
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

  function revisarSistema() {
    setRevisando(true);
    api
      .get(`${endpoints.usuarios}/estado-sistema`)
      .then(({ data }) => setEstado(data))
      .catch(() => setEstado({ servidor: { ok: false }, base_datos: { ok: false }, servicio_ia: { ok: false }, actividad: [] }))
      .finally(() => setRevisando(false));
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
    const nuevoEstado = u.estado === 'inactivo' ? 'activo' : 'inactivo';
    setAviso(null);
    try {
      await api.patch(`${endpoints.usuarios}/${u.id_usuario}/estado`, { estado: nuevoEstado });
      setUsuarios((l) => l.map((x) => (x.id_usuario === u.id_usuario ? { ...x, estado: nuevoEstado } : x)));
      setAviso(nuevoEstado === 'activo' ? `Cuenta de ${u.correo} activada.` : `Cuenta de ${u.correo} desactivada.`);
    } catch (err: any) {
      setAviso(err?.response?.data?.mensaje || 'No se pudo cambiar el estado.');
    }
  }

  function abrirEdicion(u: Usuario) {
    setEditando(editando === u.id_usuario ? null : u.id_usuario);
    setRolEdit(u.rol);
    setTemporal(null);
    setAviso(null);
  }

  async function guardarRol(u: Usuario) {
    try {
      await api.patch(`${endpoints.usuarios}/${u.id_usuario}/rol`, { rol: rolEdit });
      setUsuarios((l) => l.map((x) => (x.id_usuario === u.id_usuario ? { ...x, rol: rolEdit } : x)));
      setAviso(`Rol de ${u.correo} cambiado a ${etiquetaRol[rolEdit]}.`);
    } catch (err: any) {
      setAviso(err?.response?.data?.mensaje || 'No se pudo cambiar el rol.');
    }
  }

  async function restablecer(u: Usuario) {
    try {
      const { data } = await api.post(`${endpoints.usuarios}/${u.id_usuario}/restablecer-contrasena`);
      setTemporal({ id: u.id_usuario, clave: data.contrasena_temporal });
    } catch (err: any) {
      setAviso(err?.response?.data?.mensaje || 'No se pudo restablecer la contraseña.');
    }
  }

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setAviso('Contraseña copiada.');
    } catch {
      setAviso('No se pudo copiar; selecciona la contraseña y cópiala a mano.');
    }
  }

  const campo = (k: keyof typeof vacio) => ({
    value: nuevo[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setNuevo({ ...nuevo, [k]: e.target.value }),
  });

  const activos = usuarios.filter((u) => u.estado !== 'inactivo').length;
  const pendientes = usuarios.filter((u) => u.estado === 'inactivo').length;
  const filtrados = usuarios.filter(
    (u) =>
      (filtroRol === 'todos' || u.rol === filtroRol) &&
      (filtroEstado === 'todos' || (u.estado ?? 'activo') === filtroEstado) &&
      `${u.nombre_usuario} ${u.nombre_completo ?? ''} ${u.correo}`.toLowerCase().includes(buscar.trim().toLowerCase()),
  );

  const servicios: [string, Servicio | undefined, string][] = [
    ['Servidor', estado?.servidor, 'En línea'],
    ['Base de datos', estado?.base_datos, 'En línea'],
    ['Servicio de IA (n8n)', estado?.servicio_ia, 'En línea'],
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[13px] tracking-wide text-gold-dark mb-2">Administración</p>
          <h1 className="text-3xl">Usuarios del sistema</h1>
          <p className="text-slate-soft text-[15px] mt-1">Cuentas, roles y estado general de la plataforma.</p>
        </div>
        <button
          className="btn-primary inline-flex items-center gap-2"
          onClick={() => {
            setMostrarFormulario((v) => !v);
            setError(null);
          }}
        >
          <UserPlus size={16} /> {mostrarFormulario ? 'Cancelar' : 'Nuevo usuario'}
        </button>
      </div>

      {aviso && <p className="text-[14px] text-ok">{aviso}</p>}

      {/* ---------- Resumen por rol ---------- */}
      {!cargando && !errorCarga && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {rolesDisponibles.map((r) => {
            const n = usuarios.filter((u) => u.rol === r).length;
            return (
              <button
                key={r}
                onClick={() => setFiltroRol(filtroRol === r ? 'todos' : r)}
                className={`folio px-5 py-4 text-left flex items-center gap-4 transition-colors ${filtroRol === r ? '!border-gold' : ''}`}
                title="Filtrar la tabla por este rol"
              >
                <span className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center font-serif text-lg ${colorRol[r]}`}>{n}</span>
                <span>
                  <span className="block text-[13px] text-slate-soft">{plural[r]}</span>
                  <span className="block text-[13px]">
                    {(() => {
                      const p = usuarios.filter((u) => u.rol === r && u.estado === 'inactivo').length;
                      return p === 1 ? '1 pendiente' : `${p} pendientes`;
                    })()}
                  </span>
                </span>
              </button>
            );
          })}
        </section>
      )}

      {/* ---------- Estado del sistema y actividad ---------- */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-4">
        <div className="folio p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg m-0">Estado del sistema</h2>
            <button className="text-[13px] text-slate-soft hover:text-ink inline-flex items-center gap-1.5" onClick={revisarSistema} disabled={revisando}>
              <RefreshCw size={14} className={revisando ? 'animate-spin' : ''} /> {revisando ? 'Revisando…' : 'Revisar'}
            </button>
          </div>
          <ul className="space-y-3">
            {servicios.map(([nombre, s, ok]) => (
              <li key={nombre} className="flex items-center justify-between text-[14.5px]">
                <span className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${!estado ? 'bg-paper-300' : s?.ok ? 'bg-ok' : 'bg-warn'}`} />
                  {nombre}
                </span>
                <span className={`text-[13.5px] ${!estado ? 'text-slate-soft' : s?.ok ? 'text-ok' : 'text-warn'}`}>
                  {!estado
                    ? 'Revisando…'
                    : s?.ok
                      ? `${ok}${s.ms ? ` (${s.ms} ms)` : ''}`
                      : nombre.startsWith('Servicio')
                        ? 'Dormido o sin respuesta'
                        : 'Sin respuesta'}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-5 pt-4 border-t border-paper-300 grid grid-cols-2 gap-3 text-[13.5px]">
            <p><span className="font-serif text-2xl text-ok tabular-nums">{activos}</span><br /><span className="text-slate-soft">cuentas activas</span></p>
            <p><span className="font-serif text-2xl text-warn tabular-nums">{pendientes}</span><br /><span className="text-slate-soft">pendientes o inactivas</span></p>
          </div>
          {estado && !estado.servicio_ia.ok && (
            <p className="mt-4 text-[12.5px] text-slate-soft">
              En el plan gratuito el servicio de IA se duerme si no se usa. Al revisarlo se despierta; vuelve a revisar en un minuto.
            </p>
          )}
        </div>

        <div className="folio p-6">
          <h2 className="text-lg mb-4">Actividad reciente</h2>
          {!estado ? (
            <p className="text-slate-soft text-[14px]">Cargando…</p>
          ) : estado.actividad.length === 0 ? (
            <p className="text-slate-soft text-[14px]">Todavía no hay actividad registrada.</p>
          ) : (
            <ol className="space-y-3">
              {estado.actividad.map((a, i) => (
                <li key={i} className="flex gap-3 text-[14px]">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.tipo === 'observacion' ? 'bg-gold' : a.estado === 'exitoso' ? 'bg-ok' : 'bg-danger'}`}
                  />
                  <span className="min-w-0">
                    <span className="block truncate">{textoActividad(a)}</span>
                    <span className="block text-[12.5px] text-slate-soft">{fecha(a.fecha)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {/* ---------- Nuevo usuario ---------- */}
      {mostrarFormulario && (
        <form onSubmit={crearUsuario} className="folio p-6 grid grid-cols-2 gap-5">
          <h2 className="col-span-2 text-lg m-0">Nuevo usuario</h2>
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
            <select id="nu-rol" className="input-field" value={nuevo.rol} onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value as Rol })}>
              {rolesDisponibles.map((r) => (
                <option key={r} value={r}>{etiquetaRol[r]}</option>
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
            <button type="submit" className="btn-gold" disabled={guardando}>{guardando ? 'Creando…' : 'Crear usuario'}</button>
          </div>
        </form>
      )}

      {pendientes > 0 && (
        <div className="folio px-5 py-4 border-gold/40 bg-gold/5 text-[14.5px]">
          Hay {pendientes} cuenta(s) pendientes o inactivas. Revisa los datos y presiona <strong>Activar</strong> para darles acceso.
        </div>
      )}

      {/* ---------- Tabla de usuarios ---------- */}
      <section className="folio overflow-hidden">
        <div className="folio-header flex-wrap gap-3">
          <label className="relative" htmlFor="buscar-usuario">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-soft" />
            <input
              id="buscar-usuario"
              className="input-field !w-64 !py-1.5 !pl-9"
              placeholder="Buscar por nombre o correo"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <select id="filtro-rol" className="input-field !w-auto !py-1.5" value={filtroRol} onChange={(e) => setFiltroRol(e.target.value as Rol | 'todos')}>
              <option value="todos">Todos los roles</option>
              {rolesDisponibles.map((r) => (
                <option key={r} value={r}>{etiquetaRol[r]}</option>
              ))}
            </select>
            <select id="filtro-estado" className="input-field !w-auto !py-1.5" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as 'todos' | 'activo' | 'inactivo')}>
              <option value="todos">Todos los estados</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Pendientes o inactivos</option>
            </select>
          </div>
        </div>

        {cargando && <p className="px-6 py-5 text-slate-soft">Cargando usuarios…</p>}
        {!cargando && errorCarga && <p className="px-6 py-5 text-danger text-[14px]">{errorCarga}</p>}

        {!cargando && !errorCarga && (
          <div className="overflow-x-auto">
            <table className="w-full text-[14.5px]">
              <thead>
                <tr className="border-b border-paper-300 text-left text-slate-soft">
                  <th className="px-6 py-3 font-medium">Usuario</th>
                  <th className="px-4 py-3 font-medium">Correo</th>
                  <th className="px-4 py-3 font-medium">Rol</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-5 text-slate-soft">No hay usuarios que coincidan.</td></tr>
                )}
                {filtrados.map((u) => {
                  const esYo = u.id_usuario === yo?.id_usuario;
                  return (
                    <Fragment key={u.id_usuario}>
                      <tr className="border-b border-paper-300">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <span className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-[13px] font-semibold ${colorRol[u.rol]}`}>
                              {iniciales(u)}
                            </span>
                            <span className="min-w-0">
                              <span className="block">{u.nombre_completo || u.nombre_usuario}</span>
                              {u.nombre_completo && <span className="block text-[12.5px] text-slate-soft">{u.nombre_usuario}</span>}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-soft">{u.correo}</td>
                        <td className="px-4 py-3">{etiquetaRol[u.rol]}</td>
                        <td className="px-4 py-3">
                          <span className={`pill ${u.estado === 'inactivo' ? 'bg-warn/10 text-warn' : 'bg-ok/10 text-ok'}`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {u.estado === 'inactivo' ? 'Pendiente o inactiva' : 'Activa'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {esYo ? (
                            <span className="text-[13px] text-slate-soft">Tu cuenta</span>
                          ) : (
                            <span className="inline-flex gap-3">
                              {u.estado === 'inactivo' && (
                                <button className="text-[13px] font-medium text-ok underline" onClick={() => alternarEstado(u)}>Activar</button>
                              )}
                              <button className="text-[13px] underline text-slate-soft hover:text-ink" onClick={() => abrirEdicion(u)}>
                                {editando === u.id_usuario ? 'Cerrar' : 'Editar'}
                              </button>
                            </span>
                          )}
                        </td>
                      </tr>
                      {editando === u.id_usuario && (
                        <tr className="border-b border-paper-300 bg-paper-200/40">
                          <td colSpan={5} className="px-6 py-4">
                            <div className="flex flex-wrap items-end gap-6">
                              <div>
                                <label className="label-field" htmlFor={`rol-${u.id_usuario}`}>Cambiar rol</label>
                                <div className="flex gap-2">
                                  <select id={`rol-${u.id_usuario}`} className="input-field !w-auto !py-1.5" value={rolEdit} onChange={(e) => setRolEdit(e.target.value as Rol)}>
                                    {rolesDisponibles.map((r) => (
                                      <option key={r} value={r}>{etiquetaRol[r]}</option>
                                    ))}
                                  </select>
                                  <button className="btn-ghost !px-3.5 !py-1.5 text-[13px]" disabled={rolEdit === u.rol} onClick={() => guardarRol(u)}>
                                    Guardar rol
                                  </button>
                                </div>
                              </div>
                              <div>
                                <p className="label-field">Contraseña</p>
                                {temporal?.id === u.id_usuario ? (
                                  <div className="flex items-center gap-2">
                                    <code className="px-3 py-1.5 bg-paper-100 border border-paper-300 rounded-sm text-[14px] select-all">{temporal.clave}</code>
                                    <button className="btn-ghost !px-3 !py-1.5 text-[13px]" onClick={() => copiar(temporal.clave)}>Copiar</button>
                                  </div>
                                ) : (
                                  <button className="btn-ghost !px-3.5 !py-1.5 text-[13px]" onClick={() => restablecer(u)}>Generar contraseña temporal</button>
                                )}
                                {temporal?.id === u.id_usuario && (
                                  <p className="mt-1 text-[12.5px] text-slate-soft">Entrégasela al usuario. Solo se muestra esta vez.</p>
                                )}
                              </div>
                              <div>
                                <p className="label-field">Acceso</p>
                                <button className="btn-ghost !px-3.5 !py-1.5 text-[13px]" onClick={() => alternarEstado(u)}>
                                  {u.estado === 'inactivo' ? 'Activar cuenta' : 'Desactivar cuenta'}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
