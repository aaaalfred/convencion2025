# 🚀 Checklist para Producción
## Sistema de Concursos Herdez con Validación Facial

---

## 📊 Estado Actual

### ✅ FASE 1 COMPLETADA (100%)
- [x] Frontend completo con 4 páginas (Index, Registro, Concurso, MiPerfil)
- [x] Componentes UI (40+ de shadcn/ui)
- [x] Navegación completa con React Router
- [x] Scripts de setup (migration.sql, setup-rekognition.js)
- [x] Dependencias instaladas
- [x] Documentación completa

### ❌ FASE 2 PENDIENTE - Backend + AWS Integration
- [ ] Backend NO existe (server.js)
- [ ] AWS NO configurado (credenciales en blanco)
- [ ] Base de datos NO migrada (tablas no creadas)

**Progreso total: 40%**

---

## 🎯 Tareas para Producción

### **Paso 1: Configuración AWS** ⏱️ ~30 min
- [ ] Crear usuario IAM en AWS Console con permisos:
  - AmazonRekognitionFullAccess
  - AmazonS3FullAccess
- [ ] Obtener credenciales (Access Key ID + Secret Access Key)
- [ ] Editar archivo `.env` con credenciales reales:
  ```env
  AWS_ACCESS_KEY_ID=AKIA...
  AWS_SECRET_ACCESS_KEY=...
  AWS_REGION=us-east-1
  AWS_S3_BUCKET=herdez-concursos
  ```
- [ ] Ejecutar script de setup:
  ```bash
  node scripts/setup-rekognition.js
  ```
- [ ] Verificar que se crearon:
  - Bucket S3: `herdez-concursos`
  - Colección Rekognition: `herdez-usuarios-faces`

---

### **Paso 2: Migrar Base de Datos** ⏱️ ~5 min
- [ ] Ejecutar migración:
  ```bash
  mysql -h 72.167.45.26 -u alfred -p recompensas < scripts/migration.sql
  ```
- [ ] Verificar que se crearon las 3 tablas:
  - `usuarios` (con foto_registro_url y rekognition_face_id)
  - `concursos` (con codigo_unico para QR)
  - `participaciones` (con UNIQUE KEY anti-duplicación)
- [ ] Verificar datos de prueba (3 concursos)

---

### **Paso 3: Crear Backend** ⏱️ ~4-6 horas

#### 3.1 Archivo principal: `server.js`
- [ ] Configurar Express server (puerto 3002)
- [ ] Configurar CORS para localhost:8081
- [ ] Configurar Multer para upload de imágenes
- [ ] Configurar conexión MySQL
- [ ] Middleware de manejo de errores

#### 3.2 Librería AWS: `src/lib/aws-rekognition.ts`
- [ ] Función `indexFace()` - Registrar rostro nuevo
  - Upload a S3
  - IndexFaces en Rekognition
  - Retornar FaceID
- [ ] Función `searchFace()` - Buscar rostro existente
  - SearchFacesByImage
  - Retornar usuario identificado + confidence score
- [ ] Función `deleteFace()` - Eliminar rostro (opcional)

#### 3.3 Endpoints API

**Registro de Usuario**
- [ ] `POST /api/usuarios/registro`
  - Recibir: nombre, email (opcional), telefono (opcional), foto (base64)
  - Validar que no exista el email
  - Upload foto a S3
  - IndexFaces en Rekognition → obtener FaceID
  - INSERT en tabla usuarios
  - Retornar: usuario_id, mensaje de éxito

**Participación en Concurso**
- [ ] `POST /api/concursos/:codigo/participar`
  - Recibir: foto (base64)
  - Validar que el concurso exista y esté activo
  - SearchFacesByImage → identificar usuario
  - Si no se encuentra: retornar "no registrado"
  - Si se encuentra: verificar si ya participó (tabla participaciones)
  - Si ya participó: retornar info de participación anterior
  - Si NO participó:
    - INSERT en participaciones
    - UPDATE total_puntos en usuarios
    - Retornar: puntos ganados, nuevo balance

**Consultar Perfil**
- [ ] `POST /api/usuarios/perfil`
  - Recibir: foto (base64)
  - SearchFacesByImage → identificar usuario
  - Si no se encuentra: retornar "no registrado"
  - Si se encuentra:
    - SELECT datos del usuario
    - SELECT historial de participaciones (JOIN con concursos)
    - Retornar: perfil + historial

**Info de Concurso**
- [ ] `GET /api/concursos/:codigo`
  - Buscar concurso por codigo_unico
  - Retornar: nombre, descripción, puntos_otorgados

---

### **Paso 4: Integrar Frontend con Backend** ⏱️ ~2-3 horas

#### 4.1 Componente CameraCapture
- [ ] Implementar captura real de cámara:
  ```typescript
  navigator.mediaDevices.getUserMedia({ video: true })
  ```
- [ ] Capturar foto y convertir a base64
- [ ] Reemplazar SVG placeholder con canvas

#### 4.2 Página Registro
- [ ] Reemplazar simulación con fetch a `/api/usuarios/registro`
- [ ] Enviar datos del formulario + foto base64
- [ ] Manejar respuestas:
  - Éxito: mostrar mensaje de confirmación
  - Error: mostrar error específico
- [ ] Loading state durante upload

#### 4.3 Página Concurso
- [ ] Fetch info del concurso: `GET /api/concursos/:codigo`
- [ ] Reemplazar simulación con fetch a `/api/concursos/:codigo/participar`
- [ ] Manejar 4 posibles respuestas:
  - Éxito: puntos ganados
  - Ya participaste: fecha anterior
  - No registrado: invitar a registro
  - Error: reintento
- [ ] Loading state durante validación

#### 4.4 Página Mi Perfil
- [ ] Reemplazar simulación con fetch a `/api/usuarios/perfil`
- [ ] Mostrar datos reales del usuario
- [ ] Mostrar historial de participaciones real
- [ ] Calcular estadísticas (promedio, máximo, última participación)

---

### **Paso 5: Testing Completo** ⏱️ ~2 horas

#### 5.1 Flujo de Registro
- [ ] Test con foto de buena calidad (luz adecuada)
- [ ] Test con foto de mala calidad (rechazar)
- [ ] Test con email duplicado (debe fallar)
- [ ] Verificar que se creó FaceID en Rekognition
- [ ] Verificar que se subió foto a S3

#### 5.2 Flujo de Participación
- [ ] Test usuario nuevo → debe indicar "no registrado"
- [ ] Test usuario registrado primera vez → debe dar puntos
- [ ] Test usuario que ya participó → debe indicar "ya participaste"
- [ ] Verificar anti-duplicación (UNIQUE KEY)
- [ ] Test confidence score bajo (< 90%)

#### 5.3 Flujo de Perfil
- [ ] Test identificación correcta por rostro
- [ ] Verificar balance de puntos correcto
- [ ] Verificar historial completo
- [ ] Test con rostro no registrado

#### 5.4 Casos Edge
- [ ] Test con 2+ rostros en foto (debe rechazar)
- [ ] Test sin rostro en foto (debe rechazar)
- [ ] Test con foto borrosa (QualityFilter)
- [ ] Test con misma persona, diferente ángulo/luz

---

### **Paso 6: Seguridad y Optimización** ⏱️ ~1-2 horas

#### 6.1 Seguridad
- [ ] Configurar HTTPS en producción (obligatorio)
- [ ] Implementar rate limiting:
  ```javascript
  // 3 intentos por minuto por IP
  ```
- [ ] Sanitizar inputs (nombre, email, teléfono)
- [ ] Validar tamaño máximo de fotos (2MB)
- [ ] Configurar CORS solo para dominio de producción
- [ ] Ocultar mensajes de error detallados en producción

#### 6.2 Optimización
- [ ] Comprimir fotos antes de upload (reducir tamaño S3)
- [ ] Ajustar FaceMatchThreshold óptimo (pruebas: 85%, 90%, 95%)
- [ ] Implementar cache de búsquedas frecuentes
- [ ] Lifecycle policy en S3 (borrar fotos > 1 año)
- [ ] Indices en BD para queries frecuentes

---

### **Paso 7: Deployment a Producción** ⏱️ ~1 hora

#### 7.1 Build
- [ ] Ejecutar build de frontend:
  ```bash
  npm run build
  ```
- [ ] Verificar que no hay errores de TypeScript
- [ ] Verificar tamaño del bundle (optimizar si > 1MB)

#### 7.2 Variables de Entorno
- [ ] Crear `.env.production` con valores de producción
- [ ] Cambiar `NODE_ENV=production`
- [ ] Actualizar `FRONTEND_URL` al dominio real
- [ ] Verificar credenciales AWS de producción

#### 7.3 Servidor
- [ ] Subir código al servidor
- [ ] Instalar dependencias: `npm install --production`
- [ ] Configurar PM2 o similar para mantener server activo:
  ```bash
  pm2 start server.js --name herdez-concursos
  ```
- [ ] Configurar Nginx como reverse proxy
- [ ] Configurar certificado SSL (Let's Encrypt)

#### 7.4 Monitoreo
- [ ] Configurar logs de errores
- [ ] Monitorear uso de AWS (costos)
- [ ] Configurar alertas (errores críticos)
- [ ] Backup de base de datos (diario)

---

## 📊 Estimación de Tiempos

| Fase | Tiempo Estimado | Dificultad |
|------|----------------|------------|
| Paso 1: AWS Setup | 30 min | Fácil |
| Paso 2: Migración BD | 5 min | Fácil |
| Paso 3: Backend | 4-6 horas | Media-Alta |
| Paso 4: Integración Frontend | 2-3 horas | Media |
| Paso 5: Testing | 2 horas | Media |
| Paso 6: Seguridad | 1-2 horas | Media |
| Paso 7: Deploy | 1 hora | Fácil |

**Total: 2-3 días de desarrollo a tiempo completo**

---

## 💰 Costos AWS Estimados

### Desarrollo/Testing (100 validaciones/mes)
- Rekognition: **GRATIS** (Free Tier)
- S3: **~$0.50/mes**
- **Total: ~$0.50/mes**

### Producción (10,000 validaciones/mes)
- Rekognition: **~$11/mes**
- S3: **~$2/mes**
- **Total: ~$13/mes**

### Alta demanda (100,000 validaciones/mes)
- Rekognition: **~$110/mes**
- S3: **~$5/mes**
- **Total: ~$115/mes**

---

## 📝 Notas Importantes

### Prioridad Alta
1. FaceMatchThreshold: Empezar con 90% (ajustar según resultados)
2. QualityFilter: AUTO (rechaza fotos borrosas)
3. MaxFaces: 1 (solo una cara por foto)
4. HTTPS obligatorio en producción

### Recomendaciones
- Empezar con credenciales AWS de desarrollo (no producción)
- Hacer backup de BD antes de migrar
- Probar primero con pocos usuarios reales
- Ajustar threshold según tasa de falsos positivos/negativos
- Monitorear costos AWS diariamente al principio

### Recursos
- [AWS Rekognition Docs](https://docs.aws.amazon.com/rekognition/)
- [AWS S3 Pricing](https://aws.amazon.com/s3/pricing/)
- [Express + Multer Guide](https://expressjs.com/en/resources/middleware/multer.html)

---

**Última actualización**: 10 de Noviembre 2024
**Estado**: Fase 1 completa (40%) - Pendiente backend y AWS
