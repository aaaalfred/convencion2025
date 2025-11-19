# Guía: Concursos con Múltiples Niveles de Puntaje

## Concepto

El sistema de concursos expo2025 permite crear **múltiples niveles de puntaje para un mismo evento/concurso** mediante el uso de códigos únicos diferentes.

### Estrategia Implementada: Opción 1 - Múltiples Códigos

Cada nivel de puntaje es tratado como un **concurso independiente** en la base de datos, pero relacionados conceptualmente por el nombre y código base.

**Ventajas:**
- ✅ No requiere modificaciones de código
- ✅ Sistema ya funciona completamente
- ✅ Anti-duplicación automática (UNIQUE KEY en participaciones)
- ✅ Cada usuario puede participar UNA vez por nivel
- ✅ Control de participación única o múltiple por concurso

---

## Tipos de Participación

### 🏆 Participación ÚNICA (`participacion_unica = 1`)

**Comportamiento:** Solo la **primera persona** que accede al concurso gana los puntos.

**Casos de uso:**
- Premios especiales
- Códigos QR ocultos en el evento
- Concursos VIP o exclusivos
- "El más rápido gana"

**Ejemplo:**
```sql
INSERT INTO concursos (codigo_unico, nombre, puntos_otorgados, participacion_unica) VALUES
('NAV2024-ORO', 'Premio Oro - ¡Solo para el más rápido!', 500, 1);
```

**Flujo:**
1. **Primera persona** escanea el QR → ✅ Gana 500 puntos
2. **Segunda persona** escanea el mismo QR → ⚠️ "Este concurso ya fue ganado por María"
3. **Tercera persona** escanea el mismo QR → ⚠️ "Este concurso ya fue ganado por María"

---

### 👥 Participación MÚLTIPLE (`participacion_unica = 0`)

**Comportamiento:** **Todas las personas** pueden participar, pero cada usuario solo **una vez**.

**Casos de uso:**
- Trivias diarias
- Actividades generales
- Visitas a stands
- Participación abierta para todos

**Ejemplo:**
```sql
INSERT INTO concursos (codigo_unico, nombre, puntos_otorgados, participacion_unica) VALUES
('TRIVIA-DIARIA', 'Trivia del Día - Todos pueden participar', 50, 0);
```

**Flujo:**
1. **María** escanea el QR → ✅ Gana 50 puntos
2. **Juan** escanea el QR → ✅ Gana 50 puntos
3. **Pedro** escanea el QR → ✅ Gana 50 puntos
4. **María** vuelve a escanear → ⚠️ "Ya participaste en este concurso"

---

## Estructura de Códigos Recomendada

```
NOMBRE_BASE-NIVEL
```

**Ejemplos:**
- `NAV2024-BRONCE` → 50 puntos
- `NAV2024-PLATA` → 100 puntos
- `NAV2024-ORO` → 200 puntos

---

## Insertar Concursos en la Base de Datos

### Paso 1: Conectar a MySQL

```bash
mysql -h 72.167.45.26 -u alfred -p expo25
```

### Paso 2: Insertar los Concursos

#### Opción A: Concursos con Participación MÚLTIPLE (Todos pueden ganar)

```sql
-- Ejemplo: Concurso de Navidad 2024 (3 niveles) - Todos pueden participar
INSERT INTO concursos (nombre, codigo_unico, descripcion, puntos_otorgados, participacion_unica, activo) VALUES
('Navidad 2024 - Nivel Bronce', 'NAV2024-BRONCE', 'Participación nivel bronce - Todos pueden ganar', 50, 0, 1),
('Navidad 2024 - Nivel Plata', 'NAV2024-PLATA', 'Participación nivel plata - Todos pueden ganar', 100, 0, 1),
('Navidad 2024 - Nivel Oro', 'NAV2024-ORO', 'Participación nivel oro - Todos pueden ganar', 200, 0, 1);
```

#### Opción B: Concursos con Participación ÚNICA (Solo el más rápido gana)

```sql
-- Ejemplo: Concurso de Navidad 2024 (3 premios únicos) - Solo el primero gana
INSERT INTO concursos (nombre, codigo_unico, descripcion, puntos_otorgados, participacion_unica, activo) VALUES
('Premio Especial - Oro', 'PREMIO-ORO', '1er lugar - Solo para el más rápido', 500, 1, 1),
('Premio Especial - Plata', 'PREMIO-PLATA', '2do lugar - Solo para el más rápido', 300, 1, 1),
('Premio Especial - Bronce', 'PREMIO-BRONCE', '3er lugar - Solo para el más rápido', 100, 1, 1);
```

#### Opción C: Mezcla de Ambos (Algunos únicos, otros múltiples)

```sql
-- Concursos generales (todos participan)
INSERT INTO concursos (nombre, codigo_unico, descripcion, puntos_otorgados, participacion_unica, activo) VALUES
('Visita Stand Principal', 'STAND-PRINCIPAL', 'Todos pueden ganar 25 pts', 25, 0, 1),
('Trivia Diaria', 'TRIVIA-DIA', 'Todos pueden ganar 50 pts', 50, 0, 1);

-- Premios especiales (solo un ganador)
INSERT INTO concursos (nombre, codigo_unico, descripcion, puntos_otorgados, participacion_unica, activo) VALUES
('Código Oculto VIP', 'SECRETO-VIP', '¡Solo el primero gana 1000 pts!', 1000, 1, 1),
('Tesoro Escondido', 'TESORO-1', 'Premio oculto - 500 pts al más rápido', 500, 1, 1);
```

### Paso 3: Verificar que se Crearon

```sql
SELECT id, nombre, codigo_unico, puntos_otorgados, activo
FROM concursos
WHERE codigo_unico LIKE 'NAV2024%';
```

**Resultado esperado:**
```
+----+-----------------------------+-----------------+-------------------+--------+
| id | nombre                      | codigo_unico    | puntos_otorgados  | activo |
+----+-----------------------------+-----------------+-------------------+--------+
| 1  | Navidad 2024 - Nivel Bronce | NAV2024-BRONCE  | 50                | 1      |
| 2  | Navidad 2024 - Nivel Plata  | NAV2024-PLATA   | 100               | 1      |
| 3  | Navidad 2024 - Nivel Oro    | NAV2024-ORO     | 200               | 1      |
+----+-----------------------------+-----------------+-------------------+--------+
```

---

## Generar Códigos QR

### URLs para cada Nivel

Formato base: `https://TU_DOMINIO/concurso/CODIGO_UNICO`

**Para el ejemplo de Navidad 2024:**

| Nivel | URL | Puntos |
|-------|-----|--------|
| Bronce | `https://tuapp.com/concurso/NAV2024-BRONCE` | 50 |
| Plata | `https://tuapp.com/concurso/NAV2024-PLATA` | 100 |
| Oro | `https://tuapp.com/concurso/NAV2024-ORO` | 200 |

### Servicios para Generar QRs

**Opción 1: QR Code Generator (Online)**
- Web: https://www.qr-code-generator.com/
- Pega la URL completa
- Descarga en PNG/SVG

**Opción 2: QR Code Monkey**
- Web: https://www.qrcode-monkey.com/
- Permite personalizar colores y agregar logo
- Formato de alta calidad

**Opción 3: Comando CLI (Linux/Mac)**
```bash
# Instalar qrencode
sudo apt install qrencode  # Ubuntu/Debian
brew install qrencode      # macOS

# Generar QR
qrencode -o nav-bronce.png "https://tuapp.com/concurso/NAV2024-BRONCE"
qrencode -o nav-plata.png "https://tuapp.com/concurso/NAV2024-PLATA"
qrencode -o nav-oro.png "https://tuapp.com/concurso/NAV2024-ORO"
```

---

## Probar el Sistema Completo

### Entorno Local (Desarrollo)

**URLs de prueba:**
- http://localhost:8081/concurso/NAV2024-BRONCE
- http://localhost:8081/concurso/NAV2024-PLATA
- http://localhost:8081/concurso/NAV2024-ORO

### Flujo de Prueba

#### Test 1: Usuario Nuevo - Participación Nivel Bronce

1. **Ir a la URL**
   ```
   http://localhost:8081/concurso/NAV2024-BRONCE
   ```

2. **Visualizar Información del Concurso**
   - Nombre: "Navidad 2024 - Nivel Bronce"
   - Puntos: 50
   - Descripción

3. **Capturar Selfie**
   - Click en "Participar"
   - Permitir acceso a cámara
   - Capturar foto

4. **Resultado Esperado**
   - Si es usuario nuevo → Mensaje: "No tienes registro. Regístrate primero"
   - Redirigir a `/registro`

5. **Registrarse**
   ```
   http://localhost:8081/registro
   ```
   - Ingresar nombre
   - Capturar selfie
   - Sistema crea Face ID en AWS Rekognition
   - Sesión de 24h creada

6. **Volver a Participar**
   - Regresar a `http://localhost:8081/concurso/NAV2024-BRONCE`
   - Capturar selfie
   - ✅ Resultado: "Has ganado 50 puntos"

7. **Verificar en Base de Datos**
   ```sql
   -- Ver participación registrada
   SELECT u.nombre, c.nombre as concurso, p.puntos_ganados, p.fecha_participacion
   FROM participaciones p
   JOIN usuarios u ON p.usuario_id = u.id
   JOIN concursos c ON p.concurso_id = c.id
   WHERE c.codigo_unico = 'NAV2024-BRONCE';

   -- Ver puntos totales del usuario
   SELECT nombre, total_puntos FROM usuarios WHERE nombre = 'TU_NOMBRE';
   ```

#### Test 2: Mismo Usuario - Participación Nivel Plata

1. **Ir a la URL del Nivel Plata**
   ```
   http://localhost:8081/concurso/NAV2024-PLATA
   ```

2. **Capturar Selfie**
   - Click en "Participar"
   - Capturar foto

3. **Resultado Esperado**
   - ✅ "Has ganado 100 puntos"
   - Total acumulado: 50 + 100 = 150 puntos

4. **Verificar en Base de Datos**
   ```sql
   SELECT nombre, total_puntos FROM usuarios WHERE nombre = 'TU_NOMBRE';
   -- Debe mostrar: total_puntos = 150
   ```

#### Test 3: Mismo Usuario - Intento de Participación Duplicada

1. **Volver a Nivel Bronce**
   ```
   http://localhost:8081/concurso/NAV2024-BRONCE
   ```

2. **Capturar Selfie**

3. **Resultado Esperado**
   - ⚠️ "Ya acumulaste los 50 puntos de este concurso"
   - NO se otorgan puntos adicionales
   - Total sigue siendo 150 puntos

4. **Verificar en Base de Datos**
   ```sql
   SELECT COUNT(*) as participaciones
   FROM participaciones
   WHERE usuario_id = X AND concurso_id = Y;
   -- Debe mostrar: participaciones = 1 (no se duplicó)
   ```

#### Test 4: Ver Perfil y Ranking

1. **Mi Perfil**
   ```
   http://localhost:8081/mi-perfil
   ```
   - Capturar selfie o usar sesión activa
   - Ver puntos totales: 150
   - Ver historial:
     - Navidad 2024 - Nivel Bronce: 50 pts
     - Navidad 2024 - Nivel Plata: 100 pts

2. **Ranking**
   ```
   http://localhost:8081/ranking
   ```
   - Ver posición en tabla
   - Actualización automática cada 10 segundos

---

## Escenarios de Uso Reales

### Escenario 1: Concurso con Dificultad Progresiva

**Contexto:** Trivia sobre productos Herdez

```sql
INSERT INTO concursos (nombre, codigo_unico, descripcion, puntos_otorgados, activo) VALUES
('Trivia Herdez - Nivel Fácil', 'TRIVIA-FACIL', '5 preguntas básicas', 25, 1),
('Trivia Herdez - Nivel Medio', 'TRIVIA-MEDIO', '5 preguntas intermedias', 50, 1),
('Trivia Herdez - Nivel Difícil', 'TRIVIA-DIFICIL', '5 preguntas avanzadas', 100, 1);
```

**Distribución de QRs:**
- QR Fácil → En entrada del evento
- QR Medio → En stands de productos
- QR Difícil → En zona VIP o al completar actividad especial

### Escenario 2: Concurso con Límite de Tiempo

**Contexto:** Happy Hour con puntaje mayor

```sql
INSERT INTO concursos (nombre, codigo_unico, descripcion, puntos_otorgados, activo) VALUES
('Happy Hour Expo - Regular', 'HAPPYHOUR-REG', 'Participación fuera del horario especial', 50, 1),
('Happy Hour Expo - Premium', 'HAPPYHOUR-PREMIUM', 'Participación 6-8 PM (doble puntos)', 100, 1);
```

**Uso:**
- De 9am-6pm: Mostrar QR con código HAPPYHOUR-REG
- De 6pm-8pm: Cambiar a QR con código HAPPYHOUR-PREMIUM
- Misma actividad, diferentes puntajes según horario

### Escenario 3: Concurso por Zonas

**Contexto:** Recorrido por diferentes áreas del evento

```sql
INSERT INTO concursos (nombre, codigo_unico, descripcion, puntos_otorgados, activo) VALUES
('Recorrido - Zona Alimentación', 'RECORRIDO-ZONA-A', 'Visita zona alimentación', 30, 1),
('Recorrido - Zona Bebidas', 'RECORRIDO-ZONA-B', 'Visita zona bebidas', 30, 1),
('Recorrido - Zona Salsas', 'RECORRIDO-ZONA-C', 'Visita zona salsas', 30, 1),
('Recorrido - Zona Moles', 'RECORRIDO-ZONA-D', 'Visita zona moles', 30, 1),
('Recorrido - BONO Completó Todas', 'RECORRIDO-COMPLETO', 'Visitó las 4 zonas + bono', 100, 1);
```

**Mecánica:**
- Cada zona tiene su QR (30 pts c/u)
- Al visitar las 4 zonas: 30×4 = 120 pts
- Mostrar QR especial al completar las 4 (bonus 100 pts)
- Total posible: 220 pts

---

## Queries Útiles para Gestión

### Ver Todos los Concursos Activos

```sql
SELECT
  id,
  nombre,
  codigo_unico,
  puntos_otorgados,
  CASE
    WHEN participacion_unica = 1 THEN 'ÚNICO'
    ELSE 'MÚLTIPLE'
  END as tipo_participacion
FROM concursos
WHERE activo = 1
ORDER BY codigo_unico;
```

### Ver Concursos de Participación Única Disponibles

```sql
-- Ver premios únicos que AÚN NO han sido ganados
SELECT
  c.id,
  c.codigo_unico,
  c.nombre,
  c.puntos_otorgados,
  CASE
    WHEN p.concurso_id IS NULL THEN '🟢 DISPONIBLE'
    ELSE '🔴 GANADO'
  END as estado,
  u.nombre as ganador,
  p.fecha_participacion as fecha_ganado
FROM concursos c
LEFT JOIN participaciones p ON c.id = p.concurso_id
LEFT JOIN usuarios u ON p.usuario_id = u.id
WHERE c.participacion_unica = 1 AND c.activo = 1
ORDER BY estado, c.puntos_otorgados DESC;
```

### Ver Ganadores de Premios Únicos

```sql
-- Ver quién ganó cada premio único
SELECT
  c.codigo_unico,
  c.nombre as concurso,
  c.puntos_otorgados as premio,
  u.nombre as ganador,
  p.fecha_participacion as fecha_ganado,
  TIMESTAMPDIFF(MINUTE, c.fecha_creacion, p.fecha_participacion) as minutos_desde_creacion
FROM participaciones p
INNER JOIN concursos c ON p.concurso_id = c.id
INNER JOIN usuarios u ON p.usuario_id = u.id
WHERE c.participacion_unica = 1
ORDER BY p.fecha_participacion DESC;
```

### Ver Participaciones por Concurso

```sql
SELECT
  c.nombre AS concurso,
  COUNT(p.id) AS total_participaciones,
  SUM(p.puntos_ganados) AS puntos_totales_otorgados
FROM concursos c
LEFT JOIN participaciones p ON c.id = p.concurso_id
WHERE c.codigo_unico LIKE 'NAV2024%'
GROUP BY c.id, c.nombre;
```

**Resultado esperado:**
```
+-----------------------------+-----------------------+---------------------------+
| concurso                    | total_participaciones | puntos_totales_otorgados  |
+-----------------------------+-----------------------+---------------------------+
| Navidad 2024 - Nivel Bronce | 150                   | 7500                      |
| Navidad 2024 - Nivel Plata  | 80                    | 8000                      |
| Navidad 2024 - Nivel Oro    | 30                    | 6000                      |
+-----------------------------+-----------------------+---------------------------+
```

### Ver Top 10 Usuarios por Puntos

```sql
SELECT
  u.nombre,
  u.total_puntos,
  COUNT(p.id) AS num_participaciones
FROM usuarios u
LEFT JOIN participaciones p ON u.id = p.usuario_id
GROUP BY u.id, u.nombre, u.total_puntos
ORDER BY u.total_puntos DESC
LIMIT 10;
```

### Ver Participaciones de un Usuario Específico

```sql
SELECT
  c.nombre AS concurso,
  p.puntos_ganados,
  p.fecha_participacion,
  p.confidence_score
FROM participaciones p
JOIN concursos c ON p.concurso_id = c.id
JOIN usuarios u ON p.usuario_id = u.id
WHERE u.nombre = 'NOMBRE_USUARIO'
ORDER BY p.fecha_participacion DESC;
```

### Desactivar un Concurso (Sin Borrar)

```sql
UPDATE concursos
SET activo = 0
WHERE codigo_unico = 'NAV2024-BRONCE';
```

### Reactivar un Concurso

```sql
UPDATE concursos
SET activo = 1
WHERE codigo_unico = 'NAV2024-BRONCE';
```

---

## Anti-Patrón: Cómo NO Hacerlo

### ❌ Incorrecto: Códigos Duplicados

```sql
-- ESTO FALLARÁ - codigo_unico es UNIQUE
INSERT INTO concursos (nombre, codigo_unico, puntos_otorgados) VALUES
('Concurso A', 'MISMO-CODIGO', 50),
('Concurso B', 'MISMO-CODIGO', 100);  -- ERROR: Duplicate entry
```

### ❌ Incorrecto: Sin Convención de Nombres

```sql
-- Dificulta administración
INSERT INTO concursos (nombre, codigo_unico, puntos_otorgados) VALUES
('Algo', 'ABC123', 50),
('Otra Cosa', 'XYZ789', 100);
-- ¿Pertenecen al mismo evento? ¿Son independientes?
```

### ✅ Correcto: Nomenclatura Clara

```sql
INSERT INTO concursos (nombre, codigo_unico, puntos_otorgados) VALUES
('Navidad 2024 - Bronze', 'NAV2024-BRONZE', 50),
('Navidad 2024 - Silver', 'NAV2024-SILVER', 100),
('Navidad 2024 - Gold', 'NAV2024-GOLD', 200);
-- Claridad total: pertenecen al mismo evento, diferentes niveles
```

---

## Troubleshooting

### Problema: "Concurso no encontrado"

**Causa:** El código en la URL no existe en la BD

**Solución:**
```sql
-- Verificar que existe
SELECT * FROM concursos WHERE codigo_unico = 'TU-CODIGO';

-- Si no existe, insertarlo
INSERT INTO concursos (nombre, codigo_unico, descripcion, puntos_otorgados)
VALUES ('Nombre', 'TU-CODIGO', 'Descripción', 100);
```

### Problema: Usuario no puede participar (ya participó)

**Causa:** Constraint UNIQUE en (usuario_id, concurso_id)

**Solución:** Esto es comportamiento esperado. Si necesitas resetear:
```sql
-- Ver participación existente
SELECT * FROM participaciones
WHERE usuario_id = X AND concurso_id = Y;

-- SOLO EN DESARROLLO: Borrar participación para re-probar
DELETE FROM participaciones
WHERE usuario_id = X AND concurso_id = Y;

-- Restar puntos del total del usuario
UPDATE usuarios
SET total_puntos = total_puntos - PUNTOS_QUE_GANO
WHERE id = X;
```

### Problema: Puntos no se acumulan

**Causa:** Trigger o stored procedure puede estar fallando

**Solución:**
```sql
-- Verificar total_puntos del usuario
SELECT nombre, total_puntos FROM usuarios WHERE id = X;

-- Recalcular manualmente
UPDATE usuarios u
SET total_puntos = (
  SELECT COALESCE(SUM(puntos_ganados), 0)
  FROM participaciones
  WHERE usuario_id = u.id
)
WHERE u.id = X;
```

---

## Mejores Prácticas

### 1. Nomenclatura de Códigos

**Formato recomendado:**
```
[EVENTO]-[CATEGORIA]-[NIVEL]
```

**Ejemplos:**
- `EXPO25-VENTAS-L1`
- `EXPO25-VENTAS-L2`
- `EXPO25-TRIVIA-FACIL`
- `NAVIDAD-ZONA-A`

### 2. Longitud de Código

- **Mínimo:** 6 caracteres (ej: `NAV-L1`)
- **Recomendado:** 10-20 caracteres (balance entre claridad y QR size)
- **Máximo:** 50 caracteres (límite de BD)

### 3. Documentar en el Campo `descripcion`

```sql
INSERT INTO concursos (nombre, codigo_unico, descripcion, puntos_otorgados) VALUES
(
  'Concurso Navidad - Gold',
  'NAV2024-GOLD',
  'Nivel oro: Responder 10 preguntas difíciles. QR ubicado en zona VIP. Horario: 18:00-20:00',
  200
);
```

### 4. Backup Antes de Eventos

```bash
# Backup de concursos antes del evento
mysqldump -h 72.167.45.26 -u alfred -p expo25 concursos > backup_concursos_$(date +%Y%m%d).sql

# Restaurar si algo falla
mysql -h 72.167.45.26 -u alfred -p expo25 < backup_concursos_20241118.sql
```

---

## Anexo: Plantilla de Concurso

```sql
-- PLANTILLA: Copiar y modificar según necesidad

INSERT INTO concursos (nombre, codigo_unico, descripcion, puntos_otorgados, activo) VALUES
(
  '[NOMBRE DEL CONCURSO] - [NIVEL]',     -- Ej: "Trivia Productos - Fácil"
  '[CODIGO-NIVEL]',                       -- Ej: "TRIVIA-FACIL" (max 50 chars)
  '[DESCRIPCIÓN DETALLADA]',              -- Ej: "5 preguntas sobre productos básicos"
  [PUNTOS],                               -- Ej: 50 (número entero)
  1                                       -- 1=activo, 0=inactivo
);
```

---

## Resumen Ejecutivo

| Aspecto | Implementación |
|---------|----------------|
| **Múltiples Puntajes** | Múltiples registros en `concursos` con códigos diferentes |
| **Participación** | 1 vez por código (anti-duplicación automática) |
| **URLs** | `/concurso/CODIGO-NIVEL` |
| **QRs** | 1 QR por nivel/código |
| **Modificación Código** | ❌ No requiere cambios |
| **Esfuerzo** | Solo INSERT en MySQL + generar QRs |

---

**Última actualización:** 18 de Noviembre 2024
**Versión del sistema:** expo2025 v1.1 (con soporte de participación única/múltiple)
**Cambios recientes:**
- ✨ Nuevo campo `participacion_unica` para controlar tipo de concurso
- 🏆 Soporte para concursos de "solo un ganador"
- 👥 Soporte para concursos de participación masiva
- 📊 Queries actualizadas para gestión de premios únicos
