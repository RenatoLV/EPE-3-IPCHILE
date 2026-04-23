/**
 * controllers/snake.controller.js
 * 
 * Controladores para el módulo Snake Battle Royale.
 * Maneja la lógica de negocio entre la ruta y el modelo.
 */

const { snakeModel } = require('../models/inMemoryStore');

/**
 * GET /api/snake/leaderboard
 * Retorna el leaderboard histórico ordenado por puntaje.
 */
const getLeaderboard = (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const leaderboard = snakeModel.getLeaderboard(limit);
    res.json({
      success: true,
      count: leaderboard.length,
      data: leaderboard,
    });
  } catch (error) {
    console.error('[Snake] Error al obtener leaderboard:', error);
    res.status(500).json({ success: false, error: 'Error al obtener leaderboard' });
  }
};

/**
 * POST /api/snake/score
 * Guarda el puntaje de supervivencia de un jugador al morir.
 * Body esperado: { playerId, playerName, score, maxSize }
 */
const saveScore = (req, res) => {
  try {
    const { playerId, playerName, score, maxSize } = req.body;

    // Validación de campos requeridos
    if (!playerId || !playerName || score === undefined || maxSize === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: playerId, playerName, score, maxSize',
      });
    }

    if (typeof score !== 'number' || typeof maxSize !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'score y maxSize deben ser números',
      });
    }

    const entry = snakeModel.saveScore({ playerId, playerName, score, maxSize });
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    console.error('[Snake] Error al guardar puntaje:', error);
    res.status(500).json({ success: false, error: 'Error al guardar puntaje' });
  }
};

module.exports = { getLeaderboard, saveScore };
