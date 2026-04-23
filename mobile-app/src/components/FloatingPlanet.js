/**
 * components/FloatingPlanet.js
 * 
 * Componente reutilizable de planeta flotante con:
 *  - Arrastre libre (PanGestureHandler)
 *  - Rebote con física de resorte al soltar (withSpring)
 *  - Animación de flotación continua (oscilación suave)
 *  - Glow visual (sombra coloreada)
 *  - Navegación al tocar
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
  withRepeat, withTiming, withSequence, Easing,
  useAnimatedGestureHandler, runOnJS,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { LinearGradient }    from 'expo-linear-gradient';

const { width: W, height: H } = Dimensions.get('window');

// Configuración del resorte para el rebote al soltar
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 120,
  mass: 1.2,
  overshootClamping: false,
};

export default function FloatingPlanet({ game, onPress }) {
  // ── Posición actual (gesto de arrastre) ──────────────────────────────────
  const translateX = useSharedValue(game.initialX - game.size / 2);
  const translateY = useSharedValue(game.initialY - game.size / 2);

  // ── Posición base (para rebote al soltar) ────────────────────────────────
  const baseX = game.initialX - game.size / 2;
  const baseY = game.initialY - game.size / 2;

  // ── Escala para feedback táctil ──────────────────────────────────────────
  const scale = useSharedValue(1);

  // ── Oscilación de flotación continua ─────────────────────────────────────
  const floatY = useSharedValue(0);
  useEffect(() => {
    // Cada planeta tiene una fase distinta para que no floten sincronizados
    const delay = (game.initialX % 1000) * 2;
    floatY.value = withRepeat(
      withSequence(
        withTiming(12, { duration: 2000 + delay, easing: Easing.inOut(Easing.sin) }),
        withTiming(-12, { duration: 2000 + delay, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, // infinito
      true,
    );
  }, []);

  // ── Handler del gesto de arrastre (worklet) ──────────────────────────────
  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      // Guarda la posición al inicio del arrastre
      ctx.startX = translateX.value;
      ctx.startY = translateY.value;
      scale.value = withSpring(1.1); // escala ligera al agarrar
    },
    onActive: (event, ctx) => {
      // Actualiza posición siguiendo el dedo
      translateX.value = ctx.startX + event.translationX;
      translateY.value = ctx.startY + event.translationY;
    },
    onEnd: (event) => {
      scale.value = withSpring(1); // restaura escala

      // ── Comportamiento de rebote en los bordes ──────────────────────────
      const finalX = translateX.value;
      const finalY = translateY.value;
      const maxX = W - game.size;
      const maxY = H - game.size;

      // Si se lanza con velocidad alta, simula rebote en bordes
      if (Math.abs(event.velocityX) > 500 || Math.abs(event.velocityY) > 500) {
        const targetX = Math.max(0, Math.min(maxX, finalX + event.velocityX * 0.1));
        const targetY = Math.max(0, Math.min(maxY, finalY + event.velocityY * 0.1));
        translateX.value = withSpring(targetX, SPRING_CONFIG);
        translateY.value = withSpring(targetY, SPRING_CONFIG);
      } else {
        // Si se suelta sin mucha velocidad, vuelve a su posición base
        translateX.value = withSpring(baseX, SPRING_CONFIG);
        translateY.value = withSpring(baseY, SPRING_CONFIG);
      }
    },
  });

  // ── Estilos animados ──────────────────────────────────────────────────────
  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value + floatY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.wrapper, { width: game.size, height: game.size }, animStyle]}>
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.85}
          style={styles.touch}
        >
          <LinearGradient
            colors={game.color}
            style={[
              styles.planet,
              { width: game.size, height: game.size, borderRadius: game.size / 2 },
              // Glow effect via shadow
              {
                shadowColor: game.glowColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 24,
                elevation: 16,
              },
            ]}
          >
            <Text style={styles.emoji}>{game.emoji}</Text>
            <Text style={styles.label}>{game.label}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  wrapper:  { position: 'absolute' },
  touch:    { flex: 1 },
  planet: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  emoji:  { fontSize: 36 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f9fafb',
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 0.5,
    lineHeight: 16,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
