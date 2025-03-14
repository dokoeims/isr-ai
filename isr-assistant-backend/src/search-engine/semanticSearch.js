require('dotenv').config();
const { OpenAIEmbeddings } = require('langchain/embeddings/openai');
const { Pinecone } = require('@pinecone-database/pinecone');

// Configuración
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME;

// Configuración del contexto de búsqueda
const MAX_CONTEXT_DOCUMENTS = 5;

/**
 * Conecta a Pinecone y obtiene el índice
 */
async function connectToPinecone() {
  try {
    const pinecone = new Pinecone({
      apiKey: PINECONE_API_KEY
    });
    
    return pinecone.index(PINECONE_INDEX_NAME);
  } catch (error) {
    console.error('Error al conectar con Pinecone:', error);
    throw error;
  }
}

/**
 * Realiza búsqueda semántica
 */
async function searchInKnowledgeBase(query, options = {}) {
  try {
    // Opciones de búsqueda
    const topK = options.topK || MAX_CONTEXT_DOCUMENTS;
    const filter = options.filter || {};
    
    // Conectar a Pinecone
    const index = await connectToPinecone();
    
    // Crear embedding para la consulta
    const embeddings = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    const queryEmbedding = await embeddings.embedQuery(query);
    
    // Realizar búsqueda en Pinecone
    const searchResults = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      filter
    });
    
    // Formatear resultados
    const formattedResults = searchResults.matches.map(match => ({
      id: match.id,
      score: match.score,
      content: match.metadata.text,
      metadata: {
        type: match.metadata.type,
        number: match.metadata.number,
        title: match.metadata.title,
        titleNumber: match.metadata.titleNumber,
        chapter: match.metadata.chapter,
        chapterNumber: match.metadata.chapterNumber,
        references: match.metadata.references
      }
    }));
    
    return formattedResults;
  } catch (error) {
    console.error('Error en la búsqueda semántica:', error);
    throw error;
  }
}

/**
 * Busca por número de artículo específico
 */
async function searchByArticleNumber(articleNumber) {
  try {
    const index = await connectToPinecone();
    
    // Filtrar por número de artículo
    const filter = {
      $or: [
        { number: articleNumber.toString() },
        { parentArticle: articleNumber.toString() }
      ]
    };
    
    // Ejecutar búsqueda
    // Como no necesitamos búsqueda semántica, usamos un vector aleatorio
    const dummyVector = Array(1536).fill(0).map(() => Math.random());
    
    const searchResults = await index.query({
      vector: dummyVector,
      topK: 10,
      includeMetadata: true,
      filter
    });
    
    // Formatear resultados
    const formattedResults = searchResults.matches.map(match => ({
      id: match.id,
      score: match.score,
      content: match.metadata.text,
      metadata: {
        type: match.metadata.type,
        number: match.metadata.number,
        title: match.metadata.title,
        titleNumber: match.metadata.titleNumber,
        chapter: match.metadata.chapter,
        chapterNumber: match.metadata.chapterNumber,
        references: match.metadata.references
      }
    }));
    
    return formattedResults;
  } catch (error) {
    console.error('Error al buscar por número de artículo:', error);
    throw error;
  }
}

/**
 * Expande el contexto con artículos referenciados
 */
async function expandContextWithReferences(results) {
  try {
    // Extraer referencias de los resultados
    const references = new Set();
    results.forEach(result => {
      if (result.metadata.references && Array.isArray(result.metadata.references)) {
        result.metadata.references.forEach(ref => references.add(ref));
      }
    });
    
    // Si no hay referencias, devolvemos los resultados originales
    if (references.size === 0) {
      return results;
    }
    
    // Buscar artículos referenciados
    const referencedArticles = [];
    for (const articleNumber of references) {
      const refResults = await searchByArticleNumber(articleNumber);
      referencedArticles.push(...refResults);
    }
    
    // Combinar resultados originales con referencias
    const expandedResults = [...results];
    
    // Añadir referencias que no estén ya en los resultados
    for (const refArticle of referencedArticles) {
      const exists = expandedResults.some(result => result.id === refArticle.id);
      if (!exists) {
        expandedResults.push({
          ...refArticle,
          isReference: true  // Marcar como referencia
        });
      }
    }
    
    return expandedResults;
  } catch (error) {
    console.error('Error al expandir contexto con referencias:', error);
    // En caso de error, devolver al menos los resultados originales
    return results;
  }
}

module.exports = {
  searchInKnowledgeBase,
  searchByArticleNumber,
  expandContextWithReferences
};
