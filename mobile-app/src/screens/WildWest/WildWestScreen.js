/**
 * screens/WildWest/WildWestScreen.js
 * Wild West Quick Draw — Sprites, Audio Dinámico (Fade), Modo IA (15s) y Bot Difícil
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Dimensions, Platform, 
  Image, Pressable, ImageBackground, Alert, TouchableOpacity
} from 'react-native';
import { useNavigation }  from '@react-navigation/native';
import { Audio }          from 'expo-av';
import { database, auth } from '../../services/firebase';
import { ref, set, onValue, off, update, push, serverTimestamp } from 'firebase/database';
import { ApiService }     from '../../services/api';

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const W = isWeb ? Math.min(windowWidth, 800) : windowWidth;
const H = windowHeight;

const DUEL_STATES = { LOBBY: 'lobby', WAITING: 'waiting', READY: 'ready', DRAW: 'draw', RESULT: 'result' };

export default function WildWestScreen() {
  const navigation  = useNavigation();
  const user        = auth.currentUser;
  const playerId    = user?.uid || 'anon';
  const playerName  = user?.displayName || 'Vaquero';

  // Estados del juego
  const [duelState, setDuelState] = useState(DUEL_STATES.LOBBY);
  const [countdown, setCountdown] = useState(null);
  const [searchCountdown, setSearchCountdown] = useState(15); // NUEVO: 15 segundos de búsqueda
  const [isBotMatch, setIsBotMatch] = useState(false);
  const [playerStats, setPlayerStats] = useState(null);
  
  // Resultados y Reacciones
  const [myReaction, setMyReaction] = useState(null);
  const [enemyReaction, setEnemyReaction] = useState(null);
  const [matchResult, setMatchResult] = useState(null); // 'win', 'loss' o 'draw'
  
  // Estados Visuales (Sprites)
  const [hasShot, setHasShot] = useState(false);
  const [enemyHasShot, setEnemyHasShot] = useState(false);
  const [sounds, setSounds] = useState({});

  // Referencias para temporizadores
  const drawSignalTime = useRef(null);
  const reacted        = useRef(false);
  const searchInterval = useRef(null); // NUEVO: Para el contador visual de 15s
  const botShootTimer  = useRef(null);
  const roomIdRef      = useRef(null);

  // ── 1. Carga de Assets (Audio) y Stats ──────────────────────────────────
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
      // Limpieza total al salir
      if (sounds.shoot) sounds.shoot.unloadAsync();
      if (sounds.music) {
        sounds.music.stopAsync();
        sounds.music.unloadAsync();
      }
      clearInterval(searchInterval.current);
      clearTimeout(botShootTimer.current);
    };
  }, []);

  // ── 2. Lógica de Búsqueda y Bot IA ──────────────────────────────────────
  const joinRoom = async () => {
    setDuelState(DUEL_STATES.WAITING);
    setIsBotMatch(false);
    setHasShot(false);
    setEnemyHasShot(false);
    setSearchCountdown(15);
    reacted.current = false;
    
    // Iniciar música de tensión
    if (sounds.music) {
      await sounds.music.setVolumeAsync(0.6);
      await sounds.music.playAsync();
    }

    // Contador visual de 15 segundos para la IA
    searchInterval.current = setInterval(() => {
      setSearchCountdown(prev => {
        if (prev <= 1) {
          clearInterval(searchInterval.current);
          startBotMatch();
          return 0;
        }
        // Bajar música gradualmente durante la búsqueda
        if (sounds.music) {
          sounds.music.setVolumeAsync(Math.max(0.1, prev * 0.04));
        }
        return prev - 1;
      });
    }, 1000);

    const lobbyRef = ref(database, 'wildwest/lobby');
    onValue(lobbyRef, async (snapshot) => {
      const rooms = snapshot.val() || {};
      const openRoom = Object.entries(rooms).find(([id, r]) => r.player1 && !r.player2 && r.player1.id !== playerId);

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
      if (room.status === 'ready') {
        clearInterval(searchInterval.current);
        setDuelState(DUEL_STATES.READY);
        if (room.player1.id === playerId) startDrawCountdown();
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
    console.log("Iniciando duelo contra IA Difícil...");
    off(ref(database, 'wildwest/lobby'));
    setIsBotMatch(true);
    setDuelState(DUEL_STATES.READY);
    startDrawCountdown();
  };

  const startDrawCountdown = () => {
    const waitMs = 2000 + Math.random() * 3000;
    let count = 3;
    setCountdown(count);

    const cInterval = setInterval(async () => {
      count--;
      if (count > 0) {
        setCountdown(count);
        if (sounds.music) {
          const newVol = 0.6 - ( (3 - count) * 0.15 );
          await sounds.music.setVolumeAsync(Math.max(newVol, 0.1));
        }
      } else {
        clearInterval(cInterval);
        setCountdown(null);
        
        if (isBotMatch) {
          setDuelState(DUEL_STATES.DRAW);
          drawSignalTime.current = Date.now();
          // BOT DIFICIL: Reacción entre 200ms y 450ms
          const botReflex = Math.floor(Math.random() * 250) + 200; 
          botShootTimer.current = setTimeout(() => handleBotShoot(botReflex), botReflex);
        } else {
          setTimeout(() => update(ref(database, `wildwest/lobby/${roomIdRef.current}`), { status: 'draw', drawTimestamp: Date.now() }), waitMs - 3000);
        }
      }
    }, 1000);
  };

  // ── 3. Lógica de Disparo ────────────────────────────────────────────────
  const handleDraw = async () => {
    if (duelState !== DUEL_STATES.DRAW || reacted.current) return;
    reacted.current = true;
    
    const reactionTimeMs = Date.now() - drawSignalTime.current;
    setMyReaction(reactionTimeMs);
    setHasShot(true);
    
    if (sounds.shoot) await sounds.shoot.replayAsync();
    if (sounds.music) await sounds.music.stopAsync();

    if (isBotMatch) {
      clearTimeout(botShootTimer.current);
      setMatchResult('win');
      ApiService.saveDuelStat({ playerId, playerName, result: 'win', reactionTimeMs }).catch(()=>{});
      setTimeout(() => setDuelState(DUEL_STATES.RESULT), 2000);
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
    setTimeout(() => setDuelState(DUEL_STATES.RESULT), 2000);
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
    setDuelState(DUEL_STATES.RESULT);
  };

  // ── 4. Renderizado ──────────────────────────────────────────────────────
  return (
    <ImageBackground 
      source={require('../../../assets/sprites/fondo viejo oeste.avif')} 
      style={styles.webWrapper} 
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        
        {duelState === DUEL_STATES.LOBBY && (
          <View style={styles.centerBox}>
            <Text style={styles.titleCinematic}>WILD WEST</Text>
            <Text style={styles.subtitleCinematic}>QUICK DRAW DUEL</Text>
            
            {playerStats && (
              <View style={styles.statsMini}>
                <Text style={styles.statsMiniText}>K/D: {playerStats.wins}V - {playerStats.losses}D</Text>
                <Text style={styles.statsMiniText}>Mejor: {playerStats.bestReactionTimeMs || playerStats.avgReactionTimeMs || 0}ms</Text>
              </View>
            )}

            <Pressable style={styles.actionBtn} onPress={joinRoom}>
              <Text style={styles.actionBtnText}>BUSCAR DUELO</Text>
            </Pressable>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{marginTop: 20}}>
              <Text style={styles.backText}>VOLVER</Text>
            </TouchableOpacity>
          </View>
        )}

        {duelState === DUEL_STATES.WAITING && (
          <View style={styles.centerBox}>
            <Text style={styles.titleCinematic}>BUSCANDO...</Text>
            <Text style={styles.searchCountdownText}>{searchCountdown}s</Text>
            <Text style={styles.subtitleCinematic}>Si no hay forasteros, la IA te retará</Text>
          </View>
        )}

        {[DUEL_STATES.READY, DUEL_STATES.DRAW, DUEL_STATES.RESULT].includes(duelState) && (
          <Pressable onPress={handleDraw} style={styles.gameArea}>
            
            {/* HUD Central */}
            <View style={styles.hudCenter}>
              {duelState === DUEL_STATES.READY && <Text style={styles.countdownCinematic}>{countdown}</Text>}
              {duelState === DUEL_STATES.DRAW && !reacted.current && <Text style={styles.drawSignalCinematic}>¡DIBUJA!</Text>}
              
              {duelState === DUEL_STATES.RESULT && (
                <View style={styles.resultCard}>
                  <Text style={[styles.resultTitle, { color: matchResult === 'win' ? '#34d399' : '#ef4444' }]}>
                    {matchResult === 'win' ? '¡VIVO!' : '¡MUERTO!'}
                  </Text>
                  <Text style={styles.msLabel}>Tus reflejos: <Text style={styles.msValue}>{myReaction}ms</Text></Text>
                  {enemyReaction && <Text style={styles.msLabel}>Oponente: <Text style={styles.msValue}>{enemyReaction}ms</Text></Text>}
                  
                  <Pressable style={styles.retryBtn} onPress={() => setDuelState(DUEL_STATES.LOBBY)}>
                    <Text style={styles.retryBtnText}>OTRO DUELO</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Sprites Dinámicos */}
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
              <Image 
                source={
                  hasShot ? require('../../../assets/sprites/balaDisparada.png') : 
                  require('../../../assets/sprites/pistolasinDisparar.png')
                } 
                style={[styles.gunSprite, hasShot && styles.gunRecoil]} 
                resizeMode="contain"
              />
            </View>

          </Pressable>
        )}

      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  webWrapper: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', width: '100%', alignItems: 'center' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  gameArea: { flex: 1, width: isWeb ? 800 : '100%' },
  
  titleCinematic: { fontSize: 50, fontWeight: '900', color: '#ffedd5', letterSpacing: 5, textShadowColor: '#000', textShadowRadius: 10 },
  subtitleCinematic: { fontSize: 16, color: '#fdba74', marginTop: 10, letterSpacing: 2 },
  searchCountdownText: { fontSize: 60, fontWeight: 'bold', color: '#ef4444', marginVertical: 20 },
  
  countdownCinematic: { fontSize: 120, fontWeight: '900', color: '#ef4444', textShadowColor: '#000', textShadowRadius: 20, marginTop: H * 0.15 },
  drawSignalCinematic: { fontSize: 90, fontWeight: '900', color: '#fff', textShadowColor: '#000', textShadowRadius: 25, marginTop: H * 0.15 },
  
  hudCenter: { position: 'absolute', top: 0, width: '100%', alignItems: 'center', zIndex: 20 },
  resultCard: { backgroundColor: 'rgba(0,0,0,0.85)', padding: 30, borderRadius: 24, borderWidth: 2, borderColor: '#ea580c', marginTop: H * 0.2, alignItems: 'center', width: '80%' },
  resultTitle: { fontSize: 48, fontWeight: '900', marginBottom: 15 },
  msLabel: { color: '#d1d5db', fontSize: 18, marginBottom: 5 },
  msValue: { color: '#fb923c', fontWeight: 'bold', fontFamily: 'monospace' },
  
  actionBtn: { backgroundColor: '#ea580c', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 12, marginTop: 30, shadowColor: '#ea580c', shadowOpacity: 0.5, shadowRadius: 10 },
  actionBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  retryBtn: { backgroundColor: '#4a2511', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8, marginTop: 25, borderWidth: 1, borderColor: '#fdba74' },
  retryBtnText: { color: '#fdba74', fontWeight: 'bold' },
  backText: { color: '#9ca3af', textDecorationLine: 'underline' },

  statsMini: { flexDirection: 'row', marginTop: 20 },
  statsMiniText: { color: '#fdba74', marginHorizontal: 15, fontSize: 14, fontWeight: 'bold' },

  enemySpriteContainer: {
    position: 'absolute',
    bottom: '22%',
    alignSelf: 'center',
    width: 320,
    height: 450,
  },
  enemySprite: { width: '100%', height: '100%' },
  
  playerSpriteContainer: {
    position: 'absolute',
    bottom: -30,
    right: '2%',
    width: 280,
    height: 380,
  },
  gunSprite: { width: '100%', height: '100%' },
  gunRecoil: { transform: [{ translateY: 40 }, { rotate: '-12deg' }] }
});
