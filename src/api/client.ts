import axios from 'axios';

/**
 * IMPORTANTE PARA ENRIQUE:
 * -------------------------------------------------------------------------
 * Estas son las rutas que ASUMO que tiene tu backend (Fase 2), siguiendo
 * convenciones REST estándar sobre lo que ya construiste (auth, formularios,
 * propuestas, historial, recomendaciones).
 *
 * Si al probar el frontend ves un error 404 o "Cannot GET/POST ...", NO es un
 * bug del frontend: solo significa que tu backend usa un nombre de ruta
 * distinto. Copia el mensaje de error y la ruta exacta que marca la consola
 * del navegador (F12 -> pestaña "Network") y ajustamos este archivo, igual
 * que hicimos con los nodos de n8n.
 * -------------------------------------------------------------------------
 */

const BASE_URL = 'https://asistente-tesis-backend.onrender.com/api';

export const api = axios.create({
  baseURL: BASE_URL,
});

// Adjunta el token JWT guardado a cada solicitud
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el token expira o es inválido, regresa al login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const endpoints = {
  login: '/auth/login',
  formularios: '/formularios',
  formularioPorId: (id: number | string) => `/formularios/${id}`,
  generarPropuesta: (id: number | string) => `/formularios/${id}/generar-propuesta`,
  propuestaPorFormulario: (idFormulario: number | string) => `/propuestas/formulario/${idFormulario}`,
  propuestas: '/propuestas',
  propuestaPorId: (id: number | string) => `/propuestas/${id}`,
  historial: '/historial',
  historialPorFormulario: (idFormulario: number | string) => `/historial/formulario/${idFormulario}`,
  recomendaciones: (idFormulario: number | string) => `/recomendaciones/formulario/${idFormulario}`,
  usuarios: '/usuarios',
  misRecomendaciones: '/recomendaciones',
};