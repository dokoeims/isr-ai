require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { split } = require('sentence-splitter');

// Rutas de archivos
const PDF_PATH = process.env.PDF_PATH;
const OUTPUT_PATH = process.env.CHUNKS_OUTPUT_PATH;

/**
 * Extrae texto del PDF
 */
async function extractTextFromPdf(pdfPath) {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Error al extraer texto del PDF:', error);
    throw error;
  }
}

/**
 * Identifica la estructura jerárquica (título, capítulo, artículo, etc.)
 */
function identifyStructure(text) {
  // Dividir por líneas
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  const structuredContent = [];
  let currentSection = {};
  
  // Patrones para identificar partes de la estructura
  const titlePattern = /^TÍTULO\s+([IVXLCDM]+)\b/i;
  const chapterPattern = /^CAPÍTULO\s+([IVXLCDM]+)\b/i;
  const articlePattern = /^Artículo\s+(\d+)(?:\s*[.-]\s*|\.\s*-\s*|\s+)/i;
  const fractionPattern = /^([IVXLCDM]+)\.\s+/i;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detectar título
    if (titlePattern.test(line)) {
      const match = line.match(titlePattern);
      if (currentSection.type) {
        structuredContent.push(currentSection);
      }
      currentSection = {
        type: 'title',
        number: match[1],
        content: line,
        children: []
      };
    } 
    // Detectar capítulo
    else if (chapterPattern.test(line)) {
      const match = line.match(chapterPattern);
      if (currentSection.type === 'title') {
        currentSection.children.push({
          type: 'chapter',
          number: match[1],
          content: line,
          children: []
        });
      } else if (currentSection.type === 'chapter') {
        structuredContent.push(currentSection);
        currentSection = {
          type: 'chapter',
          number: match[1],
          content: line,
          children: []
        };
      } else {
        if (currentSection.type) {
          structuredContent.push(currentSection);
        }
        currentSection = {
          type: 'chapter',
          number: match[1],
          content: line,
          children: []
        };
      }
    } 
    // Detectar artículo
    else if (articlePattern.test(line)) {
      const match = line.match(articlePattern);
      const articleNumber = match[1];
      
      // Obtener el contenido completo del artículo (puede abarcar varias líneas)
      let articleContent = line;
      let j = i + 1;
      while (j < lines.length && !titlePattern.test(lines[j]) && 
             !chapterPattern.test(lines[j]) && !articlePattern.test(lines[j])) {
        articleContent += '\n' + lines[j];
        j++;
      }
      
      // Añadir artículo a la estructura
      const article = {
        type: 'article',
        number: articleNumber,
        content: articleContent,
        children: []
      };
      
      // Procesar fracciones si existen
      const fractions = extractFractions(articleContent);
      if (fractions.length > 0) {
        article.children = fractions;
      }
      
      if (currentSection.type === 'chapter') {
        currentSection.children.push(article);
      } else if (currentSection.type === 'title' && currentSection.children.length > 0) {
        const lastChapter = currentSection.children[currentSection.children.length - 1];
        lastChapter.children.push(article);
      } else {
        structuredContent.push(article);
      }
      
      i = j - 1; // Ajustar el índice para continuar después del artículo completo
    }
    // Si no se detecta ninguna estructura, agregar como contenido adicional
    else if (currentSection.type) {
      currentSection.content += '\n' + line;
    }
  }
  
  // Añadir la última sección si existe
  if (currentSection.type) {
    structuredContent.push(currentSection);
  }
  
  return structuredContent;
}

/**
 * Extrae fracciones de un artículo
 */
function extractFractions(articleContent) {
  const fractions = [];
  const fractionPattern = /([IVXLCDM]+)\.\s+(.*?)(?=\n[IVXLCDM]+\.|$)/gs;
  
  let match;
  while ((match = fractionPattern.exec(articleContent)) !== null) {
    fractions.push({
      type: 'fraction',
      number: match[1],
      content: match[2].trim()
    });
  }
  
  return fractions;
}

/**
 * Divide el contenido en chunks manejables
 */
function createChunks(structuredContent) {
  const chunks = [];
  
  // Función recursiva para procesar la estructura
  function processStructure(item, context = {}) {
    const newContext = { ...context };
    
    // Actualizar el contexto según el tipo de elemento
    if (item.type === 'title') {
      newContext.title = item.content;
      newContext.titleNumber = item.number;
    } else if (item.type === 'chapter') {
      newContext.chapter = item.content;
      newContext.chapterNumber = item.number;
    } else if (item.type === 'article') {
      // Para artículos, crear un chunk
      const chunk = {
        id: `art-${item.number}`,
        content: item.content,
        metadata: {
          type: 'article',
          number: item.number,
          title: newContext.title || '',
          titleNumber: newContext.titleNumber || '',
          chapter: newContext.chapter || '',
          chapterNumber: newContext.chapterNumber || '',
          references: extractReferences(item.content)
        }
      };
      chunks.push(chunk);
      
      // Si el artículo es muy largo, dividirlo en sub-chunks
      if (item.content.length > 800) {
        const sentences = split(item.content).filter(s => s.type === 'Sentence').map(s => s.raw);
        let subChunkContent = '';
        let subChunkIndex = 1;
        
        for (const sentence of sentences) {
          if ((subChunkContent + sentence).length <= 500) {
            subChunkContent += ' ' + sentence;
          } else {
            // Crear sub-chunk
            chunks.push({
              id: `art-${item.number}-sub-${subChunkIndex}`,
              content: subChunkContent.trim(),
              metadata: {
                type: 'article-part',
                number: `${item.number}.${subChunkIndex}`,
                title: newContext.title || '',
                titleNumber: newContext.titleNumber || '',
                chapter: newContext.chapter || '',
                chapterNumber: newContext.chapterNumber || '',
                parentArticle: item.number,
                references: extractReferences(subChunkContent)
              }
            });
            
            subChunkContent = sentence;
            subChunkIndex++;
          }
        }
        
        // Añadir el último sub-chunk si queda contenido
        if (subChunkContent.trim().length > 0) {
          chunks.push({
            id: `art-${item.number}-sub-${subChunkIndex}`,
            content: subChunkContent.trim(),
            metadata: {
              type: 'article-part',
              number: `${item.number}.${subChunkIndex}`,
              title: newContext.title || '',
              titleNumber: newContext.titleNumber || '',
              chapter: newContext.chapter || '',
              chapterNumber: newContext.chapterNumber || '',
              parentArticle: item.number,
              references: extractReferences(subChunkContent)
            }
          });
        }
      }
    }
    
    // Procesar hijos recursivamente
    if (item.children && item.children.length > 0) {
      for (const child of item.children) {
        processStructure(child, newContext);
      }
    }
  }
  
  // Procesar cada elemento en la estructura
  for (const item of structuredContent) {
    processStructure(item);
  }
  
  return chunks;
}

/**
 * Extrae referencias a otros artículos
 */
function extractReferences(text) {
  const references = [];
  // Patrón para detectar referencias a artículos
  const referencePattern = /artículos?\s+(\d+)(?:\s*,\s*|\s*y\s*|\s+)/gi;
  
  let match;
  while ((match = referencePattern.exec(text)) !== null) {
    references.push(match[1]);
  }
  
  return [...new Set(references)]; // Eliminar duplicados
}

/**
 * Función principal para procesar el PDF
 */
async function processPdf() {
  try {
    console.log('Iniciando procesamiento del PDF...');
    
    // 1. Extraer texto del PDF
    console.log(`Extrayendo texto de ${PDF_PATH}...`);
    const pdfText = await extractTextFromPdf(PDF_PATH);
    
    // 2. Identificar estructura del documento
    console.log('Identificando estructura del documento...');
    const structuredContent = identifyStructure(pdfText);
    
    // 3. Crear chunks manejables
    console.log('Creando chunks para procesamiento...');
    const chunks = createChunks(structuredContent);
    
    // 4. Guardar chunks procesados
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(chunks, null, 2));
    console.log(`Procesamiento completado. Chunks guardados en ${OUTPUT_PATH}`);
    
    return chunks;
  } catch (error) {
    console.error('Error en el procesamiento del PDF:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  processPdf().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = {
  processPdf,
  extractTextFromPdf,
  identifyStructure,
  createChunks
};
