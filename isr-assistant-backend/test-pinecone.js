require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

async function testConnection() {
  try {
    console.log("Iniciando prueba de conexión a Pinecone...");
    console.log("API Key:", process.env.PINECONE_API_KEY ? "***" + process.env.PINECONE_API_KEY.slice(-4) : "No configurada");
    console.log("Environment:", process.env.PINECONE_ENVIRONMENT || "No configurado");
    console.log("Index Name:", process.env.PINECONE_INDEX_NAME || "No configurado");
    console.log("Base URL:", process.env.PINECONE_BASE_URL || "No configurado");
    
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
      // No need to pass environment, we'll use the base URL directly
    });
    
    console.log("✓ Conexión inicial exitosa!");
    
    console.log("Intentando listar índices...");
    const indexes = await pinecone.listIndexes();
    const indexesList = indexes.indexes?.map(idx => idx.name) || [];
    console.log("✓ Índices disponibles:", indexesList);
    
    if (indexesList.includes(process.env.PINECONE_INDEX_NAME)) {
      console.log(`✓ El índice "${process.env.PINECONE_INDEX_NAME}" existe.`);
      
      try {
        const index = pinecone.index(process.env.PINECONE_INDEX_NAME);
        console.log(`Intentando obtener estadísticas del índice "${process.env.PINECONE_INDEX_NAME}"...`);
        const indexStats = await index.describeIndexStats();
        console.log("✓ Estadísticas del índice:", indexStats);
      } catch (indexError) {
        console.error("✗ Error al obtener información del índice:", indexError.message);
      }
    } else {
      console.log(`✗ El índice "${process.env.PINECONE_INDEX_NAME}" no existe.`);
    }
    
    console.log("Prueba de conexión completada!");
  } catch (error) {
    console.error("✗ Error durante la prueba de conexión:", error);
    
    // Información más detallada sobre el error
    console.log("\nEl error parece estar relacionado con problemas de conexión. Posibles causas:");
    console.log("1. Problemas de red o firewall que bloquean conexiones salientes");
    console.log("2. Proxy corporativo que requiere configuración adicional");
    console.log("3. API key o environment incorrectos");
    console.log("4. Servicios de Pinecone no disponibles temporalmente");
    console.log("\nDetalles completos del error:", error);
  }
}

testConnection();