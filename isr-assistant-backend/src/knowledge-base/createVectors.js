require('dotenv').config();
const fs = require('fs');
const { OpenAIEmbeddings } = require('langchain/embeddings/openai');
const { PineconeClient } = require('pinecone-client');

// Configuración
const CHUNKS_PATH = process.env.CHUNKS_OUTPUT_PATH;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME;

/**
 * Inicializa el cliente de Pinecone y el índice
 */
async function initializePinecone() {
  try {
    const pinecone = new PineconeClient({
      apiKey: PINECONE_API_KEY,
      environment: PINECONE_ENVIRONMENT
    });
    
    // Verificar si el índice existe
    const indexes = await pinecone.listIndexes();
    const indexExists = indexes.includes(PINECONE_INDEX_NAME);
    
    if (!indexExists) {
      console.log(`Creando índice ${PINECONE_INDEX_NAME}...`);
      await pinecone.createIndex({
        name: PINECONE_INDEX_NAME,
        dimension: 1536, // Dimensión para embeddings de OpenAI
        metric: 'cosine'
      });
      
      // Esperar a que el índice esté listo
      console.log('Esperando a que el índice esté listo...');
      let isReady = false;
      while (!isReady) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        const indexStatus = await pinecone.describeIndex(PINECONE_INDEX_NAME);
        isReady = indexStatus.status.ready;
      }
    }
    
    return pinecone.Index(PINECONE_INDEX_NAME);
  } catch (error) {
    console.error('Error al inicializar Pinecone:', error);
    throw error;
  }
}

/**
 * Crea embeddings para los chunks
 */
async function createEmbeddings(chunks) {
  try {
    const embeddings = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    console.log(`Creando embeddings para ${chunks.length} chunks...`);
    
    // Procesar en lotes para evitar límites de API
    const batchSize = 50;
    const vectors = [];
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map(chunk => chunk.content);
      
      console.log(`Procesando lote ${i / batchSize + 1}/${Math.ceil(chunks.length / batchSize)}...`);
      const embeddingResults = await embeddings.embedDocuments(texts);
      
      // Crear vectores para Pinecone
      for (let j = 0; j < batch.length; j++) {
        vectors.push({
          id: batch[j].id,
          values: embeddingResults[j],
          metadata: {
            ...batch[j].metadata,
            text: batch[j].content.slice(0, 1000) // Limitar tamaño para metadata
          }
        });
      }
    }
    
    return vectors;
  } catch (error) {
    console.error('Error al crear embeddings:', error);
    throw error;
  }
}

/**
 * Almacena vectores en Pinecone
 */
async function storeVectors(index, vectors) {
  try {
    console.log(`Almacenando ${vectors.length} vectores en Pinecone...`);
    
    // Pinecone tiene un límite de tamaño por operación, así que dividimos en lotes
    const batchSize = 100;
    
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      console.log(`Subiendo lote ${i / batchSize + 1}/${Math.ceil(vectors.length / batchSize)}...`);
      await index.upsert(batch);
    }
    
    console.log('Vectores almacenados correctamente en Pinecone');
  } catch (error) {
    console.error('Error al almacenar vectores en Pinecone:', error);
    throw error;
  }
}

/**
 * Función principal para crear la base de conocimiento
 */
async function createKnowledgeBase() {
  try {
    // 1. Cargar chunks procesados
    console.log(`Cargando chunks desde ${CHUNKS_PATH}...`);
    const chunks = JSON.parse(fs.readFileSync(CHUNKS_PATH, 'utf8'));
    
    // 2. Inicializar Pinecone
    console.log('Inicializando conexión con Pinecone...');
    const index = await initializePinecone();
    
    // 3. Crear embeddings
    const vectors = await createEmbeddings(chunks);
    
    // 4. Almacenar vectores en Pinecone
    await storeVectors(index, vectors);
    
    console.log('Base de conocimiento creada exitosamente');
  } catch (error) {
    console.error('Error al crear la base de conocimiento:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createKnowledgeBase().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = {
  createKnowledgeBase,
  createEmbeddings,
  initializePinecone
};
