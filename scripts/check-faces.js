const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD
  });

  // Verificar faceId del usuario
  const [users] = await pool.query('SELECT id, nombre, rekognition_face_id FROM usuarios WHERE activo = 1');
  console.log('Usuarios y sus faceIds:');
  users.forEach(u => {
    console.log('  ID ' + u.id + ': ' + u.nombre + ' -> ' + (u.rekognition_face_id || 'NULL'));
  });

  // Verificar si el faceId encontrado existe
  const faceIdBuscado = 'd713a9d2-a1d0-4126-b6ce-f4bcc77ce3d1';
  const [match] = await pool.query('SELECT id, nombre FROM usuarios WHERE rekognition_face_id = ?', [faceIdBuscado]);
  console.log('\nFaceId buscado (' + faceIdBuscado + '):', match.length > 0 ? match[0] : 'NO ENCONTRADO');

  await pool.end();
}

check();
