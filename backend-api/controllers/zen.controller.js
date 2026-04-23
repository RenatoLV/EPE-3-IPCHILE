/**
 * controllers/zen.controller.js
 * 
 * Controladores para el Mundo Zen Virtual (Sistema de Chat).
 * Implementa GET, POST y DELETE de mensajes del chat global.
 */

const { zenChatModel } = require('../models/inMemoryStore');

/**
 * GET /api/zen/chat
 * Retorna los últimos 50 mensajes del chat global del Mundo Zen.
 */
const getMessages = (req, res) => {
  try {
    const messages = zenChatModel.getMessages();
    res.json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (error) {
    console.error('[Zen] Error al obtener mensajes:', error);
    res.status(500).json({ success: false, error: 'Error al cargar mensajes del chat' });
  }
};

/**
 * POST /api/zen/chat
 * Envía un nuevo mensaje al chat global.
 * Body esperado: { playerId, playerName, message }
 */
const sendMessage = (req, res) => {
  try {
    const { playerId, playerName, message } = req.body;

    // Validación
    if (!playerId || !playerName || !message) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: playerId, playerName, message',
      });
    }

    if (message.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'El mensaje no puede estar vacío' });
    }

    if (message.length > 200) {
      return res.status(400).json({ success: false, error: 'El mensaje no puede superar 200 caracteres' });
    }

    const entry = zenChatModel.sendMessage({ playerId, playerName, message: message.trim() });
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    console.error('[Zen] Error al enviar mensaje:', error);
    res.status(500).json({ success: false, error: 'Error al enviar mensaje' });
  }
};

/**
 * DELETE /api/zen/chat/:id
 * Elimina un mensaje del chat (solo el dueño puede borrarlo).
 * Query esperado: ?playerId=xxx (para verificar autoría)
 */
const deleteMessage = (req, res) => {
  try {
    const { id } = req.params;
    const { playerId } = req.query;

    if (!playerId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere playerId como query param para verificar autoría',
      });
    }

    const result = zenChatModel.deleteMessage(id, playerId);

    if (!result.success) {
      const statusCode = result.reason.includes('No autorizado') ? 403 : 404;
      return res.status(statusCode).json({ success: false, error: result.reason });
    }

    res.json({ success: true, message: 'Mensaje eliminado correctamente', deleted: result.deleted });
  } catch (error) {
    console.error('[Zen] Error al eliminar mensaje:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar mensaje' });
  }
};

module.exports = { getMessages, sendMessage, deleteMessage };
