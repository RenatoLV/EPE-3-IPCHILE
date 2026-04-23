/**
 * screens/MenuAntiGravedad/MenuAntiGravedad.js
 * 
 * Menú principal con física de gravedad cero.
 * Tres "planetas" flotantes representan cada juego.
 * El usuario puede arrastrarlos (PanGesture) y al soltarlos
 * rebotan con física de resorte. Al tocarlos navegan al juego.
 * 
 * Tecnología: react-native-reanimated + react-native-gesture-handler
 */

import React, { useCallback } from 'react';
import { StyleSheet, View, Text, Dimensions, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
  useAnimatedGestureHandler, runOnJS,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { LinearGradient }     from 'expo-linear-gradient';
import { useNavigation }      from '@react-navigation/native';
import { auth }               from '../../services/firebase';
import { signOut }            from 'firebase/auth';
import AsyncStorage           from '@react-native-async-storage/async-storage';
import FloatingPlanet         from '../../components/FloatingPlanet';

const { width: W, height: H } = Dimensions.get('window');

// ── Configuración de cada planeta/juego ─────────────────────────────────────
const GAMES = [
  {
    id: 'snake',
    route: 'SnakeBattleRoyale',
    label: 'Snake\nBattle Royale',
    emoji: '🐍',
    color: ['#16a34a', '#052e16'],
    glowColor: '#16a34a',
    initialX: W * 0.15,
    initialY: H * 0.25,
    size: 130,
  },
  {
    id: 'wildwest',
    route: 'WildWest',
    label: 'Wild West\nQuick Draw',
    emoji: '🤠',
    color: ['#d97706', '#451a03'],
    glowColor: '#d97706',
    initialX: W * 0.55,
    initialY: H * 0.35,
    size: 120,
  },
  {
    id: 'zen',
    route: 'ZenWorld',
    label: 'Mundo Zen\nVirtual',
    emoji: '🌸',
    color: ['#7c3aed', '#1e0a3a'],
    glowColor: '#a855f7',
    initialX: W * 0.25,
    initialY: H * 0.58,
    size: 115,
  },
];

export default function MenuAntiGravedad() {
  const navigation = useNavigation();

  const handleLogout = async () => {
    await signOut(auth);
    await AsyncStorage.removeItem('@auth_token');
  };

  return (
    <LinearGradient colors={['#000010', '#06011a', '#010820']} style={styles.container}>
      {/* ── Estrellas decorativas ──────────────────────────────────────── */}
      <StarField />

      {/* ── Título flotante ──────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌌 Anti-Gravedad</Text>
        <Text style={styles.headerSub}>Arrastra los planetas · Toca para jugar</Text>
      </View>

      {/* ── Planetas/Juegos flotantes ─────────────────────────────────────── */}
      {GAMES.map((game) => (
        <FloatingPlanet
          key={game.id}
          game={game}
          onPress={() => navigation.navigate(game.route)}
        />
      ))}

      {/* ── Botón de cierre de sesión ─────────────────────────────────────── */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>⚡ Salir</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

// ── Componente de campo de estrellas (fondo decorativo) ────────────────────
function StarField() {
  const stars = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2.5 + 0.5,
    opacity: Math.random() * 0.7 + 0.2,
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((star) => (
        <View
          key={star.id}
          style={{
            position: 'absolute',
            left:    `${star.x}%`,
            top:     `${star.y}%`,
            width:   star.size,
            height:  star.size,
            borderRadius: star.size / 2,
            backgroundColor: '#ffffff',
            opacity: star.opacity,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#f0abfc',
    letterSpacing: 2,
    textShadowColor: '#a855f7',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  headerSub: { fontSize: 12, color: '#6b7280', marginTop: 6, letterSpacing: 1 },
  logoutBtn: {
    position: 'absolute',
    bottom: 40,
    right: 24,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  logoutText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
});
