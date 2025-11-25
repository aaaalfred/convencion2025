import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function verUsuarios() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT || 3306
  });

  try {
    console.log('\n📋 USUARIOS REGISTRADOS:\n');
    console.log('='.repeat(100));

    const [usuarios] = await pool.query(`
      SELECT
        u.id,
        u.nombre,
        u.email,
        u.numero_empleado,
        u.es_acompanante,
        u.total_puntos,
        u.fecha_registro,
        u.rekognition_face_id
      FROM usuarios u
      WHERE u.activo = 1
      ORDER BY u.fecha_registro DESC
    `);

    if (usuarios.length === 0) {
      console.log('No hay usuarios registrados.');
    } else {
      usuarios.forEach((u, i) => {
        console.log(`\n[${i + 1}] ID: ${u.id}`);
        console.log(`    Nombre: ${u.nombre}`);
        console.log(`    Email: ${u.email || 'N/A'}`);
        console.log(`    Número empleado: ${u.numero_empleado || 'N/A'}`);
        console.log(`    Es acompañante: ${u.es_acompanante ? 'Sí' : 'No'}`);
        console.log(`    Puntos: ${u.total_puntos}`);
        console.log(`    Fecha registro: ${u.fecha_registro}`);
        console.log(`    Face ID: ${u.rekognition_face_id ? u.rekognition_face_id.substring(0, 20) + '...' : 'N/A'}`);
      });
      console.log('\n' + '='.repeat(100));
      console.log(`Total: ${usuarios.length} usuarios`);
    }

    // Verificar acompañantes
    const [acompanantes] = await pool.query(`
      SELECT a.*, up.nombre as nombre_principal, ua.nombre as nombre_acompanante
      FROM acompanantes a
      INNER JOIN usuarios up ON a.usuario_principal_id = up.id
      INNER JOIN usuarios ua ON a.usuario_acompanante_id = ua.id
    `);

    if (acompanantes.length > 0) {
      console.log('\n👥 RELACIONES ACOMPAÑANTES:\n');
      acompanantes.forEach(a => {
        console.log(`  ${a.nombre_principal} → ${a.nombre_acompanante}`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

verUsuarios();
