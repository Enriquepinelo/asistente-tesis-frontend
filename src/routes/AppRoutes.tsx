import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
import Registro from '../pages/Registro';
import { AppShell } from '../components/layout/AppShell';
import { RutaProtegida } from './RutaProtegida';
import { useAuth } from '../context/AuthContext';

import FormularioTesis from '../pages/estudiante/FormularioTesis';
import PropuestaGenerada from '../pages/estudiante/PropuestaGenerada';
import HistorialEstudiante from '../pages/estudiante/HistorialEstudiante';
import Revisiones from '../pages/estudiante/Revisiones';
import BandejaRevision from '../pages/asesor/BandejaRevision';
import PanelGeneral from '../pages/coordinador/PanelGeneral';
import GestionUsuarios from '../pages/administrador/GestionUsuarios';

const destinoPorRol: Record<string, string> = {
  estudiante: '/estudiante/formulario',
  asesor: '/asesor/bandeja',
  coordinador: '/coordinador/panel',
  administrador: '/administrador/usuarios',
};

function Raiz() {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  return <Navigate to={destinoPorRol[usuario.rol]} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/" element={<Raiz />} />

      <Route element={<AppShell />}>
        <Route
          path="/estudiante/formulario"
          element={
            <RutaProtegida rolesPermitidos={['estudiante']}>
              <FormularioTesis />
            </RutaProtegida>
          }
        />
        <Route
          path="/estudiante/propuesta"
          element={
            <RutaProtegida rolesPermitidos={['estudiante']}>
              <PropuestaGenerada />
            </RutaProtegida>
          }
        />
        <Route
          path="/estudiante/historial"
          element={
            <RutaProtegida rolesPermitidos={['estudiante']}>
              <HistorialEstudiante />
            </RutaProtegida>
          }
        />

        <Route
          path="/estudiante/revisiones"
          element={
            <RutaProtegida rolesPermitidos={['estudiante']}>
              <Revisiones />
            </RutaProtegida>
          }
        />

        <Route
          path="/asesor/bandeja"
          element={
            <RutaProtegida rolesPermitidos={['asesor']}>
              <BandejaRevision />
            </RutaProtegida>
          }
        />

        <Route
          path="/coordinador/panel"
          element={
            <RutaProtegida rolesPermitidos={['coordinador']}>
              <PanelGeneral />
            </RutaProtegida>
          }
        />

        <Route
          path="/administrador/usuarios"
          element={
            <RutaProtegida rolesPermitidos={['administrador']}>
              <GestionUsuarios />
            </RutaProtegida>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
