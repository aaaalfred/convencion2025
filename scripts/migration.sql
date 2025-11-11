-- =====================================================
-- MIGRACIÓN: Sistema de Concursos con Validación Facial
-- Base de Datos: expo25
-- Fecha: Noviembre 2024
-- =====================================================

USE expo25;

-- =====================================================
-- TABLA 1: USUARIOS
-- Almacena usuarios registrados con su foto de referencia
-- y FaceID de AWS Rekognition para validación facial
-- =====================================================

CREATE TABLE IF NOT EXISTS usuarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(255) NOT NULL COMMENT 'Nombre completo del usuario',
  email VARCHAR(255) NULL COMMENT 'Email (opcional)',
  telefono VARCHAR(20) NULL COMMENT 'Teléfono (opcional)',
  foto_registro_url VARCHAR(500) NOT NULL COMMENT 'URL de foto en S3',
  rekognition_face_id VARCHAR(255) UNIQUE NOT NULL COMMENT 'FaceID de AWS Rekognition',
  total_puntos INT DEFAULT 0 COMMENT 'Balance global de puntos acumulados',
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de registro',
  activo TINYINT DEFAULT 1 COMMENT '1=activo, 0=inactivo',

  INDEX idx_face_id (rekognition_face_id),
  INDEX idx_email (email),
  INDEX idx_activo (activo),
  INDEX idx_puntos (total_puntos)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Usuarios del sistema de concursos con validación facial';

-- =====================================================
-- TABLA 2: CONCURSOS
-- Almacena los concursos con su código QR único
-- =====================================================

CREATE TABLE IF NOT EXISTS concursos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(255) NOT NULL COMMENT 'Nombre del concurso',
  codigo_unico VARCHAR(50) UNIQUE NOT NULL COMMENT 'Código para QR (ej: NAV2024)',
  descripcion TEXT COMMENT 'Descripción del concurso',
  puntos_otorgados INT NOT NULL COMMENT 'Puntos que se otorgan al participar',
  activo TINYINT DEFAULT 1 COMMENT '1=activo, 0=inactivo',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación',
  fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_codigo (codigo_unico),
  INDEX idx_activo (activo),
  INDEX idx_fecha (fecha_creacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Concursos disponibles para acumular puntos';

-- =====================================================
-- TABLA 3: PARTICIPACIONES
-- Registra cada participación de usuario en un concurso
-- UNIQUE KEY previene que un usuario participe dos veces
-- en el mismo concurso (anti-duplicación)
-- =====================================================

CREATE TABLE IF NOT EXISTS participaciones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL COMMENT 'ID del usuario que participa',
  concurso_id INT NOT NULL COMMENT 'ID del concurso',
  puntos_ganados INT NOT NULL COMMENT 'Puntos otorgados en esta participación',
  confidence_score DECIMAL(5,2) COMMENT 'Score de confianza de AWS Rekognition (0-100)',
  foto_validacion_url VARCHAR(500) COMMENT 'URL de foto de validación en S3',
  fecha_participacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de participación',

  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (concurso_id) REFERENCES concursos(id) ON DELETE CASCADE,

  -- ⭐ CLAVE ÚNICA: Previene duplicados (un usuario solo puede participar una vez por concurso)
  UNIQUE KEY unique_participacion (usuario_id, concurso_id),

  INDEX idx_usuario (usuario_id),
  INDEX idx_concurso (concurso_id),
  INDEX idx_fecha (fecha_participacion),
  INDEX idx_usuario_fecha (usuario_id, fecha_participacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Registro de participaciones en concursos (anti-duplicación)';

-- =====================================================
-- DATOS DE PRUEBA
-- =====================================================

-- Insertar concursos de ejemplo
INSERT INTO concursos (nombre, codigo_unico, descripcion, puntos_otorgados, activo)
VALUES
  (
    'Concurso Navideño 2024',
    'NAV2024',
    'Participa en nuestro concurso navideño y acumula 100 puntos. Válido durante la temporada navideña.',
    100,
    1
  ),
  (
    'Promoción Verano',
    'VER2024',
    'Gana 150 puntos participando en nuestra promoción de verano. ¡No te lo pierdas!',
    150,
    1
  ),
  (
    'Gran Premio Herdez',
    'PREMIO2024',
    'Participa por 200 puntos en el gran premio Herdez. ¡Acumula y gana!',
    200,
    1
  )
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre),
  descripcion = VALUES(descripcion),
  puntos_otorgados = VALUES(puntos_otorgados);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Mostrar tablas creadas
SHOW TABLES LIKE '%usuarios%';
SHOW TABLES LIKE '%concursos%';
SHOW TABLES LIKE '%participaciones%';

-- Mostrar estructura de las tablas
DESCRIBE usuarios;
DESCRIBE concursos;
DESCRIBE participaciones;

-- Mostrar concursos de prueba
SELECT * FROM concursos;

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================
