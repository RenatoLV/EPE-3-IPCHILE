/**
 * screens/WildWest/WildWestScreen.js
 * 
 * Wild West Quick Draw — Gráficos Inmersivos y Full-Screen Tap
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, Platform, TouchableWithoutFeedback
} from 'react-native';
import { LinearGradient }   from 'expo-linear-gradient';
import { useNavigation }    from '@react-navigation/native';
import { database, auth }   from '../../services/firebase';
import { ref, set, onValue, off, update, push, serverTimestamp } from 'firebase/database';
import { wildWestAPI }      from '../../services/api';

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const W = isWeb ? Math.min(windowWidth, 480) : windowWidth;
const H = windowHeight;

const DUEL_STATES = { LOBBY: 'lobby', WAITING: 'waiting', READY: 'ready', DRAW: 'draw', RESULT: 'result' };

export default function WildWestScreen() {
  const navigation  = useNavigation();
  const user        = auth.currentUser;
  const playerId    = user?.uid || 'anon';
  const playerName  = user?.displayName || 'Vaquero';

  const [duelState,    setDuelState]    = useState(DUEL_STATES.LOBBY);
  const [roomId,       setRoomId]       = useState(null);
  const [countdown,    setCountdown]    = useState(null);
  const [myResult,     setMyResult]     = useState(null);
  const [myReaction,   setMyReaction]   = useState(null);
  const [enemyReaction, setEnemyReaction] = useState(null);
  const [playerStats,  setPlayerStats]  = useState(null);

  const drawSignalTime = useRef(null);
  const reacted        = useRef(false);

  useEffect(() => {
    wildWestAPI.getPlayerStats(playerId).then(res => setPlayerStats(res.data)).catch(() => {});
  }, []);

  const joinRoom = async () => {
    setDuelState(DUEL_STATES.WAITING);
    const lobbyRef = ref(database, 'wildwest/lobby');
    onValue(lobbyRef, async (snapshot) => {
      const rooms = snapshot.val() || {};
      const openRoom = Object.entries(rooms).find(([id, r]) => r.player1 && !r.player2 && r.player1.id !== playerId);

      if (openRoom) {
        const [id, room] = openRoom;
        setRoomId(id);
        await update(ref(database, `wildwest/lobby/${id}`), { player2: { id: playerId, name: playerName }, status: 'ready' });
        listenRoom(id);
        off(lobbyRef);
      } else {
        const newRoomRef = push(ref(database, 'wildwest/lobby'));
        const id = newRoomRef.key;
        setRoomId(id);
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
      if (room.status === 'ready' && room.player1 && room.player2) {
        setDuelState(DUEL_STATES.READY);
        if (room.player1.id === playerId) startDrawCountdown(id);
      }
      if (room.status === 'draw' && !reacted.current) {
        drawSignalTime.current = Date.now();
        setDuelState(DUEL_STATES.DRAW);
        setCountdown(null);
      }
      if (room.status === 'result' && room.reactions) {
        await resolveResult(room);
        off(roomRef);
      }
    });
  };

  const startDrawCountdown = (id) => {
    const waitMs = 2000 + Math.random() * 3000;
    let count = 3;
    setCountdown(count);
    const cInterval = setInterval(() => {
      count--;
      if (count > 0) setCountdown(count);
      else {
        clearInterval(cInterval);
        setCountdown(null);
        setTimeout(() => update(ref(database, `wildwest/lobby/${id}`), { status: 'draw', drawTimestamp: Date.now() }), waitMs - 3000);
      }
    }, 1000);
  };

  const handleDraw = async () => {
    if (duelState !== DUEL_STATES.DRAW || reacted.current) return;
    reacted.current = true;
    const touchTimestamp  = Date.now();
    const reactionTimeMs  = touchTimestamp - (drawSignalTime.current || touchTimestamp);
    setMyReaction(reactionTimeMs);
    await update(ref(database, `wildwest/lobby/${roomId}/reactions`), { [playerId]: { name: playerName, reactionTimeMs, timestamp: touchTimestamp } });
  };

  const resolveResult = async (room) => {
    const reactions = Object.entries(room.reactions || {});
    if (reactions.length < 2) return;
    const mine  = room.reactions[playerId];
    const enemy = reactions.find(([id]) => id !== playerId);
    if (!mine || !enemy) return;

    const enemyData = enemy[1];
    const result = mine.reactionTimeMs < enemyData.reactionTimeMs ? 'win' : 'loss';
    const isDraw = mine.reactionTimeMs === enemyData.reactionTimeMs;

    setMyReaction(mine.reactionTimeMs);
    setEnemyReaction(enemyData.reactionTimeMs);
    setMyResult(isDraw ? 'draw' : result);
    setDuelState(DUEL_STATES.RESULT);

    try {
      await wildWestAPI.saveDuelStat({ playerId, playerName, result: isDraw ? 'loss' : result, reactionTimeMs: mine.reactionTimeMs });
      const statsRes = await wildWestAPI.getPlayerStats(playerId);
      setPlayerStats(statsRes.data);
    } catch(e){}
  };

  const WebWrapper = ({children, colors}) => (
    <View style={styles.webWrapper}>
      <LinearGradient colors={colors} style={styles.container}>
        {children}
      </LinearGradient>
    </View>
  );

  if (duelState === DUEL_STATES.LOBBY) {
    return (
      <WebWrapper colors={['#271c19', '#4a2511', '#000']}>
        <View style={styles.sunGlow} />
        <Text style={styles.titleCinematic}>WILD WEST</Text>
        <Text style={styles.subtitleCinematic}>QUICK DRAW</Text>

        {playerStats && (
          <View style={styles.statsCardGlass}>
            <Text style={styles.statsTitle}>RÉCORD PERSONAL</Text>
            <View style={styles.statRow}><Text style={styles.statLabel}>Duelos Totales</Text><Text style={styles.statValue}>{playerStats.totalDuels}</Text></View>
            <View style={styles.statRow}><Text style={styles.statLabel}>K/D</Text><Text style={styles.statValue}>{playerStats.wins}V - {playerStats.losses}D</Text></View>
            <View style={styles.statRow}><Text style={styles.statLabel}>Velocidad Promedio</Text><Text style={styles.statValue}>{playerStats.avgReactionTimeMs}ms</Text></View>
          </View>
        )}

        <TouchableOpacity style={styles.actionBtn} onPress={joinRoom}>
          <Text style={styles.actionBtnText}>BUSCAR DUELO</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backText}>Abandonar Pueblo</Text></TouchableOpacity>
      </WebWrapper>
    );
  }

  if (duelState === DUEL_STATES.WAITING) {
    return (
      <WebWrapper colors={['#271c19', '#4a2511', '#000']}>
        <Text style={styles.titleCinematic}>ESPERANDO...</Text>
        <Text style={styles.subtitleCinematic}>BUSCANDO FORASTERO</Text>
      </WebWrapper>
    );
  }

  if (duelState === DUEL_STATES.READY) {
    return (
      <WebWrapper colors={['#4a2511', '#1a0d06', '#000']}>
        <Text style={[styles.titleCinematic, {color: '#fca5a5'}]}>PREPÁRATE</Text>
        {countdown !== null && <Text style={styles.countdownCinematic}>{countdown}</Text>}
        <Text style={styles.subtitleCinematic}>NO DISPARES AÚN</Text>
      </WebWrapper>
    );
  }

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

  if (duelState === DUEL_STATES.RESULT) {
    const won = myResult === 'win';
    return (
      <WebWrapper colors={won ? ['#022c22', '#064e3b', '#000'] : ['#4c0519', '#881337', '#000']}>
        <Text style={[styles.titleCinematic, {color: won ? '#34d399' : '#f87171'}]}>{won ? 'VIVO' : 'MUERTO'}</Text>
        
        <View style={styles.statsCardGlass}>
          <View style={styles.statRow}><Text style={styles.statLabel}>Tu reacción</Text><Text style={styles.statValue}>{myReaction}ms</Text></View>
          <View style={styles.statRow}><Text style={styles.statLabel}>El enemigo</Text><Text style={styles.statValue}>{enemyReaction}ms</Text></View>
        </View>

        <TouchableOpacity style={[styles.actionBtn, {marginTop: 40}]} onPress={() => { reacted.current = false; setDuelState(DUEL_STATES.LOBBY); }}>
          <Text style={styles.actionBtnText}>REVANCHA</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backText}>Abandonar Pueblo</Text></TouchableOpacity>
      </WebWrapper>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  webWrapper: { flex: 1, backgroundColor: '#000', alignItems: 'center' },
  container:  { flex: 1, width: W, alignItems: 'center', paddingTop: 80, paddingHorizontal: 20 },
  containerCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sunGlow: { position: 'absolute', top: H*0.2, width: 300, height: 300, borderRadius: 150, backgroundColor: '#fb923c', opacity: 0.1, shadowColor: '#ea580c', shadowOpacity: 1, shadowRadius: 100, elevation: 10 },
  titleCinematic: { fontSize: 46, fontWeight: '900', color: '#fed7aa', letterSpacing: 4, fontFamily: Platform.OS==='ios'?'Georgia':'serif', textShadowColor: '#c2410c', textShadowOffset: {width: 0, height: 2}, textShadowRadius: 10, textAlign: 'center' },
  subtitleCinematic: { fontSize: 16, color: '#fdba74', letterSpacing: 6, marginTop: 10, marginBottom: 40, opacity: 0.8 },
  countdownCinematic: { fontSize: 120, fontWeight: '900', color: '#ef4444', textShadowColor: '#991b1b', textShadowRadius: 20, marginVertical: 30 },
  drawSignalCinematic: { fontSize: 60, fontWeight: '900', color: '#fef2f2', letterSpacing: 5, textShadowColor: '#000', textShadowOffset: {width: 2, height: 4}, textShadowRadius: 10 },
  drawHintCinematic: { fontSize: 16, color: '#fef2f2', marginTop: 20, letterSpacing: 2, opacity: 0.8 },
  statsCardGlass: { backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 16, padding: 24, width: '100%', borderWidth: 1, borderColor: 'rgba(253,186,116,0.2)', marginBottom: 30 },
  statsTitle: { color: '#fed7aa', fontSize: 14, letterSpacing: 3, marginBottom: 20, textAlign: 'center', fontWeight: 'bold' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 8 },
  statLabel: { color: '#d1d5db', fontSize: 15 },
  statValue: { color: '#fb923c', fontSize: 16, fontWeight: 'bold' },
  actionBtn: { backgroundColor: 'rgba(234,88,12,0.1)', paddingVertical: 18, paddingHorizontal: 50, borderRadius: 30, borderWidth: 1.5, borderColor: '#ea580c', shadowColor: '#ea580c', shadowOpacity: 0.5, shadowRadius: 15, elevation: 5, marginBottom: 20 },
  actionBtnText: { color: '#fed7aa', fontSize: 18, fontWeight: 'bold', letterSpacing: 3 },
  backText: { color: '#9ca3af', fontSize: 14, marginTop: 10, textDecorationLine: 'underline' }
});
