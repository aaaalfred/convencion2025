/**
 * Script para limpiar caras huérfanas en AWS Rekognition
 * Elimina faces que no tienen usuario correspondiente en la BD
 */
import mysql from 'mysql2/promise';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';
dotenv.config();

const rekognition = new AWS.Rekognition({
  region: process.env.APP_AWS_REGION,
  accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY
});

const COLLECTION_ID = process.env.REKOGNITION_COLLECTION_ID || 'herdez-usuarios-faces';

async function limpiarRekognition() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD
  });

  try {
    // 1. Obtener todos los faceIds válidos de la BD
    const [usuarios] = await pool.query('SELECT rekognition_face_id FROM usuarios WHERE rekognition_face_id IS NOT NULL');
    const faceIdsValidos = new Set(usuarios.map(u => u.rekognition_face_id));
    console.log('FaceIds válidos en BD:', faceIdsValidos.size);

    // 2. Obtener todas las caras en Rekognition
    let nextToken = null;
    let facesEnRekognition = [];

    do {
      const params = {
        CollectionId: COLLECTION_ID,
        MaxResults: 100,
        NextToken: nextToken
      };

      const result = await rekognition.listFaces(params).promise();
      facesEnRekognition = facesEnRekognition.concat(result.Faces);
      nextToken = result.NextToken;
    } while (nextToken);

    console.log('Caras en Rekognition:', facesEnRekognition.length);

    // 3. Identificar caras huérfanas
    const facesHuerfanas = facesEnRekognition.filter(face => !faceIdsValidos.has(face.FaceId));
    console.log('Caras huérfanas a eliminar:', facesHuerfanas.length);

    if (facesHuerfanas.length === 0) {
      console.log('✅ No hay caras huérfanas que limpiar');
      return;
    }

    // 4. Mostrar las caras que se eliminarán
    console.log('\nCaras a eliminar:');
    facesHuerfanas.forEach(face => {
      console.log('  - ' + face.FaceId);
    });

    // 5. Eliminar caras huérfanas
    const faceIdsAEliminar = facesHuerfanas.map(f => f.FaceId);

    // Rekognition permite eliminar máximo 4096 caras a la vez
    const batchSize = 100;
    for (let i = 0; i < faceIdsAEliminar.length; i += batchSize) {
      const batch = faceIdsAEliminar.slice(i, i + batchSize);
      await rekognition.deleteFaces({
        CollectionId: COLLECTION_ID,
        FaceIds: batch
      }).promise();
      console.log('Eliminadas ' + batch.length + ' caras');
    }

    console.log('\n✅ Limpieza completada. Se eliminaron ' + facesHuerfanas.length + ' caras huérfanas.');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

limpiarRekognition();
