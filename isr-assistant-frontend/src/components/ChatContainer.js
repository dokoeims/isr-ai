import React, { useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { useChatContext } from '../context/ChatContext';

const ChatContainer = () => {
  const { messages, isLoading, error } = useChatContext();
  const chatEndRef = useRef(null);

  // Desplazar al final del chat cuando se añaden nuevos mensajes
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="bg-white rounded-lg shadow-md h-[calc(100vh-130px)] flex flex-col">
      <div className="p-4 overflow-y-auto flex-grow">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}

          {isLoading && (
            <div className="chat-bubble assistant-bubble flex items-center">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-100 text-red-800 p-3 rounded-lg">
              <p>{error}</p>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>
      </div>
      
      <ChatInput />
    </div>
  );
};

export default ChatContainer;
