const express = require('express');
const searchController = require('./searchController');
const chatController = require('./chatController');

const router = express.Router();

// Rutas para búsqueda
router.post('/search', searchController.semanticSearch);
router.get('/article/:number', searchController.getArticleByNumber);

// Rutas para chat
router.post('/chat', chatController.processQuestion);
router.post('/chat/history', chatController.getChatHistory);

module.exports = router;
