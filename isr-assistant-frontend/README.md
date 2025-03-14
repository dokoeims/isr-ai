# Asistente Ley ISR México - Frontend

Este repositorio contiene el frontend para el Asistente de Ley ISR México, una aplicación que facilita la comprensión e interpretación de la Ley del Impuesto Sobre la Renta (ISR) de México mediante una interfaz de chat intuitiva y accesible.

## Características

- Interfaz de chat intuitiva para consultas en lenguaje natural
- Visualización de referencias originales de la ley
- Diseño responsivo para diferentes dispositivos
- Conexión con backend para procesamiento de consultas

## Requisitos previos

- Node.js v16 o superior
- Backend del Asistente ISR en funcionamiento

## Configuración

1. Clona este repositorio:

```bash
git clone <url-del-repositorio>
cd isr-assistant-frontend
```

2. Instala las dependencias:

```bash
npm install
```

3. Crea un archivo `.env` en la raíz del proyecto (o modifica el existente) con la URL del backend:

```
REACT_APP_API_URL=http://localhost:3000/api
```

## Ejecución

Para iniciar el servidor de desarrollo:

```bash
npm start
```

La aplicación estará disponible en `http://localhost:3000`.

## Estructura del proyecto

```
isr-assistant-frontend/
├── public/                # Archivos públicos
├── src/                   # Código fuente
│   ├── components/        # Componentes React
│   │   ├── ChatContainer.js   # Contenedor principal del chat
│   │   ├── ChatInput.js       # Entrada de texto para preguntas
│   │   ├── ChatMessage.js     # Componente de mensajes individuales
│   │   ├── Header.js          # Encabezado de la aplicación
│   │   ├── ReferenceItem.js   # Visualización de referencias individuales
│   │   └── ReferencesPanel.js # Panel de referencias legales
│   ├── context/           # Contextos de React
│   │   └── ChatContext.js # Contexto para gestión del estado del chat
│   ├── services/          # Servicios y API
│   │   └── api.js         # Funciones para comunicación con el backend
│   ├── styles/            # Estilos CSS
│   │   └── index.css      # Estilos principales
│   ├── App.js             # Componente principal
│   └── index.js           # Punto de entrada
└── package.json           # Dependencias y scripts
```

## Construcción para producción

Para construir la aplicación para producción:

```bash
npm run build
```

Esto generará una carpeta `build` con los archivos optimizados para un entorno de producción.

## Integración con el backend

Asegúrate de que el backend del Asistente ISR esté en funcionamiento en la URL especificada en el archivo `.env`. El frontend realiza las siguientes peticiones al backend:

- `POST /api/chat`: Envía preguntas al asistente
- `POST /api/chat/history`: Obtiene el historial de conversación
- `POST /api/search`: Realiza búsquedas semánticas
- `GET /api/article/:number`: Obtiene información sobre artículos específicos

## Próximos pasos

- Implementar pruebas unitarias y de integración
- Mejorar accesibilidad siguiendo estándares WCAG 2.1
- Añadir modo oscuro
- Implementar características de búsqueda avanzada

## Licencia

[MIT](LICENSE)
