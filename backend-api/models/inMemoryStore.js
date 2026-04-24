/**
 * models/inMemoryStore.js
 * 
 * Almacenamiento en memoria optimizado: DATOS REALES Y ÚNICOS.
 * Se han eliminado los datos de prueba (Gamer_X, Pro_Snake, etc.) para que el ranking sea 100% real.
 */

const { v4: uuidv4 } = require('uuid');

// ── SNAKE: Leaderboard (EMPIEZA VACÍO PARA DATOS REALES) ──────────────────────
let snakeLeaderboard = [];

// ── WILD WEST: Estadísticas de Duelos ───────────────────────────────────────
let wildWestStats = [];

// ── ZEN WORLD ───────────────────────────────────────────────────────────────
let zenChatMessages = [];

// ────────────────────────────────────────────────────────────────────────────
// MÉTODOS SNAKE
// ────────────────────────────────────────────────────────────────────────────
const snakeModel = {
  /** Obtiene el TOP 5 GLOBAL con registros ÚNICOS por usuario */
  getLeaderboard: (limit = 5) => {
    return [...snakeLeaderboard]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  },

  /** Guarda el puntaje: Solo si es mejor que el anterior del mismo usuario */
  saveScore: ({ playerId, playerName, score, maxSize }) => {
    if (score <= 0) return null;

    console.log(`[Snake] Recibido score: ${score} para ${playerName} (${playerId})`);

    const existingIdx = snakeLeaderboard.findIndex(s => s.playerId === playerId);
    
    if (existingIdx !== -1) {
      if (score > snakeLeaderboard[existingIdx].score) {
        console.log(`[Snake] NUEVO RECORD para ${playerName}: ${score}`);
        snakeLeaderboard[existingIdx] = {
          ...snakeLeaderboard[existingIdx],
          playerName, 
          score,
          maxSize,
          updatedAt: new Date().toISOString()
        };
      } else {
        console.log(`[Snake] Score ${score} no superó el récord de ${snakeLeaderboard[existingIdx].score}`);
      }
      return snakeLeaderboard[existingIdx];
    } else {
      console.log(`[Snake] Primer registro para ${playerName}: ${score}`);
      const entry = { id: uuidv4(), playerId, playerName, score, maxSize, createdAt: new Date().toISOString() };
      snakeLeaderboard.push(entry);
      return entry;
    }
  },
};

// ────────────────────────────────────────────────────────────────────────────
// MÉTODOS WILD WEST
// ────────────────────────────────────────────────────────────────────────────
const wildWestModel = {
  saveDuelStat: ({ playerId, playerName, result, reactionTimeMs }) => {
    const entry = { id: uuidv4(), playerId, playerName, result, reactionTimeMs, createdAt: new Date().toISOString() };
    wildWestStats.push(entry);
    return entry;
  },

  getPlayerStats: (playerId) => {
    const playerStats = wildWestStats.filter(s => s.playerId === playerId);
    if (!playerStats.length) return { wins: 0, losses: 0, avgReactionTimeMs: 0, bestReactionTimeMs: 0 };
    
    const wins = playerStats.filter(s => s.result === 'win');
    const avg = playerStats.reduce((sum, s) => sum + s.reactionTimeMs, 0) / playerStats.length;
    const best = wins.length > 0 ? Math.min(...wins.map(s => s.reactionTimeMs)) : 0;

    return {
      playerId,
      totalDuels: playerStats.length,
      wins: wins.length,
      losses: playerStats.length - wins.length,
      avgReactionTimeMs: Math.round(avg),
      bestReactionTimeMs: best,
    };
  },
};

const zenChatModel = {
  getMessages: () => [...zenChatMessages].slice(-50),
  sendMessage: ({ playerId, playerName, message }) => {
    const entry = { id: uuidv4(), playerId, playerName, message, createdAt: new Date().toISOString() };
    zenChatMessages.push(entry);
    return entry;
  },
};

module.exports = { snakeModel, wildWestModel, zenChatModel };
