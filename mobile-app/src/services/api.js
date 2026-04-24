import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Creamos la instancia con la URL de Render desde las variables de entorno
const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
  timeout: 30000, // 30 segundos para manejar el "Cold Start" de Render
});

export const ApiService = {
  // ── MÓDULO SNAKE BATTLE ROYALE ──────────────────────────────────────────
  
  // GET: Obtener Leaderboard con persistencia en Caché Local
  getLeaderboard: async (params = '') => {
    try {
      const response = await apiClient.get(`/snake/leaderboard${params}`);
      // Guardamos en caché para uso offline o si el servidor está lento
      if (response.data.data) {
        await AsyncStorage.setItem('@leaderboard_cache', JSON.stringify(response.data.data));
      }
      return response.data.data;
    } catch (error) {
      console.warn("[API] Cargando leaderboard desde caché local...");
      const cache = await AsyncStorage.getItem('@leaderboard_cache');
      return cache ? JSON.parse(cache) : [];
    }
  },

  // POST: Guardar Puntaje tras Game Over
  postScore: async (scoreData) => {
    try {
      const { data } = await apiClient.post('/snake/score', scoreData);
      return data;
    } catch (error) {
      console.error("[API] Error al guardar puntaje:", error.message);
      throw error;
    }
  },

  // ── MÓDULO WILD WEST ────────────────────────────────────────────────────
  
  saveDuelStat: async (duelData) => {
    return await apiClient.post('/wildwest/duel', duelData);
  },

  getPlayerStats: async (playerId) => {
    const { data } = await apiClient.get(`/wildwest/stats/${playerId}`);
    return data;
  },

  // ── MÓDULO MUNDO ZEN (CHAT) ─────────────────────────────────────────────
  
  getMessages: async () => {
    const { data } = await apiClient.get('/zen/chat');
    return data;
  },

  sendMessage: async (msgData) => {
    return await apiClient.post('/zen/chat', msgData);
  },

  deleteMessage: async (id) => {
    return await apiClient.delete(`/zen/chat/${id}`);
  }
};

export default apiClient;
