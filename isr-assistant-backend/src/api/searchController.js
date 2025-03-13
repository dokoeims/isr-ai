const { 
  searchInKnowledgeBase, 
  searchByArticleNumber, 
  expandContextWithReferences 
} = require('../search-engine/semanticSearch');

/**
 * Controlador para búsqueda semántica
 */
exports.semanticSearch = async (req, res) => {
  try {
    const { query, includeReferences = true, filter = {} } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Se requiere una consulta de búsqueda válida'
      });
    }
    
    // Realizar búsqueda semántica
    let searchResults = await searchInKnowledgeBase(query, {
      topK: 5,
      filter
    });
    
    // Expandir contexto con referencias si se solicita
    if (includeReferences && searchResults.length > 0) {
      searchResults = await expandContextWithReferences(searchResults);
    }
    
    return res.json({
      success: true,
      results: searchResults,
      query
    });
  } catch (error) {
    console.error('Error en la búsqueda semántica:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al procesar la búsqueda',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Controlador para buscar artículo por número
 */
exports.getArticleByNumber = async (req, res) => {
  try {
    const { number } = req.params;
    const { includeReferences = true } = req.query;
    
    if (!number || isNaN(Number(number))) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un número de artículo válido'
      });
    }
    
    // Buscar artículo por número
    let articleResults = await searchByArticleNumber(number);
    
    if (articleResults.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No se encontró el artículo ${number}`
      });
    }
    
    // Expandir contexto con referencias si se solicita
    if (includeReferences === 'true' || includeReferences === true) {
      articleResults = await expandContextWithReferences(articleResults);
    }
    
    return res.json({
      success: true,
      article: articleResults
    });
  } catch (error) {
    console.error(`Error al buscar artículo ${req.params.number}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Error al buscar el artículo',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
