require('dotenv').config();
const fs = require('fs');
const OpenAI = require('openai');
const { Pinecone } = require('@pinecone-database/pinecone');

// Configuración
const CHUNKS_PATH = process.env.CHUNKS_OUTPUT_PATH;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME;

/**
 * Inicializa el cliente de Pinecone y el índice
 */
async function initializePinecone() {
  try {
    const pinecone = new Pinecone({
      apiKey: PINECONE_API_KEY
    });
    
    // Verificar si el índice existe
    const indexesResult = await pinecone.listIndexes();
    const indexesList = indexesResult.indexes?.map(idx => idx.name) || [];
    const indexExists = indexesList.includes(PINECONE_INDEX_NAME);
    
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
        const indexDescription = await pinecone.describeIndex(PINECONE_INDEX_NAME);
        isReady = indexDescription.status?.ready;
      }
    }
    
    return pinecone.index(PINECONE_INDEX_NAME);
  } catch (error) {
    console.error('Error al inicializar Pinecone:', error);
    throw error;
  }
}

/**
 * Crea embeddings para los chunks usando la API oficial de OpenAI
 */
async function createEmbeddings(chunks) {
  try {
    // Inicializar el cliente de OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    console.log(`Creando embeddings para ${chunks.length} chunks...`);
    
    // Modelo de embeddings a utilizar
    const embeddingModel = "text-embedding-3-small";
    
    // Procesar en lotes más pequeños para evitar límites de API
    const batchSize = 20;
    const vectors = [];
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map(chunk => chunk.content);
      
      // Esperar un tiempo entre lotes para evitar límites de API
      if (i > 0) {
        console.log("Esperando 2 segundos para evitar límites de API...");
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      console.log(`Procesando lote ${i / batchSize + 1}/${Math.ceil(chunks.length / batchSize)}...`);
      
      try {
        // Obtener embeddings usando la API oficial
        const response = await openai.embeddings.create({
          model: embeddingModel,
          input: texts,
          encoding_format: "float"
        });
        
        // Extraer los vectores de la respuesta
        const embeddingResults = response.data.map(item => item.embedding);
        
        // Crear vectores para Pinecone
        for (let j = 0; j < batch.length; j++) {
          vectors.push({
            id: batch[j].id,
            values: embeddingResults[j],
            metadata: {
              ...batch[j].metadata,
              text: batch[j].content.slice(0, 500) // Limitar el tamaño para metadata
            }
          });
        }
      } catch (embedError) {
        console.error(`Error al procesar el lote ${i / batchSize + 1}:`, embedError.message);
        console.log('Intentando nuevamente con lotes más pequeños...');
        
        // Dividir el lote actual en sub-lotes más pequeños
        const subBatchSize = 5;
        for (let k = 0; k < batch.length; k += subBatchSize) {
          const subBatch = batch.slice(k, k + subBatchSize);
          const subTexts = subBatch.map(chunk => chunk.content);
          
          try {
            console.log(`Procesando sub-lote ${k / subBatchSize + 1}/${Math.ceil(batch.length / subBatchSize)}...`);
            
            // Obtener embeddings para el sub-lote
            const subResponse = await openai.embeddings.create({
              model: embeddingModel,
              input: subTexts,
              encoding_format: "float"
            });
            
            const subEmbeddingResults = subResponse.data.map(item => item.embedding);
            
            // Añadir los resultados del sub-lote
            for (let l = 0; l < subBatch.length; l++) {
              vectors.push({
                id: subBatch[l].id,
                values: subEmbeddingResults[l],
                metadata: {
                  ...subBatch[l].metadata,
                  text: subBatch[l].content.slice(0, 500) // Limitar el tamaño para metadata
                }
              });
            }
          } catch (subError) {
            console.error(`Error al procesar sub-lote:`, subError.message);
            console.log(`Omitiendo ${subBatch.length} chunks problemáticos...`);
            
            // Si hay un error específico por chunk, intentar procesar uno por uno
            for (let m = 0; m < subBatch.length; m++) {
              try {
                console.log(`Intentando procesar chunk individual ${m + 1}/${subBatch.length}...`);
                
                // Intentar con un solo chunk
                const singleResponse = await openai.embeddings.create({
                  model: embeddingModel,
                  input: subBatch[m].content,
                  encoding_format: "float"
                });
                
                vectors.push({
                  id: subBatch[m].id,
                  values: singleResponse.data[0].embedding,
                  metadata: {
                    ...subBatch[m].metadata,
                    text: subBatch[m].content.slice(0, 500)
                  }
                });
              } catch (singleError) {
                console.error(`No se pudo procesar el chunk individual:`, singleError.message);
              }
              
              // Pequeña pausa entre chunks individuales
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
          
          // Esperar un breve tiempo entre sub-lotes para no sobrecargar la API
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    console.log(`Se generaron embeddings para ${vectors.length} de ${chunks.length} chunks.`);
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
    
    // Pinecone tiene un límite de tamaño por operación, así que dividimos en lotes pequeños
    const batchSize = 50;
    
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
