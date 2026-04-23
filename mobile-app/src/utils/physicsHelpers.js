/**
 * utils/physicsHelpers.js
 * 
 * Utilidades de físicas 2D para el Menú Anti-Gravedad y los juegos.
 * Incluye funciones para:
 *  - Colisión círculo-círculo
 *  - Cálculo de velocidad tras rebote
 *  - Lerp (interpolación lineal) para movimiento suave
 *  - Mitigación de lag: extrapolación de posición basada en velocidad
 */

/**
 * Detecta colisión entre dos círculos
 * @param {{ x: number, y: number }} c1 - Centro del círculo 1
 * @param {number} r1 - Radio del círculo 1
 * @param {{ x: number, y: number }} c2 - Centro del círculo 2
 * @param {number} r2 - Radio del círculo 2
 * @returns {boolean}
 */
export const circleCollision = (c1, r1, c2, r2) => {
  const dx   = c2.x - c1.x;
  const dy   = c2.y - c1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < r1 + r2;
};

/**
 * Interpola linealmente entre dos valores
 * Útil para suavizar movimiento y animaciones
 * @param {number} a - Valor inicial
 * @param {number} b - Valor objetivo
 * @param {number} t - Factor [0, 1]
 * @returns {number}
 */
export const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Extrapola la posición de un jugador remoto para compensar lag de red.
 * Basado en su última posición conocida y velocidad calculada.
 * 
 * @param {{ x: number, y: number }} lastPos - Última posición conocida
 * @param {{ vx: number, vy: number }} velocity - Velocidad en píxeles/ms
 * @param {number} lastTimestamp - Timestamp cuando se recibió lastPos
 * @returns {{ x: number, y: number }} - Posición extrapolada
 */
export const extrapolatePosition = (lastPos, velocity, lastTimestamp) => {
  const elapsed = Date.now() - lastTimestamp;
  return {
    x: lastPos.x + velocity.vx * elapsed,
    y: lastPos.y + velocity.vy * elapsed,
  };
};

/**
 * Calcula la velocidad de rebote en un eje dado el coeficiente de restitución.
 * @param {number} v - Velocidad actual en el eje
 * @param {number} restitution - [0-1] (1 = rebote perfecto, 0 = sin rebote)
 * @returns {number}
 */
export const bounceVelocity = (v, restitution = 0.7) => -v * restitution;

/**
 * Normaliza un vector 2D (lo convierte a longitud 1)
 * @param {{ x: number, y: number }} v
 * @returns {{ x: number, y: number }}
 */
export const normalizeVector = (v) => {
  const mag = Math.sqrt(v.x * v.x + v.y * v.y);
  if (mag === 0) return { x: 0, y: 0 };
  return { x: v.x / mag, y: v.y / mag };
};

/**
 * Mantiene un valor dentro de límites [min, max]
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * Genera una posición aleatoria dentro de un área dada
 * @param {number} maxX
 * @param {number} maxY
 * @param {number} padding - Margen mínimo desde los bordes
 * @returns {{ x: number, y: number }}
 */
export const randomPosition = (maxX, maxY, padding = 30) => ({
  x: padding + Math.random() * (maxX - padding * 2),
  y: padding + Math.random() * (maxY - padding * 2),
});
