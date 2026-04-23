/**
 * routes/zen.routes.js
 * Rutas REST del módulo Mundo Zen Virtual (Chat).
 * 
 *  GET    /api/zen/chat     → Obtener últimos 50 mensajes
 *  POST   /api/zen/chat     → Enviar un mensaje
 *  DELETE /api/zen/chat/:id → Borrar mensaje propio (?playerId=xxx)
 */

const express = require('express');
const router  = express.Router();
const { getMessages, sendMessage, deleteMessage } = require('../controllers/zen.controller');

router.get('/chat',      getMessages);
router.post('/chat',     sendMessage);
router.delete('/chat/:id', deleteMessage);

module.exports = router;
