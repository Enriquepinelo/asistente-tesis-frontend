# Frontend — Asistente de Planificación de Tesis

## 1. Dónde colocarlo

Coloca esta carpeta (`frontend-tesis`) al mismo nivel que tu carpeta `backend`, por ejemplo:

```
E:\U\Clases de Recuperacion\Proyecto de Graduacion 2\backend
E:\U\Clases de Recuperacion\Proyecto de Graduacion 2\frontend-tesis
```

## 2. Instalar dependencias

Abre una terminal (CMD o PowerShell) dentro de la carpeta `frontend-tesis` y ejecuta:

```
npm install
```

Esto puede tardar 1–2 minutos la primera vez.

## 3. Ejecutar el proyecto

Con tu backend (puerto 3000) y n8n (puerto 5678) ya corriendo, ejecuta:

```
npm run dev
```

Y abre en el navegador: `http://localhost:5173`

## 4. Si algo da error de conexión (404 o "Network Error")

Este frontend asume ciertas rutas de tu backend (ver comentario al inicio de
`src/api/client.ts`). Si alguna pantalla no carga datos:

1. Abre las herramientas de desarrollador del navegador (tecla F12).
2. Ve a la pestaña "Network" (Red).
3. Intenta la acción que falló y fíjate qué URL marca en rojo y qué código de error da (404, 500, etc.).
4. Pásame esa información — así ajustamos `src/api/client.ts` para que apunte a la ruta real de tu backend, igual como hicimos con los nodos de n8n.

## 5. Estructura de carpetas

- `src/pages/estudiante` — formulario, propuesta generada e historial.
- `src/pages/asesor` — bandeja de revisión de propuestas.
- `src/pages/coordinador` — panel general con estadísticas.
- `src/pages/administrador` — gestión de usuarios.
- `src/api/client.ts` — todas las rutas del backend en un solo lugar.
- `src/context/AuthContext.tsx` — manejo de sesión (JWT).
