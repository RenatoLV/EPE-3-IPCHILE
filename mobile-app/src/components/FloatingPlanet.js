/**
 * components/FloatingPlanet.js
 * Planeta con física de atracción al centro de gravedad.
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, Dimensions, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  useAnimatedGestureHandler,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';

const { width: W, height: H } = Dimensions.get('window');
const CENTER_X = W / 2;
const CENTER_Y = H / 2;

export default function FloatingPlanet({ game, onPress }) {
  // Posición relativa al centro de la pantalla
  const x = useSharedValue(game.initialX - CENTER_X);
  const y = useSharedValue(game.initialY - CENTER_Y);
  const scale = useSharedValue(1);
  const isDragging = useSharedValue(false);

  // 1. Animación de "Orbital sutil" (Flotación constante)
  useEffect(() => {
    const randomDelay = Math.random() * 1000;
    x.value = withDelay(randomDelay, withRepeat(
      withSequence(
        withTiming(x.value + 5, { duration: 2500 }),
        withTiming(x.value - 5, { duration: 2500 })
      ), -1, true
    ));
  }, []);

  // 2. Manejo de Gestos con Física de Regreso al Centro
  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startX = x.value;
      ctx.startY = y.value;
      scale.value = withSpring(1.25);
      isDragging.value = true;
    },
    onActive: (event, ctx) => {
      x.value = ctx.startX + event.translationX;
      y.value = ctx.startY + event.translationY;
    },
    onEnd: () => {
      isDragging.value = false;
      scale.value = withSpring(1);
      
      // EFECTO GRAVEDAD: Regresa a su "Estación" asignada cerca del centro
      // Usamos un spring con damping bajo para un rebote "gomoso"
      x.value = withSpring(game.initialX - CENTER_X, { damping: 12, stiffness: 90 });
      y.value = withSpring(game.initialY - CENTER_Y, { damping: 12, stiffness: 90 });
    },
  });

  // 3. Estilos Animados Dinámicos (UI Móvil Premium)
  const animatedStyle = useAnimatedStyle(() => {
    // Calculamos qué tan lejos está del centro absoluto
    const distance = Math.sqrt(Math.pow(x.value, 2) + Math.pow(y.value, 2));
    
    // Si se aleja mucho, se encoge un poco (efecto de perspectiva)
    const perspectiveScale = interpolate(
      distance,
      [0, 300],
      [1, 0.7],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateX: x.value + CENTER_X - game.size / 2 },
        { translateY: y.value + CENTER_Y - game.size / 2 },
        { scale: scale.value * perspectiveScale },
      ],
    };
  });

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scale.value, [1, 1.25], [0.4, 0.8]),
    transform: [{ scale: withRepeat(withTiming(1.1, { duration: 1500 }), -1, true) }]
  }));

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <Pressable onPress={onPress} style={styles.pressable}>
          
          {/* Aura de Gravedad */}
          <Animated.View 
            style={[
              styles.glow, 
              { backgroundColor: game.glowColor, shadowColor: game.glowColor },
              glowStyle
            ]} 
          />
          
          {/* Cuerpo del Planeta */}
          <LinearGradient
            colors={game.color}
            style={[styles.planet, { width: game.size, height: game.size, borderRadius: game.size / 2 }]}
          >
            <Text style={[styles.emoji, { fontSize: game.size * 0.35 }]}>{game.emoji}</Text>
            <Text style={styles.label}>{game.label}</Text>
          </LinearGradient>
          
        </Pressable>
      </Animated.View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute' },
  pressable: { alignItems: 'center', justifyContent: 'center' },
  planet: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  glow: {
    position: 'absolute',
    width: '115%',
    height: '115%',
    borderRadius: 999,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    zIndex: -1,
  },
  emoji: { marginBottom: 4 },
  label: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
