import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import AWS from 'aws-sdk';

dotenv.config();

const USUARIOS_A_ELIMINAR = [1, 2, 3, 6, 7];

async function eliminarUsuarios() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT || 3306
  });

  // Configurar AWS Rekognition
  AWS.config.update({
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  });

  const rekognition = new AWS.Rekognition();
  const collectionId = process.env.AWS_REKOGNITION_COLLECTION_ID || 'herdez-concursos';

  try {
    console.log('\n🗑️  ELIMINANDO USUARIOS...\n');
    console.log('IDs a eliminar:', USUARIOS_A_ELIMINAR.join(', '));
    console.log('='.repeat(60));

    // 1. Obtener los Face IDs de los usuarios a eliminar
    const [usuarios] = await pool.query(
      'SELECT id, nombre, rekognition_face_id FROM usuarios WHERE id IN (?)',
      [USUARIOS_A_ELIMINAR]
    );

    console.log(`\nEncontrados ${usuarios.length} usuarios para eliminar:\n`);
    usuarios.forEach(u => {
      console.log(`  - ID ${u.id}: ${u.nombre}`);
    });

    // 2. Eliminar relaciones de acompañantes
    console.log('\n📎 Eliminando relaciones de acompañantes...');
    const [resultAcomp] = await pool.query(
      'DELETE FROM acompanantes WHERE usuario_principal_id IN (?) OR usuario_acompanante_id IN (?)',
      [USUARIOS_A_ELIMINAR, USUARIOS_A_ELIMINAR]
    );
    console.log(`   Eliminadas ${resultAcomp.affectedRows} relaciones`);

    // 3. Eliminar participaciones
    console.log('\n🎯 Eliminando participaciones...');
    const [resultPart] = await pool.query(
      'DELETE FROM participaciones WHERE usuario_id IN (?)',
      [USUARIOS_A_ELIMINAR]
    );
    console.log(`   Eliminadas ${resultPart.affectedRows} participaciones`);

    // 4. Eliminar rostros de AWS Rekognition
    console.log('\n👤 Eliminando rostros de AWS Rekognition...');
    const faceIds = usuarios
      .filter(u => u.rekognition_face_id)
      .map(u => u.rekognition_face_id);

    if (faceIds.length > 0) {
      try {
        const deleteResult = await rekognition.deleteFaces({
          CollectionId: collectionId,
          FaceIds: faceIds
        }).promise();
        console.log(`   Eliminados ${deleteResult.DeletedFaces?.length || 0} rostros de Rekognition`);
      } catch (awsError) {
        console.log(`   ⚠️  Error al eliminar de Rekognition: ${awsError.message}`);
      }
    } else {
      console.log('   No hay rostros para eliminar');
    }

    // 5. Eliminar usuarios de la base de datos
    console.log('\n👥 Eliminando usuarios de la base de datos...');
    const [resultUsers] = await pool.query(
      'DELETE FROM usuarios WHERE id IN (?)',
      [USUARIOS_A_ELIMINAR]
    );
    console.log(`   Eliminados ${resultUsers.affectedRows} usuarios`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ ELIMINACIÓN COMPLETADA');
    console.log('='.repeat(60));

    // Mostrar usuarios restantes
    const [restantes] = await pool.query(
      'SELECT id, nombre, email FROM usuarios WHERE activo = 1 ORDER BY id'
    );
    console.log('\n📋 Usuarios restantes:\n');
    restantes.forEach(u => {
      console.log(`   ID ${u.id}: ${u.nombre} (${u.email || 'sin email'})`);
    });

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

eliminarUsuarios();
