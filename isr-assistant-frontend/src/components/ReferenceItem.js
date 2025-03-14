import React from 'react';

const ReferenceItem = ({ reference }) => {
  const handleCopyText = () => {
    navigator.clipboard.writeText(reference.content);
    alert('Texto copiado al portapapeles');
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="mb-2">
        <h3 className="text-blue-800 font-bold">{reference.article}</h3>
        {reference.title && <p className="text-sm text-gray-600">{reference.title}</p>}
        {reference.chapter && <p className="text-sm text-gray-600">{reference.chapter}</p>}
      </div>
      
      <div className="mt-4 border-t pt-2">
        <p className="text-gray-800 whitespace-pre-wrap">
          {reference.content}
        </p>
      </div>
      
      <div className="mt-4 flex justify-between">
        <button
          className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded border border-indigo-200 hover:bg-indigo-200 text-sm"
          onClick={() => window.open(`https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf#page=${reference.article.replace('Artículo ', '')}`, '_blank')}
        >
          Ver PDF
        </button>
        <button
          className="px-3 py-1 bg-green-100 text-green-800 rounded border border-green-200 hover:bg-green-200 text-sm"
          onClick={handleCopyText}
        >
          Copiar
        </button>
      </div>
      
      {reference.isReference && (
        <div className="mt-2 bg-yellow-50 p-2 rounded text-xs text-yellow-800">
          Este artículo es referenciado desde la consulta principal.
        </div>
      )}
    </div>
  );
};

export default ReferenceItem;
