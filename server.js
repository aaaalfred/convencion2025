import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import crypto from 'crypto';

// Configurar __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config();

// ============================================
// LOGS DE VARIABLES DE ENTORNO
// ============================================
console.log('\n' + '='.repeat(60));
console.log('🔍 VERIFICANDO VARIABLES DE ENTORNO');
console.log('='.repeat(60));

// Helper para mostrar variable de forma segura
const showVar = (name, value, showChars = 4) => {
  if (!value) {
    console.log(`❌ ${name}: NOT SET`);
    return false;
  }
  const maskedValue = value.substring(0, showChars) + '***';
  console.log(`✅ ${name}: ${maskedValue} (length: ${value.length})`);
  return true;
};

// Variables de Base de Datos
console.log('\n📊 BASE DE DATOS:');
showVar('DB_HOST', process.env.DB_HOST, 10);
showVar('DB_PORT', process.env.DB_PORT, 10);
showVar('DB_DATABASE', process.env.DB_DATABASE, 10);
showVar('DB_USERNAME', process.env.DB_USERNAME, 6);
showVar('DB_PASSWORD', process.env.DB_PASSWORD, 2);

// Variables AWS
console.log('\n☁️  AWS:');
showVar('APP_AWS_REGION', process.env.APP_AWS_REGION, 15);
showVar('APP_AWS_ACCESS_KEY_ID', process.env.APP_AWS_ACCESS_KEY_ID, 8);
showVar('APP_AWS_SECRET_ACCESS_KEY', process.env.APP_AWS_SECRET_ACCESS_KEY, 4);
showVar('APP_AWS_S3_BUCKET', process.env.APP_AWS_S3_BUCKET, 15);
showVar('REKOGNITION_COLLECTION_ID', process.env.REKOGNITION_COLLECTION_ID, 15);

// Variables de Servidor
console.log('\n🚀 SERVIDOR:');
console.log(`✅ NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`✅ PORT: ${process.env.PORT || 3000}`);
showVar('FRONTEND_URL', process.env.FRONTEND_URL, 20);
showVar('ADMIN_SECRET_KEY', process.env.ADMIN_SECRET_KEY, 4);

console.log('='.repeat(60) + '\n');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================

// CORS - permitir requests desde el frontend
const allowedOrigins = [
  'http://localhost:8081',
  'http://localhost:5173',
  'https://main.d23cmb2t56fwxl.amplifyapp.com',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Permitir requests sin origin (como mobile apps o Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS: Origen no permitido: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parser para JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configurar Multer para uploads de imágenes en memoria
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Solo permitir imágenes
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'));
    }
  }
});

// ============================================
// CONEXIÓN A BASE DE DATOS
// ============================================

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '-06:00' // Hora de México (CST/CDT)
});

// Verificar conexión (no termina el proceso si falla)
let dbConnected = false;
async function testConnection() {
  console.log('\n' + '='.repeat(60));
  console.log('🔌 INTENTANDO CONEXIÓN A BASE DE DATOS');
  console.log('='.repeat(60));
  console.log(`📍 Host: ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}`);
  console.log(`💾 Database: ${process.env.DB_DATABASE}`);
  console.log(`👤 User: ${process.env.DB_USERNAME}`);

  try {
    const connection = await pool.getConnection();
    console.log('✅ Conexión a MySQL exitosa');

    // Verificar base de datos
    const [rows] = await connection.query('SELECT DATABASE() as db, VERSION() as version');
    console.log(`📊 Base de datos actual: ${rows[0].db}`);
    console.log(`🔢 Versión MySQL: ${rows[0].version}`);

    connection.release();
    dbConnected = true;
    console.log('='.repeat(60) + '\n');
    return true;
  } catch (error) {
    console.error('❌ Error conectando a MySQL:');
    console.error(`   Código: ${error.code || 'N/A'}`);
    console.error(`   Mensaje: ${error.message}`);
    console.error(`   Errno: ${error.errno || 'N/A'}`);
    console.warn('⚠️  Servidor iniciará sin conexión a BD. Verifica las variables de entorno.');
    console.log('='.repeat(60) + '\n');
    dbConnected = false;
    return false;
  }
}

// ============================================
// IMPORTAR LIBRERÍAS AWS
// ============================================

console.log('='.repeat(60));
console.log('☁️  CARGANDO AWS REKOGNITION');
console.log('='.repeat(60));

// Importamos las funciones de AWS Rekognition
let awsRekognition;
try {
  console.log('📦 Importando módulo aws-rekognition.js...');
  const module = await import('./lib/aws-rekognition.js');
  awsRekognition = module.default;
  console.log('✅ Módulo AWS Rekognition cargado exitosamente');

  // Verificar configuración de AWS
  if (process.env.APP_AWS_ACCESS_KEY_ID && process.env.APP_AWS_SECRET_ACCESS_KEY) {
    console.log('✅ Credenciales AWS configuradas');
    console.log(`📍 Region: ${process.env.APP_AWS_REGION || 'us-east-1'}`);
    console.log(`🪣  S3 Bucket: ${process.env.APP_AWS_S3_BUCKET || 'No configurado'}`);
    console.log(`👤 Collection ID: ${process.env.REKOGNITION_COLLECTION_ID || 'No configurado'}`);
  } else {
    console.warn('⚠️  Credenciales AWS no configuradas');
    awsRekognition = null;
  }
} catch (error) {
  console.error('❌ Error cargando AWS Rekognition:');
  console.error(`   ${error.message}`);
  console.warn('⚠️  El servidor funcionará sin reconocimiento facial');
  awsRekognition = null;
}
console.log('='.repeat(60) + '\n');

// ============================================
// UTILIDADES
// ============================================

// Convertir base64 a Buffer
function base64ToBuffer(base64String) {
  // Remover el prefijo data:image/...;base64, si existe
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

// Middleware de manejo de errores
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================
// ENDPOINTS
// ============================================

// Servir archivos estáticos del frontend (si existen)
const staticPath = path.join(__dirname, 'dist');
try {
  if (existsSync(staticPath)) {
    app.use(express.static(staticPath));
    console.log('📁 Sirviendo archivos estáticos desde /dist');
  }
} catch (err) {
  console.warn('⚠️  No se encontró directorio /dist para archivos estáticos');
}

// Ruta raíz
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({
      service: 'herdez-concursos-facial',
      status: 'running',
      message: 'API Backend - Usa /health para ver el estado',
      endpoints: {
        health: '/health',
        registro: 'POST /api/usuarios/registro',
        participar: 'POST /api/concursos/:codigo/participar',
        perfil: 'POST /api/usuarios/perfil',
        ranking: 'GET /api/ranking'
      }
    });
  }
});

// Health check mejorado
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'herdez-concursos-facial',
    port: PORT,
    env: process.env.NODE_ENV || 'development',
    connections: {
      database: dbConnected ? 'connected' : 'disconnected',
      aws: awsRekognition ? 'configured' : 'not configured'
    },
    environment: {
      DB_HOST: process.env.DB_HOST ? 'set' : 'missing',
      AWS_REGION: process.env.APP_AWS_REGION ? 'set' : 'missing',
      AWS_CREDENTIALS: (process.env.APP_AWS_ACCESS_KEY_ID && process.env.APP_AWS_SECRET_ACCESS_KEY) ? 'set' : 'missing'
    }
  };

  // Si nada está conectado, devolver status degraded
  if (!dbConnected && !awsRekognition) {
    health.status = 'degraded';
    res.status(503).json(health);
  } else {
    res.status(200).json(health);
  }
});

// ============================================
// 1. REGISTRO DE USUARIO
// POST /api/usuarios/registro
// ============================================
app.post('/api/usuarios/registro', asyncHandler(async (req, res) => {
  const { nombre, email, telefono, foto } = req.body;

  // Validaciones
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({
      success: false,
      error: 'El nombre es requerido'
    });
  }

  if (!foto) {
    return res.status(400).json({
      success: false,
      error: 'La foto es requerida'
    });
  }

  // Verificar si el email ya existe (si se proporcionó)
  if (email) {
    const [existing] = await pool.query(
      'SELECT id FROM usuarios WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'El email ya está registrado'
      });
    }
  }

  if (!awsRekognition) {
    return res.status(503).json({
      success: false,
      error: 'Servicio de AWS Rekognition no configurado'
    });
  }

  try {
    // Convertir foto base64 a buffer
    const imageBuffer = base64ToBuffer(foto);

    // 1. Indexar rostro en AWS Rekognition
    const { faceId, s3Url } = await awsRekognition.indexFace(imageBuffer, `registro-${Date.now()}.jpg`);

    // 2. Insertar usuario en la base de datos con fecha de México
    const fechaMexico = new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' });
    const fechaRegistro = new Date(fechaMexico);

    const [result] = await pool.query(
      `INSERT INTO usuarios (nombre, email, telefono, foto_registro_url, rekognition_face_id, fecha_registro)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, email || null, telefono || null, s3Url, faceId, fechaRegistro]
    );

    const usuarioId = result.insertId;

    // Generar token de sesión y fecha de expiración (24 horas)
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        usuarioId,
        nombre,
        email: email || null,
        faceId,
        sessionToken,
        expiresAt
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);

    // Errores específicos de AWS Rekognition
    if (error.code === 'InvalidImageFormatException') {
      return res.status(400).json({
        success: false,
        error: 'Formato de imagen inválido'
      });
    }
    if (error.code === 'InvalidParameterException') {
      return res.status(400).json({
        success: false,
        error: 'No se detectó un rostro en la imagen o hay múltiples rostros'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al registrar usuario'
    });
  }
}));

// ============================================
// 2. PARTICIPAR EN CONCURSO
// POST /api/concursos/:codigo/participar
// ============================================
app.post('/api/concursos/:codigo/participar', asyncHandler(async (req, res) => {
  const { codigo } = req.params;
  const { foto } = req.body;

  if (!foto) {
    return res.status(400).json({
      success: false,
      error: 'La foto es requerida'
    });
  }

  if (!awsRekognition) {
    return res.status(503).json({
      success: false,
      error: 'Servicio de AWS Rekognition no configurado'
    });
  }

  try {
    // 1. Verificar que el concurso existe y está activo
    const [concursos] = await pool.query(
      'SELECT id, nombre, puntos_otorgados FROM concursos WHERE codigo_unico = ? AND activo = 1',
      [codigo]
    );

    if (concursos.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Concurso no encontrado o inactivo'
      });
    }

    const concurso = concursos[0];

    // 2. Buscar rostro en AWS Rekognition
    const imageBuffer = base64ToBuffer(foto);
    const searchResult = await awsRekognition.searchFace(imageBuffer);

    if (!searchResult.found) {
      return res.status(404).json({
        success: false,
        tipo: 'no-registrado',
        mensaje: 'No te reconocemos. ¿Es tu primera vez?',
        error: 'Usuario no registrado'
      });
    }

    const { faceId, similarity } = searchResult;

    // 3. Obtener datos del usuario
    const [usuarios] = await pool.query(
      'SELECT id, nombre, total_puntos FROM usuarios WHERE rekognition_face_id = ?',
      [faceId]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({
        success: false,
        tipo: 'no-registrado',
        mensaje: 'Usuario no encontrado en la base de datos'
      });
    }

    const usuario = usuarios[0];

    // 4. Verificar si ya participó en este concurso
    const [participaciones] = await pool.query(
      'SELECT fecha_participacion, puntos_ganados FROM participaciones WHERE usuario_id = ? AND concurso_id = ?',
      [usuario.id, concurso.id]
    );

    if (participaciones.length > 0) {
      const participacion = participaciones[0];
      return res.status(200).json({
        success: true,
        tipo: 'ya-participaste',
        mensaje: 'Ya participaste en este concurso',
        data: {
          usuario: {
            nombre: usuario.nombre,
            totalPuntos: usuario.total_puntos
          },
          participacion: {
            fecha: participacion.fecha_participacion,
            puntosGanados: participacion.puntos_ganados
          }
        }
      });
    }

    // 5. Registrar nueva participación con fecha de México
    const fechaMexico = new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' });
    const fechaParticipacion = new Date(fechaMexico);

    await pool.query(
      `INSERT INTO participaciones (usuario_id, concurso_id, puntos_ganados, confidence_score, fecha_participacion)
       VALUES (?, ?, ?, ?, ?)`,
      [usuario.id, concurso.id, concurso.puntos_otorgados, similarity, fechaParticipacion]
    );

    // 6. Actualizar puntos totales del usuario
    const nuevoTotal = usuario.total_puntos + concurso.puntos_otorgados;
    await pool.query(
      'UPDATE usuarios SET total_puntos = ? WHERE id = ?',
      [nuevoTotal, usuario.id]
    );

    // 7. Respuesta exitosa
    res.status(200).json({
      success: true,
      tipo: 'exito',
      mensaje: `¡Hola ${usuario.nombre}! Ganaste ${concurso.puntos_otorgados} puntos`,
      data: {
        usuario: {
          nombre: usuario.nombre,
          totalPuntos: nuevoTotal
        },
        puntosGanados: concurso.puntos_otorgados,
        similarity
      }
    });

  } catch (error) {
    console.error('Error en participación:', error);
    res.status(500).json({
      success: false,
      error: 'Error al procesar participación'
    });
  }
}));

// ============================================
// 3. CONSULTAR PERFIL CON SESIÓN (SIN FOTO)
// GET /api/usuarios/perfil-sesion/:usuarioId
// ============================================
app.get('/api/usuarios/perfil-sesion/:usuarioId', asyncHandler(async (req, res) => {
  const { usuarioId } = req.params;

  if (!usuarioId) {
    return res.status(400).json({
      success: false,
      error: 'El usuarioId es requerido'
    });
  }

  try {
    // 1. Obtener datos del usuario (sin AWS Rekognition)
    const [usuarios] = await pool.query(
      'SELECT id, nombre, email, telefono, total_puntos, fecha_registro FROM usuarios WHERE id = ? AND activo = 1',
      [usuarioId]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado o sesión inválida'
      });
    }

    const usuario = usuarios[0];

    // 2. Obtener historial de participaciones
    const [historial] = await pool.query(
      `SELECT
        p.id,
        c.nombre as concurso,
        c.codigo_unico as codigo,
        p.puntos_ganados as puntos,
        p.fecha_participacion as fecha,
        p.confidence_score as confidence
       FROM participaciones p
       INNER JOIN concursos c ON p.concurso_id = c.id
       WHERE p.usuario_id = ?
       ORDER BY p.fecha_participacion DESC`,
      [usuario.id]
    );

    res.status(200).json({
      success: true,
      data: {
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
          telefono: usuario.telefono,
          totalPuntos: usuario.total_puntos,
          fechaRegistro: usuario.fecha_registro
        },
        historial: historial.map(h => ({
          id: h.id,
          concurso: h.concurso,
          codigo: h.codigo,
          puntos: h.puntos,
          fecha: new Date(h.fecha).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          hora: new Date(h.fecha).toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
        }))
      }
    });

  } catch (error) {
    console.error('Error consultando perfil con sesión:', error);
    res.status(500).json({
      success: false,
      error: 'Error al consultar perfil'
    });
  }
}));

// ============================================
// 4. CONSULTAR PERFIL CON VALIDACIÓN FACIAL
// POST /api/usuarios/perfil
// (Método legacy para cuando no hay sesión)
// ============================================
app.post('/api/usuarios/perfil', asyncHandler(async (req, res) => {
  const { foto } = req.body;

  if (!foto) {
    return res.status(400).json({
      success: false,
      error: 'La foto es requerida'
    });
  }

  if (!awsRekognition) {
    return res.status(503).json({
      success: false,
      error: 'Servicio de AWS Rekognition no configurado'
    });
  }

  try {
    // 1. Buscar rostro en AWS Rekognition
    const imageBuffer = base64ToBuffer(foto);
    const searchResult = await awsRekognition.searchFace(imageBuffer);

    if (!searchResult.found) {
      return res.status(404).json({
        success: false,
        tipo: 'no-registrado',
        mensaje: 'No te reconocemos. ¿Es tu primera vez?'
      });
    }

    const { faceId } = searchResult;

    // 2. Obtener datos del usuario
    const [usuarios] = await pool.query(
      'SELECT id, nombre, email, telefono, total_puntos, fecha_registro FROM usuarios WHERE rekognition_face_id = ?',
      [faceId]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({
        success: false,
        mensaje: 'Usuario no encontrado'
      });
    }

    const usuario = usuarios[0];

    // 3. Obtener historial de participaciones
    const [historial] = await pool.query(
      `SELECT
        p.id,
        c.nombre as concurso,
        c.codigo_unico as codigo,
        p.puntos_ganados as puntos,
        p.fecha_participacion as fecha,
        p.confidence_score as confidence
       FROM participaciones p
       INNER JOIN concursos c ON p.concurso_id = c.id
       WHERE p.usuario_id = ?
       ORDER BY p.fecha_participacion DESC`,
      [usuario.id]
    );

    // 4. Generar token de sesión para futuras consultas
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    res.status(200).json({
      success: true,
      data: {
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
          telefono: usuario.telefono,
          totalPuntos: usuario.total_puntos,
          fechaRegistro: usuario.fecha_registro
        },
        historial: historial.map(h => ({
          id: h.id,
          concurso: h.concurso,
          codigo: h.codigo,
          puntos: h.puntos,
          fecha: new Date(h.fecha).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          hora: new Date(h.fecha).toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
        })),
        sessionToken,
        expiresAt
      }
    });

  } catch (error) {
    console.error('Error consultando perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Error al consultar perfil'
    });
  }
}));

// ============================================
// 4. INFORMACIÓN DE CONCURSO
// GET /api/concursos/:codigo
// ============================================
app.get('/api/concursos/:codigo', asyncHandler(async (req, res) => {
  const { codigo } = req.params;

  const [concursos] = await pool.query(
    'SELECT id, nombre, codigo_unico, descripcion, puntos_otorgados, activo FROM concursos WHERE codigo_unico = ?',
    [codigo]
  );

  if (concursos.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Concurso no encontrado'
    });
  }

  res.status(200).json({
    success: true,
    data: concursos[0]
  });
}));

// ============================================
// 5. RANKING GENERAL
// GET /api/ranking
// ============================================
app.get('/api/ranking', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 50; // Default: top 50

  // Obtener ranking de usuarios ordenados por puntos
  const [ranking] = await pool.query(
    `SELECT
      id,
      nombre,
      total_puntos,
      fecha_registro,
      (SELECT COUNT(*) FROM participaciones WHERE usuario_id = usuarios.id) as total_participaciones
     FROM usuarios
     WHERE activo = 1 AND total_puntos > 0
     ORDER BY total_puntos DESC, fecha_registro ASC
     LIMIT ?`,
    [limit]
  );

  // Obtener estadísticas generales
  const [stats] = await pool.query(
    `SELECT
      COUNT(*) as total_usuarios,
      SUM(total_puntos) as puntos_totales,
      AVG(total_puntos) as promedio_puntos,
      MAX(total_puntos) as max_puntos
     FROM usuarios
     WHERE activo = 1`
  );

  res.status(200).json({
    success: true,
    data: {
      ranking: ranking.map((usuario, index) => ({
        posicion: index + 1,
        id: usuario.id,
        nombre: usuario.nombre,
        puntos: usuario.total_puntos,
        participaciones: usuario.total_participaciones,
        fechaRegistro: usuario.fecha_registro
      })),
      estadisticas: {
        totalUsuarios: stats[0].total_usuarios,
        puntosTotales: stats[0].puntos_totales,
        promedioPuntos: Math.round(stats[0].promedio_puntos || 0),
        maxPuntos: stats[0].max_puntos
      },
      timestamp: new Date().toISOString()
    }
  });
}));

// ============================================
// 6. OBTENER PREGUNTA ALEATORIA
// GET /api/preguntas/random
// ============================================
app.get('/api/preguntas/random', asyncHandler(async (req, res) => {
  const usuarioId = req.query.usuarioId;

  // Obtener una pregunta aleatoria activa que el usuario no haya respondido
  let query;
  let params;

  if (usuarioId) {
    // Si hay usuarioId, evitar preguntas ya respondidas
    query = `
      SELECT id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, puntos
      FROM preguntas
      WHERE activo = 1
      AND id NOT IN (
        SELECT pregunta_id FROM respuestas_usuarios WHERE usuario_id = ?
      )
      ORDER BY RAND()
      LIMIT 1
    `;
    params = [usuarioId];
  } else {
    // Sin usuarioId, cualquier pregunta activa
    query = `
      SELECT id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, puntos
      FROM preguntas
      WHERE activo = 1
      ORDER BY RAND()
      LIMIT 1
    `;
    params = [];
  }

  const [preguntas] = await pool.query(query, params);

  if (preguntas.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'No hay preguntas disponibles'
    });
  }

  res.status(200).json({
    success: true,
    data: preguntas[0]
  });
}));

// ============================================
// 7. RESPONDER PREGUNTA
// POST /api/preguntas/responder
// ============================================
app.post('/api/preguntas/responder', asyncHandler(async (req, res) => {
  const { usuarioId, preguntaId, respuesta } = req.body;

  // Validaciones
  if (!usuarioId || !preguntaId || !respuesta) {
    return res.status(400).json({
      success: false,
      error: 'Faltan parámetros requeridos'
    });
  }

  if (!['A', 'B', 'C', 'D'].includes(respuesta.toUpperCase())) {
    return res.status(400).json({
      success: false,
      error: 'Respuesta inválida. Debe ser A, B, C o D'
    });
  }

  try {
    // 1. Verificar que el usuario existe
    const [usuarios] = await pool.query(
      'SELECT id, nombre, total_puntos FROM usuarios WHERE id = ?',
      [usuarioId]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const usuario = usuarios[0];

    // 2. Verificar que la pregunta existe
    const [preguntas] = await pool.query(
      'SELECT id, pregunta, respuesta_correcta, puntos FROM preguntas WHERE id = ? AND activo = 1',
      [preguntaId]
    );

    if (preguntas.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Pregunta no encontrada'
      });
    }

    const pregunta = preguntas[0];

    // 3. Verificar si ya respondió esta pregunta
    const [respuestasExistentes] = await pool.query(
      'SELECT id FROM respuestas_usuarios WHERE usuario_id = ? AND pregunta_id = ?',
      [usuarioId, preguntaId]
    );

    if (respuestasExistentes.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Ya respondiste esta pregunta anteriormente'
      });
    }

    // 4. Verificar si la respuesta es correcta
    const esCorrecta = respuesta.toUpperCase() === pregunta.respuesta_correcta;
    const puntosGanados = esCorrecta ? pregunta.puntos : 0;

    // 5. Registrar la respuesta
    await pool.query(
      `INSERT INTO respuestas_usuarios (usuario_id, pregunta_id, respuesta_seleccionada, es_correcta, puntos_ganados)
       VALUES (?, ?, ?, ?, ?)`,
      [usuarioId, preguntaId, respuesta.toUpperCase(), esCorrecta ? 1 : 0, puntosGanados]
    );

    // 6. Si es correcta, actualizar puntos del usuario
    let nuevoTotal = usuario.total_puntos;
    if (esCorrecta) {
      nuevoTotal = usuario.total_puntos + puntosGanados;
      await pool.query(
        'UPDATE usuarios SET total_puntos = ? WHERE id = ?',
        [nuevoTotal, usuarioId]
      );
    }

    // 7. Responder
    res.status(200).json({
      success: true,
      data: {
        esCorrecta,
        respuestaCorrecta: pregunta.respuesta_correcta,
        puntosGanados,
        totalPuntos: nuevoTotal,
        mensaje: esCorrecta
          ? `¡Correcto! Ganaste ${puntosGanados} puntos`
          : `Incorrecto. La respuesta correcta era ${pregunta.respuesta_correcta}`
      }
    });

  } catch (error) {
    console.error('Error al responder pregunta:', error);
    res.status(500).json({
      success: false,
      error: 'Error al procesar la respuesta'
    });
  }
}));

// ============================================
// MANEJO DE ERRORES
// ============================================

// 404 - Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada'
  });
});

// Manejador global de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Error de Multer
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'El archivo es demasiado grande (máximo 5MB)'
      });
    }
  }

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Error interno del servidor'
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

async function startServer() {
  // Verificar conexión a BD
  await testConnection();

  // Iniciar servidor
  app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 SERVIDOR HERDEZ CONCURSOS INICIADO');
    console.log('='.repeat(60));
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

    console.log('\n📊 ESTADO DE CONEXIONES:');
    console.log(`   Base de datos: ${dbConnected ? '✅ CONECTADA' : '❌ DESCONECTADA'}`);
    if (dbConnected) {
      console.log(`   └─ ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`);
    }
    console.log(`   AWS Rekognition: ${awsRekognition ? '✅ CONFIGURADO' : '❌ NO CONFIGURADO'}`);
    if (awsRekognition) {
      console.log(`   └─ ${process.env.APP_AWS_REGION} | ${process.env.REKOGNITION_COLLECTION_ID}`);
    }

    console.log('\n🔗 ENDPOINTS DISPONIBLES:');
    console.log(`   GET  /                - Frontend o info de API`);
    console.log(`   GET  /health          - Estado del servidor`);
    console.log(`   POST /api/usuarios/registro`);
    console.log(`   POST /api/concursos/:codigo/participar`);
    console.log(`   GET  /api/ranking`);

    if (!dbConnected || !awsRekognition) {
      console.log('\n⚠️  ADVERTENCIAS:');
      if (!dbConnected) {
        console.log('   - Base de datos no disponible');
        console.log('   - Verifica las variables de entorno de BD');
      }
      if (!awsRekognition) {
        console.log('   - AWS Rekognition no disponible');
        console.log('   - Verifica las credenciales AWS');
      }
      console.log('   - Servidor en modo DEGRADED');
      console.log('   - Usa /health para más detalles');
    } else {
      console.log('\n✅ TODOS LOS SERVICIOS OPERATIVOS');
    }

    console.log('='.repeat(60) + '\n');
  });
}

startServer();
