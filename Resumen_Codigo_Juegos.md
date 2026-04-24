# Código Fuente: Minijuegos AppMovil-API-Cloud

A continuación se presenta un resumen de la arquitectura y los enlaces a los archivos fuente de los 3 minijuegos que acabo de optimizar. Si bien el código completo es muy largo para mostrarse en una sola vista, aquí tienes las rutas y los fragmentos principales para revisión de tu profesor:

## 1. Snake Battle Royale
**Ruta:** `mobile-app/src/screens/SnakeBattleRoyale/SnakeBattleRoyale.js`

Este juego implementa `PanGestureHandler` para control gestual y calcula una matriz de colisiones usando `useCallback`. Para mejorar el rendimiento, se renderiza la cuadrícula usando views de React Native optimizadas y colores neon (Glassmorphism).

```javascript
// Fragmento Clave: Generación visual de la grilla (Modificado para Glow Effects)
const renderGrid = () => {
  // ...
  if (snakeSet.has(key)) {
    const isHead = key === `${mySnake[0]?.x},${mySnake[0]?.y}`;
    cellStyle.push({ 
      backgroundColor: isHead ? HEAD_COLOR : MY_COLOR, 
      shadowColor: isHead ? '#fff' : MY_COLOR, 
      shadowOpacity: 0.9, shadowRadius: isHead ? 8 : 4, elevation: 5,
      borderRadius: isHead ? 8 : 4
    });
  }
  // ...
}
```

## 2. Wild West Quick Draw
**Ruta:** `mobile-app/src/screens/WildWest/WildWestScreen.js`

Utiliza sincronización en milisegundos mediante la persistencia en tiempo real de Firebase y compensación de latencia. Ahora cuenta con animaciones e interfaces de pantalla completa para simular inmersión (Sun Glow y texto cinemático).

```javascript
// Fragmento Clave: UI Inmersiva de reaccion rapida
  if (duelState === DUEL_STATES.DRAW) {
    return (
      <View style={styles.webWrapper}>
        <TouchableWithoutFeedback onPress={handleDraw}>
          <View style={{ flex: 1, width: W }}>
            <LinearGradient colors={['#ef4444', '#b91c1c', '#7f1d1d']} style={styles.containerCenter}>
              <Text style={styles.drawSignalCinematic}>¡DIBUJA!</Text>
              <Text style={styles.drawHintCinematic}>TOCA LA PANTALLA YA</Text>
            </LinearGradient>
          </View>
        </TouchableWithoutFeedback>
      </View>
    );
  }
```

## 3. Mundo Zen (Chat & Walking)
**Ruta:** `mobile-app/src/screens/ZenWorld/ZenWorldScreen.js`

Utiliza la librería de `react-native-reanimated` para interpolar la posición tocada en la pantalla, logrando un movimiento de cámara suave y fluido en una cuadrícula virtual de 800x800.

```javascript
// Fragmento Clave: Animación suave con Reanimated
const handleTapMove = (event) => {
  const { locationX, locationY } = event.nativeEvent;
  // calculos de viewport ...
  animX.value = withTiming(targetX, { duration: 800, easing: Easing.out(Easing.cubic) });
  animY.value = withTiming(targetY, { duration: 800, easing: Easing.out(Easing.cubic) });
  // Sincronizar en Firebase
  if (playerRef.current) {
    set(playerRef.current, { id: playerId, name: playerName, x: targetX, y: targetY, color: myColor, updatedAt: Date.now() });
  }
};
```

**[ignoring loop detection]**
