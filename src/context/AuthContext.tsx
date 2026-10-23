import { createContext, useContext, useState, ReactNode } from 'react';
import { api, endpoints } from '../api/client';
import type { Usuario } from '../types';

interface AuthContextValue {
  usuario: Usuario | null;
  cargando: boolean;
  error: string | null;
  iniciarSesion: (correo: string, contrasena: string) => Promise<boolean>;
  cerrarSesion: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const guardado = localStorage.getItem('usuario');
    return guardado ? JSON.parse(guardado) : null;
  });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function iniciarSesion(correo: string, contrasena: string) {
    setCargando(true);
    setError(null);
    try {
      const { data } = await api.post(endpoints.login, { correo, contrasena });
      const token = data.token ?? data.accessToken;
      const usuarioRecibido: Usuario = data.usuario ?? data.user;
      localStorage.setItem('token', token);
      localStorage.setItem('usuario', JSON.stringify(usuarioRecibido));
      setUsuario(usuarioRecibido);
      return true;
    } catch (err: any) {
      const mensaje =
        err?.response?.data?.mensaje ||
        err?.response?.data?.message ||
        'No se pudo iniciar sesión. Verifica tu correo y contraseña.';
      setError(mensaje);
      return false;
    } finally {
      setCargando(false);
    }
  }

  function cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, error, iniciarSesion, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
