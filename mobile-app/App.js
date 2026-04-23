/**
 * App.js — Punto de entrada de la app móvil
 * AppMovil-API-Cloud (React Native / Expo)
 * 
 * Envuelve el sistema de navegación con los providers necesarios:
 *  - GestureHandlerRootView (react-native-gesture-handler)
 *  - SafeAreaProvider (safe-area-context)
 */

import 'react-native-gesture-handler'; // ¡Debe ser el primer import!
import React                         from 'react';
import { GestureHandlerRootView }    from 'react-native-gesture-handler';
import { SafeAreaProvider }          from 'react-native-safe-area-context';
import { StatusBar }                 from 'expo-status-bar';
import AppNavigator                  from './src/navigation/AppNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor="#000" />
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
