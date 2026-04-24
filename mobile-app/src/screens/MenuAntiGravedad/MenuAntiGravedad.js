/**
 * screens/MenuAntiGravedad/MenuAntiGravedad.js
 * * Menú principal interactivo con fondo de estrellas animadas.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Dimensions, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, Easing
} from 'react-native-reanimated';
import { LinearGradient }     from 'expo-linear-gradient';
import { useNavigation }      from '@react-navigation/native';
import { auth }               from '../../services/firebase';
import { signOut }            from 'firebase/auth';
import AsyncStorage           from '@react-native-async-storage/async-storage';
import FloatingPlanet         from '../../components/FloatingPlanet';

const { width: W, height: H } = Dimensions.get('window');
const CX = W / 2;
const CY = H / 2;

const GAMES = [
  {
    id: 'snake',
    route: 'SnakeBattleRoyale',
    label: 'Snake\nBattle',
    emoji: '🐍',
    color: ['#10b981', '#064e3b'],
    glowColor: '#10b981',
    initialX: CX - 80,
    initialY: CY - 120,
    size: 120,
  },
  {
    id: 'wildwest',
    route: 'WildWest',
    label: 'Wild\nWest',
    emoji: '🤠',
    color: ['#f59e0b', '#78350f'],
    glowColor: '#f59e0b',
    initialX: CX + 90,
    initialY: CY,
    size: 110,
  },
  {
    id: 'zen',
    route: 'ZenWorld',
    label: 'Zen\nWorld',
    emoji: '🌸',
    color: ['#8b5cf6', '#4c1d95'],
    glowColor: '#a78bfa',
    initialX: CX - 70,
    initialY: CY + 130,
    size: 105,
  },
];

export default function MenuAntiGravedad() {
  const navigation = useNavigation();

  // Animación de pulsación para el botón de salir
  const pulseAnim = useSharedValue(1);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const logoutAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }]
  }));

  const handleLogout = async () => {
    await signOut(auth);
    await AsyncStorage.removeItem('@auth_token');
  };

  return (
    <LinearGradient colors={['#000008', '#08021c', '#020b24']} style={styles.container}>
      <AnimatedStarField />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌌 Anti-Gravedad</Text>
        <Text style={styles.headerSub}>Arrastra los planetas · Toca para jugar</Text>
      </View>

      {GAMES.map((game) => (
        <FloatingPlanet
          key={game.id}
          game={game}
          onPress={() => navigation.navigate(game.route)}
        />
      ))}

      <Animated.View style={[styles.logoutBtnContainer, logoutAnimatedStyle]}>
        <TouchableOpacity activeOpacity={0.7} style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>⚡ Salir de órbita</Text>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
}

// ── Componente de Estrella Individual Animada ──────────────────────────────
function AnimatedStar({ star }) {
  const opacity = useSharedValue(star.opacity);

  useEffect(() => {
    // Hace que cada estrella cambie su opacidad continuamente
    opacity.value = withRepeat(
      withTiming(star.opacity * 0.2, { duration: 1500 + Math.random() * 2000 }),
      -1, // Infinito
      true // Reversa
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: `${star.x}%`,
          top: `${star.y}%`,
          width: star.size,
          height: star.size,
          borderRadius: star.size / 2,
          backgroundColor: '#ffffff',
          shadowColor: '#fff',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: star.size,
        },
        animatedStyle
      ]}
    />
  );
}

// ── Componente de campo de estrellas ───────────────────────────────────────
function AnimatedStarField() {
  const stars = React.useMemo(() => Array.from({ length: 70 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 0.5,
    opacity: Math.random() * 0.8 + 0.2,
  })), []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((star) => (
        <AnimatedStar key={star.id} star={star} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 2,
    textShadowColor: '#c084fc',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  headerSub: { fontSize: 14, color: '#a78bfa', marginTop: 8, letterSpacing: 1.5, fontWeight: '500' },
  logoutBtnContainer: {
    position: 'absolute',
    bottom: 45,
    right: 24,
  },
  logoutBtn: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,0.5)',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  logoutText: { color: '#fca5a5', fontSize: 14, fontWeight: '700', letterSpacing: 1 },
});
