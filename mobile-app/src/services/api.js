/**
 * services/api.js
 * 
 * Cliente Axios para consumir la API REST del backend Node.js.
 * Implementa:
 *  - Caché local con AsyncStorage (optimización de performance)
 *  - Interceptores de request/response para logging y manejo de errores
 *  - Métodos tipados para cada endpoint de los 3 juegos
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Configuración base de Axios ────────────────────────────────────────────
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de TTL para caché

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// ── Interceptor de Request: inyectar token de autenticación ───────────────
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('@auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // Si falla AsyncStorage, continúa sin token
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Interceptor de Response: manejo global de errores ─────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.message || 'Error de red desconocido';
    console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url} → ${message}`);
    return Promise.reject(new Error(message));
  },
);

// ────────────────────────────────────────────────────────────────────────────
// UTILIDADES DE CACHÉ (AsyncStorage)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Lee un valor cacheado. Retorna null si expiró o no existe.
 */
const readCache = async (key) => {
  try {
    const raw = await AsyncStorage.getItem(`@cache_${key}`);
    if (!raw) return null;
    const { data, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) {
      await AsyncStorage.removeItem(`@cache_${key}`);
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

/**
 * Guarda un valor en caché con TTL.
 */
const writeCache = async (key, data) => {
  try {
    const payload = { data, expiresAt: Date.now() + CACHE_TTL_MS };
    await AsyncStorage.setItem(`@cache_${key}`, JSON.stringify(payload));
  } catch (e) {
    console.warn('[Caché] No se pudo guardar:', e.message);
  }
};

// ────────────────────────────────────────────────────────────────────────────
// MÓDULO SNAKE BATTLE ROYALE
// ────────────────────────────────────────────────────────────────────────────
export const snakeAPI = {
  /**
   * GET /api/snake/leaderboard
   * Usa caché local; solo llama a la red si el caché expiró.
   */
  getLeaderboard: async (limit = 20) => {
    const cacheKey = `snake_leaderboard_${limit}`;
    const cached = await readCache(cacheKey);
    if (cached) {
      console.log('[Caché] Leaderboard Snake desde caché local');
      return cached;
    }
    const { data } = await apiClient.get(`/snake/leaderboard?limit=${limit}`);
    await writeCache(cacheKey, data);
    return data;
  },

  /**
   * POST /api/snake/score
   * Guarda el puntaje de un jugador al morir.
   */
  saveScore: async ({ playerId, playerName, score, maxSize }) => {
    const { data } = await apiClient.post('/snake/score', { playerId, playerName, score, maxSize });
    // Invalida el caché del leaderboard al guardar un nuevo puntaje
    await AsyncStorage.removeItem('@cache_snake_leaderboard_20');
    return data;
  },
};

// ────────────────────────────────────────────────────────────────────────────
// MÓDULO WILD WEST QUICK DRAW
// ────────────────────────────────────────────────────────────────────────────
export const wildWestAPI = {
  /**
   * POST /api/wildwest/duel
   * Guarda resultado y tiempo de reacción de un duelo.
   */
  saveDuelStat: async ({ playerId, playerName, result, reactionTimeMs }) => {
    const { data } = await apiClient.post('/wildwest/duel', { playerId, playerName, result, reactionTimeMs });
    return data;
  },

  /**
   * GET /api/wildwest/stats/:playerId
   * Obtiene promedio de reacción y estadísticas del jugador.
   * Usa caché local de 5 minutos.
   */
  getPlayerStats: async (playerId) => {
    const cacheKey = `wildwest_stats_${playerId}`;
    const cached = await readCache(cacheKey);
    if (cached) return cached;
    const { data } = await apiClient.get(`/wildwest/stats/${playerId}`);
    await writeCache(cacheKey, data);
    return data;
  },
};

// ────────────────────────────────────────────────────────────────────────────
// MÓDULO MUNDO ZEN (CHAT)
// ────────────────────────────────────────────────────────────────────────────
export const zenAPI = {
  /**
   * GET /api/zen/chat
   * Carga los últimos 50 mensajes del chat. Caché de 30 segundos.
   */
  getMessages: async () => {
    const cacheKey = 'zen_chat_messages';
    const cached = await readCache(cacheKey);
    if (cached) return cached;
    const { data } = await apiClient.get('/zen/chat');
    // Caché corto para el chat (30 segundos)
    const payload = { data, expiresAt: Date.now() + 30000 };
    await AsyncStorage.setItem(`@cache_${cacheKey}`, JSON.stringify(payload));
    return data;
  },

  /**
   * POST /api/zen/chat
   * Envía un nuevo mensaje al chat.
   */
  sendMessage: async ({ playerId, playerName, message }) => {
    const { data } = await apiClient.post('/zen/chat', { playerId, playerName, message });
    await AsyncStorage.removeItem('@cache_zen_chat_messages');
    return data;
  },

  /**
   * DELETE /api/zen/chat/:id
   * Elimina un mensaje propio del chat.
   */
  deleteMessage: async (messageId, playerId) => {
    const { data } = await apiClient.delete(`/zen/chat/${messageId}?playerId=${playerId}`);
    await AsyncStorage.removeItem('@cache_zen_chat_messages');
    return data;
  },
};

export default apiClient;
