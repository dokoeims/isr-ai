import React from 'react';

const Header = () => {
  return (
    <header className="bg-blue-700 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-xl font-bold">Asistente Ley ISR México</h1>
        <button 
          className="bg-gray-200 text-blue-700 rounded-full w-10 h-10 flex items-center justify-center font-bold"
          title="Ayuda"
          onClick={() => alert('Asistente de la Ley del Impuesto Sobre la Renta (ISR) de México.\n\nFormula preguntas en lenguaje natural sobre la Ley ISR y te proporcionaré respuestas claras con referencias a los artículos específicos.')}
        >
          ?
        </button>
      </div>
    </header>
  );
};

export default Header;
