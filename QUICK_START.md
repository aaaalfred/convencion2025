# 🚀 Inicio Rápido - Ver Interfaces

## 1. Instalar Dependencias

```bash
cd concursos
npm install
```

## 2. Iniciar Servidor de Desarrollo

```bash
npm run dev
```

Esto abrirá el proyecto en: **http://localhost:8081**

---

## 📱 Páginas Disponibles (con datos simulados)

### 1. Página Principal
- URL: http://localhost:8081/
- Tarjetas de navegación a todas las secciones
- Información del sistema

### 2. Registro de Usuario
- URL: http://localhost:8081/registro
- Formulario de registro
- Captura de selfie simulada
- Proceso completo con feedback visual

### 3. Concurso Demo
- URL: http://localhost:8081/concurso/NAV2024
- Información del concurso
- Captura facial simulada
- Resultados aleatorios (éxito/ya-participaste/no-registrado)

### 4. Mi Perfil
- URL: http://localhost:8081/mi-perfil
- Identificación por selfie
- Balance de puntos
- Historial de participaciones

---

## 🎯 Flujo Completo de Prueba

1. **Inicio**: http://localhost:8081/
2. Click en "Registrarme"
3. Completa el formulario y captura selfie (simulado)
4. Vuelve al inicio
5. Click en "Concurso Demo"
6. Captura selfie para validación
7. Ve el resultado (aleatorio)
8. Prueba "Mi Perfil" con otra selfie

---

## ⚙️ Próximos Pasos

Una vez que las interfaces estén aprobadas:

1. Configurar credenciales de AWS en `.env`
2. Ejecutar setup de Rekognition: `node scripts/setup-rekognition.js`
3. Migrar base de datos: `mysql < scripts/migration.sql`
4. Implementar backend real en `server.js`

---

## 💡 Notas

- Todas las fotos son simuladas (SVG placeholders)
- Los datos son mockeados (sin backend)
- Los resultados son aleatorios para demostración
- No se necesita AWS configurado para ver las interfaces

