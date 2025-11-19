-- Tabla de configuración del countdown
CREATE TABLE IF NOT EXISTS countdown_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(255) NOT NULL COMMENT 'Nombre del evento',
  fecha_objetivo DATETIME NOT NULL COMMENT 'Fecha y hora objetivo del countdown',
  descripcion TEXT COMMENT 'Descripción del evento',
  activo TINYINT DEFAULT 1 COMMENT '1=activo, 0=inactivo',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='Configuración de countdowns para eventos';

-- Insertar configuración por defecto (Convención Herdez 2025)
INSERT INTO countdown_config (nombre, fecha_objetivo, descripcion, activo) VALUES
('Convención Nacional Sahuayo 2025', '2025-12-01 12:00:00', 'Evento principal de la Convención Nacional Herdez', 1);

-- Query para consultar el countdown activo
-- SELECT * FROM countdown_config WHERE activo = 1 ORDER BY fecha_objetivo ASC LIMIT 1;
