/**
 * server.js - Punto de entrada del Backend API REST
 * AppMovil-API-Cloud | Node.js + Express
 * 
 * Expone endpoints para:
 *  - /api/snake    → Leaderboard del Snake Battle Royale
 *  - /api/wildwest → Estadísticas del Wild West Quick Draw
 *  - /api/zen/chat → Sistema de chat del Mundo Zen
 */

require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const compression = require('compression');
const morgan      = require('morgan');
const rateLimit   = require('express-rate-limit');

// ── Importar rutas ──────────────────────────────────────────────────────────
const snakeRoutes   = require('./routes/snake.routes');
const wildWestRoutes = require('./routes/wildwest.routes');
const zenRoutes     = require('./routes/zen.routes');

const app  = express();
app.set('trust proxy', 1); // Confía en el primer proxy (Render)
const PORT = process.env.PORT || 3001;

// ── Middlewares de Seguridad ────────────────────────────────────────────────
app.use(helmet());                // Cabeceras de seguridad HTTP
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST', 'DELETE', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Optimización: Compresión Gzip de respuestas JSON ───────────────────────
app.use(compression({
  level: 6,         // Nivel de compresión (equilibrio velocidad/tamaño)
  threshold: 1024,  // Solo comprimir respuestas > 1KB
}));

// ── Parsing y Logging ───────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ── Rate Limiting: Protección anti-abuso ────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200,                  // Máximo 200 requests por ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Inténtalo en 15 minutos.' },
});
app.use('/api', limiter);

// ── Cache Control: Forzar datos frescos en el Leaderboard ───────────────────
app.use('/api/snake/leaderboard', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// ── Rutas API ───────────────────────────────────────────────────────────────
app.use('/api/snake',   snakeRoutes);
app.use('/api/wildwest', wildWestRoutes);
app.use('/api/zen',     zenRoutes);

// ── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    project: 'AppMovil-API-Cloud',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── Manejador de rutas no encontradas ───────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Ruta ${req.originalUrl} no encontrada.` });
});

// ── Manejador global de errores ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error Global]', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
  });
});

// ── Iniciar servidor ────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Backend API corriendo en http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
