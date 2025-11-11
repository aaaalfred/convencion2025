import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function runMigration() {
  console.log('🔄 Iniciando migración de base de datos...\n');

  let connection;

  try {
    // Conectar a MySQL
    console.log(`📡 Conectando a ${process.env.DB_HOST}:${process.env.DB_PORT}...`);
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      multipleStatements: true
    });

    console.log('✅ Conexión establecida\n');

    // Leer archivo SQL
    const sqlFile = path.join(__dirname, 'migration.sql');
    console.log(`📄 Leyendo archivo: ${sqlFile}`);
    const sql = await fs.readFile(sqlFile, 'utf8');

    // Ejecutar migración
    console.log('⚙️  Ejecutando migración...\n');
    const [results] = await connection.query(sql);

    console.log('✅ Migración ejecutada exitosamente\n');

    // Verificar tablas creadas
    console.log('🔍 Verificando tablas creadas...');
    const [tables] = await connection.query('SHOW TABLES FROM expo25');

    console.log('\nTablas en la base de datos expo25:');
    tables.forEach(row => {
      const tableName = Object.values(row)[0];
      console.log(`  ✓ ${tableName}`);
    });

    // Verificar concursos de prueba
    console.log('\n🎯 Verificando concursos de prueba...');
    const [concursos] = await connection.query('SELECT * FROM expo25.concursos');

    if (concursos.length > 0) {
      console.log(`\n✅ ${concursos.length} concursos creados:`);
      concursos.forEach(c => {
        console.log(`  • ${c.nombre} (${c.codigo_unico}) - ${c.puntos_otorgados} puntos`);
      });
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Error durante la migración:');
    console.error(error.message);

    if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n⚠️  La base de datos "expo25" no existe.');
      console.log('Por favor crea la base de datos primero:');
      console.log('  CREATE DATABASE expo25;');
    }

    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión cerrada\n');
    }
  }
}

runMigration();
