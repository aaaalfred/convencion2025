import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();

// ============================================
// CONFIGURACIÓN AWS
// ============================================

// Configurar credenciales de AWS
AWS.config.update({
  accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY,
  region: process.env.APP_AWS_REGION || 'us-east-1'
});

// Clientes de AWS
const rekognition = new AWS.Rekognition();
const s3 = new AWS.S3();

// Configuración
const BUCKET_NAME = process.env.APP_AWS_S3_BUCKET || 'herdez-concursos';
const COLLECTION_ID = process.env.REKOGNITION_COLLECTION_ID || 'herdez-usuarios-faces';
const FACE_MATCH_THRESHOLD = 90; // 90% de similitud mínima
const MAX_FACES = 1; // Solo permitir una cara por imagen
const QUALITY_FILTER = 'AUTO'; // Rechazar fotos borrosas automáticamente

// ============================================
// FUNCIONES AUXILIARES S3
// ============================================

/**
 * Subir imagen a S3
 * @param {Buffer} imageBuffer - Buffer de la imagen
 * @param {string} fileName - Nombre del archivo
 * @returns {Promise<string>} - URL de la imagen en S3
 */
async function uploadToS3(imageBuffer, fileName) {
  const params = {
    Bucket: BUCKET_NAME,
    Key: `faces/${fileName}`,
    Body: imageBuffer,
    ContentType: 'image/jpeg',
    // ACL: 'public-read' // Descomentar si quieres URLs públicas
  };

  try {
    const result = await s3.upload(params).promise();
    return result.Location;
  } catch (error) {
    console.error('Error subiendo imagen a S3:', error);
    throw new Error(`Error al subir imagen a S3: ${error.message}`);
  }
}

/**
 * Eliminar imagen de S3
 * @param {string} s3Url - URL de la imagen en S3
 */
async function deleteFromS3(s3Url) {
  try {
    // Extraer el key de la URL
    const urlParts = s3Url.split('/');
    const key = urlParts.slice(3).join('/'); // Después del bucket name

    const params = {
      Bucket: BUCKET_NAME,
      Key: key
    };

    await s3.deleteObject(params).promise();
    console.log(`✅ Imagen eliminada de S3: ${key}`);
  } catch (error) {
    console.error('Error eliminando imagen de S3:', error);
    // No lanzar error, solo loggear
  }
}

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Registrar un nuevo rostro en AWS Rekognition
 * @param {Buffer} imageBuffer - Buffer de la imagen
 * @param {string} fileName - Nombre del archivo
 * @returns {Promise<{faceId: string, s3Url: string}>}
 */
async function indexFace(imageBuffer, fileName) {
  try {
    // 1. Subir imagen a S3
    const s3Url = await uploadToS3(imageBuffer, fileName);
    console.log(`✅ Imagen subida a S3: ${fileName}`);

    // 2. Indexar rostro en Rekognition
    const params = {
      CollectionId: COLLECTION_ID,
      Image: {
        Bytes: imageBuffer
      },
      ExternalImageId: fileName.replace(/\.[^/.]+$/, ''), // Sin extensión
      DetectionAttributes: ['ALL'],
      MaxFaces: MAX_FACES,
      QualityFilter: QUALITY_FILTER
    };

    const response = await rekognition.indexFaces(params).promise();

    // Verificar que se detectó al menos un rostro
    if (!response.FaceRecords || response.FaceRecords.length === 0) {
      // Eliminar imagen de S3 si no se detectó rostro
      await deleteFromS3(s3Url);
      throw new Error('No se detectó ningún rostro en la imagen');
    }

    // Verificar que solo hay un rostro
    if (response.FaceRecords.length > 1) {
      // Eliminar imagen y rostros de S3 y Rekognition
      await deleteFromS3(s3Url);
      for (const record of response.FaceRecords) {
        await deleteFace(record.Face.FaceId);
      }
      throw new Error('Se detectaron múltiples rostros. Por favor, toma una foto con solo tu rostro');
    }

    const faceId = response.FaceRecords[0].Face.FaceId;
    const confidence = response.FaceRecords[0].Face.Confidence;

    console.log(`✅ Rostro indexado: ${faceId} (confianza: ${confidence.toFixed(2)}%)`);

    return {
      faceId,
      s3Url,
      confidence
    };

  } catch (error) {
    console.error('Error indexando rostro:', error);

    // Manejar errores específicos
    if (error.code === 'InvalidParameterException') {
      throw new Error('No se detectó un rostro válido en la imagen o hay múltiples rostros');
    }
    if (error.code === 'InvalidImageFormatException') {
      throw new Error('Formato de imagen inválido. Usa JPG o PNG');
    }
    if (error.code === 'ImageTooLargeException') {
      throw new Error('La imagen es demasiado grande. Máximo 15MB');
    }

    throw error;
  }
}

/**
 * Buscar un rostro en la colección de Rekognition
 * @param {Buffer} imageBuffer - Buffer de la imagen
 * @returns {Promise<{found: boolean, faceId?: string, similarity?: number}>}
 */
async function searchFace(imageBuffer) {
  try {
    const params = {
      CollectionId: COLLECTION_ID,
      Image: {
        Bytes: imageBuffer
      },
      FaceMatchThreshold: FACE_MATCH_THRESHOLD,
      MaxFaces: 1,
      QualityFilter: QUALITY_FILTER
    };

    const response = await rekognition.searchFacesByImage(params).promise();

    // Verificar si se encontraron coincidencias
    if (!response.FaceMatches || response.FaceMatches.length === 0) {
      console.log('❌ No se encontró coincidencia de rostro');
      return {
        found: false
      };
    }

    const match = response.FaceMatches[0];
    const faceId = match.Face.FaceId;
    const similarity = match.Similarity;

    console.log(`✅ Rostro encontrado: ${faceId} (similitud: ${similarity.toFixed(2)}%)`);

    return {
      found: true,
      faceId,
      similarity
    };

  } catch (error) {
    console.error('Error buscando rostro:', error);

    // Manejar errores específicos
    if (error.code === 'InvalidParameterException') {
      // No se detectó rostro en la imagen - no es un error fatal
      return {
        found: false
      };
    }
    if (error.code === 'InvalidImageFormatException') {
      throw new Error('Formato de imagen inválido. Usa JPG o PNG');
    }

    throw error;
  }
}

/**
 * Eliminar un rostro de la colección de Rekognition
 * @param {string} faceId - ID del rostro a eliminar
 * @returns {Promise<boolean>}
 */
async function deleteFace(faceId) {
  try {
    const params = {
      CollectionId: COLLECTION_ID,
      FaceIds: [faceId]
    };

    await rekognition.deleteFaces(params).promise();
    console.log(`✅ Rostro eliminado: ${faceId}`);
    return true;

  } catch (error) {
    console.error('Error eliminando rostro:', error);
    return false;
  }
}

/**
 * Verificar que la colección existe
 * @returns {Promise<boolean>}
 */
async function checkCollection() {
  try {
    const params = {
      CollectionId: COLLECTION_ID
    };

    await rekognition.describeCollection(params).promise();
    console.log(`✅ Colección '${COLLECTION_ID}' existe`);
    return true;

  } catch (error) {
    if (error.code === 'ResourceNotFoundException') {
      console.log(`❌ Colección '${COLLECTION_ID}' no existe`);
      return false;
    }
    throw error;
  }
}

/**
 * Verificar que el bucket de S3 existe
 * @returns {Promise<boolean>}
 */
async function checkBucket() {
  try {
    await s3.headBucket({ Bucket: BUCKET_NAME }).promise();
    console.log(`✅ Bucket '${BUCKET_NAME}' existe`);
    return true;

  } catch (error) {
    if (error.code === 'NotFound') {
      console.log(`❌ Bucket '${BUCKET_NAME}' no existe`);
      return false;
    }
    throw error;
  }
}

/**
 * Verificar configuración de AWS
 */
async function verifySetup() {
  console.log('🔍 Verificando configuración de AWS...');

  const collectionExists = await checkCollection();
  const bucketExists = await checkBucket();

  if (!collectionExists || !bucketExists) {
    console.log('\n⚠️  Configuración incompleta:');
    if (!collectionExists) {
      console.log('  - Ejecuta: node scripts/setup-rekognition.js');
    }
    if (!bucketExists) {
      console.log('  - Verifica el nombre del bucket en .env');
    }
    return false;
  }

  console.log('✅ Configuración de AWS completa\n');
  return true;
}

// ============================================
// EXPORTAR
// ============================================

export default {
  indexFace,
  searchFace,
  deleteFace,
  verifySetup,
  uploadToS3,
  deleteFromS3
};
