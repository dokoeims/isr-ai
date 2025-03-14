import React, { createContext, useContext, useState, useEffect } from 'react';
import { getChatHistory, sendQuestion } from '../services/api';

const ChatContext = createContext();

export const useChatContext = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [references, setReferences] = useState([]);
  const [selectedReference, setSelectedReference] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState('user-' + Date.now()); // Generamos un ID único para el chat
  const [error, setError] = useState(null);

  // Cargar historial de chat al iniciar
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const history = await getChatHistory(chatId);
        if (history && history.length > 0) {
          setMessages(history);
        } else {
          // Si no hay historial, iniciamos con un mensaje de bienvenida
          setMessages([
            {
              role: 'assistant',
              content: '¡Hola! Soy tu asistente para resolver dudas sobre la Ley del Impuesto Sobre la Renta (ISR) de México. ¿En qué puedo ayudarte hoy?',
            },
          ]);
        }
      } catch (err) {
        console.error('Error al cargar el historial:', err);
        setError('No se pudo cargar el historial de chat');
      }
    };

    loadChatHistory();
  }, [chatId]);

  // Función para enviar una pregunta al asistente
  const sendMessage = async (question) => {
    if (!question.trim()) return;

    // Añadir la pregunta del usuario al chat
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendQuestion(question, chatId);
      
      if (response) {
        // Añadir la respuesta del asistente al chat
        setMessages((prev) => [...prev, { role: 'assistant', content: response.response }]);
        
        // Actualizar las referencias
        if (response.sourceReferences && response.sourceReferences.length > 0) {
          setReferences(response.sourceReferences);
          // Seleccionar la primera referencia por defecto
          setSelectedReference(response.sourceReferences[0]);
        }
      }
    } catch (err) {
      console.error('Error al enviar la pregunta:', err);
      setError('No se pudo obtener respuesta en este momento. Por favor, intenta de nuevo.');
      // Añadir un mensaje de error al chat
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Lo siento, no pude procesar tu pregunta en este momento. Por favor, intenta de nuevo.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        references,
        selectedReference,
        isLoading,
        error,
        chatId,
        sendMessage,
        setSelectedReference,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
