/**
 * controllers/wildwest.controller.js
 * 
 * Controladores para Wild West Quick Draw.
 * Gestiona estadísticas de duelos y tiempos de reacción.
 */

const { wildWestModel } = require('../models/inMemoryStore');

/**
 * POST /api/wildwest/duel
 * Guarda el resultado de un duelo y el tiempo de reacción del jugador.
 * Body esperado: { playerId, playerName, result, reactionTimeMs }
 */
const saveDuelStat = (req, res) => {
  try {
    const { playerId, playerName, result, reactionTimeMs } = req.body;

    // Validación
    if (!playerId || !playerName || !result || reactionTimeMs === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: playerId, playerName, result (win|loss), reactionTimeMs',
      });
    }

    if (!['win', 'loss'].includes(result)) {
      return res.status(400).json({
        success: false,
        error: 'result debe ser "win" o "loss"',
      });
    }

    if (typeof reactionTimeMs !== 'number' || reactionTimeMs < 0) {
      return res.status(400).json({
        success: false,
        error: 'reactionTimeMs debe ser un número positivo (milisegundos)',
      });
    }

    const entry = wildWestModel.saveDuelStat({ playerId, playerName, result, reactionTimeMs });
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    console.error('[WildWest] Error al guardar estadística:', error);
    res.status(500).json({ success: false, error: 'Error al guardar estadística de duelo' });
  }
};

/**
 * GET /api/wildwest/stats/:playerId
 * Retorna el promedio de tiempo de reacción y estadísticas del jugador.
 */
const getPlayerStats = (req, res) => {
  try {
    const { playerId } = req.params;
    if (!playerId) {
      return res.status(400).json({ success: false, error: 'playerId es requerido' });
    }

    const stats = wildWestModel.getPlayerAvgReaction(playerId);
    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'No se encontraron estadísticas para este jugador',
      });
    }

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('[WildWest] Error al obtener estadísticas:', error);
    res.status(500).json({ success: false, error: 'Error al obtener estadísticas' });
  }
};

module.exports = { saveDuelStat, getPlayerStats };
