import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

async function runMigration() {
  let connection;

  try {
    console.log('🚀 Iniciando migración de tabla de preguntas...\n');

    // Conectar a MySQL
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      multipleStatements: true
    });

    console.log('✅ Conectado a MySQL\n');

    // Leer archivo SQL
    const sqlFile = join(__dirname, 'preguntas-migration.sql');
    const sqlContent = await fs.readFile(sqlFile, 'utf-8');

    console.log('📄 Ejecutando script SQL...\n');

    // Ejecutar SQL
    const [results] = await connection.query(sqlContent);

    console.log('✅ Migración completada exitosamente\n');
    console.log('Resultados:', results);

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n👋 Conexión cerrada');
    }
  }
}

runMigration();
