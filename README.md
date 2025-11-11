# Sistema de Concursos Herdez con Validación Facial

Sistema de concursos donde usuarios escanean códigos QR y validan su identidad mediante reconocimiento facial con AWS Rekognition para acumular puntos.

## 🎯 Características

- ✅ **Registro sin autenticación tradicional**: Solo foto de referencia
- ✅ **Validación facial automática**: AWS Rekognition identifica usuarios
- ✅ **Anti-duplicación**: Un usuario solo puede participar una vez por concurso
- ✅ **Balance global de puntos**: Acumulación centralizada
- ✅ **QR por concurso**: Cada concurso tiene su código único
- ✅ **Panel administrativo**: Gestión de concursos y puntos

## 🛠️ Stack Tecnológico

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express + Node.js
- **Base de Datos**: MySQL (compartida con proyecto catálogo)
- **Reconocimiento Facial**: AWS Rekognition
- **Almacenamiento**: AWS S3
- **Puertos**:
  - Frontend: **8081**
  - Backend: **3002**

## 📁 Estructura del Proyecto

```
concursos/
├── src/
│   ├── components/
│   │   ├── ui/              # Componentes shadcn/ui
│   │   └── shared/          # Componentes compartidos
│   ├── pages/               # Páginas de la aplicación
│   ├── lib/                 # Utilidades y helpers
│   └── contexts/            # Context API
├── scripts/
│   ├── migration.sql        # Migración de BD (3 tablas)
│   └── setup-rekognition.js # Setup de AWS
├── public/                  # Symlink a ../public (compartido)
├── server.js               # Backend Express
└── .env                    # Variables de entorno
```

## 🚀 Inicio Rápido

### 1. Prerequisitos

- Node.js >= 18.x
- npm >= 9.x
- Cuenta de AWS con acceso a Rekognition y S3
- MySQL (compartido con proyecto catálogo)

### 2. Instalación

```bash
# Navegar al directorio
cd concursos

# Instalar dependencias
npm install
```

### 3. Configuración

#### Variables de Entorno

Editar `.env` y completar las credenciales de AWS:

```env
# AWS (COMPLETAR)
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=us-east-1
AWS_S3_BUCKET=herdez-concursos
REKOGNITION_COLLECTION_ID=herdez-usuarios-faces
```

#### Setup de AWS Rekognition

```bash
# Ejecutar script de setup (crea colección y bucket)
node scripts/setup-rekognition.js
```

#### Migración de Base de Datos

```bash
# Ejecutar migración SQL (crea 3 tablas)
mysql -h 72.167.45.26 -u alfred -p recompensas < scripts/migration.sql
```

### 4. Desarrollo

```bash
# Terminal 1: Iniciar backend (puerto 3002)
npm run server

# Terminal 2: Iniciar frontend (puerto 8081)
npm run dev
```

**Acceso**: http://localhost:8081

## 📋 Base de Datos

### Tablas Creadas

#### `usuarios`
- Almacena usuarios con foto de referencia y FaceID de AWS Rekognition
- Sin passwords, solo reconocimiento facial

#### `concursos`
- Concursos con código QR único
- Puntos otorgados por participación

#### `participaciones`
- Registro de participaciones
- **UNIQUE KEY** previene duplicados (anti-fraude)

## 🔐 Seguridad

- **FaceMatchThreshold**: 90% (alta confianza)
- **QualityFilter**: AUTO (rechaza fotos borrosas)
- **Rate Limiting**: 3 intentos por minuto
- **UNIQUE KEY**: Previene participaciones duplicadas
- **HTTPS**: Obligatorio en producción

## 📊 Flujo de Usuario

### Registro (Primera vez)
1. Usuario ingresa nombre
2. Captura selfie de referencia
3. Sistema guarda en S3 y crea FaceID en Rekognition
4. ¡Listo para participar!

### Participación en Concurso
1. Escanea QR → `/concurso/ABC123`
2. Sistema solicita selfie
3. **AWS Rekognition identifica automáticamente al usuario**
4. Si NO ha participado: Otorga puntos ✅
5. Si YA participó: Muestra mensaje informativo ℹ️
6. Si NO está registrado: Invita a registrarse ❌

## 🔧 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Inicia servidor de desarrollo Vite (8081) |
| `npm run server` | Inicia servidor backend Express (3002) |
| `npm run dev:full` | Inicia ambos servidores (requiere concurrently) |
| `npm run build` | Build de producción |
| `npm run lint` | Ejecuta ESLint |

## 💰 Costos Estimados (AWS)

### Por mes (100,000 validaciones)
- **Rekognition**: ~$110 (IndexFaces + SearchFaces)
- **S3 Storage**: ~$5 (220GB)
- **Total**: ~$115/mes

### Primeros 12 meses (Free Tier)
- IndexFaces: 1,000 gratis/mes
- SearchFaces: 1,000 gratis/mes

## 🎨 Personalización

### Colores de Marca
Los estilos heredan los colores de Herdez del proyecto principal:
- Rojo Herdez: `#da241a`
- Gradiente: Purple → Blue

### Componentes UI
Todos los componentes shadcn/ui están disponibles en `src/components/ui/`

## 🐛 Troubleshooting

### Error: "Collection not found"
```bash
node scripts/setup-rekognition.js
```

### Error: "Bucket does not exist"
Verificar que AWS_S3_BUCKET en `.env` coincida con el bucket creado

### Error: Puerto en uso
Cambiar puertos en:
- `vite.config.ts` (frontend)
- `.env` PORT=3002 (backend)

## 📚 Próximos Pasos

- [ ] Implementar páginas de registro y concurso
- [ ] Crear componentes de captura facial
- [ ] Desarrollar backend con endpoints API
- [ ] Panel administrativo
- [ ] Testing y deployment

## 🤝 Relación con Proyecto Principal

Este proyecto **comparte** con el proyecto catálogo:
- ✅ Base de datos MySQL (`recompensas`)
- ✅ Carpeta public (via symlink)
- ✅ Componentes UI de shadcn
- ✅ Estilos y colores de marca
- ❌ Código (totalmente independiente)

Ambos proyectos pueden **correr simultáneamente** sin conflictos.

## 📄 Licencia

Proyecto privado - Herdez © 2024

---

**Desarrollado para Herdez Sahuayo**
