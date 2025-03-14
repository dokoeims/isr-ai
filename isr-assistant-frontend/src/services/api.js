import axios from 'axios';

// URL base de la API
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Crear instancia de axios con configuración base
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Envía una pregunta al asistente
 * @param {string} question - Pregunta del usuario
 * @param {string} chatId - Identificador único del chat
 * @returns {Promise<Object>} - Respuesta del asistente
 */
export const sendQuestion = async (question, chatId) => {
  try {
    const response = await api.post('/chat', {
      question,
      chatId,
    });

    return response.data;
  } catch (error) {
    console.error('Error al enviar pregunta:', error);
    throw error;
  }
};

/**
 * Obtiene el historial de chat
 * @param {string} chatId - Identificador único del chat
 * @returns {Promise<Array>} - Historial de mensajes
 */
export const getChatHistory = async (chatId) => {
  try {
    const response = await api.post('/chat/history', {
      chatId,
    });

    return response.data.history;
  } catch (error) {
    console.error('Error al obtener historial:', error);
    return [];
  }
};

/**
 * Realiza una búsqueda semántica
 * @param {string} query - Consulta de búsqueda
 * @param {boolean} includeReferences - Indicador para incluir referencias
 * @returns {Promise<Array>} - Resultados de búsqueda
 */
export const searchSemantic = async (query, includeReferences = true) => {
  try {
    const response = await api.post('/search', {
      query,
      includeReferences,
    });

    return response.data.results;
  } catch (error) {
    console.error('Error en búsqueda semántica:', error);
    throw error;
  }
};

/**
 * Obtiene un artículo específico por número
 * @param {string|number} articleNumber - Número de artículo
 * @param {boolean} includeReferences - Indicador para incluir referencias
 * @returns {Promise<Object>} - Artículo con información detallada
 */
export const getArticleByNumber = async (articleNumber, includeReferences = true) => {
  try {
    const response = await api.get(`/article/${articleNumber}`, {
      params: { includeReferences },
    });

    return response.data.article;
  } catch (error) {
    console.error(`Error al obtener artículo ${articleNumber}:`, error);
    throw error;
  }
};

export default api;
