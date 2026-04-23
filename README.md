# AppMovil-API-Cloud

Ecosistema de 3 minijuegos multijugador móvil (React Native/Expo) con backend REST (Node.js/Express) y Firebase.

## 📁 Estructura del Proyecto

```
EPE3/
├── backend-api/          ← Node.js + Express REST API
│   ├── controllers/
│   │   ├── snake.controller.js
│   │   ├── wildwest.controller.js
│   │   └── zen.controller.js
│   ├── models/
│   │   └── inMemoryStore.js
│   ├── routes/
│   │   ├── snake.routes.js
│   │   ├── wildwest.routes.js
│   │   └── zen.routes.js
│   ├── server.js
│   ├── .env.example
│   └── package.json
│
└── mobile-app/           ← React Native (Expo)
    ├── src/
    │   ├── components/
    │   │   └── FloatingPlanet.js
    │   ├── navigation/
    │   │   └── AppNavigator.js
    │   ├── screens/
    │   │   ├── LoginScreen.js
    │   │   ├── MenuAntiGravedad/
    │   │   │   └── MenuAntiGravedad.js
    │   │   ├── SnakeBattleRoyale/
    │   │   │   └── SnakeBattleRoyale.js
    │   │   ├── WildWest/
    │   │   │   └── WildWestScreen.js
    │   │   └── ZenWorld/
    │   │       └── ZenWorldScreen.js
    │   ├── services/
    │   │   ├── api.js          ← Cliente Axios con caché AsyncStorage
    │   │   └── firebase.js     ← Inicialización Firebase SDK
    │   └── utils/
    │       ├── physicsHelpers.js
    │       └── lagMitigation.js
    ├── App.js
    ├── app.json
    ├── babel.config.js
    ├── .env.example
    └── package.json
```

## 🚀 Puesta en Marcha

### 1. Configurar variables de entorno

**Backend:**
```bash
cd backend-api
cp .env.example .env
# Edita .env con tus credenciales Firebase Admin SDK
```

**App Móvil:**
```bash
cd mobile-app
cp .env.example .env
# Edita .env con tu FIREBASE_API_KEY y FIREBASE_APP_ID
```

### 2. Instalar dependencias

```bash
# Backend
cd backend-api && npm install

# App Móvil
cd mobile-app && npm install
```

### 3. Ejecutar

```bash
# Terminal 1 — Backend API
cd backend-api && npm run dev

# Terminal 2 — App Expo
cd mobile-app && npx expo start
```

## 🔥 Firebase — Pasos de Configuración

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona el proyecto **appmovil-api-cloud** (ID: `appmovil-api-cloud`, Nº: `1006948232711`)
3. Habilita **Authentication** → Email/Contraseña
4. Habilita **Realtime Database** → Modo de prueba
5. Añade una app Web → Copia `apiKey` y `appId` al `.env` de mobile-app
6. Para el backend → Genera una clave privada de cuenta de servicio (Service Account)

## 🗺️ Endpoints API REST

| Módulo | Método | Ruta | Descripción |
|--------|--------|------|-------------|
| Snake | GET | `/api/snake/leaderboard` | Leaderboard histórico |
| Snake | POST | `/api/snake/score` | Guardar puntaje |
| WildWest | POST | `/api/wildwest/duel` | Guardar estadística de duelo |
| WildWest | GET | `/api/wildwest/stats/:playerId` | Estadísticas del jugador |
| Zen | GET | `/api/zen/chat` | Últimos 50 mensajes |
| Zen | POST | `/api/zen/chat` | Enviar mensaje |
| Zen | DELETE | `/api/zen/chat/:id` | Borrar mensaje propio |
| Health | GET | `/api/health` | Estado del servidor |

## ✅ Cumplimiento de Rúbrica

| Requisito | Estado |
|-----------|--------|
| Firebase Authentication (Login obligatorio) | ✅ |
| Firebase Realtime Database (sync en tiempo real) | ✅ |
| API REST propia (Node.js/Express) | ✅ |
| GET, POST, DELETE en la API | ✅ |
| Caché local (AsyncStorage) | ✅ |
| Compresión JSON (gzip) en backend | ✅ |
| Menú con físicas (Reanimated) | ✅ |
| Snake Battle Royale multijugador | ✅ |
| Zona Segura (Battle Royale) | ✅ |
| Modo Espectador al morir | ✅ |
| Wild West con mitigación de lag | ✅ |
| Mundo Zen con chat GET/POST/DELETE | ✅ |
| Estructura modular (components/services/utils) | ✅ |
