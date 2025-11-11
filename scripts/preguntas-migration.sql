-- =====================================================
-- MIGRACIÓN: Tabla de Preguntas para Countdown
-- Base de Datos: expo25
-- Fecha: Noviembre 2024
-- =====================================================

USE expo25;

-- =====================================================
-- TABLA: PREGUNTAS
-- Almacena preguntas de opción múltiple que aparecen
-- después del countdown
-- =====================================================

CREATE TABLE IF NOT EXISTS preguntas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  pregunta TEXT NOT NULL COMMENT 'Texto de la pregunta',
  opcion_a VARCHAR(255) NOT NULL COMMENT 'Opción A',
  opcion_b VARCHAR(255) NOT NULL COMMENT 'Opción B',
  opcion_c VARCHAR(255) NOT NULL COMMENT 'Opción C',
  opcion_d VARCHAR(255) NOT NULL COMMENT 'Opción D',
  respuesta_correcta CHAR(1) NOT NULL COMMENT 'A, B, C o D',
  puntos INT DEFAULT 50 COMMENT 'Puntos otorgados por respuesta correcta',
  activo TINYINT DEFAULT 1 COMMENT '1=activo, 0=inactivo',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Preguntas de opción múltiple para el countdown';

-- =====================================================
-- TABLA: RESPUESTAS_USUARIOS
-- Registra las respuestas de los usuarios
-- =====================================================

CREATE TABLE IF NOT EXISTS respuestas_usuarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL COMMENT 'ID del usuario',
  pregunta_id INT NOT NULL COMMENT 'ID de la pregunta',
  respuesta_seleccionada CHAR(1) NOT NULL COMMENT 'A, B, C o D',
  es_correcta TINYINT NOT NULL COMMENT '1=correcta, 0=incorrecta',
  puntos_ganados INT DEFAULT 0 COMMENT 'Puntos ganados (0 si incorrecta)',
  fecha_respuesta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (pregunta_id) REFERENCES preguntas(id) ON DELETE CASCADE,

  -- Un usuario solo puede responder una vez cada pregunta
  UNIQUE KEY unique_respuesta (usuario_id, pregunta_id),

  INDEX idx_usuario (usuario_id),
  INDEX idx_pregunta (pregunta_id),
  INDEX idx_fecha (fecha_respuesta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Registro de respuestas de usuarios a preguntas';

-- =====================================================
-- DATOS DE PRUEBA
-- =====================================================

INSERT INTO preguntas (pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, puntos, activo)
VALUES
  (
    '¿En qué año se fundó Herdez?',
    '1914',
    '1920',
    '1940',
    '1950',
    'A',
    50,
    1
  ),
  (
    '¿Cuál es el ingrediente principal de la salsa verde Herdez?',
    'Chile jalapeño',
    'Tomate verde',
    'Chile serrano',
    'Aguacate',
    'B',
    50,
    1
  ),
  (
    '¿Qué producto es icónico de la marca Herdez?',
    'Salsa de tomate',
    'Mayonesa',
    'Salsa verde y roja',
    'Atún',
    'C',
    50,
    1
  ),
  (
    '¿Cuántos años de tradición tiene Herdez en México?',
    'Más de 50 años',
    'Más de 80 años',
    'Más de 100 años',
    'Más de 120 años',
    'C',
    50,
    1
  ),
  (
    '¿Qué significa Herdez para las familias mexicanas?',
    'Tradición y calidad',
    'Innovación',
    'Precio bajo',
    'Importación',
    'A',
    50,
    1
  )
ON DUPLICATE KEY UPDATE
  pregunta = VALUES(pregunta),
  opcion_a = VALUES(opcion_a),
  opcion_b = VALUES(opcion_b),
  opcion_c = VALUES(opcion_c),
  opcion_d = VALUES(opcion_d),
  respuesta_correcta = VALUES(respuesta_correcta),
  puntos = VALUES(puntos);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

DESCRIBE preguntas;
DESCRIBE respuestas_usuarios;
SELECT * FROM preguntas;

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================
