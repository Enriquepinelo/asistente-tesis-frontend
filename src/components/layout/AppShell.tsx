import { NavLink, Outlet, Navigate } from 'react-router-dom';
import {
  FileText,
  LayoutGrid,
  History,
  LogOut,
  ClipboardCheck,
  Users,
  BarChart3,
  GraduationCap,
} from 'lucide-react';
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
              {item.label}
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

      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-5xl px-8 py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
