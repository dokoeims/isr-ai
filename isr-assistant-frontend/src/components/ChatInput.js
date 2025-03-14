import React, { useState } from 'react';
import { useChatContext } from '../context/ChatContext';

const ChatInput = () => {
  const [input, setInput] = useState('');
  const { sendMessage, isLoading } = useChatContext();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className="border-t border-gray-200 p-4"
    >
      <div className="flex items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu pregunta sobre la Ley ISR..."
          className="flex-grow px-4 py-2 bg-gray-50 border border-gray-300 rounded-l-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="bg-blue-700 text-white p-2 rounded-r-full hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-400"
          disabled={isLoading || !input.trim()}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-6 w-6"
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 10l7-7m0 0l7 7m-7-7v18" 
              transform="rotate(90 12 12)"
            />
          </svg>
        </button>
      </div>
    </form>
  );
};

export default ChatInput;
