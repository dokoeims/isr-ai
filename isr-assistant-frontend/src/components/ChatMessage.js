import React from 'react';
import ReactMarkdown from 'react-markdown';

const ChatMessage = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`chat-bubble ${isUser ? 'user-bubble' : 'assistant-bubble'}`}>
      <ReactMarkdown className="whitespace-pre-wrap">
        {message.content}
      </ReactMarkdown>
    </div>
  );
};

export default ChatMessage;
