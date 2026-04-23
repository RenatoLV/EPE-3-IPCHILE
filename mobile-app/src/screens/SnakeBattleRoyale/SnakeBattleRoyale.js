/**
 * screens/SnakeBattleRoyale/SnakeBattleRoyale.js
 * 
 * Snake Battle Royale — Gráficos Neon y Controles por Gestos (Swipe)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, Platform
} from 'react-native';
import { LinearGradient }       from 'expo-linear-gradient';
import { useNavigation }        from '@react-navigation/native';
import { PanGestureHandler }    from 'react-native-gesture-handler';
import { database, auth }       from '../../services/firebase';
import { ref, set, onValue, off, remove, onDisconnect } from 'firebase/database';
import { snakeAPI }             from '../../services/api';

// ── Adaptación Web/Móvil ──────────────────────────────────────────────────
const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
// Si es web, limitamos el ancho para simular un móvil en el centro de la pantalla
const W = isWeb ? Math.min(windowWidth, 480) : windowWidth;
const H = isWeb ? windowHeight : windowHeight;

const CELL_SIZE     = 18;
const GRID_COLS     = Math.floor(W / CELL_SIZE);
const GRID_ROWS     = 30;
const TICK_MS       = 200;

const DIRS = { UP: [0,-1], DOWN: [0,1], LEFT: [-1,0], RIGHT: [1,0] };
const MY_COLOR     = '#10b981'; // Neon Green
const ENEMY_COLORS = ['#f43f5e', '#3b82f6', '#f59e0b', '#d946ef'];

export default function SnakeBattleRoyale() {
  const navigation  = useNavigation();
  const user        = auth.currentUser;
  const playerId    = user?.uid || 'anon';
  const playerName  = user?.displayName || 'Jugador';

  const [gameState,    setGameState]    = useState('lobby'); 
  const [mySnake,      setMySnake]      = useState([{ x: 5, y: 5 }]);
  const [food,         setFood]         = useState({ x: 10, y: 10 });
  const [direction,    setDirection]    = useState(DIRS.RIGHT);
  const [safeZone,     setSafeZone]     = useState({ top: 0, left: 0, right: GRID_COLS - 1, bottom: GRID_ROWS - 1 });
  const [otherPlayers, setOtherPlayers] = useState({});
  const [leaderboard,  setLeaderboard]  = useState([]);
  const [myScore,      setMyScore]      = useState(0);
  
  const dirRef    = useRef(DIRS.RIGHT);
  const snakeRef  = useRef([{ x: 5, y: 5 }]);
  const gameRef   = useRef(null);
  const tickTimer = useRef(null);

  useEffect(() => {
    snakeAPI.getLeaderboard(5).then(res => setLeaderboard(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const roomRef = ref(database, 'snake/room1/players');
    const unsub = onValue(roomRef, (snapshot) => {
      const data = snapshot.val() || {};
      const others = Object.fromEntries(Object.entries(data).filter(([id]) => id !== playerId));
      setOtherPlayers(others);
    });
    return () => off(roomRef, 'value', unsub);
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') return;
    gameRef.current = ref(database, `snake/room1/players/${playerId}`);
    onDisconnect(gameRef.current).remove();
    return () => { if (gameRef.current) remove(gameRef.current); };
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    tickTimer.current = setInterval(gameTick, TICK_MS);
    return () => clearInterval(tickTimer.current);
  }, [gameState, food]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const zoneTimer = setInterval(() => {
      setSafeZone(prev => ({
        top:    Math.min(prev.top + 1,    GRID_ROWS / 2 - 1),
        left:   Math.min(prev.left + 1,   GRID_COLS / 2 - 1),
        right:  Math.max(prev.right - 1,  GRID_COLS / 2),
        bottom: Math.max(prev.bottom - 1, GRID_ROWS / 2),
      }));
    }, 15000);
    return () => clearInterval(zoneTimer);
  }, [gameState]);

  const gameTick = useCallback(() => {
    const current = snakeRef.current;
    const dir     = dirRef.current;
    const newHead = { x: current[0].x + dir[0], y: current[0].y + dir[1] };
    const sz = safeZone;
    const hitWall = (newHead.x < sz.left || newHead.x > sz.right || newHead.y < sz.top || newHead.y > sz.bottom);
    const hitSelf = current.some(seg => seg.x === newHead.x && seg.y === newHead.y);

    if (hitWall || hitSelf) return handleDeath();

    const ate = newHead.x === food.x && newHead.y === food.y;
    const newSnake = ate ? [newHead, ...current] : [newHead, ...current.slice(0, -1)];

    if (ate) {
      setFood({ x: Math.floor(Math.random() * GRID_COLS), y: Math.floor(Math.random() * GRID_ROWS) });
      setMyScore(prev => prev + 10 * newSnake.length);
    }

    snakeRef.current = newSnake;
    setMySnake([...newSnake]);

    if (gameRef.current) {
      set(gameRef.current, { playerId, playerName, snake: newSnake, score: myScore, color: MY_COLOR, updatedAt: Date.now() });
    }
  }, [food, safeZone, myScore]);

  const handleDeath = async () => {
    clearInterval(tickTimer.current);
    if (gameRef.current) remove(gameRef.current);
    setGameState('spectator');
    try { await snakeAPI.saveScore({ playerId, playerName, score: myScore, maxSize: snakeRef.current.length }); } catch(e){}
  };

  // ── Controles Touch (Swipe) sin botones ──────────────────────────────────
  const onGestureEvent = (event) => {
    const { translationX, translationY } = event.nativeEvent;
    const cur = dirRef.current;
    if (Math.abs(translationX) > Math.abs(translationY)) {
      if (translationX > 0 && cur !== DIRS.LEFT)  { dirRef.current = DIRS.RIGHT; setDirection(DIRS.RIGHT); }
      else if (translationX < 0 && cur !== DIRS.RIGHT) { dirRef.current = DIRS.LEFT; setDirection(DIRS.LEFT); }
    } else {
      if (translationY > 0 && cur !== DIRS.UP)    { dirRef.current = DIRS.DOWN; setDirection(DIRS.DOWN); }
      else if (translationY < 0 && cur !== DIRS.DOWN)  { dirRef.current = DIRS.UP; setDirection(DIRS.UP); }
    }
  };

  const renderGrid = () => {
    const cells = [];
    const snakeSet = new Set(mySnake.map(s => `${s.x},${s.y}`));
    const enemySets = Object.values(otherPlayers).map((p, i) => ({ set: new Set((p.snake || []).map(s => `${s.x},${s.y}`)), color: ENEMY_COLORS[i % ENEMY_COLORS.length] }));

    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const key = `${x},${y}`;
        const isOutside = (x < safeZone.left || x > safeZone.right || y < safeZone.top || y > safeZone.bottom);
        let cellStyle = [styles.cell, { width: CELL_SIZE - 2, height: CELL_SIZE - 2 }];
        
        if (isOutside) {
          cellStyle.push(styles.cellDanger);
        } else if (key === `${food.x},${food.y}`) {
          cellStyle.push(styles.cellFood);
        } else if (snakeSet.has(key)) {
          cellStyle.push({ backgroundColor: MY_COLOR, shadowColor: MY_COLOR, shadowOpacity: 0.8, shadowRadius: 5, elevation: 5 });
        } else {
          let enemyColor = null;
          for (const e of enemySets) if (e.set.has(key)) enemyColor = e.color;
          if (enemyColor) {
            cellStyle.push({ backgroundColor: enemyColor, shadowColor: enemyColor, shadowOpacity: 0.8, shadowRadius: 5, elevation: 5 });
          } else {
            cellStyle.push(styles.cellEmpty);
          }
        }
        cells.push(<View key={key} style={cellStyle} />);
      }
    }
    return cells;
  };

  const MainWrapper = isWeb ? View : View;

  if (gameState === 'lobby') {
    return (
      <View style={styles.webWrapper}>
        <LinearGradient colors={['#020617', '#0f172a', '#020617']} style={styles.container}>
          <Text style={styles.titleNeon}>SNAKE BR</Text>
          <Text style={styles.subtitle}>Desliza tu dedo en la pantalla para moverte.</Text>
          <View style={styles.glassCard}>
            <Text style={styles.cardTitle}>🏆 Top Jugadores</Text>
            {leaderboard.map((entry, i) => (
              <View key={entry.id} style={styles.leaderRow}>
                <Text style={styles.leaderRank}>#{i + 1}</Text>
                <Text style={styles.leaderName}>{entry.playerName}</Text>
                <Text style={styles.leaderScore}>{entry.score} pts</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.btnNeon} onPress={() => { setGameState('playing'); setMyScore(0); snakeRef.current = [{x: 5, y: 5}]; }}>
            <Text style={styles.btnNeonText}>INICIAR JUEGO</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backText}>← Volver</Text></TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.webWrapper}>
      <PanGestureHandler onGestureEvent={onGestureEvent}>
        <View style={{ flex: 1 }}>
          <LinearGradient colors={['#020617', '#022c22', '#020617']} style={styles.container}>
            <View style={styles.hudGlass}>
              <Text style={styles.hudText}>PUNTOS: {myScore}</Text>
              <Text style={styles.hudText}>ZONA: {safeZone.right - safeZone.left}x{safeZone.bottom - safeZone.top}</Text>
              <Text style={styles.hudText}>ALMAS: {Object.keys(otherPlayers).length + 1}</Text>
            </View>
            <View style={styles.gridContainer}>
              <View style={[styles.grid, { width: GRID_COLS * CELL_SIZE, height: GRID_ROWS * CELL_SIZE }]}>
                {renderGrid()}
              </View>
            </View>
            {gameState === 'spectator' && (
              <View style={styles.spectatorOverlay}>
                <Text style={styles.spectatorTitle}>HAS MUERTO</Text>
                <TouchableOpacity style={styles.btnNeon} onPress={() => navigation.goBack()}>
                  <Text style={styles.btnNeonText}>SALIR</Text>
                </TouchableOpacity>
              </View>
            )}
            <Text style={styles.hintText}>Desliza el dedo (Swipe) para cambiar de dirección</Text>
          </LinearGradient>
        </View>
      </PanGestureHandler>
    </View>
  );
}

const styles = StyleSheet.create({
  webWrapper: { flex: 1, backgroundColor: '#000', alignItems: 'center' },
  container:  { flex: 1, width: isWeb ? Math.min(Dimensions.get('window').width, 480) : '100%', alignItems: 'center', paddingTop: 50 },
  titleNeon:  { fontSize: 40, fontWeight: '900', color: '#10b981', textShadowColor: '#10b981', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15, marginBottom: 10 },
  subtitle:   { color: '#94a3b8', fontSize: 13, marginBottom: 30, textAlign: 'center', paddingHorizontal: 20 },
  glassCard:  { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 20, width: '85%', marginBottom: 30, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' },
  cardTitle:  { color: '#10b981', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  leaderRow:  { flexDirection: 'row', marginBottom: 8 },
  leaderRank: { color: '#64748b', width: 30 },
  leaderName: { color: '#f8fafc', flex: 1 },
  leaderScore:{ color: '#10b981', fontWeight: 'bold' },
  btnNeon:    { backgroundColor: 'rgba(16,185,129,0.1)', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30, borderWidth: 2, borderColor: '#10b981', shadowColor: '#10b981', shadowOpacity: 0.8, shadowRadius: 10, elevation: 10, marginBottom: 20 },
  btnNeonText:{ color: '#10b981', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  backText:   { color: '#64748b', fontSize: 14, marginTop: 10 },
  hudGlass:   { flexDirection: 'row', justifyContent: 'space-between', width: '90%', padding: 15, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 15, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  hudText:    { color: '#10b981', fontSize: 11, fontWeight: 'bold' },
  gridContainer:{ flex: 1, justifyContent: 'center' },
  grid:       { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' },
  cell:       { margin: 1, borderRadius: 4 },
  cellEmpty:  { backgroundColor: 'rgba(255,255,255,0.02)' },
  cellDanger: { backgroundColor: 'rgba(244,63,94,0.15)' },
  cellFood:   { backgroundColor: '#fbbf24', borderRadius: 10, shadowColor: '#fbbf24', shadowOpacity: 1, shadowRadius: 8, elevation: 8 },
  hintText:   { color: '#64748b', fontSize: 12, marginBottom: 30, opacity: 0.7 },
  spectatorOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  spectatorTitle: { fontSize: 40, fontWeight: '900', color: '#f43f5e', textShadowColor: '#f43f5e', textShadowRadius: 20, marginBottom: 30 }
});
