/**
 * routes/snake.routes.js
 * Rutas REST del módulo Snake Battle Royale.
 * 
 *  GET  /api/snake/leaderboard   → Leaderboard histórico
 *  POST /api/snake/score         → Guardar puntaje al morir
 */

const express = require('express');
const router  = express.Router();
const { getLeaderboard, saveScore } = require('../controllers/snake.controller');

router.get('/leaderboard', getLeaderboard);
router.post('/score',      saveScore);

module.exports = router;
