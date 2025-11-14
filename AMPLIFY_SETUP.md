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
DB_DATABASE=recompensas
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

### Si ves "database": "disconnected"
1. Verifica que las variables de entorno de BD estén correctas
2. Verifica que la IP de Amplify puede conectarse a tu MySQL
3. Revisa los logs en Amplify Console

### Si ves "aws": "not configured"
1. Verifica que las credenciales AWS están configuradas
2. Verifica que la colección de Rekognition existe
3. Verifica que el bucket S3 existe

### Si aún ves Error 500
1. Ve a Amplify Console → Logs
2. Busca errores específicos
3. El servidor ahora NO se detiene, así que deberías ver logs detallados

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

1. Configura las variables de entorno en Amplify
2. Re-despliega la aplicación
3. Visita `/health` para verificar conexiones
4. Si todo está OK, prueba el registro de usuarios
