/**
 * navigation/AppNavigator.js
 * 
 * Configuración del sistema de navegación con React Navigation.
 * Separa rutas protegidas (requieren login) de rutas públicas (auth).
 */

import React, { useEffect, useState } from 'react';
import { NavigationContainer }         from '@react-navigation/native';
import { createNativeStackNavigator }  from '@react-navigation/native-stack';
import { View, ActivityIndicator }     from 'react-native';

// Pantallas de autenticación
import LoginScreen    from '../screens/LoginScreen';

// Pantallas principales
import MenuAntiGravedad    from '../screens/MenuAntiGravedad/MenuAntiGravedad';
import SnakeBattleRoyale   from '../screens/SnakeBattleRoyale/SnakeBattleRoyale';
import WildWestScreen      from '../screens/WildWest/WildWestScreen';
import ZenWorldScreen      from '../screens/ZenWorld/ZenWorldScreen';

// Firebase Auth para detectar sesión activa
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Escucha los cambios de sesión de Firebase Authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe; // Limpia el listener al desmontar
  }, []);

  // Pantalla de carga mientras Firebase verifica la sesión
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a1a' }}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // ── Rutas protegidas (usuario autenticado) ──────────────────────
          <>
            <Stack.Screen name="MenuAntiGravedad"  component={MenuAntiGravedad} />
            <Stack.Screen name="SnakeBattleRoyale" component={SnakeBattleRoyale} />
            <Stack.Screen name="WildWest"          component={WildWestScreen} />
            <Stack.Screen name="ZenWorld"          component={ZenWorldScreen} />
          </>
        ) : (
          // ── Ruta pública (sin sesión) ────────────────────────────────────
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
