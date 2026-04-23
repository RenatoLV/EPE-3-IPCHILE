/**
 * services/firebase.js
 * 
 * Inicialización y exportación de los servicios de Firebase.
 * Proyecto: AppMovil-API-Cloud (ID: appmovil-api-cloud, Nº: 1006948232711)
 * 
 * ⚠️ Requiere que el archivo .env esté configurado con:
 *    EXPO_PUBLIC_FIREBASE_API_KEY
 *    EXPO_PUBLIC_FIREBASE_APP_ID
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth }                          from 'firebase/auth';
import { getDatabase }                      from 'firebase/database';
import { getPerformance }                   from 'firebase/performance';

// ── Configuración del proyecto Firebase ────────────────────────────────────
// Las credenciales sensibles (apiKey, appId) vienen del archivo .env
const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:        'appmovil-api-cloud.firebaseapp.com',
  databaseURL:       'https://appmovil-api-cloud-default-rtdb.firebaseio.com',
  projectId:         'appmovil-api-cloud',
  storageBucket:     'appmovil-api-cloud.appspot.com',
  messagingSenderId: '1006948232711',
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// ── Singleton: evita reinicializar en hot-reload de Expo ──────────────────
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ── Servicios exportados ───────────────────────────────────────────────────
export const auth = getAuth(app);
export const database = getDatabase(app);
export const perf = getPerformance(app);

export default app;
