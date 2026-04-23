/**
 * utils/lagMitigation.js
 * 
 * Estrategias de mitigación de lag para el sistema multijugador.
 * 
 * Técnicas implementadas:
 *  1. Dead Reckoning: Extrapola posición basándose en velocidad
 *  2. Client-Side Prediction: El cliente aplica acciones localmente
 *     sin esperar confirmación del servidor
 *  3. Timestamp-based comparison (Wild West): El juez es el timestamp
 *     local del evento, no el tiempo de llegada al servidor
 */

/**
 * Dead Reckoning — Extrapola la posición de un jugador remoto.
 * Se usa cuando no llega un update de Firebase a tiempo.
 * 
 * @param {object} remotePlayer - Datos del jugador remoto desde RTDB
 * @param {number} remotePlayer.x
 * @param {number} remotePlayer.y
 * @param {number} remotePlayer.vx - Velocidad X (px/ms)
 * @param {number} remotePlayer.vy - Velocidad Y (px/ms)
 * @param {number} remotePlayer.updatedAt - Timestamp del último update
 * @returns {{ x: number, y: number }}
 */
export const deadReckoning = (remotePlayer) => {
  const { x, y, vx = 0, vy = 0, updatedAt } = remotePlayer;
  const elapsed = Date.now() - updatedAt;
  // Solo extrapola hasta 500ms para evitar posiciones muy erróneas
  const safeElapsed = Math.min(elapsed, 500);
  return {
    x: x + vx * safeElapsed,
    y: y + vy * safeElapsed,
  };
};

/**
 * Calcula la velocidad de un jugador a partir de dos posiciones y timestamps.
 * Retorna vx, vy en px/ms.
 * 
 * @param {{ x: number, y: number, t: number }} prev
 * @param {{ x: number, y: number, t: number }} curr
 * @returns {{ vx: number, vy: number }}
 */
export const calcVelocity = (prev, curr) => {
  const dt = curr.t - prev.t;
  if (dt === 0) return { vx: 0, vy: 0 };
  return {
    vx: (curr.x - prev.x) / dt,
    vy: (curr.y - prev.y) / dt,
  };
};

/**
 * Timestamp Comparison — Método de mitigación de lag para Wild West.
 * Determina el ganador de un duelo basándose en tiempos de reacción locales.
 * El lag de red NO afecta el resultado porque comparamos timestamps,
 * no el orden de llegada al servidor.
 * 
 * @param {number} myReactionMs - Mi tiempo de reacción local (ms)
 * @param {number} enemyReactionMs - Tiempo de reacción del enemigo (ms)
 * @returns {'win' | 'loss' | 'draw'}
 */
export const determineWinner = (myReactionMs, enemyReactionMs) => {
  if (myReactionMs < enemyReactionMs) return 'win';
  if (myReactionMs > enemyReactionMs) return 'loss';
  return 'draw';
};

/**
 * Smoothing — Suaviza la transición entre la posición actual y la objetivo.
 * Reduce los "saltos" visuales cuando llega un update de Firebase.
 * 
 * @param {{ x: number, y: number }} current - Posición renderizada actualmente
 * @param {{ x: number, y: number }} target  - Nueva posición recibida
 * @param {number} alpha - Factor de suavizado [0-1], menor = más suave
 * @returns {{ x: number, y: number }}
 */
export const smoothPosition = (current, target, alpha = 0.15) => ({
  x: current.x + (target.x - current.x) * alpha,
  y: current.y + (target.y - current.y) * alpha,
});
