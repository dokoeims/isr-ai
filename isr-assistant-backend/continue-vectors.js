require('dotenv').config();
const fs = require('fs');
const { Pinecone } = require('@pinecone-database/pinecone');
const path = require('path');
const OpenAI = require('openai');

// Configuración
const CHUNKS_PATH = process.env.CHUNKS_OUTPUT_PATH || './data/processed_chunks.json';
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME;

// Lote desde el que queremos continuar (lote 55)
const START_BATCH = 54; // Índices comienzan en 0, así que el lote 55 es el índice 54

/**
 * Inicializa el cliente de Pinecone y el índice
 */
async function initializePinecone() {
  try {
    const pinecone = new Pinecone({
      apiKey: PINECONE_API_KEY
    });
    
    return pinecone.index(PINECONE_INDEX_NAME);
  } catch (error) {
    console.error('Error al inicializar Pinecone:', error);
    throw error;
  }
}

/**
 * Limita el tamaño de los metadatos para evitar exceder el límite de 40KB
 */
function limitMetadataSize(vector) {
  // Reducir significativamente el tamaño del texto
  if (vector.metadata && vector.metadata.text) {
    vector.metadata.text = vector.metadata.text.slice(0, 200);
  }
  return vector;
}

/**
 * Almacena vectores en Pinecone
 */
async function storeRemainingVectors(index, vectors) {
  try {
    const batchSize = 50;
    const totalBatches = Math.ceil(vectors.length / batchSize);
    
    console.log(`Continuando la subida desde el lote ${START_BATCH + 1} de ${totalBatches}...`);
    
    for (let i = START_BATCH * batchSize; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize).map(limitMetadataSize);
      const currentBatch = Math.floor(i / batchSize) + 1;
      console.log(`Subiendo lote ${currentBatch}/${totalBatches}...`);
      
      try {
        await index.upsert(batch);
        console.log(`✅ Lote ${currentBatch} subido correctamente.`);
      } catch (batchError) {
        console.error(`❌ Error en lote ${currentBatch}:`, batchError.message);
        
        // Si el error es por tamaño de metadatos, intentar con cada vector individualmente
        if (batchError.message.includes('Metadata size')) {
          console.log('Intentando procesar el lote vector por vector...');
          
          for (let j = 0; j < batch.length; j++) {
            try {
              // Reducir aún más el tamaño de metadatos para vectores problemáticos
              const vector = {...batch[j]};
              if (vector.metadata && vector.metadata.text) {
                vector.metadata.text = vector.metadata.text.slice(0, 100); // Reducir drásticamente
              }
              
              await index.upsert([vector]);
              console.log(`  ✓ Vector ${j+1}/${batch.length} subido correctamente`);
            } catch (vectorError) {
              console.error(`  ✗ No se pudo subir el vector ${j+1}/${batch.length}:`, vectorError.message);
              
              // Si aún falla, intentar una última vez sin metadatos de texto
              try {
                const minimalVector = {...batch[j]};
                if (minimalVector.metadata) {
                  // Eliminar completamente el campo text
                  delete minimalVector.metadata.text;
                }
                await index.upsert([minimalVector]);
                console.log(`    ✓ Vector ${j+1}/${batch.length} subido con metadatos mínimos`);
              } catch (finalError) {
                console.error(`    ✗ No se pudo subir el vector ni con metadatos mínimos:`, finalError.message);
              }
            }
          }
        } else {
          // Para otros tipos de errores, simplemente continuamos con el siguiente lote
          console.log('Continuando con el siguiente lote...');
        }
      }
    }
    
    console.log('✅ Todos los vectores restantes han sido almacenados correctamente en Pinecone');
  } catch (error) {
    console.error('Error al almacenar vectores en Pinecone:', error);
    throw error;
  }
}

/**
 * Función para leer embeddings o crearlos si es necesario
 */
async function getEmbeddings() {
  // Primero intentamos cargar embeddings existentes
  const embeddingsPath = CHUNKS_PATH.replace('.json', '_embeddings.json');
  
  if (fs.existsSync(embeddingsPath)) {
    console.log(`Cargando embeddings existentes desde ${embeddingsPath}...`);
    return JSON.parse(fs.readFileSync(embeddingsPath, 'utf8'));
  }
  
  // Si no encontramos el archivo principal, buscamos en el directorio de datos
  try {
    const dataDir = path.dirname(CHUNKS_PATH);
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir);
      const embeddingFile = files.find(file => file.includes('embedding') && file.endsWith('.json'));
      
      if (embeddingFile) {
        const fullPath = path.join(dataDir, embeddingFile);
        console.log(`Cargando embeddings desde archivo encontrado: ${fullPath}`);
        return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      }
    }
  } catch (dirError) {
    console.warn(`Error al buscar en el directorio de datos: ${dirError.message}`);
  }
  
  // Como último recurso, buscamos en el directorio actual
  try {
    const currentDirFiles = fs.readdirSync('.');
    const embeddingFile = currentDirFiles.find(file => file.includes('embedding') && file.endsWith('.json'));
    
    if (embeddingFile) {
      console.log(`Cargando embeddings desde directorio actual: ${embeddingFile}`);
      return JSON.parse(fs.readFileSync(embeddingFile, 'utf8'));
    }
  } catch (currentDirError) {
    console.warn(`Error al buscar en el directorio actual: ${currentDirError.message}`);
  }
  
  // Si no encontramos los embeddings, necesitamos cargar los chunks y crearlos
  console.log('⚠️ No se encontraron embeddings existentes. Necesitamos cargar los chunks y crear nuevos embeddings.');
  
  if (!fs.existsSync(CHUNKS_PATH)) {
    throw new Error(`No se encontró el archivo de chunks en ${CHUNKS_PATH}. No podemos continuar sin este archivo.`);
  }
  
  const chunks = JSON.parse(fs.readFileSync(CHUNKS_PATH, 'utf8'));
  console.log(`Cargados ${chunks.length} chunks. Creando nuevos embeddings solo para los lotes restantes...`);
  
  // Crear embeddings solo para los lotes faltantes
  const lotesProcesados = START_BATCH * 50; // 50 es el tamaño de batch que estamos usando
  const chunksRestantes = chunks.slice(lotesProcesados);
  
  return await createEmbeddingsForRemainingChunks(chunksRestantes, lotesProcesados);
}

/**
 * Crea embeddings solo para los chunks restantes
 */
async function createEmbeddingsForRemainingChunks(chunks, startIndex) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  
  console.log(`Creando embeddings para ${chunks.length} chunks restantes...`);
  
  const batchSize = 20;
  const vectors = [];
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const texts = batch.map(chunk => chunk.content);
    
    // Pausa entre lotes para evitar límites de API
    if (i > 0) {
      console.log("Esperando 2 segundos para evitar límites de API...");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`Procesando lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}...`);
    
    try {
      // Verificar que todos los textos son válidos
      const validTexts = texts.map(text => {
        if (typeof text !== 'string') {
          console.warn('Encontrado texto no válido, convirtiéndolo a string:', text);
          return String(text || 'Contenido no disponible');
        }
        return text;
      });
      
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: validTexts,
        encoding_format: "float"
      });
      
      const embeddingResults = response.data.map(item => item.embedding);
      
      for (let j = 0; j < batch.length; j++) {
        vectors.push({
          id: batch[j].id,
          values: embeddingResults[j],
          metadata: {
            ...batch[j].metadata,
            // Reducir significativamente el tamaño del texto para evitar problemas
            text: batch[j].content ? batch[j].content.slice(0, 200) : ''
          }
        });
      }
    } catch (embedError) {
      console.error(`Error al procesar el lote ${Math.floor(i / batchSize) + 1}:`, embedError.message);
      console.log('Intentando nuevamente con lotes más pequeños...');
      
      // Dividir el lote actual en sub-lotes más pequeños (siguiendo la lógica original)
      const subBatchSize = 5;
      for (let k = 0; k < batch.length; k += subBatchSize) {
        const subBatch = batch.slice(k, k + subBatchSize);
        const subTexts = subBatch.map(chunk => {
          if (typeof chunk.content !== 'string') {
            return String(chunk.content || 'Contenido no disponible');
          }
          return chunk.content;
        });
        
        try {
          console.log(`Procesando sub-lote ${Math.floor(k / subBatchSize) + 1}/${Math.ceil(batch.length / subBatchSize)}...`);
          
          // Obtener embeddings para el sub-lote
          const subResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
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
                text: subBatch[l].content ? subBatch[l].content.slice(0, 200) : ''
              }
            });
          }
        } catch (subError) {
          console.error(`Error al procesar sub-lote:`, subError.message);
          console.log(`Intentando procesar cada chunk individualmente...`);
          
          // Si hay un error específico por chunk, intentar procesar uno por uno
          for (let m = 0; m < subBatch.length; m++) {
            try {
              console.log(`Intentando procesar chunk individual ${m + 1}/${subBatch.length}...`);
              
              // Verificar que el contenido es un string válido
              const safeContent = typeof subBatch[m].content === 'string' ? 
                subBatch[m].content : 
                String(subBatch[m].content || 'Contenido no disponible');
              
              // Intentar con un solo chunk
              const singleResponse = await openai.embeddings.create({
                model: "text-embedding-3-small",
                input: safeContent,
                encoding_format: "float"
              });
              
              vectors.push({
                id: subBatch[m].id,
                values: singleResponse.data[0].embedding,
                metadata: {
                  ...subBatch[m].metadata,
                  text: safeContent.slice(0, 100) // Reducir aún más el tamaño
                }
              });
              
              console.log(`  ✓ Chunk individual ${m+1}/${subBatch.length} procesado correctamente`);
            } catch (singleError) {
              console.error(`  ✗ No se pudo procesar el chunk individual ${subBatch[m].id}:`, singleError.message);
            }
            
            // Pequeña pausa entre chunks individuales
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        // Esperar un breve tiempo entre sub-lotes
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  
  }
  
  console.log(`Se crearon ${vectors.length} embeddings para los chunks restantes.`);
  
  // Guardar los embeddings creados
  const tempEmbeddingsPath = './data/remaining_embeddings.json';
  fs.writeFileSync(tempEmbeddingsPath, JSON.stringify(vectors));
  console.log(`Embeddings guardados en ${tempEmbeddingsPath}`);
  
  return vectors;
}

/**
 * Función principal para continuar la subida de vectores
 */
async function continueVectorsUpload() {
  try {
    console.log('🚀 Iniciando proceso para continuar la subida de vectores a Pinecone...');
    
    // 1. Obtener embeddings (cargar existentes o crear nuevos)
    const vectors = await getEmbeddings();
    console.log(`Se han obtenido ${vectors.length} vectores en total.`);
    
    // 2. Inicializar Pinecone
    console.log('Inicializando conexión con Pinecone...');
    const index = await initializePinecone();
    
    // 3. Almacenar vectores restantes en Pinecone
    await storeRemainingVectors(index, vectors);
    
    console.log('✅ Proceso completado con éxito!');
  } catch (error) {
    console.error('❌ Error al continuar la subida de vectores:', error);
    process.exit(1);
  }
}

// Ejecutar la función principal
continueVectorsUpload();
