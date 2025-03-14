const { searchInKnowledgeBase, expandContextWithReferences } = require('../search-engine/semanticSearch');
const OpenAI = require('openai');

// Almacenamiento temporal de historial (en producción usaríamos una base de datos)
const chatHistory = new Map();

/**
 * Extrae información relevante para respuesta de contexto
 */
function extractRelevantContext(searchResults) {
  // Combinar el texto de los resultados de búsqueda para formar el contexto
  const context = searchResults.map(result => {
    const metadata = result.metadata;
    const contextHeader = `ARTÍCULO ${metadata.number}${metadata.title ? ` - ${metadata.title}` : ''}`;
    
    return `${contextHeader}\n${result.content}`;
  }).join('\n\n');
  
  return context;
}

/**
 * Extrae el texto original para mostrar como referencia
 */
function extractOriginalTexts(searchResults) {
  return searchResults.map(result => ({
    id: result.id,
    article: `Artículo ${result.metadata.number}`,
    title: result.metadata.title || '',
    chapter: result.metadata.chapter || '',
    content: result.content,
    isReference: result.isReference || false,
    score: result.score
  }));
}

/**
 * Genera una respuesta usando el modelo de lenguaje
 */
async function generateResponse(question, context, chatId) {
  try {
    // Obtener historial previo si existe
    const previousMessages = chatHistory.get(chatId) || [];
    
    // Inicializar el cliente de OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Construir el sistema y el mensaje del usuario
    const systemMessage = `Eres un asistente especializado en la Ley del Impuesto Sobre la Renta (ISR) de México. Tu tarea es ayudar a explicar conceptos de esta ley de manera clara y comprensible para personas sin formación jurídica, pero siempre basándote en el texto original de la ley.

CONTEXTO DE LA LEY ISR:
${context}

INSTRUCCIONES:
1. Responde basándote ÚNICAMENTE en la información proporcionada en el CONTEXTO.
2. Si la información en el CONTEXTO no es suficiente para responder, indícalo claramente.
3. Usa lenguaje simple y claro, evitando jerga legal innecesaria.
4. Estructura tu respuesta de manera ordenada y concisa.
5. Si es relevante, menciona específicamente qué artículos o fracciones estás citando.
6. No inventes información ni interpretes más allá de lo que dice explícitamente la ley.`;

    // Generar respuesta usando la API oficial
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: question }
      ],
      temperature: 0.2
    });
    
    const response = completion.choices[0].message.content;
    
    // Guardar en historial (máximo 10 mensajes)
    const newHistory = [
      ...previousMessages,
      { role: 'user', content: question },
      { role: 'assistant', content: response }
    ].slice(-10);
    
    chatHistory.set(chatId, newHistory);
    
    return response;
  } catch (error) {
    console.error('Error al generar respuesta:', error);
    throw error;
  }
}

/**
 * Controlador para procesar preguntas
 */
exports.processQuestion = async (req, res) => {
  try {
    const { question, chatId = 'default' } = req.body;
    
    if (!question || typeof question !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Se requiere una pregunta válida'
      });
    }
    
    // 1. Realizar búsqueda semántica
    const searchResults = await searchInKnowledgeBase(question, {
      // Utilizamos un filtro básico para asegurar que la consulta funcione correctamente
      filter: { type: { $exists: true } }
    });
    
    // 2. Expandir contexto con referencias
    const expandedResults = await expandContextWithReferences(searchResults);
    
    // 3. Extraer contexto relevante
    const relevantContext = extractRelevantContext(expandedResults);
    
    // 4. Generar respuesta
    const response = await generateResponse(question, relevantContext, chatId);
    
    // 5. Extraer fragmentos originales para mostrar como referencia
    const originalTexts = extractOriginalTexts(expandedResults);
    
    return res.json({
      success: true,
      response,
      sourceReferences: originalTexts,
      chatId
    });
  } catch (error) {
    console.error('Error al procesar pregunta:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al procesar tu pregunta',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Controlador para obtener historial de chat
 */
exports.getChatHistory = async (req, res) => {
  try {
    const { chatId = 'default' } = req.body;
    
    const history = chatHistory.get(chatId) || [];
    
    return res.json({
      success: true,
      history,
      chatId
    });
  } catch (error) {
    console.error('Error al obtener historial de chat:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al obtener historial de chat',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
