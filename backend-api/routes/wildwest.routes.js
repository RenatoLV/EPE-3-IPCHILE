/**
 * routes/wildwest.routes.js
 * Rutas REST del módulo Wild West Quick Draw.
 * 
 *  POST /api/wildwest/duel          → Guardar resultado de duelo
 *  GET  /api/wildwest/stats/:playerId → Estadísticas del jugador
 */

const express = require('express');
const router  = express.Router();
const { saveDuelStat, getPlayerStats } = require('../controllers/wildwest.controller');

router.post('/duel',          saveDuelStat);
router.get('/stats/:playerId', getPlayerStats);

module.exports = router;
