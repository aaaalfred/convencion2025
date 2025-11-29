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
  'http://localhost:3002',  // Servidor backend (para testing local de producción)
  'http://localhost:3000',  // Puerto alternativo
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
  timezone: '-06:00' // Zona horaria de México (UTC-6)
});

// Helper para ejecutar queries con timezone de México configurado
async function queryWithTimezone(sql, params = []) {
  const connection = await pool.getConnection();
  try {
    // Configurar timezone de México para esta conexión
    await connection.query("SET time_zone = '-06:00'");
    // Ejecutar query
    const result = await connection.query(sql, params);
    return result;
  } finally {
    connection.release();
  }
}

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
    // Configurar timezone
    await connection.query("SET time_zone = '-06:00'");
    console.log('✅ Conexión a MySQL exitosa');

    // Verificar base de datos y timezone
    const [rows] = await connection.query('SELECT DATABASE() as db, VERSION() as version, @@session.time_zone as timezone');
    console.log(`📊 Base de datos actual: ${rows[0].db}`);
    console.log(`🔢 Versión MySQL: ${rows[0].version}`);
    console.log(`🕐 Timezone configurado: ${rows[0].timezone}`);

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
console.log('='.repeat(60));
console.log('📁 CONFIGURANDO ARCHIVOS ESTÁTICOS DEL FRONTEND');
console.log('='.repeat(60));

const staticPath = path.join(__dirname, 'dist');
console.log(`📂 Buscando directorio: ${staticPath}`);

try {
  if (existsSync(staticPath)) {
    app.use(express.static(staticPath));
    console.log('✅ Directorio /dist encontrado');
    console.log('📁 Sirviendo archivos estáticos desde /dist');

    // Verificar index.html
    const indexPath = path.join(staticPath, 'index.html');
    if (existsSync(indexPath)) {
      console.log('✅ index.html encontrado');
    } else {
      console.warn('⚠️  index.html NO encontrado en /dist');
    }
  } else {
    console.warn('⚠️  Directorio /dist NO existe');
    console.warn('   El servidor mostrará solo la API en la ruta raíz');
  }
} catch (err) {
  console.error('❌ Error al configurar archivos estáticos:');
  console.error(`   ${err.message}`);
}
console.log('='.repeat(60) + '\n');

// Ruta raíz
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (existsSync(indexPath)) {
    console.log('🌐 Sirviendo index.html para ruta /');
    res.sendFile(indexPath);
  } else {
    console.log('📋 Sirviendo info de API para ruta / (index.html no encontrado)');
    res.json({
      service: 'herdez-concursos-facial',
      status: 'running',
      message: 'API Backend - Usa /health para ver el estado',
      note: 'Frontend no encontrado en /dist - verifica el build',
      __dirname: __dirname,
      lookingFor: indexPath,
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
  const { nombre, email, telefono, foto, numeroEmpleado } = req.body;

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

  // Validar número de empleado
  if (!numeroEmpleado || !numeroEmpleado.trim()) {
    return res.status(400).json({
      success: false,
      error: 'El número de empleado es requerido'
    });
  }

  // Buscar datos del empleado
  const [empleados] = await pool.query(
    'SELECT numero_empleado, sucursal, puesto FROM numeros_empleado WHERE numero_empleado = ? AND activo = 1',
    [numeroEmpleado.trim()]
  );

  if (empleados.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Número de empleado no válido'
    });
  }

  const empleado = empleados[0];

  // Verificar si el número de empleado ya está registrado
  const [usuarioExistente] = await pool.query(
    'SELECT id FROM usuarios WHERE numero_empleado = ?',
    [numeroEmpleado.trim()]
  );

  if (usuarioExistente.length > 0) {
    return res.status(409).json({
      success: false,
      error: 'Este número de empleado ya está registrado'
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
      `INSERT INTO usuarios (nombre, email, telefono, numero_empleado, foto_registro_url, rekognition_face_id, fecha_registro)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nombre, email || null, telefono || null, numeroEmpleado.trim(), s3Url, faceId, fechaRegistro]
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
        numeroEmpleado: empleado.numero_empleado,
        sucursal: empleado.sucursal,
        puesto: empleado.puesto,
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
      'SELECT id, nombre, puntos_otorgados, participacion_unica FROM concursos WHERE codigo_unico = ? AND activo = 1',
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

    // 4. Verificar participación según el tipo de concurso
    if (concurso.participacion_unica === 1) {
      // MODO PARTICIPACIÓN ÚNICA: Verificar si ALGUIEN ya ganó este concurso
      const [participaciones] = await pool.query(
        `SELECT p.fecha_participacion, p.puntos_ganados, u.nombre as ganador, u.id as ganador_id
         FROM participaciones p
         INNER JOIN usuarios u ON p.usuario_id = u.id
         WHERE p.concurso_id = ?
         LIMIT 1`,
        [concurso.id]
      );

      if (participaciones.length > 0) {
        const participacion = participaciones[0];
        const esElMismoUsuario = participacion.ganador_id === usuario.id;

        return res.status(200).json({
          success: true,
          tipo: esElMismoUsuario ? 'ya-ganaste' : 'concurso-agotado',
          mensaje: esElMismoUsuario
            ? `Ya ganaste este concurso con ${participacion.puntos_ganados} puntos`
            : `Este concurso ya fue ganado por ${participacion.ganador}`,
          data: {
            ganador: participacion.ganador,
            fecha: participacion.fecha_participacion,
            puntosGanados: participacion.puntos_ganados,
            esElGanador: esElMismoUsuario
          }
        });
      }
    } else if (codigo !== 'MASTER300') {
      // MODO PARTICIPACIÓN MÚLTIPLE: Verificar si ESTE USUARIO ya participó
      // Excepción: MASTER300 permite participaciones ILIMITADAS del mismo usuario
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
    }

    // 5. Registrar nueva participación con fecha de México
    const fechaMexico = new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' });
    const fechaParticipacion = new Date(fechaMexico);

    // MASTER300: Usa ON DUPLICATE KEY UPDATE para sumar puntos acumulados
    if (codigo === 'MASTER300') {
      await pool.query(
        `INSERT INTO participaciones (usuario_id, concurso_id, puntos_ganados, confidence_score, fecha_participacion)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           puntos_ganados = puntos_ganados + VALUES(puntos_ganados),
           confidence_score = VALUES(confidence_score),
           fecha_participacion = VALUES(fecha_participacion)`,
        [usuario.id, concurso.id, concurso.puntos_otorgados, similarity, fechaParticipacion]
      );
    } else {
      await pool.query(
        `INSERT INTO participaciones (usuario_id, concurso_id, puntos_ganados, confidence_score, fecha_participacion)
         VALUES (?, ?, ?, ?, ?)`,
        [usuario.id, concurso.id, concurso.puntos_otorgados, similarity, fechaParticipacion]
      );
    }

    // 6. Actualizar puntos totales del usuario
    const nuevoTotal = parseInt(usuario.total_puntos) + parseInt(concurso.puntos_otorgados);
    await pool.query(
      'UPDATE usuarios SET total_puntos = ? WHERE id = ?',
      [nuevoTotal, usuario.id]
    );

    // Si el usuario es acompañante, también actualizar puntos del usuario principal
    const [esAcompanante] = await pool.query(
      `SELECT a.usuario_principal_id, u.nombre as nombre_principal, u.total_puntos as puntos_principal
       FROM acompanantes a
       INNER JOIN usuarios u ON a.usuario_principal_id = u.id
       WHERE a.usuario_acompanante_id = ?`,
      [usuario.id]
    );

    if (esAcompanante.length > 0) {
      const principal = esAcompanante[0];
      const nuevoTotalPrincipal = principal.puntos_principal + concurso.puntos_otorgados;
      await pool.query(
        'UPDATE usuarios SET total_puntos = ? WHERE id = ?',
        [nuevoTotalPrincipal, principal.usuario_principal_id]
      );
      console.log(`✅ Puntos del acompañante sumados al principal: ${principal.nombre_principal}`);
    }

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
      'SELECT id, nombre, email, telefono, total_puntos, fecha_registro, foto_registro_url FROM usuarios WHERE id = ? AND activo = 1',
      [usuarioId]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado o sesión inválida'
      });
    }

    const usuario = usuarios[0];

    // 2. Verificar si el usuario tiene acompañante
    const [acompanante] = await pool.query(
      `SELECT u.id, u.nombre
       FROM acompanantes a
       INNER JOIN usuarios u ON a.usuario_acompanante_id = u.id
       WHERE a.usuario_principal_id = ? AND u.activo = 1`,
      [usuario.id]
    );

    // 3. Obtener historial de participaciones (del usuario principal y del acompañante si existe)
    let usuariosIds = [usuario.id];
    if (acompanante.length > 0) {
      usuariosIds.push(acompanante[0].id);
    }

    // Query para concursos
    const [historialConcursos] = await pool.query(
      `SELECT
        p.id,
        p.usuario_id,
        u.nombre as nombre_participante,
        c.nombre as concurso,
        c.codigo_unico as codigo,
        p.puntos_ganados as puntos,
        p.fecha_participacion as fecha,
        'concurso' as tipo
       FROM participaciones p
       INNER JOIN concursos c ON p.concurso_id = c.id
       INNER JOIN usuarios u ON p.usuario_id = u.id
       WHERE p.usuario_id IN (?)`,
      [usuariosIds]
    );

    // Query para trivias
    const [historialTrivias] = await pool.query(
      `SELECT
        r.id,
        r.usuario_id,
        u.nombre as nombre_participante,
        t.nombre as concurso,
        CONCAT('TRIVIA-', t.id) as codigo,
        r.puntos_ganados as puntos,
        r.fecha_respuesta as fecha,
        'trivia' as tipo
       FROM respuestas_usuarios r
       INNER JOIN trivias t ON r.trivia_id = t.id
       INNER JOIN usuarios u ON r.usuario_id = u.id
       WHERE r.usuario_id IN (?)`,
      [usuariosIds]
    );

    // Combinar y ordenar por fecha
    const historial = [...historialConcursos, ...historialTrivias].sort((a, b) =>
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
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
          fotoUrl: awsRekognition?.getPresignedUrl ? awsRekognition.getPresignedUrl(usuario.foto_registro_url) : usuario.foto_registro_url,
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
          }),
          ganador: h.nombre_participante,
          esAcompanante: h.usuario_id !== usuario.id,
          tipo: h.tipo
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

    // 3. Verificar si el usuario tiene acompañante
    const [acompanante] = await pool.query(
      `SELECT u.id, u.nombre
       FROM acompanantes a
       INNER JOIN usuarios u ON a.usuario_acompanante_id = u.id
       WHERE a.usuario_principal_id = ? AND u.activo = 1`,
      [usuario.id]
    );

    // 4. Obtener historial de participaciones (del usuario principal y del acompañante si existe)
    let usuariosIds = [usuario.id];
    if (acompanante.length > 0) {
      usuariosIds.push(acompanante[0].id);
    }

    // Query para concursos
    const [historialConcursos] = await pool.query(
      `SELECT
        p.id,
        p.usuario_id,
        u.nombre as nombre_participante,
        c.nombre as concurso,
        c.codigo_unico as codigo,
        p.puntos_ganados as puntos,
        p.fecha_participacion as fecha,
        'concurso' as tipo
       FROM participaciones p
       INNER JOIN concursos c ON p.concurso_id = c.id
       INNER JOIN usuarios u ON p.usuario_id = u.id
       WHERE p.usuario_id IN (?)`,
      [usuariosIds]
    );

    // Query para trivias
    const [historialTrivias] = await pool.query(
      `SELECT
        r.id,
        r.usuario_id,
        u.nombre as nombre_participante,
        t.nombre as concurso,
        CONCAT('TRIVIA-', t.id) as codigo,
        r.puntos_ganados as puntos,
        r.fecha_respuesta as fecha,
        'trivia' as tipo
       FROM respuestas_usuarios r
       INNER JOIN trivias t ON r.trivia_id = t.id
       INNER JOIN usuarios u ON r.usuario_id = u.id
       WHERE r.usuario_id IN (?)`,
      [usuariosIds]
    );

    // Combinar y ordenar por fecha
    const historial = [...historialConcursos, ...historialTrivias].sort((a, b) =>
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );

    // Placeholder para mantener compatibilidad

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
          fotoUrl: awsRekognition?.getPresignedUrl ? awsRekognition.getPresignedUrl(usuario.foto_registro_url) : usuario.foto_registro_url,
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
          }),
          ganador: h.nombre_participante,
          esAcompanante: h.usuario_id !== usuario.id,
          tipo: h.tipo
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
// 4.1 LISTAR TODOS LOS CONCURSOS
// GET /api/concursos
// ============================================
app.get('/api/concursos', asyncHandler(async (req, res) => {
  const [concursos] = await pool.query(
    `SELECT
      c.id,
      c.nombre,
      c.codigo_unico as codigo,
      c.descripcion,
      c.puntos_otorgados,
      c.participacion_unica,
      c.activo,
      c.fecha_creacion,
      COUNT(p.id) as total_participaciones,
      SUM(p.puntos_ganados) as puntos_totales_otorgados
     FROM concursos c
     LEFT JOIN participaciones p ON c.id = p.concurso_id
     GROUP BY c.id
     ORDER BY c.fecha_creacion DESC`
  );

  res.json({
    success: true,
    data: concursos
  });
}));

// ============================================
// 4.2 PARTICIPANTES DE UN CONCURSO
// GET /api/concursos/:id/participantes
// ============================================
app.get('/api/concursos/:id/participantes', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [concursos] = await pool.query(
    'SELECT id, nombre, codigo_unico, puntos_otorgados, participacion_unica FROM concursos WHERE id = ?',
    [id]
  );

  if (concursos.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Concurso no encontrado'
    });
  }

  const concurso = concursos[0];

  const [participantes] = await pool.query(
    `SELECT
      p.id, p.usuario_id, u.nombre, u.email, p.puntos_ganados, p.fecha_participacion
     FROM participaciones p
     INNER JOIN usuarios u ON p.usuario_id = u.id
     WHERE p.concurso_id = ?
     ORDER BY p.fecha_participacion ASC`,
    [id]
  );

  res.json({
    success: true,
    data: {
      concurso: {
        id: concurso.id,
        nombre: concurso.nombre,
        codigo: concurso.codigo_unico,
        puntosOtorgados: concurso.puntos_otorgados,
        participacionUnica: concurso.participacion_unica === 1
      },
      participantes: participantes.map((p, index) => ({
        posicion: index + 1,
        id: p.id,
        usuarioId: p.usuario_id,
        nombre: p.nombre,
        puntos: parseInt(p.puntos_ganados),
        fecha: new Date(p.fecha_participacion).toLocaleDateString('es-MX', {
          year: 'numeric', month: 'short', day: 'numeric'
        }),
        hora: new Date(p.fecha_participacion).toLocaleTimeString('es-MX', {
          hour: '2-digit', minute: '2-digit', hour12: true
        })
      })),
      totalParticipantes: participantes.length
    }
  });
}));

// ============================================
// 4.3 LISTAR TODAS LAS TRIVIAS
// GET /api/trivias
// ============================================
app.get('/api/trivias', asyncHandler(async (req, res) => {
  const [trivias] = await pool.query(
    `SELECT
      t.id, t.nombre, t.descripcion, t.fecha_inicio, t.fecha_fin,
      t.puntos_maximos, t.puntos_minimos, t.activo, t.fecha_creacion,
      COUNT(r.id) as total_participaciones,
      SUM(CASE WHEN r.es_correcta = 1 THEN r.puntos_ganados ELSE 0 END) as puntos_totales_otorgados
     FROM trivias t
     LEFT JOIN respuestas_usuarios r ON t.id = r.trivia_id
     GROUP BY t.id
     ORDER BY t.fecha_inicio DESC`
  );

  res.json({
    success: true,
    data: trivias.map(t => ({
      ...t,
      estado: new Date() < new Date(t.fecha_inicio) ? 'proxima' :
              new Date() > new Date(t.fecha_fin) ? 'finalizada' : 'activa'
    }))
  });
}));

// ============================================
// 4.4 PARTICIPANTES DE UNA TRIVIA
// GET /api/trivias/:id/participantes
// ============================================
app.get('/api/trivias/:id/participantes', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [trivias] = await pool.query(
    'SELECT id, nombre, descripcion, fecha_inicio, fecha_fin, puntos_maximos, puntos_minimos FROM trivias WHERE id = ?',
    [id]
  );

  if (trivias.length === 0) {
    return res.status(404).json({ success: false, error: 'Trivia no encontrada' });
  }

  const trivia = trivias[0];

  const [participantes] = await pool.query(
    `SELECT r.id, r.usuario_id, u.nombre, r.puntos_ganados, r.fecha_respuesta, r.es_correcta
     FROM respuestas_usuarios r
     INNER JOIN usuarios u ON r.usuario_id = u.id
     WHERE r.trivia_id = ?
     ORDER BY r.puntos_ganados DESC, r.fecha_respuesta ASC`,
    [id]
  );

  res.json({
    success: true,
    data: {
      trivia: {
        id: trivia.id,
        nombre: trivia.nombre,
        descripcion: trivia.descripcion,
        fechaInicio: trivia.fecha_inicio,
        fechaFin: trivia.fecha_fin,
        puntosMaximos: trivia.puntos_maximos,
        puntosMinimos: trivia.puntos_minimos
      },
      participantes: participantes.map((p, index) => ({
        posicion: index + 1,
        id: p.id,
        usuarioId: p.usuario_id,
        nombre: p.nombre,
        puntos: parseInt(p.puntos_ganados),
        esCorrecta: p.es_correcta === 1,
        fecha: new Date(p.fecha_respuesta).toLocaleDateString('es-MX', {
          year: 'numeric', month: 'short', day: 'numeric'
        }),
        hora: new Date(p.fecha_respuesta).toLocaleTimeString('es-MX', {
          hour: '2-digit', minute: '2-digit', hour12: true
        })
      })),
      totalParticipantes: participantes.length,
      respuestasCorrectas: participantes.filter(p => p.es_correcta === 1).length
    }
  });
}));

// ============================================
// 4.5 LISTAR USUARIOS PARA AUDITORÍA
// GET /api/auditoria/usuarios
// ============================================
app.get('/api/auditoria/usuarios', asyncHandler(async (req, res) => {
  const [usuarios] = await pool.query(
    `SELECT
      u.id,
      u.nombre,
      u.email,
      u.numero_empleado,
      u.total_puntos,
      u.fecha_registro,
      u.es_acompanante,
      (SELECT COUNT(*) FROM participaciones WHERE usuario_id = u.id) as total_concursos,
      (SELECT COUNT(*) FROM respuestas_usuarios WHERE usuario_id = u.id) as total_trivias
     FROM usuarios u
     WHERE u.activo = 1
     ORDER BY u.total_puntos DESC`
  );

  res.json({
    success: true,
    data: usuarios.map(u => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      numeroEmpleado: u.numero_empleado,
      totalPuntos: parseInt(u.total_puntos) || 0,
      fechaRegistro: u.fecha_registro,
      esAcompanante: u.es_acompanante === 1,
      totalConcursos: parseInt(u.total_concursos) || 0,
      totalTrivias: parseInt(u.total_trivias) || 0
    })),
    totalUsuarios: usuarios.length
  });
}));

// ============================================
// 4.6 HISTORIAL DE UN USUARIO PARA AUDITORÍA
// GET /api/auditoria/usuarios/:id/historial
// ============================================
app.get('/api/auditoria/usuarios/:id/historial', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Obtener info del usuario
  const [usuarios] = await pool.query(
    'SELECT id, nombre, email, numero_empleado, total_puntos, fecha_registro, es_acompanante FROM usuarios WHERE id = ? AND activo = 1',
    [id]
  );

  if (usuarios.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Usuario no encontrado'
    });
  }

  const usuario = usuarios[0];

  // Obtener participaciones en concursos
  const [concursos] = await pool.query(
    `SELECT
      p.id,
      c.nombre as evento,
      c.codigo_unico as codigo,
      p.puntos_ganados as puntos,
      p.fecha_participacion as fecha,
      'concurso' as tipo
     FROM participaciones p
     INNER JOIN concursos c ON p.concurso_id = c.id
     WHERE p.usuario_id = ?`,
    [id]
  );

  // Obtener participaciones en trivias
  const [trivias] = await pool.query(
    `SELECT
      r.id,
      t.nombre as evento,
      CONCAT('TRIVIA-', t.id) as codigo,
      r.puntos_ganados as puntos,
      r.fecha_respuesta as fecha,
      'trivia' as tipo,
      r.es_correcta
     FROM respuestas_usuarios r
     INNER JOIN trivias t ON r.trivia_id = t.id
     WHERE r.usuario_id = ?`,
    [id]
  );

  // Combinar y ordenar
  const historial = [...concursos, ...trivias]
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .map((h, index) => ({
      id: h.id,
      evento: h.evento,
      codigo: h.codigo,
      puntos: parseInt(h.puntos) || 0,
      tipo: h.tipo,
      esCorrecta: h.es_correcta === 1,
      fecha: new Date(h.fecha).toLocaleDateString('es-MX', {
        year: 'numeric', month: 'short', day: 'numeric'
      }),
      hora: new Date(h.fecha).toLocaleTimeString('es-MX', {
        hour: '2-digit', minute: '2-digit', hour12: true
      })
    }));

  const puntosConcursos = concursos.reduce((sum, c) => sum + (parseInt(c.puntos) || 0), 0);
  const puntosTrivias = trivias.reduce((sum, t) => sum + (parseInt(t.puntos) || 0), 0);

  res.json({
    success: true,
    data: {
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        numeroEmpleado: usuario.numero_empleado,
        totalPuntos: parseInt(usuario.total_puntos) || 0,
        fechaRegistro: usuario.fecha_registro,
        esAcompanante: usuario.es_acompanante === 1
      },
      resumen: {
        totalPuntos: parseInt(usuario.total_puntos) || 0,
        puntosConcursos,
        puntosTrivias,
        totalConcursos: concursos.length,
        totalTrivias: trivias.length
      },
      historial
    }
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
// 6. OBTENER CONFIGURACIÓN DEL COUNTDOWN
// GET /api/countdown/config
// ============================================
app.get('/api/countdown/config', asyncHandler(async (req, res) => {
  // Obtener la configuración activa del countdown
  const [configs] = await pool.query(
    `SELECT id, nombre, fecha_objetivo, descripcion
     FROM countdown_config
     WHERE activo = 1
     ORDER BY fecha_objetivo ASC
     LIMIT 1`
  );

  if (configs.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'No hay countdown configurado'
    });
  }

  res.status(200).json({
    success: true,
    data: {
      id: configs[0].id,
      nombre: configs[0].nombre,
      fechaObjetivo: configs[0].fecha_objetivo,
      descripcion: configs[0].descripcion
    }
  });
}));

// ============================================
// 7. OBTENER PRÓXIMA TRIVIA (para countdown)
// GET /api/trivias/proxima
// ============================================
app.get('/api/trivias/proxima', asyncHandler(async (req, res) => {
  try {
    // Buscar primera trivia activa o próxima (ordenadas por fecha_inicio)
    const [trivias] = await queryWithTimezone(
      `SELECT id, nombre, descripcion, fecha_inicio, fecha_fin,
              puntos_maximos, puntos_minimos
       FROM trivias
       WHERE activo = 1
       AND fecha_fin > NOW()
       ORDER BY fecha_inicio ASC
       LIMIT 1`
    );

    if (trivias.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No hay trivias configuradas',
        data: null
      });
    }

    const trivia = trivias[0];

    res.json({
      success: true,
      data: {
        id: trivia.id,
        nombre: trivia.nombre,
        descripcion: trivia.descripcion,
        fechaInicio: trivia.fecha_inicio,
        fechaFin: trivia.fecha_fin,
        puntosMaximos: trivia.puntos_maximos,
        puntosMinimos: trivia.puntos_minimos
      }
    });

  } catch (error) {
    console.error('Error al obtener próxima trivia:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener próxima trivia'
    });
  }
}));

// ============================================
// 8. OBTENER TRIVIA ACTIVA
// GET /api/trivias/activa
// ============================================
app.get('/api/trivias/activa', asyncHandler(async (req, res) => {
  const usuarioId = req.query.usuarioId;

  try {
    // LOG: Verificar hora del servidor CON TIMEZONE
    const [horaServidor] = await queryWithTimezone('SELECT NOW() as hora, @@session.time_zone as tz');
    console.log('🕒 Hora del servidor MySQL:', horaServidor[0].hora);
    console.log('🌍 Timezone:', horaServidor[0].tz);

    // Obtener trivia activa con puntaje calculado en MySQL
    const [trivias] = await queryWithTimezone(
      `SELECT
        id,
        nombre,
        descripcion,
        fecha_inicio,
        fecha_fin,
        puntos_maximos,
        puntos_minimos,
        ROUND(
          puntos_maximos -
          ((puntos_maximos - puntos_minimos) *
          (TIMESTAMPDIFF(SECOND, fecha_inicio, NOW()) /
           TIMESTAMPDIFF(SECOND, fecha_inicio, fecha_fin)))
        ) as puntaje_actual
       FROM trivias
       WHERE activo = 1
       AND NOW() BETWEEN fecha_inicio AND fecha_fin
       ORDER BY fecha_inicio DESC
       LIMIT 1`
    );

    console.log('📊 Trivias encontradas:', trivias.length);
    if (trivias.length > 0) {
      console.log('✅ Trivia activa:', trivias[0].nombre);
      console.log('📈 Puntaje actual:', trivias[0].puntaje_actual);
    }

    if (trivias.length === 0) {
      // LOG: Mostrar todas las trivias para debug
      const [todasTrivias] = await queryWithTimezone(
        `SELECT id, nombre, fecha_inicio, fecha_fin, activo,
                NOW() as ahora,
                CASE
                  WHEN NOW() < fecha_inicio THEN 'NO INICIADA'
                  WHEN NOW() > fecha_fin THEN 'FINALIZADA'
                  ELSE 'ACTIVA'
                END as estado
         FROM trivias
         WHERE activo = 1`
      );
      console.log('🔍 Debug - Todas las trivias activas:', todasTrivias);

      return res.json({
        success: false,
        error: 'No hay trivias activas en este momento',
        data: null
      });
    }

    const trivia = trivias[0];
    const puntajeActual = trivia.puntaje_actual;

    // Verificar si el usuario ya participó en esta trivia
    let yaParticipo = false;
    if (usuarioId) {
      const [participaciones] = await pool.query(
        'SELECT id FROM respuestas_usuarios WHERE usuario_id = ? AND trivia_id = ?',
        [usuarioId, trivia.id]
      );
      yaParticipo = participaciones.length > 0;
    }

    res.json({
      success: true,
      data: {
        triviaId: trivia.id,
        nombre: trivia.nombre,
        descripcion: trivia.descripcion,
        fechaInicio: trivia.fecha_inicio,
        fechaFin: trivia.fecha_fin,
        puntosMaximos: trivia.puntos_maximos,
        puntosMinimos: trivia.puntos_minimos,
        puntajeActual,
        yaParticipo
      }
    });

  } catch (error) {
    console.error('Error al obtener trivia activa:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener trivia activa'
    });
  }
}));

// ============================================
// 8. OBTENER PREGUNTA ALEATORIA
// GET /api/preguntas/random
// ============================================
app.get('/api/preguntas/random', asyncHandler(async (req, res) => {
  const usuarioId = req.query.usuarioId;
  const triviaId = req.query.triviaId;

  // Validar que triviaId esté presente
  if (!triviaId) {
    return res.status(400).json({
      success: false,
      error: 'El parámetro triviaId es requerido'
    });
  }

  // Obtener una pregunta aleatoria de la trivia específica
  const query = `
    SELECT id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, puntos, trivia_id
    FROM preguntas
    WHERE activo = 1
    AND trivia_id = ?
    ORDER BY RAND()
    LIMIT 1
  `;

  const [preguntas] = await pool.query(query, [triviaId]);

  if (preguntas.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'No hay preguntas disponibles para esta trivia'
    });
  }

  res.status(200).json({
    success: true,
    data: preguntas[0]
  });
}));

// ============================================
// 8. RESPONDER PREGUNTA CON TRIVIA
// POST /api/preguntas/responder
// ============================================
app.post('/api/preguntas/responder', asyncHandler(async (req, res) => {
  const { usuarioId, preguntaId, respuesta, triviaId } = req.body;

  // Validaciones
  if (!usuarioId || !preguntaId || !respuesta || !triviaId) {
    return res.status(400).json({
      success: false,
      error: 'Faltan parámetros requeridos (usuarioId, preguntaId, respuesta, triviaId)'
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

    // 2. Verificar que la trivia existe y está activa
    const [trivias] = await pool.query(
      `SELECT id, nombre, fecha_inicio, fecha_fin, puntos_maximos, puntos_minimos
       FROM trivias
       WHERE id = ? AND activo = 1`,
      [triviaId]
    );

    if (trivias.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Trivia no encontrada o inactiva'
      });
    }

    const trivia = trivias[0];

    // 3. Verificar si el usuario ya participó en esta trivia
    const [participacionesExistentes] = await pool.query(
      'SELECT id FROM respuestas_usuarios WHERE usuario_id = ? AND trivia_id = ?',
      [usuarioId, triviaId]
    );

    if (participacionesExistentes.length > 0) {
      return res.status(409).json({
        success: false,
        error: `Ya participaste en la trivia "${trivia.nombre}". Solo puedes participar una vez por trivia.`,
        tipo: 'ya_participo'
      });
    }

    // 4. Verificar que la pregunta existe y pertenece a esta trivia
    const [preguntas] = await pool.query(
      `SELECT id, pregunta, respuesta_correcta, puntos, trivia_id
       FROM preguntas
       WHERE id = ? AND trivia_id = ? AND activo = 1`,
      [preguntaId, triviaId]
    );

    if (preguntas.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Pregunta no encontrada o no pertenece a esta trivia'
      });
    }

    const pregunta = preguntas[0];

    // 5. Calcular puntaje dinámico basado en tiempo (en MySQL)
    const [puntajeCalc] = await queryWithTimezone(
      `SELECT
        CASE
          WHEN NOW() < ? THEN NULL
          WHEN NOW() > ? THEN NULL
          ELSE ROUND(
            ? - ((? - ?) *
            (TIMESTAMPDIFF(SECOND, ?, NOW()) /
             TIMESTAMPDIFF(SECOND, ?, ?)))
          )
        END as puntaje_dinamico,
        CASE
          WHEN NOW() < ? THEN 'NO_INICIADA'
          WHEN NOW() > ? THEN 'FINALIZADA'
          ELSE 'ACTIVA'
        END as estado_trivia`,
      [
        trivia.fecha_inicio, // para validar no iniciada
        trivia.fecha_fin,    // para validar finalizada
        trivia.puntos_maximos, trivia.puntos_maximos, trivia.puntos_minimos, // cálculo puntaje
        trivia.fecha_inicio, trivia.fecha_inicio, trivia.fecha_fin, // cálculo porcentaje
        trivia.fecha_inicio, // para estado no iniciada
        trivia.fecha_fin     // para estado finalizada
      ]
    );

    // Verificar que estamos dentro de la ventana de tiempo
    if (puntajeCalc[0].estado_trivia === 'NO_INICIADA') {
      return res.status(400).json({
        success: false,
        error: 'La trivia aún no ha comenzado',
        tipo: 'no_iniciada'
      });
    }

    if (puntajeCalc[0].estado_trivia === 'FINALIZADA') {
      return res.status(400).json({
        success: false,
        error: 'La trivia ya finalizó',
        tipo: 'finalizada'
      });
    }

    const puntajeDinamico = parseInt(puntajeCalc[0].puntaje_dinamico) || 0;

    // 6. Verificar si la respuesta es correcta
    const esCorrecta = respuesta.toUpperCase() === pregunta.respuesta_correcta;
    // Si es correcta: puntaje dinámico. Si es incorrecta: puntos mínimos por participar
    const puntosGanados = esCorrecta ? puntajeDinamico : trivia.puntos_minimos;

    // 7. Registrar la respuesta con trivia_id
    await pool.query(
      `INSERT INTO respuestas_usuarios
       (usuario_id, pregunta_id, trivia_id, respuesta_seleccionada, es_correcta, puntos_ganados)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [usuarioId, preguntaId, triviaId, respuesta.toUpperCase(), esCorrecta ? 1 : 0, puntosGanados]
    );

    // 8. Actualizar puntos del usuario (siempre gana puntos por participar)
    let nuevoTotal = parseInt(usuario.total_puntos) + puntosGanados;
    await pool.query(
      'UPDATE usuarios SET total_puntos = ? WHERE id = ?',
      [nuevoTotal, usuarioId]
    );

    // Si el usuario es acompañante, también actualizar puntos del usuario principal
    const [esAcompanante] = await pool.query(
      `SELECT a.usuario_principal_id, u.total_puntos as puntos_principal
       FROM acompanantes a
       INNER JOIN usuarios u ON a.usuario_principal_id = u.id
       WHERE a.usuario_acompanante_id = ?`,
      [usuarioId]
    );

    if (esAcompanante.length > 0) {
      const principal = esAcompanante[0];
      const nuevoTotalPrincipal = principal.puntos_principal + puntosGanados;
      await pool.query(
        'UPDATE usuarios SET total_puntos = ? WHERE id = ?',
        [nuevoTotalPrincipal, principal.usuario_principal_id]
      );
    }

    // 9. Responder
    res.status(200).json({
      success: true,
      data: {
        esCorrecta,
        respuestaCorrecta: pregunta.respuesta_correcta,
        puntosGanados,
        puntajeDinamico,
        totalPuntos: nuevoTotal,
        trivia: {
          id: trivia.id,
          nombre: trivia.nombre
        },
        mensaje: esCorrecta
          ? `¡Correcto! Ganaste ${puntosGanados} puntos en "${trivia.nombre}"`
          : `Incorrecto. La respuesta era ${pregunta.respuesta_correcta}. Ganaste ${puntosGanados} puntos por participar.`
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
// 9. VALIDAR NÚMERO DE EMPLEADO
// GET /api/numeros-empleado/validar/:numero
// ============================================
app.get('/api/numeros-empleado/validar/:numero', asyncHandler(async (req, res) => {
  const { numero } = req.params;

  if (!numero || !numero.trim()) {
    return res.status(400).json({
      success: false,
      error: 'El número de empleado es requerido'
    });
  }

  try {
    // Buscar número de empleado en la tabla
    const [empleados] = await pool.query(
      'SELECT numero_empleado, sucursal, puesto, activo FROM numeros_empleado WHERE numero_empleado = ?',
      [numero.trim()]
    );

    if (empleados.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Número de empleado no válido',
        valido: false
      });
    }

    const empleado = empleados[0];

    // Verificar si está activo
    if (empleado.activo !== 1) {
      return res.status(403).json({
        success: false,
        error: 'Número de empleado inactivo',
        valido: false
      });
    }

    // Verificar si ya está registrado
    const [usuariosExistentes] = await pool.query(
      'SELECT id, nombre FROM usuarios WHERE numero_empleado = ?',
      [numero.trim()]
    );

    if (usuariosExistentes.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Este número de empleado ya está registrado',
        valido: false,
        yaRegistrado: true,
        usuario: {
          id: usuariosExistentes[0].id,
          nombre: usuariosExistentes[0].nombre
        }
      });
    }

    // Número válido y disponible
    res.status(200).json({
      success: true,
      valido: true,
      data: {
        numeroEmpleado: empleado.numero_empleado,
        sucursal: empleado.sucursal,
        puesto: empleado.puesto
      }
    });

  } catch (error) {
    console.error('Error validando número de empleado:', error);
    res.status(500).json({
      success: false,
      error: 'Error al validar número de empleado'
    });
  }
}));

// ============================================
// 10. REGISTRAR ACOMPAÑANTE
// POST /api/acompanantes/registro
// ============================================
app.post('/api/acompanantes/registro', asyncHandler(async (req, res) => {
  const { nombre, email, foto, usuarioPrincipalId } = req.body;

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

  if (!usuarioPrincipalId) {
    return res.status(400).json({
      success: false,
      error: 'El ID del usuario principal es requerido'
    });
  }

  if (!awsRekognition) {
    return res.status(503).json({
      success: false,
      error: 'Servicio de AWS Rekognition no configurado'
    });
  }
  try {

    // 3. Verificar que el usuario principal existe
    const [usuariosPrincipales] = await pool.query(
      'SELECT id, nombre FROM usuarios WHERE id = ? AND activo = 1',
      [usuarioPrincipalId]
    );

    if (usuariosPrincipales.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario principal no encontrado'
      });
    }

    // 4. Verificar que el usuario principal no tenga ya un acompañante
    const [acompanantesExistentes] = await pool.query(
      'SELECT id FROM acompanantes WHERE usuario_principal_id = ?',
      [usuarioPrincipalId]
    );

    if (acompanantesExistentes.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Ya tienes un acompañante registrado'
      });
    }

    // 5. Convertir foto base64 a buffer
    const imageBuffer = base64ToBuffer(foto);

    // 6. Indexar rostro en AWS Rekognition
    const { faceId, s3Url } = await awsRekognition.indexFace(imageBuffer, `acompanante-${Date.now()}.jpg`);

    // 7. Insertar usuario acompañante en la base de datos
    const fechaMexico = new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' });
    const fechaRegistro = new Date(fechaMexico);

    const [resultUsuario] = await pool.query(
      `INSERT INTO usuarios (nombre, email, foto_registro_url, rekognition_face_id, es_acompanante, fecha_registro)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [nombre, email || null, s3Url, faceId, fechaRegistro]
    );

    const acompananteId = resultUsuario.insertId;

    // 8. Crear relación en tabla acompanantes
    await pool.query(
      'INSERT INTO acompanantes (usuario_principal_id, usuario_acompanante_id) VALUES (?, ?)',
      [usuarioPrincipalId, acompananteId]
    );

    // Respuesta exitosa
    res.status(201).json({
      success: true,
      message: 'Acompañante registrado exitosamente',
      data: {
        acompananteId,
        nombre,
        email: email || null,
        faceId
      }
    });

  } catch (error) {
    console.error('Error registrando acompañante:', error);

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
      error: 'Error al registrar acompañante'
    });
  }
}));

// ============================================
// 11. OBTENER ACOMPAÑANTE DE UN USUARIO
// GET /api/usuarios/:id/acompanante
// ============================================
app.get('/api/usuarios/:id/acompanante', asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'El ID de usuario es requerido'
    });
  }

  try {
    // Buscar el acompañante del usuario
    const [acompanantes] = await pool.query(
      `SELECT
        u.id,
        u.nombre,
        u.email,
        u.numero_empleado,
        u.total_puntos,
        u.foto_registro_url,
        u.fecha_registro,
        ne.sucursal,
        ne.puesto,
        a.fecha_registro as fecha_vinculacion
       FROM acompanantes a
       INNER JOIN usuarios u ON a.usuario_acompanante_id = u.id
       LEFT JOIN numeros_empleado ne ON u.numero_empleado = ne.numero_empleado
       WHERE a.usuario_principal_id = ? AND u.activo = 1`,
      [id]
    );

    if (acompanantes.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No tienes acompañante registrado',
        tieneAcompanante: false
      });
    }

    const acompanante = acompanantes[0];

    res.status(200).json({
      success: true,
      tieneAcompanante: true,
      data: {
        id: acompanante.id,
        nombre: acompanante.nombre,
        email: acompanante.email,
        numeroEmpleado: acompanante.numero_empleado,
        sucursal: acompanante.sucursal,
        puesto: acompanante.puesto,
        totalPuntos: acompanante.total_puntos,
        fotoUrl: awsRekognition?.getPresignedUrl ? awsRekognition.getPresignedUrl(acompanante.foto_registro_url) : acompanante.foto_registro_url,
        fechaRegistro: acompanante.fecha_registro,
        fechaVinculacion: acompanante.fecha_vinculacion
      }
    });

  } catch (error) {
    console.error('Error obteniendo acompañante:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener acompañante'
    });
  }
}));

// ============================================
// MANEJO DE ERRORES
// ============================================

// ============================================
// SPA FALLBACK - Servir index.html para rutas no-API
// ============================================

// Catch-all para rutas no-API (404s de APIs)
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint de API no encontrado',
    path: req.path
  });
});

// Catch-all: servir index.html para cualquier otra ruta
// Esto permite que React Router maneje las rutas client-side
app.use((req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');

  if (existsSync(indexPath)) {
    console.log(`🌐 Sirviendo index.html para ruta: ${req.path}`);
    res.sendFile(indexPath);
  } else {
    // Si index.html no existe, informar
    res.status(503).json({
      success: false,
      error: 'Frontend no disponible',
      message: 'El archivo index.html no se encontró en /dist',
      path: indexPath,
      note: 'Verifica que el build se haya ejecutado correctamente'
    });
  }
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
