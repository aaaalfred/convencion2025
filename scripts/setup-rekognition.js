/**
 * Setup Script para AWS Rekognition y S3
 *
 * Este script configura los recursos necesarios en AWS:
 * 1. Crea colección de rostros en Rekognition
 * 2. Crea bucket de S3 para almacenar fotos
 * 3. Configura políticas de acceso
 *
 * Ejecutar: node scripts/setup-rekognition.js
 */

const AWS = require('aws-sdk');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Configurar AWS
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const rekognition = new AWS.Rekognition();
const s3 = new AWS.S3();

// Configuración
const COLLECTION_ID = process.env.REKOGNITION_COLLECTION_ID || 'herdez-usuarios-faces';
const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'herdez-concursos';

/**
 * Verificar credenciales de AWS
 */
async function verificarCredenciales() {
  console.log(`\n${colors.cyan}[1/4] Verificando credenciales de AWS...${colors.reset}`);

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error(`${colors.red}❌ Error: Credenciales de AWS no configuradas en .env${colors.reset}`);
    console.log(`${colors.yellow}Por favor configura AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY en el archivo .env${colors.reset}`);
    process.exit(1);
  }

  try {
    const sts = new AWS.STS();
    const identity = await sts.getCallerIdentity().promise();
    console.log(`${colors.green}✅ Credenciales válidas (Account: ${identity.Account})${colors.reset}`);
    return true;
  } catch (error) {
    console.error(`${colors.red}❌ Error al verificar credenciales:${colors.reset}`, error.message);
    process.exit(1);
  }
}

/**
 * Crear colección de rostros en Rekognition
 */
async function crearColeccion() {
  console.log(`\n${colors.cyan}[2/4] Creando colección de rostros: ${COLLECTION_ID}${colors.reset}`);

  try {
    // Verificar si ya existe
    const collections = await rekognition.listCollections().promise();

    if (collections.CollectionIds.includes(COLLECTION_ID)) {
      console.log(`${colors.yellow}⚠️  La colección '${COLLECTION_ID}' ya existe${colors.reset}`);

      // Mostrar estadísticas
      const stats = await rekognition.describeCollection({
        CollectionId: COLLECTION_ID
      }).promise();

      console.log(`${colors.blue}   Rostros indexados: ${stats.FaceCount}${colors.reset}`);
      console.log(`${colors.blue}   ARN: ${stats.CollectionARN}${colors.reset}`);
      return true;
    }

    // Crear colección nueva
    const response = await rekognition.createCollection({
      CollectionId: COLLECTION_ID
    }).promise();

    console.log(`${colors.green}✅ Colección creada exitosamente${colors.reset}`);
    console.log(`${colors.blue}   ARN: ${response.CollectionArn}${colors.reset}`);
    console.log(`${colors.blue}   Status: ${response.StatusCode}${colors.reset}`);
    return true;

  } catch (error) {
    console.error(`${colors.red}❌ Error al crear colección:${colors.reset}`, error.message);

    if (error.code === 'ResourceAlreadyExistsException') {
      console.log(`${colors.green}✅ La colección ya existe (esto es OK)${colors.reset}`);
      return true;
    }

    throw error;
  }
}

/**
 * Crear bucket de S3
 */
async function crearBucket() {
  console.log(`\n${colors.cyan}[3/4] Creando bucket de S3: ${BUCKET_NAME}${colors.reset}`);

  try {
    // Verificar si ya existe
    try {
      await s3.headBucket({ Bucket: BUCKET_NAME }).promise();
      console.log(`${colors.yellow}⚠️  El bucket '${BUCKET_NAME}' ya existe${colors.reset}`);

      // Verificar región
      const location = await s3.getBucketLocation({ Bucket: BUCKET_NAME }).promise();
      const region = location.LocationConstraint || 'us-east-1';
      console.log(`${colors.blue}   Región: ${region}${colors.reset}`);
      return true;

    } catch (headError) {
      if (headError.statusCode !== 404) {
        throw headError;
      }
    }

    // Crear bucket nuevo
    const params = {
      Bucket: BUCKET_NAME,
      ACL: 'private',
    };

    // Si no es us-east-1, agregar LocationConstraint
    if (process.env.AWS_REGION && process.env.AWS_REGION !== 'us-east-1') {
      params.CreateBucketConfiguration = {
        LocationConstraint: process.env.AWS_REGION
      };
    }

    await s3.createBucket(params).promise();
    console.log(`${colors.green}✅ Bucket creado exitosamente${colors.reset}`);

    // Configurar versionamiento (opcional pero recomendado)
    await s3.putBucketVersioning({
      Bucket: BUCKET_NAME,
      VersioningConfiguration: {
        Status: 'Enabled'
      }
    }).promise();
    console.log(`${colors.green}✅ Versionamiento activado${colors.reset}`);

    // Configurar lifecycle para borrar fotos antiguas (opcional)
    await s3.putBucketLifecycleConfiguration({
      Bucket: BUCKET_NAME,
      LifecycleConfiguration: {
        Rules: [
          {
            Id: 'DeleteOldValidations',
            Status: 'Enabled',
            Prefix: 'validaciones/',
            Expiration: {
              Days: 90 // Borrar fotos de validación después de 90 días
            }
          }
        ]
      }
    }).promise();
    console.log(`${colors.green}✅ Política de lifecycle configurada (validaciones se borran a los 90 días)${colors.reset}`);

    return true;

  } catch (error) {
    console.error(`${colors.red}❌ Error al crear bucket:${colors.reset}`, error.message);

    if (error.code === 'BucketAlreadyOwnedByYou' || error.code === 'BucketAlreadyExists') {
      console.log(`${colors.green}✅ El bucket ya existe (esto es OK)${colors.reset}`);
      return true;
    }

    throw error;
  }
}

/**
 * Verificar configuración final
 */
async function verificarSetup() {
  console.log(`\n${colors.cyan}[4/4] Verificando configuración...${colors.reset}`);

  try {
    // Test: Verificar que podemos acceder a la colección
    const collectionStats = await rekognition.describeCollection({
      CollectionId: COLLECTION_ID
    }).promise();

    // Test: Verificar que podemos acceder al bucket
    const bucketExists = await s3.headBucket({
      Bucket: BUCKET_NAME
    }).promise();

    console.log(`\n${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.green}✅ SETUP COMPLETADO EXITOSAMENTE${colors.reset}`);
    console.log(`${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

    console.log(`${colors.blue}Configuración:${colors.reset}`);
    console.log(`  • Colección Rekognition: ${colors.cyan}${COLLECTION_ID}${colors.reset}`);
    console.log(`  • Rostros indexados: ${colors.cyan}${collectionStats.FaceCount}${colors.reset}`);
    console.log(`  • Bucket S3: ${colors.cyan}${BUCKET_NAME}${colors.reset}`);
    console.log(`  • Región AWS: ${colors.cyan}${process.env.AWS_REGION}${colors.reset}`);

    console.log(`\n${colors.yellow}Próximos pasos:${colors.reset}`);
    console.log(`  1. Ejecutar migración SQL: ${colors.cyan}mysql -h <host> -u <user> -p recompensas < scripts/migration.sql${colors.reset}`);
    console.log(`  2. Instalar dependencias: ${colors.cyan}npm install${colors.reset}`);
    console.log(`  3. Iniciar servidor: ${colors.cyan}npm run server${colors.reset}`);
    console.log(`  4. Iniciar frontend: ${colors.cyan}npm run dev${colors.reset}`);
    console.log(`\n`);

    return true;

  } catch (error) {
    console.error(`${colors.red}❌ Error en verificación:${colors.reset}`, error.message);
    throw error;
  }
}

/**
 * Ejecutar setup completo
 */
async function main() {
  console.log(`\n${colors.cyan}╔════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║  AWS Rekognition & S3 Setup - Herdez      ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════╝${colors.reset}`);

  try {
    await verificarCredenciales();
    await crearColeccion();
    await crearBucket();
    await verificarSetup();

    process.exit(0);

  } catch (error) {
    console.error(`\n${colors.red}❌ Error fatal:${colors.reset}`, error);
    console.log(`\n${colors.yellow}Verifica:${colors.reset}`);
    console.log(`  • Credenciales de AWS en .env`);
    console.log(`  • Permisos IAM (Rekognition y S3)`);
    console.log(`  • Región configurada correctamente`);
    console.log(`\n`);
    process.exit(1);
  }
}

// Ejecutar
main();
