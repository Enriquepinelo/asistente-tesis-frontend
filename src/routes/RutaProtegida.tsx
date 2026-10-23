import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Rol } from '../types';
import { ReactNode } from 'react';

export function RutaProtegida({
  children,
  rolesPermitidos,
}: {
  children: ReactNode;
  rolesPermitidos: Rol[];
}) {
  const { usuario } = useAuth();

  if (!usuario) return <Navigate to="/login" replace />;
  if (!rolesPermitidos.includes(usuario.rol)) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
