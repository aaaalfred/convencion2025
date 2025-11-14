# Configuración de AWS Amplify para Herdez Concursos

## Cambios Realizados

### 1. Puerto Corregido
- Cambiado de `3002` a `3000` (requerido por Amplify)
- El servidor ahora respeta `process.env.PORT || 3000`

### 2. Servidor Resiliente
- El servidor ya NO se detiene si falla la conexión a la base de datos
- Inicia en modo "degraded" y muestra warnings
- Permite diagnosticar problemas a través del endpoint `/health`

### 3. Health Check Mejorado
- URL: `https://tu-app.amplifyapp.com/health`
- Muestra estado de conexiones (BD, AWS)
- Indica qué variables de entorno faltan

## Variables de Entorno Requeridas en Amplify

Ve a: **Amplify Console → Tu App → Environment variables**

### Base de Datos MySQL
```
DB_HOST=72.167.45.26
DB_PORT=3306
DB_DATABASE=expo25
DB_USERNAME=alfred
DB_PASSWORD=aaabcde1409
```

### AWS Credentials
```
APP_AWS_REGION=us-east-1
APP_AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
APP_AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
APP_AWS_S3_BUCKET=herdez-concursos
REKOGNITION_COLLECTION_ID=herdez-usuarios-faces
```

### Otras
```
NODE_ENV=production
PORT=3000
ADMIN_SECRET_KEY=herdez_admin_2024
FRONTEND_URL=https://main.d23cmb2t56fwxl.amplifyapp.com
```

## Pasos para Configurar

### 1. Configurar Variables de Entorno
1. Ve a AWS Amplify Console
2. Selecciona tu aplicación
3. Ve a **App settings → Environment variables**
4. Agrega TODAS las variables listadas arriba
5. Click en **Save**

### 2. Verificar Seguridad de Base de Datos
Tu base de datos MySQL está en una IP pública (`72.167.45.26`). Asegúrate de:
- Permitir conexiones desde IPs de AWS Amplify
- O mejor: migrar la BD a RDS con Security Groups

### 3. Re-desplegar
1. Ve a **Build settings**
2. Click en **Redeploy this version**
3. Espera a que termine el build

### 4. Verificar Estado
Una vez desplegado, visita:
```
https://tu-app.amplifyapp.com/health
```

Deberías ver:
```json
{
  "status": "ok",
  "connections": {
    "database": "connected",
    "aws": "configured"
  },
  "environment": {
    "DB_HOST": "set",
    "AWS_REGION": "set",
    "AWS_CREDENTIALS": "set"
  }
}
```

## Diagnóstico de Problemas

### Ver Logs en Amplify Console
1. Ve a **Amplify Console → Tu App**
2. Click en **Monitoring** en el menú lateral
3. Click en **Logs**
4. Selecciona **Access logs** o **Build logs**

### Logs Disponibles

El servidor ahora incluye logs detallados que muestran:

#### 1. Variables de Entorno (al inicio)
```
============================================================
🔍 VERIFICANDO VARIABLES DE ENTORNO
============================================================

📊 BASE DE DATOS:
✅ DB_HOST: 72.167.45*** (length: 13)
✅ DB_PORT: 3306*** (length: 4)
✅ DB_DATABASE: expo25*** (length: 6)
...

☁️  AWS:
✅ APP_AWS_REGION: us-east-1*** (length: 9)
✅ APP_AWS_ACCESS_KEY_ID: AKIAXXX*** (length: 20)
...
```

#### 2. Conexión a Base de Datos
```
============================================================
🔌 INTENTANDO CONEXIÓN A BASE DE DATOS
============================================================
📍 Host: 72.167.45.26:3306
💾 Database: expo25
👤 User: alfred
✅ Conexión a MySQL exitosa
📊 Base de datos actual: expo25
🔢 Versión MySQL: 8.0.x
```

#### 3. AWS Rekognition
```
============================================================
☁️  CARGANDO AWS REKOGNITION
============================================================
📦 Importando módulo aws-rekognition.js...
✅ Módulo AWS Rekognition cargado exitosamente
✅ Credenciales AWS configuradas
📍 Region: us-east-1
🪣  S3 Bucket: herdez-concursos
👤 Collection ID: herdez-usuarios-faces
```

#### 4. Resumen al Iniciar
```
============================================================
🚀 SERVIDOR HERDEZ CONCURSOS INICIADO
============================================================
📍 URL: http://localhost:3000
🌍 Entorno: production
⏰ Timestamp: 2025-11-14T...

📊 ESTADO DE CONEXIONES:
   Base de datos: ✅ CONECTADA
   └─ 72.167.45.26:3306/expo25
   AWS Rekognition: ✅ CONFIGURADO
   └─ us-east-1 | herdez-usuarios-faces

🔗 ENDPOINTS DISPONIBLES:
   GET  /                - Frontend o info de API
   GET  /health          - Estado del servidor
   ...

✅ TODOS LOS SERVICIOS OPERATIVOS
```

### Si ves "database": "disconnected"
1. Revisa los logs de conexión a BD (sección 2 arriba)
2. Busca el código de error (ej: `ECONNREFUSED`, `ER_ACCESS_DENIED_ERROR`)
3. Verifica que las variables de entorno de BD estén correctas
4. Verifica que la IP de Amplify puede conectarse a tu MySQL

### Si ves "aws": "not configured"
1. Revisa los logs de AWS (sección 3 arriba)
2. Verifica que las credenciales AWS están configuradas
3. Verifica que la colección de Rekognition existe
4. Verifica que el bucket S3 existe

### Si aún ves Error 500
1. Ve a **Amplify Console → Monitoring → Logs**
2. Busca errores específicos en los logs
3. El servidor ahora NO se detiene, así que verás logs detallados
4. Busca mensajes con ❌ para identificar problemas

## Arquitectura de Amplify

Tu aplicación ahora está configurada como:

```
.amplify-hosting/
├── compute/default/
│   ├── server.js           # Tu servidor Express
│   ├── package.json
│   ├── node_modules/       # Dependencias de producción
│   └── lib/
│       └── aws-rekognition.js
└── static/
    └── [archivos del frontend compilados]
```

## Endpoints Disponibles

- `GET /` - Frontend o info de la API
- `GET /health` - Estado del servidor
- `POST /api/usuarios/registro` - Registrar usuario con foto
- `POST /api/concursos/:codigo/participar` - Participar en concurso
- `POST /api/usuarios/perfil` - Ver perfil con validación facial
- `GET /api/ranking` - Ver ranking de usuarios

## Siguientes Pasos

1. ✅ Configura las variables de entorno en Amplify (COMPLETADO)
2. ✅ Re-despliega la aplicación (Haz REDEPLOY después de configurar variables)
3. Visita `/health` para verificar conexiones
4. Si todo está OK, prueba el registro de usuarios

## IMPORTANTE: Redeploy Después de Variables

Después de configurar variables de entorno en Amplify Console, SIEMPRE debes hacer
un nuevo deploy para que se apliquen. Las variables solo se cargan durante el build.
