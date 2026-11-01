import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import {
  FileText,
  LayoutGrid,
  History,
  LogOut,
  ClipboardCheck,
  Users,
  BarChart3,
  GraduationCap,
  MessageSquare,
  Bell,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { cargarObservaciones, ultimaVista } from '../../api/revisiones';
import {
  archivosDeEstudiantes,
  esDelAsesor,
  misDocumentos,
  ultimoArchivoVisto,
  ultimoDocAsesorVisto,
  type ArchivoEstudiante,
} from '../../api/documentos';
import { useAuth } from '../../context/AuthContext';
import type { Rol } from '../../types';

interface NavItem {
  to: string;
  label: string;
  icon: typeof FileText;
}

const navPorRol: Record<Rol, NavItem[]> = {
  estudiante: [
    { to: '/estudiante/formulario', label: 'Nuevo formulario', icon: FileText },
    { to: '/estudiante/propuesta', label: 'Mi propuesta', icon: LayoutGrid },
    { to: '/estudiante/historial', label: 'Historial', icon: History },
    { to: '/estudiante/revisiones', label: 'Revisiones', icon: MessageSquare },
  ],
  asesor: [
    { to: '/asesor/bandeja', label: 'Bandeja de revisión', icon: ClipboardCheck },
  ],
  coordinador: [
    { to: '/coordinador/panel', label: 'Panel general', icon: BarChart3 },
  ],
  administrador: [
    { to: '/administrador/usuarios', label: 'Usuarios', icon: Users },
  ],
};

const rolEtiqueta: Record<Rol, string> = {
  estudiante: 'Estudiante',
  asesor: 'Asesor',
  coordinador: 'Coordinador',
  administrador: 'Administrador',
};

export function AppShell() {
  const { usuario, cerrarSesion } = useAuth();
  const [nuevas, setNuevas] = useState(0);
  const [archivosNuevos, setArchivosNuevos] = useState(0);
  const [alerta, setAlerta] = useState<ArchivoEstudiante | null>(null);
  const [docsNuevos, setDocsNuevos] = useState(0);
  const [alertaEst, setAlertaEst] = useState<string | null>(null);

  // Aviso para el estudiante: documentos nuevos que le compartió su asesor.
  useEffect(() => {
    if (usuario?.rol !== 'estudiante') return;
    let activo = true;
    let mayorConocido = -1;
    const revisar = () =>
      misDocumentos()
        .then((todos) => {
          if (!activo) return;
          const delAsesor = todos.filter(esDelAsesor);
          const vistos = ultimoDocAsesorVisto(usuario.correo);
          setDocsNuevos(delAsesor.filter((d) => d.id_documento > vistos).length);
          const ultimo = delAsesor.reduce((a, d) => (!a || d.id_documento > a.id_documento ? d : a), null as (typeof delAsesor)[number] | null);
          const mayor = ultimo?.id_documento ?? 0;
          if (mayorConocido >= 0 && mayor > mayorConocido && ultimo) setAlertaEst(ultimo.nombre_archivo);
          mayorConocido = Math.max(mayorConocido, mayor);
        })
        .catch(() => undefined);
    revisar();
    const alVer = () => {
      setDocsNuevos(0);
      setAlertaEst(null);
    };
    window.addEventListener('docs-asesor-vistos', alVer);
    const intervalo = window.setInterval(revisar, 30000);
    return () => {
      activo = false;
      window.removeEventListener('docs-asesor-vistos', alVer);
      window.clearInterval(intervalo);
    };
  }, [usuario?.rol, usuario?.correo]);
  const navigate = useNavigate();

  // Aviso para el asesor y el coordinador: archivos nuevos que subieron los estudiantes.
  // Se revisa cada 30 segundos; si llega uno nuevo mientras está en el sistema, aparece una alerta.
  useEffect(() => {
    if (usuario?.rol !== 'asesor') return;
    let activo = true;
    let mayorConocido = -1;
    const revisar = () =>
      archivosDeEstudiantes()
        .then((lista) => {
          if (!activo) return;
          const vistos = ultimoArchivoVisto(usuario.correo);
          setArchivosNuevos(lista.filter((d) => d.id_documento > vistos).length);
          const mayor = lista[0]?.id_documento ?? 0;
          if (mayorConocido >= 0 && mayor > mayorConocido && lista[0]) setAlerta(lista[0]);
          mayorConocido = Math.max(mayorConocido, mayor);
        })
        .catch(() => undefined);
    revisar();
    const alVer = () => {
      setArchivosNuevos(0);
      setAlerta(null);
    };
    window.addEventListener('archivos-vistos', alVer);
    const intervalo = window.setInterval(revisar, 30000);
    return () => {
      activo = false;
      window.removeEventListener('archivos-vistos', alVer);
      window.clearInterval(intervalo);
    };
  }, [usuario?.rol, usuario?.correo]);

  // Aviso para el estudiante: cuantas observaciones nuevas dejo su asesor.
  useEffect(() => {
    if (usuario?.rol !== 'estudiante') return;
    let activo = true;
    const contar = () =>
      cargarObservaciones()
        .then((obs) => {
          const vista = ultimaVista(usuario.correo);
          if (activo) setNuevas(obs.filter((o) => o.id_recomendacion > vista).length);
        })
        .catch(() => undefined);
    contar();
    const alVer = () => setNuevas(0);
    window.addEventListener('revisiones-vistas', alVer);
    const intervalo = window.setInterval(contar, 60000);
    return () => {
      activo = false;
      window.removeEventListener('revisiones-vistas', alVer);
      window.clearInterval(intervalo);
    };
  }, [usuario?.rol, usuario?.correo]);
  // Sin sesión (por ejemplo, justo después de cerrarla) se regresa al inicio de sesión.
  if (!usuario) return <Navigate to="/login" replace />;

  const items = navPorRol[usuario.rol];

  return (
    <div className="min-h-screen flex bg-paper">
      <aside className="w-64 shrink-0 bg-ink text-paper-100 flex flex-col">
        <div className="px-6 py-6 border-b border-white/10 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full border border-gold/60 flex items-center justify-center">
            <GraduationCap size={18} className="text-gold-light" />
          </div>
          <div>
            <p className="font-serif text-[15px] leading-tight">Asistente de</p>
            <p className="font-serif text-[15px] leading-tight">Planificación de Tesis</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-sm px-3.5 py-2.5 text-[14.5px] transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-paper-200/80 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon size={17} />
              <span className="flex-1">{item.label}</span>
              {item.to === '/asesor/bandeja' && archivosNuevos > 0 && (
                <span className="rounded-full bg-gold text-ink text-[12px] font-semibold px-2 py-0.5" aria-label={`${archivosNuevos} archivos nuevos`}>
                  {archivosNuevos}
                </span>
              )}
              {item.to === '/estudiante/revisiones' && nuevas + docsNuevos > 0 && (
                <span className="rounded-full bg-gold text-ink text-[12px] font-semibold px-2 py-0.5" aria-label={`${nuevas + docsNuevos} novedades`}>
                  {nuevas + docsNuevos}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-6 py-5 border-t border-white/10">
          <p className="text-[13px] text-paper-200/70">{rolEtiqueta[usuario.rol]}</p>
          <p className="text-[14px] font-medium truncate">{usuario.correo}</p>
          <button
            onClick={cerrarSesion}
            className="mt-3 flex items-center gap-2 text-[13.5px] text-paper-200/80 hover:text-gold-light transition-colors"
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {alerta && (
        <div role="alert" className="fixed top-5 right-5 z-50 w-80 rounded-sm border border-gold/40 bg-white shadow-lg px-4 py-3.5 aparecer">
          <div className="flex items-start gap-3">
            <Bell size={18} className="text-gold-dark mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-[14.5px]">Nuevo archivo de un estudiante</p>
              <p className="text-[13px] text-slate-soft mt-0.5 break-words">
                {alerta.nombre_estudiante ?? 'Un estudiante'} subió "{alerta.nombre_archivo}".
              </p>
              <button
                className="mt-2 text-[13px] text-gold-dark underline"
                onClick={() => {
                  setAlerta(null);
                  navigate('/asesor/bandeja');
                }}
              >
                Ver en la bandeja
              </button>
            </div>
            <button aria-label="Cerrar aviso" onClick={() => setAlerta(null)} className="text-slate-soft hover:text-slate">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {alertaEst && (
        <div role="alert" className="fixed top-5 right-5 z-50 w-80 rounded-sm border border-gold/40 bg-white shadow-lg px-4 py-3.5 aparecer">
          <div className="flex items-start gap-3">
            <Bell size={18} className="text-gold-dark mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-[14.5px]">Tu asesor te compartió un documento</p>
              <p className="text-[13px] text-slate-soft mt-0.5 break-words">"{alertaEst}"</p>
              <button
                className="mt-2 text-[13px] text-gold-dark underline"
                onClick={() => {
                  setAlertaEst(null);
                  navigate('/estudiante/revisiones');
                }}
              >
                Ver en Revisiones
              </button>
            </div>
            <button aria-label="Cerrar aviso" onClick={() => setAlertaEst(null)} className="text-slate-soft hover:text-slate">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-5xl px-8 py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
