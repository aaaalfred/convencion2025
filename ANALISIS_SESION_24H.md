# Análisis: Sistema de Sesión de 24 Horas con Validación Facial Selectiva

## 📋 Propuesta

Implementar un sistema donde:
1. **Una vez registrado**, el usuario se autentica automáticamente y la sesión dura **24 horas**
2. **Solo al participar en concursos** (sumar puntos) se solicita validación facial
3. **Navegación y consulta de perfil** no requieren selfie durante las 24 horas

---

## ✅ Ventajas

### 1. **Experiencia de Usuario (UX)**
- ✨ **No más selfies repetitivas**: Usuario solo toma foto en registro y al ganar puntos
- 🚀 **Acceso instantáneo al perfil**: Ver historial y puntos sin esperas
- 📱 **Navegación fluida**: Moverse por la app sin interrupciones
- 😊 **Menos fricción**: Reduce frustración de usuarios

### 2. **Reducción de Costos**
- 💰 **Ahorro en AWS Rekognition**:
  - Antes: ~3-5 búsquedas por usuario (registro, perfil, concursos)
  - Después: ~2 búsquedas por usuario (registro, participación)
  - **Ahorro estimado: 40-60% en llamadas a Rekognition**
- 📊 Con 1000 usuarios/día: ~$30/mes → ~$15/mes

### 3. **Rendimiento**
- ⚡ Carga de perfil instantánea (sin esperar AWS Rekognition)
- 🔄 Menos carga en servidor (consultas simples por usuarioId)
- 📉 Menor latencia en operaciones de consulta

### 4. **Seguridad Mantenida**
- 🔒 **La validación crítica se mantiene**: Ganar puntos siempre requiere facial
- ✅ **Previene fraude donde importa**: Al momento de acumular valor
- 🎯 **Balance perfecto**: UX vs Seguridad

---

## ⚠️ Desventajas y Consideraciones

### 1. **Seguridad en Navegación**
- 🔓 **Acceso no facial al perfil**: Alguien con el dispositivo puede ver historial
- 📱 **Riesgo de dispositivo compartido**: Hermanos, amigos podrían ver perfil ajeno
- ⚖️ **Mitigación**: El perfil solo muestra datos, no permite acciones críticas

### 2. **Gestión de Sesión**
- ⏰ **Expiración fija 24h**: Usuario debe re-autenticarse después
- 🔄 **Una sesión por dispositivo**: Si cambia de móvil, debe autenticarse de nuevo
- 🗑️ **Logout manual**: Considerar botón "Cerrar Sesión" por seguridad

### 3. **Consideraciones de Privacidad**
- 📱 Si alguien pierde su teléfono durante las 24h, otra persona podría:
  - ✅ Ver su perfil y puntos (no crítico)
  - ❌ NO podría participar en concursos (requiere selfie)
- 🔐 **Recomendación**: Agregar opción de "Cerrar sesión" en perfil

---

## 🏗️ Implementación Técnica

### **Opción Recomendada: LocalStorage + SessionToken**

#### ¿Por qué LocalStorage?
- ✅ Simple de implementar
- ✅ Persiste entre tabs y recargas
- ✅ Expira automáticamente (validación por fecha)
- ✅ No requiere servidor de sesiones

#### Estructura de Datos:
```javascript
{
  "sessionToken": "uuid-v4-token",
  "usuarioId": 123,
  "nombre": "Juan Pérez",
  "email": "juan@ejemplo.com",
  "expiresAt": "2024-11-11T03:50:00.000Z"
}
```

---

## 🔧 Cambios Necesarios

### **BACKEND** (server.js)

#### 1. Modificar Endpoint de Registro
```javascript
// POST /api/usuarios/registro
// Después de registrar usuario exitosamente:
const sessionToken = crypto.randomUUID();
const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

return {
  success: true,
  data: {
    usuarioId: result.insertId,
    nombre,
    email,
    sessionToken,
    expiresAt
  }
}
```

#### 2. Nuevo Endpoint: Perfil con Sesión
```javascript
// GET /api/usuarios/perfil-sesion/:usuarioId
// Headers: Authorization: Bearer {sessionToken}
// NO requiere foto, solo valida sesión

app.get('/api/usuarios/perfil-sesion/:usuarioId', asyncHandler(async (req, res) => {
  const { usuarioId } = req.params;

  // Obtener datos del usuario y historial (sin AWS Rekognition)
  const [usuarios] = await pool.query(
    'SELECT id, nombre, email, total_puntos, fecha_registro FROM usuarios WHERE id = ? AND activo = 1',
    [usuarioId]
  );

  // ... resto de la lógica
}));
```

#### 3. Mantener Endpoint de Participación SIN CAMBIOS
```javascript
// POST /api/concursos/:codigo/participar
// SIEMPRE requiere foto para validación facial
// NO cambios aquí
```

#### 4. Endpoint para Validar Sesión (opcional)
```javascript
// GET /api/usuarios/validar-sesion/:usuarioId
// Verifica que el usuario existe y está activo
app.get('/api/usuarios/validar-sesion/:usuarioId', asyncHandler(async (req, res) => {
  const { usuarioId } = req.params;

  const [usuarios] = await pool.query(
    'SELECT id, nombre FROM usuarios WHERE id = ? AND activo = 1',
    [usuarioId]
  );

  if (usuarios.length === 0) {
    return res.status(404).json({ success: false, error: 'Sesión inválida' });
  }

  res.json({ success: true, valida: true });
}));
```

---

### **FRONTEND**

#### 1. Crear utilidad de gestión de sesión
**Archivo:** `/src/lib/session.ts`

```typescript
interface SessionData {
  sessionToken: string;
  usuarioId: number;
  nombre: string;
  email: string | null;
  expiresAt: string;
}

export const SessionManager = {
  // Guardar sesión después de registro
  save: (data: SessionData) => {
    localStorage.setItem('userSession', JSON.stringify(data));
  },

  // Obtener sesión actual
  get: (): SessionData | null => {
    const data = localStorage.getItem('userSession');
    if (!data) return null;

    try {
      const session = JSON.parse(data);

      // Verificar si expiró
      if (new Date(session.expiresAt) < new Date()) {
        SessionManager.clear();
        return null;
      }

      return session;
    } catch {
      return null;
    }
  },

  // Verificar si hay sesión activa
  isActive: (): boolean => {
    return SessionManager.get() !== null;
  },

  // Cerrar sesión
  clear: () => {
    localStorage.removeItem('userSession');
  },

  // Renovar sesión (al participar exitosamente)
  renew: () => {
    const session = SessionManager.get();
    if (session) {
      session.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      SessionManager.save(session);
    }
  }
};
```

#### 2. Modificar Página de Registro
**Archivo:** `/src/pages/Registro.tsx`

```typescript
// Después de registro exitoso:
if (data.success) {
  // Guardar sesión
  SessionManager.save({
    sessionToken: data.data.sessionToken,
    usuarioId: data.data.usuarioId,
    nombre: formData.nombre,
    email: formData.email || null,
    expiresAt: data.data.expiresAt
  });

  setUsuarioId(data.data.usuarioId);
  setStep('success');
}
```

#### 3. Modificar Página Mi Perfil
**Archivo:** `/src/pages/MiPerfil.tsx`

```typescript
export default function MiPerfil() {
  const [step, setStep] = useState<'checking' | 'camera' | 'profile' | 'not-found'>('checking');

  useEffect(() => {
    // Verificar si hay sesión activa
    const session = SessionManager.get();

    if (session) {
      // Cargar perfil usando sesión (sin foto)
      fetchPerfilConSesion(session.usuarioId);
    } else {
      // No hay sesión, solicitar selfie
      setStep('camera');
    }
  }, []);

  const fetchPerfilConSesion = async (usuarioId: number) => {
    try {
      const response = await fetch(`${API_URL}/api/usuarios/perfil-sesion/${usuarioId}`);
      const data = await response.json();

      if (data.success) {
        setUsuario(data.data.usuario);
        setHistorial(data.data.historial);
        setStep('profile');
      } else {
        // Sesión inválida, limpiar y pedir selfie
        SessionManager.clear();
        setStep('camera');
      }
    } catch (error) {
      // Error, pedir selfie
      SessionManager.clear();
      setStep('camera');
    }
  };

  // Método actual con selfie se mantiene como fallback
  const handleCameraCapture = async (imageBase64: string) => {
    // ... código actual de validación facial ...

    // Si es exitoso, guardar sesión
    if (data.success) {
      SessionManager.save({
        sessionToken: crypto.randomUUID(), // Generar nuevo token
        usuarioId: data.data.usuario.id,
        nombre: data.data.usuario.nombre,
        email: data.data.usuario.email,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
    }
  };
}
```

#### 4. Participación en Concursos (SIN CAMBIOS)
**Archivo:** `/src/pages/Concurso.tsx`

```typescript
// El flujo de participación NO cambia
// SIEMPRE requiere selfie para validación facial
const handleCameraCapture = async (imageBase64: string) => {
  // ... código actual, sin cambios ...
  // Siempre envía foto a AWS Rekognition

  // Al participar exitosamente, renovar sesión
  if (data.success && data.tipo === 'exito') {
    SessionManager.renew();
  }
};
```

#### 5. Agregar Botón de Cerrar Sesión
En el componente Header o en Mi Perfil:

```typescript
const handleCerrarSesion = () => {
  SessionManager.clear();
  toast.success('Sesión cerrada');
  navigate('/');
};
```

---

## 📊 Comparación de Flujos

### **Flujo ACTUAL (Sin sesión)**

```
1. Usuario abre app
2. Va a Mi Perfil
   → Solicita selfie
   → Envía a AWS Rekognition ($0.001)
   → Muestra perfil
3. Va a Concurso
   → Solicita selfie OTRA VEZ
   → Envía a AWS Rekognition ($0.001)
   → Participa

Total: 2 selfies, 2 llamadas AWS = $0.002/usuario/día
```

### **Flujo PROPUESTO (Con sesión 24h)**

```
1. Usuario se registra
   → Solicita selfie (1 vez)
   → Guarda sesión 24h
   → Envía a AWS Rekognition ($0.001)
2. Usuario abre app al día siguiente
3. Va a Mi Perfil
   → ✅ Sesión activa
   → ✅ NO solicita selfie
   → ✅ NO llama AWS
   → Muestra perfil instantáneamente
4. Va a Concurso
   → Solicita selfie (por seguridad)
   → Envía a AWS Rekognition ($0.001)
   → Participa

Total: 1 selfie por día, 1 llamada AWS = $0.001/usuario/día
Ahorro: 50%
```

---

## 🎯 Flujos de Usuario Detallados

### **Escenario 1: Primer Registro**
```
1. Usuario entra a /registro
2. Llena formulario
3. Toma selfie → AWS Rekognition indexa rostro
4. ✅ Registro exitoso
5. 🔐 Sesión guardada automáticamente (24h)
6. ✅ Redirige a home con sesión activa
```

### **Escenario 2: Usuario Regresa Dentro de 24h**
```
1. Usuario abre app
2. Va a Mi Perfil
3. ✅ Sistema detecta sesión válida
4. ✅ Carga perfil sin selfie (instantáneo)
5. Usuario ve sus puntos e historial
```

### **Escenario 3: Usuario Participa en Concurso**
```
1. Usuario escanea QR → /concurso/NAV2024
2. Ve info del concurso
3. Click "Participar"
4. 📸 Sistema SIEMPRE solicita selfie
5. AWS Rekognition valida identidad
6. ✅ Puntos acumulados
7. 🔄 Sesión renovada (otras 24h)
```

### **Escenario 4: Sesión Expirada (>24h)**
```
1. Usuario abre app después de 24h
2. Va a Mi Perfil
3. ❌ Sistema detecta sesión expirada
4. 📸 Solicita selfie para re-autenticarse
5. AWS Rekognition identifica usuario
6. ✅ Nueva sesión creada (24h)
7. Muestra perfil
```

### **Escenario 5: Usuario Cierra Sesión Manualmente**
```
1. Usuario en Mi Perfil
2. Click "Cerrar Sesión"
3. 🗑️ Sesión eliminada de localStorage
4. Próxima vez deberá tomar selfie de nuevo
```

---

## 🔒 Consideraciones de Seguridad

### **Datos Protegidos por Validación Facial:**
- ✅ Ganar puntos en concursos
- ✅ Registro inicial
- ✅ Cualquier operación que modifique datos

### **Datos Accesibles con Sesión (sin facial):**
- 📊 Ver perfil propio (nombre, puntos)
- 📜 Ver historial de participaciones
- 🏆 Ver ranking general (público)

### **Riesgos Aceptables:**
- ⚠️ Si alguien roba el teléfono, puede ver el perfil
- ✅ Pero NO puede participar en concursos (requiere selfie del dueño real)
- ✅ NO puede modificar datos
- ✅ NO puede hacer acciones críticas

### **Recomendaciones Adicionales:**
1. Agregar botón "Cerrar Sesión" visible en Mi Perfil
2. Mostrar último acceso en perfil
3. Opción de "Requiere siempre validación facial" en configuración (para usuarios paranoicos)

---

## 📈 Métricas de Éxito

### **KPIs a Mejorar:**
- ⏱️ **Tiempo de carga de perfil**: 3-5s → <500ms (90% mejora)
- 📉 **Tasa de abandono en Mi Perfil**: Reducción del 40-60%
- 💰 **Costos AWS Rekognition**: Reducción del 50%
- 😊 **Satisfacción de usuario**: Incremento esperado

---

## ⚡ Estimación de Esfuerzo

### **Desarrollo:**
- **Backend**: 2-3 horas
  - Modificar endpoint registro (30 min)
  - Crear endpoint perfil-sesion (1h)
  - Testing (1h)

- **Frontend**: 3-4 horas
  - Crear SessionManager (1h)
  - Modificar Registro (30 min)
  - Modificar Mi Perfil (1.5h)
  - Agregar botón cerrar sesión (30 min)
  - Testing (1h)

- **Total**: **5-7 horas de desarrollo**

### **Testing:**
- Flujos de sesión válida/expirada (1h)
- Seguridad: intentar burlar validación facial en concursos (1h)
- UX: navegación fluida (30 min)

---

## 🎯 Conclusión y Recomendación

### **✅ RECOMENDACIÓN: IMPLEMENTAR**

Esta mejora es **altamente recomendable** por:

1. **Gran impacto en UX** con bajo esfuerzo
2. **Reduce costos operativos** significativamente
3. **Mantiene seguridad donde importa** (ganar puntos)
4. **Mejora performance** percibido por el usuario
5. **Balance perfecto** entre comodidad y seguridad

### **Prioridad: ALTA**
- Beneficio/Esfuerzo: **8/10**
- Impacto en usuario: **9/10**
- Riesgo técnico: **2/10** (bajo)
- ROI: **Muy Alto**

---

## 🚀 Próximos Pasos

Si decides implementar:

1. ✅ Revisar este análisis y aprobar
2. 🔧 Implementar cambios en backend (2-3h)
3. 💻 Implementar cambios en frontend (3-4h)
4. 🧪 Testing exhaustivo de flujos (2h)
5. 📱 Testing en dispositivos reales
6. 🚀 Deploy a producción
7. 📊 Monitorear métricas (satisfacción, costos AWS)

**Tiempo total estimado: 1-2 días de trabajo**

---

*Análisis realizado el 11 de noviembre de 2024*
*Sistema: Herdez Concursos con Validación Facial*
