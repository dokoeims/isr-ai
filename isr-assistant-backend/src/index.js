require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./api/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api', apiRoutes);

// Ruta base
app.get('/', (req, res) => {
  res.json({
    message: 'API del Asistente de Ley ISR México',
    status: 'online',
    version: '1.0.0'
  });
});

// Manejador de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Ha ocurrido un error en el servidor',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
