# Asistente Ley ISR México - Backend

Este repositorio contiene el backend para el Asistente de Ley ISR México, una aplicación que facilita la comprensión e interpretación de la Ley del Impuesto Sobre la Renta (ISR) de México mediante procesamiento de lenguaje natural y búsqueda semántica.

## Características

- Extracción y procesamiento estructurado del PDF oficial de la Ley ISR
- Identificación automática de la estructura jerárquica (títulos, capítulos, artículos)
- Base de conocimiento vectorial para búsqueda semántica
- API REST para integración con frontend
- Generación de respuestas en lenguaje natural basadas en el texto original
- Seguimiento de referencias cruzadas entre artículos

## Requisitos previos

- Node.js v16 o superior
- Cuenta en OpenAI (para generación de embeddings y respuestas)
- Cuenta en Pinecone (para base de conocimiento vectorial)
- PDF oficial de la Ley ISR de México

## Configuración

1. Clona este repositorio:

```bash
git clone <url-del-repositorio>
cd isr-assistant-backend
```

2. Instala las dependencias:

```bash
npm install
```

3. Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```
# Configuración general
PORT=3000
NODE_ENV=development

# Configuración de la base de datos vectorial (Pinecone)
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=your-pinecone-environment
PINECONE_INDEX_NAME=isr-mexico

# Configuración del modelo de embeddings
OPENAI_API_KEY=your-openai-api-key

# Configuración de rutas
PDF_PATH=./data/ley_isr_actual.pdf
CHUNKS_OUTPUT_PATH=./data/processed_chunks.json
```

4. Coloca el PDF de la Ley ISR en la carpeta `data` con el nombre especificado en `PDF_PATH` (por defecto, `ley_isr_actual.pdf`).

## Preparación inicial

Antes de ejecutar la aplicación, es necesario procesar el PDF y crear la base de conocimiento:

```bash
node src/setup.js
```

Este proceso realizará las siguientes tareas:
- Extraer y procesar el contenido del PDF
- Identificar la estructura jerárquica
- Crear chunks para procesamiento
- Generar embeddings
- Almacenar vectores en Pinecone

## Ejecución

Para iniciar el servidor de desarrollo:

```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3000` (o el puerto especificado en `.env`).

## Estructura del proyecto

```
isr-assistant-backend/
├── data/                       # Datos procesados y PDF original
├── src/                        # Código fuente
│   ├── api/                    # API REST
│   │   ├── chatController.js   # Controlador para interacción conversacional
│   │   ├── routes.js           # Definición de rutas
│   │   └── searchController.js # Controlador para búsquedas
│   ├── knowledge-base/         # Gestión de la base de conocimiento
│   │   └── createVectors.js    # Creación de embeddings y almacenamiento
│   ├── pdf-processing/         # Procesamiento del PDF
│   │   └── processPdf.js       # Extracción y estructuración de texto
│   ├── search-engine/          # Motor de búsqueda semántica
│   │   └── semanticSearch.js   # Búsqueda y recuperación de información
│   ├── index.js                # Punto de entrada principal
│   └── setup.js                # Script de configuración inicial
└── package.json                # Dependencias y scripts
```

## API Endpoints

### Búsqueda

- `POST /api/search`: Realiza una búsqueda semántica
  ```json
  {
    "query": "¿Qué son las deducciones personales?",
    "includeReferences": true
  }
  ```

- `GET /api/article/:number`: Obtiene un artículo específico por número
  ```
  GET /api/article/151?includeReferences=true
  ```

### Chat

- `POST /api/chat`: Procesa una pregunta y genera respuesta
  ```json
  {
    "question": "¿Cuáles son las deducciones personales para personas físicas?",
    "chatId": "usuario123"
  }
  ```

- `POST /api/chat/history`: Obtiene el historial de conversación
  ```json
  {
    "chatId": "usuario123"
  }
  ```

## Próximos pasos

- Implementar tests unitarios y de integración
- Mejorar el manejo de referencias cruzadas
- Optimizar el procesamiento de PDF para manejar diferentes formatos
- Implementar sistema de versionado para actualizaciones de la ley

## Licencia

[MIT](LICENSE)
