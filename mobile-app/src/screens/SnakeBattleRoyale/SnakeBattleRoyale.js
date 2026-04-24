/**
 * screens/SnakeBattleRoyale/SnakeBattleRoyale.js
 * * IA Avanzada: Registro único, bots inteligentes y colisiones realistas (quien choca pierde).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Platform, useWindowDimensions
} from 'react-native';
import { PanGestureHandler }    from 'react-native-gesture-handler';
import { useNavigation }        from '@react-navigation/native';
import { useUniversalControls } from '../../hooks/useUniversalControls';

import { database, auth }       from '../../services/firebase';
import { ref, set, onValue, off, remove, onDisconnect } from 'firebase/database';
import { ApiService }           from '../../services/api';

const DIRS = { UP: [0,-1], DOWN: [0,1], LEFT: [-1,0], RIGHT: [1,0] };

export default function SnakeBattleRoyale() {
  const navigation = useNavigation();
  const user       = auth.currentUser;
  const playerId   = user?.uid || 'anon';
  const playerName = user?.displayName || 'Gamer';

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const W = isWeb ? Math.min(windowWidth * 0.8, 600) : windowWidth;
  const H = windowHeight;

  const GRID_COLS     = 21; 
  const GRID_ROWS     = 25;
  const CELL_SIZE     = Math.floor((W * 0.95) / GRID_COLS);
  const TICK_MS       = 140; 

  const [gameState, setGameState] = useState('lobby'); 
  const [mySnake,   setMySnake]   = useState([{ x: 10, y: 7 }, { x: 10, y: 8 }]);
  const [foods,     setFoods]     = useState([{ x: 5, y: 5 }, { x: 15, y: 15 }]); 
  const [bots,      setBots]      = useState([]); 
  const [myScore,   setMyScore]   = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  
  const dirRef    = useRef(DIRS.UP);
  const snakeRef  = useRef([{ x: 10, y: 7 }, { x: 10, y: 8 }]);
  const botsRef   = useRef([]);
  const foodsRef  = useRef([{ x: 5, y: 5 }, { x: 15, y: 15 }]);
  const tickTimer = useRef(null);
  const gameRef   = useRef(null);

  useEffect(() => {
    ApiService.getLeaderboard().then(data => setLeaderboard(data || [])).catch(() => {});
  }, [gameState]);

  const handleKeyboardMove = useCallback((dirStr) => {
    const cur = dirRef.current;
    if (dirStr === 'UP' && cur !== DIRS.DOWN)    dirRef.current = DIRS.UP;
    else if (dirStr === 'DOWN' && cur !== DIRS.UP)    dirRef.current = DIRS.DOWN;
    else if (dirStr === 'LEFT' && cur !== DIRS.RIGHT)   dirRef.current = DIRS.LEFT;
    else if (dirStr === 'RIGHT' && cur !== DIRS.LEFT)  dirRef.current = DIRS.RIGHT;
  }, []);

  useUniversalControls(handleKeyboardMove);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const botTimer = setTimeout(() => {
      if (botsRef.current.length === 0) {
        const newBots = [
          { id: 'bot_alpha', snake: [{x: 2, y: 2}, {x: 1, y: 2}], dir: DIRS.RIGHT, color: '#f43f5e' },
          { id: 'bot_beta',  snake: [{x: GRID_COLS-3, y: GRID_ROWS-3}, {x: GRID_COLS-2, y: GRID_ROWS-3}], dir: DIRS.LEFT, color: '#3b82f6' }
        ];
        botsRef.current = newBots;
        setBots(newBots);
      }
    }, 2000);
    return () => clearTimeout(botTimer);
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    tickTimer.current = setInterval(gameTick, TICK_MS);
    return () => clearInterval(tickTimer.current);
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    gameRef.current = ref(database, `snake/room_retro/players/${playerId}`);
    onDisconnect(gameRef.current).remove();
    return () => { if (gameRef.current) remove(gameRef.current); };
  }, [gameState]);

  const generarComida = () => ({
    x: Math.floor(Math.random() * GRID_COLS),
    y: Math.floor(Math.random() * GRID_ROWS)
  });

  const gameTick = useCallback(() => {
    const current = snakeRef.current;
    const dir     = dirRef.current;
    const head    = current[0];
    const newHead = { x: head.x + dir[0], y: head.y + dir[1] };

    // --- 1. Lógica de Bots (IA Avanzada) ---
    let currentBots = [...botsRef.current];
    let nextFoods = [...foodsRef.current];
    let foodChanged = false;

    currentBots = currentBots.map(bot => {
      const bHead = bot.snake[0];
      const target = nextFoods[0];
      
      const possibleDirs = Object.values(DIRS).filter(d => {
        if (d[0] === -bot.dir[0] && d[1] === -bot.dir[1]) return false;
        const nX = bHead.x + d[0];
        const nY = bHead.y + d[1];
        if (nX < 0 || nX >= GRID_COLS || nY < 0 || nY >= GRID_ROWS) return false;
        // Evitar su cuerpo
        if (bot.snake.some(s => s.x === nX && s.y === nY)) return false;
        // Evitar al Jugador
        if (snakeRef.current.some(s => s.x === nX && s.y === nY)) return false;
        // Evitar a otros bots
        if (botsRef.current.some(other => other.id !== bot.id && other.snake.some(s => s.x === nX && s.y === nY))) return false;
        return true;
      });

      let chosenDir = bot.dir;
      if (possibleDirs.length > 0) {
        chosenDir = possibleDirs.sort((a, b) => {
          const distA = Math.abs((bHead.x + a[0]) - target.x) + Math.abs((bHead.y + a[1]) - target.y);
          const distB = Math.abs((bHead.x + b[0]) - target.x) + Math.abs((bHead.y + b[1]) - target.y);
          return distA - distB;
        })[0];
      }

      const nextBH = { x: bHead.x + chosenDir[0], y: bHead.y + chosenDir[1] };
      
      // Colisión de Bot (Quien choca pierde)
      const hitWall = (nextBH.x < 0 || nextBH.x >= GRID_COLS || nextBH.y < 0 || nextBH.y >= GRID_ROWS);
      const hitPlayer = snakeRef.current.some(s => s.x === nextBH.x && s.y === nextBH.y);
      const hitOtherBot = botsRef.current.some(other => other.id !== bot.id && other.snake.some(s => s.x === nextBH.x && s.y === nextBH.y));
      
      if (hitWall || hitPlayer || hitOtherBot) {
        // Respawn instantáneo del bot si muere
        return { ...bot, snake: [{x: Math.floor(Math.random()*GRID_COLS), y: Math.floor(Math.random()*GRID_ROWS)}], dir: DIRS.UP };
      }

      const ateIdx = nextFoods.findIndex(f => f.x === nextBH.x && f.y === nextBH.y);
      if (ateIdx !== -1) {
        nextFoods[ateIdx] = generarComida();
        foodChanged = true;
        return { ...bot, snake: [nextBH, ...bot.snake], dir: chosenDir };
      }
      return { ...bot, snake: [nextBH, ...bot.snake.slice(0, -1)], dir: chosenDir };
    });

    if (foodChanged) {
      foodsRef.current = nextFoods;
      setFoods(nextFoods);
    }
    botsRef.current = currentBots;
    setBots(currentBots);

    // --- 2. Lógica del Jugador (Quien choca pierde) ---
    const hitWallP = (newHead.x < 0 || newHead.x >= GRID_COLS || newHead.y < 0 || newHead.y >= GRID_ROWS);
    const hitSelfP = current.slice(0, -1).some(seg => seg.x === newHead.x && seg.y === newHead.y);
    const hitBotP  = currentBots.some(bot => bot.snake.some(s => s.x === newHead.x && s.y === newHead.y));

    if (hitWallP || hitSelfP || hitBotP) return handleDeath();

    const ateIdxP = nextFoods.findIndex(f => f.x === newHead.x && f.y === newHead.y);
    const newSnakeP = ateIdxP !== -1 ? [newHead, ...current] : [newHead, ...current.slice(0, -1)];

    if (ateIdxP !== -1) {
      const finalFoods = [...nextFoods];
      finalFoods[ateIdxP] = generarComida();
      foodsRef.current = finalFoods;
      setFoods(finalFoods);
      setMyScore(prev => prev + 15);
    }

    snakeRef.current = newSnakeP;
    setMySnake(newSnakeP);

    if (gameRef.current) {
      set(gameRef.current, { playerId, playerName, snake: newSnakeP, score: myScore, updatedAt: Date.now() });
    }
  }, [myScore]);

  const handleDeath = async () => {
    clearInterval(tickTimer.current);
    if (gameRef.current) remove(gameRef.current);
    setGameState('gameover');
    try {
      await ApiService.postScore({ playerId, playerName, score: myScore, maxSize: snakeRef.current.length });
    } catch (err) {}
  };

  const onGestureEvent = (event) => {
    const { translationX, translationY } = event.nativeEvent;
    const cur = dirRef.current;
    if (Math.abs(translationX) > Math.abs(translationY)) {
      if (translationX > 20 && cur !== DIRS.LEFT)  dirRef.current = DIRS.RIGHT;
      else if (translationX < -20 && cur !== DIRS.RIGHT) dirRef.current = DIRS.LEFT;
    } else {
      if (translationY > 20 && cur !== DIRS.UP)    dirRef.current = DIRS.DOWN;
      else if (translationY < -20 && cur !== DIRS.DOWN)  dirRef.current = DIRS.UP;
    }
  };

  const renderGameEntities = () => {
    return (
      <>
        {foods.map((f, i) => (
          <View key={`f-${i}`} style={[styles.entity, styles.cellFood, { left: f.x * CELL_SIZE, top: f.y * CELL_SIZE, width: CELL_SIZE, height: CELL_SIZE }]}>
            <View style={styles.foodCrossV} />
            <View style={styles.foodCrossH} />
          </View>
        ))}
        {bots.map(bot => bot.snake.map((s, i) => (
          <View key={`${bot.id}-${i}`} style={[styles.entity, styles.cellSnake, { backgroundColor: bot.color, left: s.x * CELL_SIZE, top: s.y * CELL_SIZE, width: CELL_SIZE - 1, height: CELL_SIZE - 1 }]} />
        )))}
        {mySnake.map((s, i) => (
          <View key={`my-${i}`} style={[styles.entity, styles.cellSnake, { left: s.x * CELL_SIZE, top: s.y * CELL_SIZE, width: CELL_SIZE - 1, height: CELL_SIZE - 1 }]} />
        ))}
      </>
    );
  };

  if (gameState === 'lobby' || gameState === 'gameover') {
    return (
      <View style={[styles.mainWrapper, { width: windowWidth, height: windowHeight }]}>
        <View style={[styles.gameLienzo, { width: W, height: H * 0.9 }]}>
          <Text style={styles.retroTitle}>SNAKE RETRO</Text>
          {gameState === 'gameover' && (
            <View style={styles.gameOverBox}>
              <Text style={styles.retroGameOver}>FIN DEL JUEGO</Text>
              <Text style={styles.finalScore}>SCORE: {myScore}</Text>
            </View>
          )}
          <View style={styles.leaderboardBox}>
            <Text style={styles.leaderTitle}>TOP 5 GLOBAL (ÚNICOS)</Text>
            {leaderboard.length > 0 ? leaderboard.map((entry, i) => (
              <Text key={i} style={styles.leaderText}>{i+1}. {entry.playerName}: {entry.score}</Text>
            )) : <Text style={styles.leaderText}>Cargando...</Text>}
          </View>
          <TouchableOpacity 
            style={styles.retroButton} 
            onPress={() => {
              setGameState('playing');
              setMyScore(0);
              snakeRef.current = [{ x: 10, y: 7 }, { x: 10, y: 8 }];
              dirRef.current = DIRS.UP;
              botsRef.current = [];
              setBots([]);
            }}>
            <Text style={styles.retroButtonText}>JUGAR AHORA</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{marginTop: 20}}>
            <Text style={styles.backText}>VOLVER</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.mainWrapper, { width: windowWidth, height: windowHeight }]}>
      <PanGestureHandler onGestureEvent={onGestureEvent}>
        <View style={[styles.gameLienzo, { width: W, height: H * 0.9 }]}>
          <View style={[styles.board, { width: GRID_COLS * CELL_SIZE, height: GRID_ROWS * CELL_SIZE }]}>
            {renderGameEntities()}
          </View>
          <View style={styles.footer}>
            <Text style={styles.scoreText}>PUNTOS: {myScore}</Text>
            <Text style={styles.scoreText}>BOTS: {bots.length}</Text>
          </View>
        </View>
      </PanGestureHandler>
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  gameLienzo: { backgroundColor: '#9bba5a', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: Platform.OS === 'web' ? 24 : 0, padding: 20 },
  board: { backgroundColor: '#ac6', borderWidth: 4, borderColor: 'rgba(0,0,0,0.85)', position: 'relative' },
  entity: { position: 'absolute' },
  cellSnake: { backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: 2 },
  cellFood: { justifyContent: 'center', alignItems: 'center' },
  foodCrossV: { position: 'absolute', width: '25%', height: '75%', backgroundColor: 'rgba(0,0,0,0.85)' },
  foodCrossH: { position: 'absolute', width: '75%', height: '25%', backgroundColor: 'rgba(0,0,0,0.85)' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 },
  scoreText: { fontFamily: 'monospace', fontSize: 20, fontWeight: 'bold', color: 'rgba(0,0,0,0.75)' },
  retroTitle: { fontFamily: 'monospace', fontSize: 40, fontWeight: 'bold', color: 'rgba(0,0,0,0.75)', marginBottom: 20 },
  gameOverBox: { alignItems: 'center', marginBottom: 20 },
  retroGameOver: { fontFamily: 'monospace', fontSize: 24, color: '#7f1d1d', fontWeight: 'bold' },
  finalScore: { fontSize: 18, color: 'rgba(0,0,0,0.75)', fontWeight: 'bold' },
  leaderboardBox: { backgroundColor: 'rgba(0,0,0,0.05)', padding: 15, borderRadius: 10, width: '100%', marginBottom: 20 },
  leaderTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5, color: 'rgba(0,0,0,0.7)' },
  leaderText: { fontSize: 14, color: 'rgba(0,0,0,0.6)', fontFamily: 'monospace' },
  retroButton: { borderWidth: 3, borderColor: 'rgba(0,0,0,0.75)', paddingVertical: 12, paddingHorizontal: 30, backgroundColor: '#ac6' },
  retroButtonText: { fontSize: 20, fontWeight: 'bold', color: 'rgba(0,0,0,0.75)' },
  backText: { color: 'rgba(0,0,0,0.5)', textDecorationLine: 'underline' }
});
