-- ============================================
-- Modificar tabla concursos para soportar
-- participación única vs múltiple
-- ============================================

-- Agregar campo participacion_unica
ALTER TABLE concursos
ADD COLUMN participacion_unica TINYINT DEFAULT 0
COMMENT '1=solo una persona gana (premio único), 0=múltiples personas pueden participar (cada usuario una vez)';

-- Agregar índice para optimizar consultas
ALTER TABLE concursos
ADD INDEX idx_participacion_unica (participacion_unica);

-- ============================================
-- EJEMPLOS DE USO
-- ============================================

-- Concursos con PARTICIPACIÓN ÚNICA (solo un ganador por código)
-- Útil para: Premios especiales, códigos ocultos, concursos exclusivos
INSERT INTO concursos (codigo_unico, nombre, descripcion, puntos_otorgados, participacion_unica, activo) VALUES
('NAV2024-ORO', 'Navideño Oro - Premio Único', 'Primer lugar en concurso navideño. Solo una persona puede ganar.', 500, 1, 1),
('NAV2024-PLATA', 'Navideño Plata - Premio Único', 'Segundo lugar en concurso navideño. Solo una persona puede ganar.', 300, 1, 1),
('NAV2024-BRONCE', 'Navideño Bronce - Premio Único', 'Tercer lugar en concurso navideño. Solo una persona puede ganar.', 100, 1, 1);

-- Concursos con PARTICIPACIÓN MÚLTIPLE (todos pueden participar)
-- Útil para: Trivias diarias, actividades generales, participación abierta
INSERT INTO concursos (codigo_unico, nombre, descripcion, puntos_otorgados, participacion_unica, activo) VALUES
('TRIVIA-DIARIA', 'Trivia del Día', 'Responde la trivia diaria. Todos pueden participar una vez.', 50, 0, 1),
('SELFIE-HERDEZ', 'Selfie con Producto Herdez', 'Tómate una selfie con un producto Herdez. Todos pueden participar.', 75, 0, 1),
('VISITA-STAND', 'Visita al Stand', 'Visita nuestro stand. Todos pueden participar.', 25, 0, 1);

-- ============================================
-- COMPORTAMIENTO
-- ============================================

-- PARTICIPACIÓN ÚNICA (participacion_unica = 1):
-- - Solo la PRIMERA persona que accede al concurso gana los puntos
-- - Las personas siguientes reciben mensaje: "Este concurso ya fue ganado por [Nombre] el [fecha]"
-- - Ideal para: Premios especiales, códigos ocultos en el evento, concursos VIP

-- PARTICIPACIÓN MÚLTIPLE (participacion_unica = 0):
-- - Todas las personas pueden participar y ganar puntos
-- - Cada usuario solo puede participar UNA VEZ en el mismo concurso
-- - Si intenta participar de nuevo recibe: "Ya participaste en este concurso"
-- - Ideal para: Actividades generales, trivias, participación abierta

-- ============================================
-- CONSULTAS ÚTILES
-- ============================================

-- Ver concursos de participación única
SELECT codigo_unico, nombre, puntos_otorgados, participacion_unica
FROM concursos
WHERE participacion_unica = 1 AND activo = 1;

-- Ver ganadores de concursos únicos
SELECT
  c.codigo_unico,
  c.nombre as concurso,
  u.nombre as ganador,
  p.puntos_ganados,
  p.fecha_participacion
FROM participaciones p
INNER JOIN concursos c ON p.concurso_id = c.id
INNER JOIN usuarios u ON p.usuario_id = u.id
WHERE c.participacion_unica = 1
ORDER BY p.fecha_participacion DESC;

-- Ver concursos únicos disponibles (sin ganador aún)
SELECT
  c.id,
  c.codigo_unico,
  c.nombre,
  c.puntos_otorgados,
  CASE
    WHEN p.concurso_id IS NULL THEN 'DISPONIBLE'
    ELSE 'GANADO'
  END as estado
FROM concursos c
LEFT JOIN participaciones p ON c.id = p.concurso_id
WHERE c.participacion_unica = 1 AND c.activo = 1;
