# Solución: Error "Ruta no encontrada" en Producción (Amplify)

## Problema

Al acceder a URLs de concursos en producción como:
```
https://main.d23cmb2t56fwxl.amplifyapp.com/concurso/NAV2024-BRONCE
```

Se recibe el error:
```json
{"success":false,"error":"Ruta no encontrada"}
```

## Causa Raíz

El servidor Express (`server.js`) está configurado para:
1. ✅ Servir archivos estáticos desde `/dist`
2. ✅ Servir `index.html` en la ruta raíz `/`
3. ✅ Manejar rutas API como `/api/concursos/:codigo`
4. ❌ **NO tiene fallback** para rutas de React Router

Cuando un usuario accede directamente a `/concurso/NAV2024-BRONCE`:
- El servidor no encuentra una ruta API que coincida
- `express.static` busca un archivo físico `/dist/concurso/NAV2024-BRONCE` (no existe)
- Cae en el handler 404 → devuelve JSON de error

### Lo que DEBERÍA pasar:

1. Usuario accede a `/concurso/NAV2024-BRONCE`
2. Servidor sirve `index.html`
3. Frontend React carga
4. React Router ve la ruta y muestra el componente `Concurso.tsx`
5. El componente hace fetch a `/api/concursos/NAV2024-BRONCE` (API)
6. El servidor responde con los datos del concurso

---

## Solución: Agregar Fallback Route

### Paso 1: Modificar `server.js`

Ubicar el handler 404 (línea 987-993):

```javascript
// 404 - Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada'
  });
});
```

### Paso 2: Reemplazar con SPA Fallback

**REEMPLAZAR** el handler 404 con:

```javascript
// ============================================
// SPA FALLBACK - Servir index.html para rutas no-API
// ============================================

// Catch-all: servir index.html para rutas que no sean de API
// Esto permite que React Router maneje las rutas client-side
app.get('*', (req, res) => {
  // Si es una ruta de API que no existe, devolver 404 JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      error: 'Endpoint de API no encontrado',
      path: req.path
    });
  }

  // Para cualquier otra ruta, servir index.html
  const indexPath = path.join(__dirname, 'dist', 'index.html');

  if (existsSync(indexPath)) {
    console.log(`🌐 Sirviendo index.html para ruta: ${req.path}`);
    res.sendFile(indexPath);
  } else {
    // Si index.html no existe, informar
    res.status(503).json({
      success: false,
      error: 'Frontend no disponible',
      message: 'El archivo index.html no se encontró en /dist',
      path: indexPath,
      note: 'Verifica que el build se haya ejecutado correctamente'
    });
  }
});

// Manejador global de errores (mantener sin cambios)
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Error de Multer
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'El archivo es demasiado grande (máximo 5MB)'
      });
    }
  }

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Error interno del servidor'
  });
});
```

### Paso 3: Guardar y Hacer Commit

```bash
cd expo2025
git add server.js
git commit -m "Fix: Agregar fallback para rutas de React Router en producción

- Servir index.html para cualquier ruta no-API
- Permite navegación client-side con React Router
- Mantiene respuestas 404 JSON para endpoints de API inexistentes"
```

### Paso 4: Hacer Push y Desplegar

```bash
git push origin main
```

Amplify detectará el push y redesplegará automáticamente.

---

## Verificación

### Después del Despliegue

1. **Prueba directa en navegador:**
   ```
   https://main.d23cmb2t56fwxl.amplifyapp.com/concurso/NAV2024-BRONCE
   ```
   - Debe mostrar la página del concurso (HTML)
   - NO debe mostrar JSON de error

2. **Prueba de API:**
   ```
   https://main.d23cmb2t56fwxl.amplifyapp.com/api/concursos/NAV2024-BRONCE
   ```
   - Debe devolver JSON con datos del concurso:
     ```json
     {
       "success": true,
       "data": {
         "id": 1,
         "nombre": "Navidad 2024 - Nivel Bronce",
         "codigo_unico": "NAV2024-BRONCE",
         "puntos_otorgados": 50,
         ...
       }
     }
     ```

3. **Prueba de ruta inexistente:**
   ```
   https://main.d23cmb2t56fwxl.amplifyapp.com/ruta/que/no/existe
   ```
   - Debe mostrar el frontend (index.html)
   - React Router mostrará su página 404 (si existe) o el componente por defecto

4. **Prueba de API inexistente:**
   ```
   https://main.d23cmb2t56fwxl.amplifyapp.com/api/ruta/inexistente
   ```
   - Debe devolver:
     ```json
     {
       "success": false,
       "error": "Endpoint de API no encontrado",
       "path": "/api/ruta/inexistente"
     }
     ```

---

## Explicación Técnica

### Orden de Middlewares en Express

El orden de los middlewares en Express es **crítico**:

```
1. CORS
2. JSON parser
3. Multer (uploads)
4. express.static (archivos estáticos)
5. Rutas específicas:
   - GET /
   - GET /health
   - POST /api/usuarios/registro
   - POST /api/concursos/:codigo/participar
   - GET /api/concursos/:codigo
   - GET /api/ranking
   - ...
6. ⚡ CATCH-ALL (nuevo): GET * → index.html
7. Error handlers
```

El catch-all (`app.get('*')`) debe estar **después** de todas las rutas específicas, pero **antes** de los error handlers.

### ¿Por qué funciona en desarrollo?

En desarrollo usas:
- **Frontend**: `npm run dev` → Vite Dev Server (puerto 8081)
- **Backend**: `npm run server` → Express (puerto 3002)

Vite Dev Server tiene built-in SPA fallback, por eso funciona.

En producción (Amplify):
- Frontend y backend se sirven desde el **mismo servidor Express**
- Express necesita configuración explícita para SPA fallback

---

## Debugging en Amplify

### Ver logs del servidor

1. Ve a la consola de AWS Amplify
2. Click en tu app
3. Ve a "Monitoring" o "Logs"
4. Busca logs que contengan:
   ```
   🌐 Sirviendo index.html para ruta: /concurso/NAV2024-BRONCE
   ```

### Variables de entorno

Verifica que estén configuradas en Amplify:
```
DB_HOST=72.167.45.26
DB_PORT=3306
DB_DATABASE=expo25
DB_USERNAME=alfred
DB_PASSWORD=***
APP_AWS_REGION=us-east-1
APP_AWS_ACCESS_KEY_ID=***
APP_AWS_SECRET_ACCESS_KEY=***
APP_AWS_S3_BUCKET=herdez-concursos
REKOGNITION_COLLECTION_ID=herdez-usuarios-faces
NODE_ENV=production
PORT=3000
```

---

## Testing Local con Producción Simulada

Para probar localmente como en producción:

```bash
# 1. Build del frontend
npm run build

# 2. Verificar que /dist existe
ls -la dist/

# 3. Iniciar solo el servidor (que servirá frontend y backend)
npm run server

# 4. Abrir navegador
http://localhost:3002/concurso/NAV2024-BRONCE
```

Esto simula exactamente cómo funciona en Amplify.

---

## Alternativa: Configurar en deploy-manifest.json

Otra opción es modificar `deploy-manifest.json` para que Amplify maneje el fallback:

```json
{
  "routes": [
    {
      "path": "/api/*",
      "target": { "kind": "Compute", "src": "default" }
    },
    {
      "path": "/*.*",
      "target": { "kind": "Static" },
      "fallback": { "kind": "Compute", "src": "default" }
    },
    {
      "path": "/*",
      "target": { "kind": "Static" },
      "fallback": { "kind": "Compute", "src": "default" }
    }
  ]
}
```

Pero es más simple y mantenible hacerlo en el servidor Express.

---

## Resumen

| Aspecto | Antes | Después |
|---------|-------|---------|
| `/concurso/NAV2024-BRONCE` (navegador) | ❌ JSON error 404 | ✅ Muestra frontend HTML |
| `/api/concursos/NAV2024-BRONCE` (API) | ✅ JSON con datos | ✅ JSON con datos (sin cambios) |
| `/api/ruta/inexistente` (API) | ❌ JSON genérico | ✅ JSON específico con path |
| React Router | ❌ No funciona | ✅ Funciona correctamente |

---

**Última actualización:** 18 de Noviembre 2024
**Versión:** expo2025 v1.0
**Autor:** Generado por Claude Code
