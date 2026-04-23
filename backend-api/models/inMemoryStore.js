/**
 * models/inMemoryStore.js
 * 
 * Almacenamiento en memoria como base de datos simple para el backend.
 * En producción se reemplazaría por MongoDB o PostgreSQL.
 * Cumple el requisito de tener una capa de "modelo" separada.
 */

const { v4: uuidv4 } = require('uuid');

// ── SNAKE: Leaderboard ───────────────────────────────────────────────────────
let snakeLeaderboard = [
  { id: uuidv4(), playerId: 'demo1', playerName: 'Gamer_X', score: 1500, maxSize: 12, createdAt: new Date().toISOString() },
  { id: uuidv4(), playerId: 'demo2', playerName: 'Pro_Snake', score: 1200, maxSize: 9,  createdAt: new Date().toISOString() },
  { id: uuidv4(), playerId: 'demo3', playerName: 'Rookie',    score: 800,  maxSize: 5,  createdAt: new Date().toISOString() },
];

// ── WILD WEST: Estadísticas de Duelos ───────────────────────────────────────
let wildWestStats = [
  { id: uuidv4(), playerId: 'demo1', playerName: 'Cowboy_1', result: 'win',  reactionTimeMs: 380, createdAt: new Date().toISOString() },
  { id: uuidv4(), playerId: 'demo2', playerName: 'Sheriff',  result: 'loss', reactionTimeMs: 512, createdAt: new Date().toISOString() },
];

// ── ZEN WORLD: Mensajes de Chat ──────────────────────────────────────────────
let zenChatMessages = [
  { id: uuidv4(), playerId: 'demo1', playerName: 'Espíritu_1', message: '¡Bienvenidos al Mundo Zen! 🌸', createdAt: new Date().toISOString() },
  { id: uuidv4(), playerId: 'demo2', playerName: 'Alma_Libre',  message: 'Qué paz se siente aquí... ✨',   createdAt: new Date().toISOString() },
];

// ────────────────────────────────────────────────────────────────────────────
// MÉTODOS SNAKE
// ────────────────────────────────────────────────────────────────────────────
const snakeModel = {
  /** Obtiene el leaderboard ordenado por puntaje descendente */
  getLeaderboard: (limit = 20) =>
    [...snakeLeaderboard]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit),

  /** Guarda un nuevo puntaje de Snake */
  saveScore: ({ playerId, playerName, score, maxSize }) => {
    const entry = { id: uuidv4(), playerId, playerName, score, maxSize, createdAt: new Date().toISOString() };
    snakeLeaderboard.push(entry);
    return entry;
  },
};

// ────────────────────────────────────────────────────────────────────────────
// MÉTODOS WILD WEST
// ────────────────────────────────────────────────────────────────────────────
const wildWestModel = {
  /** Guarda estadísticas de un duelo */
  saveDuelStat: ({ playerId, playerName, result, reactionTimeMs }) => {
    const entry = { id: uuidv4(), playerId, playerName, result, reactionTimeMs, createdAt: new Date().toISOString() };
    wildWestStats.push(entry);
    return entry;
  },

  /** Calcula el promedio de tiempo de reacción de un jugador */
  getPlayerAvgReaction: (playerId) => {
    const playerStats = wildWestStats.filter(s => s.playerId === playerId);
    if (!playerStats.length) return null;
    const avg = playerStats.reduce((sum, s) => sum + s.reactionTimeMs, 0) / playerStats.length;
    return {
      playerId,
      totalDuels: playerStats.length,
      wins: playerStats.filter(s => s.result === 'win').length,
      losses: playerStats.filter(s => s.result === 'loss').length,
      avgReactionTimeMs: Math.round(avg),
    };
  },
};

// ────────────────────────────────────────────────────────────────────────────
// MÉTODOS ZEN CHAT
// ────────────────────────────────────────────────────────────────────────────
const zenChatModel = {
  /** Obtiene los últimos 50 mensajes del chat */
  getMessages: () =>
    [...zenChatMessages]
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .slice(-50),

  /** Envía un nuevo mensaje al chat */
  sendMessage: ({ playerId, playerName, message }) => {
    const entry = { id: uuidv4(), playerId, playerName, message, createdAt: new Date().toISOString() };
    zenChatMessages.push(entry);
    return entry;
  },

  /** Elimina un mensaje por ID (solo el dueño puede borrar) */
  deleteMessage: (messageId, requestingPlayerId) => {
    const idx = zenChatMessages.findIndex(m => m.id === messageId);
    if (idx === -1) return { success: false, reason: 'Mensaje no encontrado' };
    if (zenChatMessages[idx].playerId !== requestingPlayerId) {
      return { success: false, reason: 'No autorizado: solo puedes borrar tus propios mensajes' };
    }
    const deleted = zenChatMessages.splice(idx, 1)[0];
    return { success: true, deleted };
  },
};

module.exports = { snakeModel, wildWestModel, zenChatModel };
