/**
 * screens/WildWest/WildWestScreen.js
 * Wild West Quick Draw — Mejoras UI/UX, Navegación Segura y Animaciones Reanimated
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Dimensions, Platform, 
  Image, Pressable, ImageBackground, TouchableOpacity, SafeAreaView
} from 'react-native';
import { useNavigation }  from '@react-navigation/native';
import { Audio }          from 'expo-av';
import { database, auth } from '../../services/firebase';
import { ref, set, onValue, off, update, push, serverTimestamp, onDisconnect, remove } from 'firebase/database';
import { ApiService }     from '../../services/api';
import Animated, { 
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence 
} from 'react-native-reanimated';

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

const DUEL_STATES = { LOBBY: 'lobby', WAITING: 'waiting', READY: 'ready', DRAW: 'draw', RESULT: 'result' };

export default function WildWestScreen() {
  const navigation  = useNavigation();
  const user        = auth.currentUser;
  const playerId    = user?.uid || 'anon';
  const playerName  = user?.displayName || 'Vaquero';

  const [duelState, setDuelState] = useState(DUEL_STATES.LOBBY);
  const [countdown, setCountdown] = useState(null);
  const [searchCountdown, setSearchCountdown] = useState(15);
  const [isBotMatch, setIsBotMatch] = useState(false);
  const [playerStats, setPlayerStats] = useState(null);
  
  const [myReaction, setMyReaction] = useState(null);
  const [enemyReaction, setEnemyReaction] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  
  const [hasShot, setHasShot] = useState(false);
  const [enemyHasShot, setEnemyHasShot] = useState(false);
  const [sounds, setSounds] = useState({});

  // ── Animaciones ─────────────────────────────────────────────────────────
  const gunTranslateY = useSharedValue(0);
  const gunRotate = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const resultScale = useSharedValue(0.8);
  const resultOpacity = useSharedValue(0);

  const drawSignalTime = useRef(null);
  const reacted        = useRef(false);
  const searchInterval = useRef(null);
  const botShootTimer  = useRef(null);
  const roomIdRef      = useRef(null);
  const countdownStarted = useRef(false);

  useEffect(() => {
    ApiService.getPlayerStats(playerId).then(res => {
      if (res && res.data) setPlayerStats(res.data);
    }).catch(() => {});

    async function loadSounds() {
      try {
        const { sound: shootSound } = await Audio.Sound.createAsync(
          require('../../../assets/sounds/disparo.mp3')
        );
        const { sound: duelMusic } = await Audio.Sound.createAsync(
          require('../../../assets/sounds/musica-de-duelo-a-muerte-en-el-viejo-oeste-music-of-dueling-to-the-death-in-25-l.m4a')
        );
        await duelMusic.setIsLoopingAsync(true);
        setSounds({ shoot: shootSound, music: duelMusic });
      } catch (e) {
        console.log("Error cargando audios:", e.message);
      }
    }
    loadSounds();

    return () => {
      handleCleanup(); // Aseguramos limpieza si el componente se desmonta de golpe
    };
  }, []);

  // ── Navegación y Limpieza (UX Mejorada) ─────────────────────────────────
  const handleCleanup = () => {
    if (sounds.shoot) sounds.shoot.unloadAsync();
    if (sounds.music) {
      sounds.music.stopAsync();
      sounds.music.unloadAsync();
    }
    clearInterval(searchInterval.current);
    clearTimeout(botShootTimer.current);
    off(ref(database, 'wildwest/lobby'));
    
    // Si estábamos esperando a alguien, borramos nuestra sala
    if (duelState === DUEL_STATES.WAITING && roomIdRef.current) {
      remove(ref(database, `wildwest/lobby/${roomIdRef.current}`)).catch(() => {});
    }
  };

  const handleExit = () => {
    handleCleanup();
    navigation.goBack();
  };

  // ── Lógica del Juego ────────────────────────────────────────────────────
  const joinRoom = async () => {
    setDuelState(DUEL_STATES.WAITING);
    setIsBotMatch(false);
    setHasShot(false);
    setEnemyHasShot(false);
    setSearchCountdown(15);
    reacted.current = false;
    countdownStarted.current = false;
    
    // Reset de animaciones
    gunTranslateY.value = 0;
    gunRotate.value = 0;
    resultScale.value = 0.8;
    resultOpacity.value = 0;

    if (sounds.music) {
      await sounds.music.setVolumeAsync(0.6);
      await sounds.music.playAsync();
    }

    searchInterval.current = setInterval(() => {
      setSearchCountdown(prev => {
        if (prev <= 1) {
          clearInterval(searchInterval.current);
          startBotMatch();
          return 0;
        }
        if (sounds.music) sounds.music.setVolumeAsync(Math.max(0.1, prev * 0.04));
        return prev - 1;
      });
    }, 1000);

    const lobbyRef = ref(database, 'wildwest/lobby');
    onValue(lobbyRef, async (snapshot) => {
      const rooms = snapshot.val() || {};
      const now = Date.now();
      
      const openRoom = Object.entries(rooms).find(([id, r]) => {
        if (r.status !== 'waiting' || !r.player1 || r.player2 || r.player1.id === playerId) return false;
        if (r.createdAt && (now - r.createdAt > 60000)) {
           remove(ref(database, `wildwest/lobby/${id}`)).catch(() => {});
           return false;
        }
        return true;
      });

      if (openRoom) {
        clearInterval(searchInterval.current);
        const [id, room] = openRoom;
        roomIdRef.current = id;
        await update(ref(database, `wildwest/lobby/${id}`), { player2: { id: playerId, name: playerName }, status: 'ready' });
        listenRoom(id);
        off(lobbyRef);
      } else {
        const newRoomRef = push(ref(database, 'wildwest/lobby'));
        const id = newRoomRef.key;
        roomIdRef.current = id;
        onDisconnect(newRoomRef).remove();
        await set(newRoomRef, { player1: { id: playerId, name: playerName }, status: 'waiting', createdAt: serverTimestamp() });
        listenRoom(id);
        off(lobbyRef);
      }
    }, { onlyOnce: true });
  };

  const listenRoom = (id) => {
    const roomRef = ref(database, `wildwest/lobby/${id}`);
    onValue(roomRef, async (snapshot) => {
      const room = snapshot.val();
      if (!room) return;
      if (room.status === 'ready' && !countdownStarted.current) {
        clearInterval(searchInterval.current);
        setDuelState(DUEL_STATES.READY);
        countdownStarted.current = true;
        startDrawCountdown(room.player1.id === playerId, false);
      }
      if (room.status === 'draw' && !reacted.current) {
        drawSignalTime.current = Date.now();
        setDuelState(DUEL_STATES.DRAW);
        setCountdown(null);
      }
      if (room.status === 'result' && room.reactions) {
        resolveResult(room);
        off(roomRef);
      }
    });
  };

  const startBotMatch = () => {
    off(ref(database, 'wildwest/lobby'));
    if (roomIdRef.current) remove(ref(database, `wildwest/lobby/${roomIdRef.current}`)).catch(() => {});

    setIsBotMatch(true);
    setDuelState(DUEL_STATES.READY);
    countdownStarted.current = true;
    startDrawCountdown(true, true);
  };

  const startDrawCountdown = (isHost, isBot = false) => {
    const extraWaitMs = 1000 + Math.random() * 3000;
    let count = 3;
    setCountdown(count);

    const cInterval = setInterval(async () => {
      count--;
      if (count > 0) {
        setCountdown(count);
        if (sounds.music) await sounds.music.setVolumeAsync(Math.max(0.6 - ((3 - count) * 0.15), 0.1));
      } else {
        clearInterval(cInterval);
        setCountdown(null);
        
        if (isBot) {
          setDuelState(DUEL_STATES.DRAW);
          drawSignalTime.current = Date.now();
          const botReflex = Math.floor(Math.random() * 250) + 200; 
          botShootTimer.current = setTimeout(() => handleBotShoot(botReflex), botReflex);
        } else if (isHost) {
          setTimeout(() => update(ref(database, `wildwest/lobby/${roomIdRef.current}`), { status: 'draw', drawTimestamp: Date.now() }), extraWaitMs);
        }
      }
    }, 1000);
  };

  // ── Feedback Visual de Disparo (Juice) ──────────────────────────────────
  const triggerShootAnimation = () => {
    gunTranslateY.value = withSequence(withTiming(40, {duration: 50}), withSpring(0));
    gunRotate.value = withSequence(withTiming(-15, {duration: 50}), withSpring(0));
    flashOpacity.value = withSequence(withTiming(1, {duration: 20}), withTiming(0, {duration: 200}));
  };

  const handleDraw = async () => {
    if (duelState !== DUEL_STATES.DRAW || reacted.current) return;
    reacted.current = true;
    
    const reactionTimeMs = Date.now() - drawSignalTime.current;
    setMyReaction(reactionTimeMs);
    setHasShot(true);
    triggerShootAnimation();
    
    if (sounds.shoot) await sounds.shoot.replayAsync();
    if (sounds.music) await sounds.music.stopAsync();

    if (isBotMatch) {
      clearTimeout(botShootTimer.current);
      setMatchResult('win');
      ApiService.saveDuelStat({ playerId, playerName, result: 'win', reactionTimeMs }).catch(()=>{});
      showResultCard();
    } else {
      await update(ref(database, `wildwest/lobby/${roomIdRef.current}/reactions`), { [playerId]: { name: playerName, reactionTimeMs, timestamp: Date.now() } });
    }
  };

  const handleBotShoot = async (botReflex) => {
    if (reacted.current) return;
    reacted.current = true;
    setEnemyReaction(botReflex);
    setEnemyHasShot(true);
    
    if (sounds.shoot) await sounds.shoot.replayAsync();
    if (sounds.music) await sounds.music.stopAsync();
    
    setMatchResult('loss');
    ApiService.saveDuelStat({ playerId, playerName, result: 'loss', reactionTimeMs: 9999 }).catch(()=>{});
    showResultCard();
  };

  const resolveResult = (room) => {
    const reactions = Object.entries(room.reactions || {});
    if (reactions.length < 2) return;
    const mine = room.reactions[playerId];
    const enemy = reactions.find(([id]) => id !== playerId)[1];

    setMyReaction(mine.reactionTimeMs);
    setEnemyReaction(enemy.reactionTimeMs);
    
    const win = mine.reactionTimeMs < enemy.reactionTimeMs;
    setMatchResult(win ? 'win' : 'loss');
    setHasShot(mine.reactionTimeMs <= enemy.reactionTimeMs);
    setEnemyHasShot(enemy.reactionTimeMs <= mine.reactionTimeMs);
    
    if (sounds.music) sounds.music.stopAsync();
    showResultCard();
  };

  const showResultCard = () => {
    setTimeout(() => {
      setDuelState(DUEL_STATES.RESULT);
      resultScale.value = withSpring(1, { damping: 12 });
      resultOpacity.value = withTiming(1, { duration: 300 });
    }, 1500); // Pequeña pausa dramática antes de mostrar el resultado
  };

  // ── Estilos Animados ────────────────────────────────────────────────────
  const animatedGunStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: gunTranslateY.value }, { rotate: `${gunRotate.value}deg` }]
  }));
  const animatedFlashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));
  const animatedResultStyle = useAnimatedStyle(() => ({
    opacity: resultOpacity.value,
    transform: [{ scale: resultScale.value }]
  }));

  // ── Renderizado ─────────────────────────────────────────────────────────
  return (
    <ImageBackground 
      source={require('../../../assets/sprites/fondo viejo oeste.avif')} 
      style={styles.background} 
      resizeMode="cover"
    >
      {/* Capa de destello al disparar */}
      <Animated.View style={[styles.flashScreen, animatedFlashStyle]} pointerEvents="none" />

      <SafeAreaView style={styles.safeArea}>
        
        {/* TOP BAR - Navegación */}
        {[DUEL_STATES.LOBBY, DUEL_STATES.WAITING, DUEL_STATES.RESULT].includes(duelState) && (
          <View style={styles.topBar}>
            <TouchableOpacity onPress={handleExit} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Abandonar Pueblo</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.overlay}>
          {duelState === DUEL_STATES.LOBBY && (
            <View style={styles.centerBox}>
              <Text style={styles.titleCinematic}>WILD WEST</Text>
              <Text style={styles.subtitleCinematic}>QUICK DRAW DUEL</Text>
              
              {playerStats && (
                <View style={styles.statsCard}>
                  <Text style={styles.statsTitle}>TU LEYENDA</Text>
                  <Text style={styles.statsText}>Victorias: <Text style={styles.statsHighlight}>{playerStats.wins}</Text> | Derrotas: <Text style={styles.statsHighlight}>{playerStats.losses}</Text></Text>
                  <Text style={styles.statsText}>Mejor Reflejo: <Text style={styles.statsHighlight}>{playerStats.bestReactionTimeMs || 0}ms</Text></Text>
                </View>
              )}

              <TouchableOpacity style={styles.actionBtn} onPress={joinRoom} activeOpacity={0.8}>
                <Text style={styles.actionBtnText}>🤠 BUSCAR DUELO</Text>
              </TouchableOpacity>
            </View>
          )}

          {duelState === DUEL_STATES.WAITING && (
            <View style={styles.centerBox}>
              <Text style={styles.titleCinematic}>BUSCANDO...</Text>
              <View style={styles.searchCircle}>
                <Text style={styles.searchCountdownText}>{searchCountdown}</Text>
              </View>
              <Text style={styles.subtitleCinematic}>Afilando espuelas. Si no hay rival,{'\n'}la IA te retará pronto.</Text>
            </View>
          )}

          {[DUEL_STATES.READY, DUEL_STATES.DRAW, DUEL_STATES.RESULT].includes(duelState) && (
            <Pressable 
              onPressIn={handleDraw} 
              onTouchStart={handleDraw}
              style={styles.gameArea}
              disabled={duelState === DUEL_STATES.RESULT} // Desactiva el toque si ya terminó
            >
              <View style={styles.hudCenter}>
                {duelState === DUEL_STATES.READY && <Text style={styles.countdownCinematic}>{countdown}</Text>}
                {duelState === DUEL_STATES.DRAW && !reacted.current && <Text style={styles.drawSignalCinematic}>¡DIBUJA!</Text>}
                
                {duelState === DUEL_STATES.RESULT && (
                  <Animated.View style={[styles.resultCard, animatedResultStyle]}>
                    <Text style={[styles.resultTitle, { color: matchResult === 'win' ? '#34d399' : '#ef4444' }]}>
                      {matchResult === 'win' ? '¡SOBREVIVISTE!' : '¡CAÍSTE!'}
                    </Text>
                    <View style={styles.resultDetails}>
                      <Text style={styles.msLabel}>Tus reflejos: <Text style={styles.msValue}>{myReaction}ms</Text></Text>
                      {enemyReaction && <Text style={styles.msLabel}>Oponente: <Text style={styles.msValue}>{enemyReaction}ms</Text></Text>}
                    </View>
                    
                    <TouchableOpacity style={styles.retryBtn} onPress={() => setDuelState(DUEL_STATES.LOBBY)} activeOpacity={0.8}>
                      <Text style={styles.retryBtnText}>↻ OTRO DUELO</Text>
                    </TouchableOpacity>
                  </Animated.View>
                )}
              </View>

              <View style={styles.enemySpriteContainer}>
                <Image 
                  source={
                    enemyHasShot ? require('../../../assets/sprites/enemigodisparando.png') :
                    (matchResult === 'win' && duelState === DUEL_STATES.RESULT) ? require('../../../assets/sprites/EnemigoDisparado.png') :
                    require('../../../assets/sprites/Enemigo.png')
                  }
                  style={styles.enemySprite}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.playerSpriteContainer}>
                <Animated.Image 
                  source={
                    hasShot ? require('../../../assets/sprites/balaDisparada.png') : 
                    require('../../../assets/sprites/pistolasinDisparar.png')
                  } 
                  style={[styles.gunSprite, animatedGunStyle]} 
                  resizeMode="contain"
                />
              </View>
            </Pressable>
          )}

        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center' },
  flashScreen: { ...StyleSheet.absoluteFillObject, backgroundColor: 'white', zIndex: 100 },
  
  // NAVEGACIÓN
  topBar: { width: '100%', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 10, alignItems: 'flex-start', zIndex: 50 },
  backButton: { backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#52525b' },
  backButtonText: { color: '#d4d4d8', fontSize: 14, fontWeight: '600' },

  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, width: '100%' },
  gameArea: { flex: 1, width: '100%' },
  
  // TIPOGRAFÍA Y UI LOBBY
  titleCinematic: { fontSize: windowWidth < 400 ? 40 : 54, fontWeight: '900', color: '#ffedd5', letterSpacing: 4, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: {width: 0, height: 4}, textShadowRadius: 10 },
  subtitleCinematic: { fontSize: 16, color: '#fdba74', marginTop: 8, letterSpacing: 2, textAlign: 'center', textShadowColor: '#000', textShadowRadius: 5 },
  
  statsCard: { backgroundColor: 'rgba(20, 10, 5, 0.7)', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#9a3412', marginTop: 25, width: '80%', maxWidth: 300, alignItems: 'center' },
  statsTitle: { color: '#fb923c', fontSize: 12, fontWeight: '900', letterSpacing: 2, marginBottom: 8 },
  statsText: { color: '#d1d5db', fontSize: 14, marginVertical: 2 },
  statsHighlight: { color: '#fff', fontWeight: 'bold' },

  actionBtn: { backgroundColor: '#ea580c', paddingVertical: 18, paddingHorizontal: 40, borderRadius: 16, marginTop: 40, shadowColor: '#ea580c', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.5, shadowRadius: 10, elevation: 8 },
  actionBtnText: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 1 },

  // UI BÚSQUEDA
  searchCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: '#ef4444', justifyContent: 'center', alignItems: 'center', marginVertical: 30, backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  searchCountdownText: { fontSize: 48, fontWeight: 'bold', color: '#ef4444' },

  // UI JUEGO
  countdownCinematic: { fontSize: windowWidth < 400 ? 90 : 130, fontWeight: '900', color: '#ef4444', textShadowColor: '#000', textShadowRadius: 20, marginTop: '30%' },
  drawSignalCinematic: { fontSize: windowWidth < 400 ? 70 : 100, fontWeight: '900', color: '#fff', textShadowColor: '#000', textShadowRadius: 30, marginTop: '30%' },
  hudCenter: { position: 'absolute', top: 0, width: '100%', alignItems: 'center', zIndex: 20, height: '100%' },
  
  // UI RESULTADOS
  resultCard: { backgroundColor: 'rgba(15, 10, 5, 0.95)', padding: 30, borderRadius: 24, borderWidth: 2, borderColor: '#ea580c', marginTop: '25%', alignItems: 'center', width: '85%', maxWidth: 350, shadowColor: '#000', shadowOffset: {width:0, height:10}, shadowOpacity: 0.8, shadowRadius: 20 },
  resultTitle: { fontSize: windowWidth < 400 ? 32 : 40, fontWeight: '900', marginBottom: 20, textTransform: 'uppercase' },
  resultDetails: { backgroundColor: 'rgba(0,0,0,0.5)', padding: 15, borderRadius: 12, width: '100%', marginBottom: 20 },
  msLabel: { color: '#d1d5db', fontSize: 16, marginBottom: 8, textAlign: 'center' },
  msValue: { color: '#fb923c', fontWeight: 'bold', fontSize: 20, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  retryBtn: { backgroundColor: '#ea580c', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 12, width: '100%', alignItems: 'center' },
  retryBtnText: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 1 },

  // SPRITES
  enemySpriteContainer: { position: 'absolute', bottom: '25%', alignSelf: 'center', width: '55%', maxWidth: 300, aspectRatio: 320/450 },
  enemySprite: { width: '100%', height: '100%' },
  playerSpriteContainer: { position: 'absolute', bottom: -20, right: -10, width: '55%', maxWidth: 300, aspectRatio: 280/380, zIndex: 10 },
  gunSprite: { width: '100%', height: '100%' },
});
