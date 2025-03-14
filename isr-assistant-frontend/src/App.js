import React from 'react';
import Header from './components/Header';
import ChatContainer from './components/ChatContainer';
import ReferencesPanel from './components/ReferencesPanel';
import { useChatContext } from './context/ChatContext';

function App() {
  const { selectedReference } = useChatContext();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-3/5">
            <ChatContainer />
          </div>
          <div className="w-full lg:w-2/5">
            <ReferencesPanel />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
