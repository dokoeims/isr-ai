import React from 'react';
import ReferenceItem from './ReferenceItem';
import { useChatContext } from '../context/ChatContext';

const ReferencesPanel = () => {
  const { references, selectedReference, setSelectedReference } = useChatContext();

  return (
    <div className="bg-gray-50 rounded-lg shadow-md h-[calc(100vh-130px)] flex flex-col">
      <div className="bg-gray-200 p-4 rounded-t-lg">
        <h2 className="text-center font-bold text-gray-700">Referencias originales</h2>
      </div>
      
      <div className="overflow-y-auto flex-grow p-4">
        {references.length > 0 ? (
          <div>
            <div className="mb-4 space-y-2">
              {references.map((reference) => (
                <div 
                  key={reference.id}
                  className={`cursor-pointer p-2 rounded ${
                    selectedReference && selectedReference.id === reference.id 
                      ? 'bg-blue-100 border-l-4 border-blue-600' 
                      : 'hover:bg-blue-50'
                  }`}
                  onClick={() => setSelectedReference(reference)}
                >
                  <h3 className="font-medium text-blue-800">{reference.article}</h3>
                  <p className="text-sm text-gray-600 truncate">
                    {reference.title || reference.chapter}
                  </p>
                </div>
              ))}
            </div>
            
            {selectedReference && (
              <ReferenceItem reference={selectedReference} />
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500 mt-8">
            <p>Realiza una consulta para ver referencias del texto original de la Ley ISR</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferencesPanel;
