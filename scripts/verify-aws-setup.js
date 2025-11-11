import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Configurar AWS
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const rekognition = new AWS.Rekognition();
const s3 = new AWS.S3();

const COLLECTION_ID = process.env.REKOGNITION_COLLECTION_ID || 'herdez-usuarios-faces';
const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'herdez-concursos';

async function verificar() {
  console.log('\n🔍 Verificando recursos de AWS...\n');

  try {
    // Verificar colección de Rekognition
    console.log('1. Verificando colección de Rekognition...');
    const collection = await rekognition.describeCollection({
      CollectionId: COLLECTION_ID
    }).promise();

    console.log(`   ✅ Colección: ${COLLECTION_ID}`);
    console.log(`   📊 Rostros indexados: ${collection.FaceCount}`);
    console.log(`   🔗 ARN: ${collection.CollectionARN}\n`);

    // Verificar bucket S3
    console.log('2. Verificando bucket S3...');
    await s3.headBucket({ Bucket: BUCKET_NAME }).promise();

    const location = await s3.getBucketLocation({ Bucket: BUCKET_NAME }).promise();
    const region = location.LocationConstraint || 'us-east-1';

    console.log(`   ✅ Bucket: ${BUCKET_NAME}`);
    console.log(`   📍 Región: ${region}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ CONFIGURACIÓN DE AWS COMPLETA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🚀 Siguiente paso: Iniciar servidor backend');
    console.log('   npm run server\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

verificar();
