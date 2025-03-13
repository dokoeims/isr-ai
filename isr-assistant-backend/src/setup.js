require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { processPdf } = require('./pdf-processing/processPdf');
const { createKnowledgeBase } = require('./knowledge-base/createVectors');

// Rutas
const DATA_DIR = path.resolve(__dirname, '../data');
const PDF_PATH = process.env.PDF_PATH;

/**
 * Verifica que el archivo PDF existe
 */
function checkPdfExists() {
  if (!fs.existsSync(PDF_PATH)) {
    console.error(`ERROR: No se encontró el archivo PDF en la ruta: ${PDF_PATH}`);
    console.log('Por favor, coloca el archivo PDF de la Ley ISR en la ubicación correcta y vuelve a intentarlo.');
    return false;
  }
  return true;
}

/**
 * Verifica que las variables de entorno estén configuradas
 */
function checkEnvironmentVariables() {
  const requiredVars = [
    'OPENAI_API_KEY',
    'PINECONE_API_KEY',
    'PINECONE_ENVIRONMENT',
    'PINECONE_INDEX_NAME'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('ERROR: Faltan las siguientes variables de entorno:');
    missingVars.forEach(varName => console.error(`- ${varName}`));
    console.log('Por favor, configura estas variables en el archivo .env y vuelve a intentarlo.');
    return false;
  }
  
  return true;
}

/**
 * Función principal de configuración
 */
async function setup() {
  console.log('=== CONFIGURACIÓN DEL ASISTENTE DE LEY ISR ===');
  
  // Verificar prerrequisitos
  if (!checkPdfExists() || !checkEnvironmentVariables()) {
    process.exit(1);
  }
  
  try {
    // 1. Procesar el PDF
    console.log('\n--- PASO 1: Procesamiento del PDF ---');
    await processPdf();
    
    // 2. Crear base de conocimiento
    console.log('\n--- PASO 2: Creación de la base de conocimiento ---');
    await createKnowledgeBase();
    
    console.log('\n=== CONFIGURACIÓN COMPLETADA CON ÉXITO ===');
    console.log('Ahora puedes iniciar el servidor con: npm run dev');
  } catch (error) {
    console.error('\nERROR durante la configuración:', error);
    console.log('Por favor, revisa los errores y vuelve a intentarlo.');
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  setup().catch(console.error);
}

module.exports = { setup };
