/**
 * screens/ZenWorld/ZenWorldScreen.js
 * * Mundo Zen — Entorno Vivo, Armario y Sistema de Colisiones Sencillas (Estilo Club Penguin)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Dimensions, KeyboardAvoidingView, Platform, TouchableWithoutFeedback
} from 'react-native';
import { LinearGradient }     from 'expo-linear-gradient';
import { useNavigation }      from '@react-navigation/native';
import { database, auth }     from '../../services/firebase';
import { ref, set, onValue, off, onDisconnect, remove } from 'firebase/database';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, Easing } from 'react-native-reanimated';
import { useUniversalControls } from '../../hooks/useUniversalControls';

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const W = isWeb ? Math.min(windowWidth, 800) : windowWidth;
const H = windowHeight;

const WORLD_SIZE  = 1000;
const AVATAR_SIZE = 40;
const AVATAR_COLORS = ['#a855f7', '#22d3ee', '#f472b6', '#34d399', '#fb923c'];
const MOVEMENT_STEP = 30;

const AVAILABLE_AVATARS = ['🐧', '🤖', '🦊', '🐼', '🐸', '🐱', '🦄', '👻'];

// ── 1. Configuración del Mapa y Colisiones ───────────────────────────────
const DECORATIONS = [
  { id: 1, x: 100, y: 150, emoji: '🌸', size: 40 }, 
  { id: 2, x: 300, y: 220, emoji: '🏮', size: 50 },
  { id: 3, x: 500, y: 80,  emoji: '🌿', size: 30 }, 
  { id: 4, x: 650, y: 300, emoji: '🪷', size: 45 },
  // Objetos Sólidos (Tienen hitbox de colisión)
  { id: 5, x: 200, y: 400, emoji: '⛩️', size: 80, solid: true, ox: 5, oy: 40, hw: 70, hh: 40 }, 
  { id: 6, x: 450, y: 550, emoji: '🎋', size: 50 },
  { id: 7, x: 600, y: 650, emoji: '🌙', size: 40 }, 
  { id: 8, x: 150, y: 700, emoji: '🌊', size: 60, solid: true, ox: 0, oy: 20, hw: 60, hh: 40 }
];

const checkCollision = (newX, newY) => {
  const margin = 10;
  if (newX < margin || newX > WORLD_SIZE - AVATAR_SIZE - margin) return true;
  if (newY < margin || newY > WORLD_SIZE - AVATAR_SIZE - margin) return true;

  for (let d of DECORATIONS) {
    if (d.solid) {
      const hitX = d.x + (d.ox || 0);
      const hitY = d.y + (d.oy || 0);
      if (
        newX < hitX + d.hw &&
        newX + AVATAR_SIZE > hitX &&
        newY < hitY + d.hh &&
        newY + AVATAR_SIZE > hitY
      ) {
        return true; 
      }
    }
  }
  return false;
};

// ── Componente de Decoración Animada ──
const AnimatedDecoration = ({ d }) => {
  const offset = useSharedValue(0);

  useEffect(() => {
    const randomDuration = 1500 + Math.random() * 1500; 
    offset.value = withRepeat(
      withTiming(8, { duration: randomDuration, easing: Easing.inOut(Easing.quad) }),
      -1, true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }]
  }));

  return (
    <Animated.View style={[styles.decoration, { left: d.x, top: d.y }, animatedStyle]}>
      <Text style={{ fontSize: d.size, opacity: 0.8 }}>{d.emoji}</Text>
    </Animated.View>
  );
};

export default function ZenWorldScreen() {
  const navigation = useNavigation();
  const user       = auth.currentUser;
  const playerId   = user?.uid || 'anon';
  const playerName = user?.displayName || 'Espíritu';

  const [isInWardrobe, setIsInWardrobe] = useState(true); 
  const [selectedEmoji, setSelectedEmoji] = useState('🐧');
  
  const [myPos, setMyPos] = useState({ x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 });
  const [otherPlayers, setOtherPlayers] = useState({});
  const [chatInput, setChatInput] = useState('');
  const [myLatestMessage, setMyLatestMessage] = useState('');

  const myColor = AVATAR_COLORS[Math.abs(playerId.charCodeAt(0)) % AVATAR_COLORS.length];
  const playerRef = useRef(null);
  
  const animX = useSharedValue(WORLD_SIZE / 2);
  const animY = useSharedValue(WORLD_SIZE / 2);

  // ── 2. Sincronización con Firebase ──────────────────────────────────────
  useEffect(() => {
    if (isInWardrobe) return; 

    playerRef.current = ref(database, `zen/world/players/${playerId}`);
    onDisconnect(playerRef.current).remove();

    updateFirebasePosition(myPos.x, myPos.y, '');

    const worldRef = ref(database, 'zen/world/players');
    onValue(worldRef, (snap) => {
      const all = snap.val() || {};
      setOtherPlayers(Object.fromEntries(Object.entries(all).filter(([id]) => id !== playerId)));
    });

    return () => {
      if (playerRef.current) remove(playerRef.current);
      off(ref(database, 'zen/world/players'));
    };
  }, [isInWardrobe]);

  const updateFirebasePosition = (targetX, targetY, msg = myLatestMessage) => {
    if (isNaN(targetX) || isNaN(targetY)) return; 
    set(playerRef.current, { 
      id: playerId, name: playerName, x: targetX, y: targetY, color: myColor, 
      emoji: selectedEmoji, message: msg, messageTime: Date.now(), updatedAt: Date.now() 
    });
  };

  // ── 3. Controles con Validación de Colisión ─────────────────────────────
  const handleTapMove = (event) => {
    let lx = event.nativeEvent.locationX;
    let ly = event.nativeEvent.locationY;
    
    if (lx === undefined || isNaN(lx)) lx = event.nativeEvent.offsetX || 0;
    if (ly === undefined || isNaN(ly)) ly = event.nativeEvent.offsetY || 0;

    const viewX = Math.max(0, Math.min(myPos.x - W / 2, WORLD_SIZE - W));
    const viewY = Math.max(0, Math.min(myPos.y - H * 0.4, WORLD_SIZE - H));

    const targetX = viewX + lx - AVATAR_SIZE/2;
    const targetY = viewY + ly - AVATAR_SIZE/2;

    if (!checkCollision(targetX, targetY)) {
      executeMovement(targetX, targetY);
    }
  };

  const handleKeyboardMove = useCallback((dirStr) => {
    if (isInWardrobe) return;
    let newX = myPos.x;
    let newY = myPos.y;

    if (dirStr === 'UP') newY -= MOVEMENT_STEP;
    if (dirStr === 'DOWN') newY += MOVEMENT_STEP;
    if (dirStr === 'LEFT') newX -= MOVEMENT_STEP;
    if (dirStr === 'RIGHT') newX += MOVEMENT_STEP;

    if (!checkCollision(newX, newY)) {
      executeMovement(newX, newY);
    }
  }, [myPos, isInWardrobe]);

  useUniversalControls(handleKeyboardMove);

  const executeMovement = (targetX, targetY) => {
    if (isNaN(targetX) || isNaN(targetY)) return;
    animX.value = withTiming(targetX, { duration: 400, easing: Easing.out(Easing.quad) });
    animY.value = withTiming(targetY, { duration: 400, easing: Easing.out(Easing.quad) });
    setMyPos({ x: targetX, y: targetY });
    updateFirebasePosition(targetX, targetY);
  };

  // ── 4. Chat ─────────────────────────────────────────────────────────────
  const sendChatMessage = () => {
    const msg = chatInput.trim();
    if (!msg) return;
    setMyLatestMessage(msg);
    updateFirebasePosition(myPos.x, myPos.y, msg);
    setChatInput('');
    setTimeout(() => {
      setMyLatestMessage('');
      updateFirebasePosition(myPos.x, myPos.y, '');
    }, 5000);
  };

  const myAvatarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: animX.value }, { translateY: animY.value }]
  }));

  const viewX = Math.max(0, Math.min(myPos.x - W / 2, WORLD_SIZE - W));
  const viewY = Math.max(0, Math.min(myPos.y - H * 0.4, WORLD_SIZE - H));

  // ── RENDERIZADOS ────────────────────────────────────────────────────────
  if (isInWardrobe) {
    return (
      <View style={styles.webWrapper}>
        <LinearGradient colors={['#0f172a', '#1e1b4b']} style={styles.wardrobeContainer}>
          <Text style={styles.wardrobeTitle}>ELIGE TU ESPÍRITU</Text>
          <View style={styles.wardrobeGrid}>
            {AVAILABLE_AVATARS.map((emoji) => (
              <TouchableOpacity key={emoji} style={[styles.wardrobeItem, selectedEmoji === emoji && styles.wardrobeItemSelected]} onPress={() => setSelectedEmoji(emoji)}>
                <Text style={styles.wardrobeEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.wardrobeBtn} onPress={() => setIsInWardrobe(false)}>
            <Text style={styles.wardrobeBtnText}>ENTRAR AL PUEBLO</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{marginTop: 20}}>
            <Text style={{color: '#94a3b8', textDecorationLine: 'underline'}}>Volver al Menú</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.webWrapper}>
      <View style={styles.container}>
        <TouchableWithoutFeedback onPress={handleTapMove}>
          <View style={styles.worldViewport}>
            <LinearGradient colors={['#0f172a', '#1e1b4b', '#020617']} style={styles.worldBg} />
            <View style={[styles.world, { transform: [{ translateX: -viewX }, { translateY: -viewY }] }]}>
              
              {DECORATIONS.map(d => <AnimatedDecoration key={d.id} d={d} />)}

              {Object.entries(otherPlayers).map(([id, p]) => {
                const showBubble = p.message && (Date.now() - p.messageTime < 6000);
                return (
                  <View key={id} style={[styles.avatarContainer, { transform: [{ translateX: p.x }, { translateY: p.y }] }]}>
                    {showBubble && <View style={styles.chatBubbleFloat}><Text style={styles.chatBubbleText}>{p.message}</Text></View>}
                    <View style={[styles.avatarGlow, { backgroundColor: p.color || '#6b7280' }]} />
                    <View style={[styles.avatar, { backgroundColor: p.color || '#6b7280' }]}><Text style={styles.avatarEmoji}>{p.emoji || '🐧'}</Text></View>
                    <Text style={[styles.avatarName, { color: p.color || '#fff' }]}>{(p.name || '').slice(0, 8)}</Text>
                  </View>
                );
              })}

              <Animated.View style={[styles.avatarContainer, myAvatarStyle]}>
                {myLatestMessage ? <View style={styles.chatBubbleFloat}><Text style={styles.chatBubbleText}>{myLatestMessage}</Text></View> : null}
                <View style={[styles.avatarGlow, { backgroundColor: myColor }]} />
                <View style={[styles.avatar, { backgroundColor: myColor }]}><Text style={styles.avatarEmoji}>{selectedEmoji}</Text></View>
                <Text style={[styles.avatarName, { color: myColor }]}>{playerName.slice(0, 8)}</Text>
              </Animated.View>

            </View>
          </View>
        </TouchableWithoutFeedback>

        <View style={styles.hud}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.hudBtn}>
            <Text style={styles.hudBtnText}>✕ SALIR</Text>
          </TouchableOpacity>
          <View style={styles.hudInfo}>
            <Text style={styles.hudInfoText}>PUEBLO ZEN</Text>
            <Text style={styles.hudSubText}>{Object.keys(otherPlayers).length + 1} Conectados</Text>
          </View>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.chatBarContainer}>
            <View style={styles.chatInputRow}>
              <TextInput style={styles.chatInput} placeholder="Escribe algo para hablar..." placeholderTextColor="#94a3b8" value={chatInput} onChangeText={setChatInput} onSubmitEditing={sendChatMessage} />
              <TouchableOpacity style={styles.chatSendBtn} onPress={sendChatMessage}>
                <Text style={styles.chatSendIcon}>💬</Text>
              </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webWrapper: { flex: 1, backgroundColor: '#000', alignItems: 'center' },
  container: { flex: 1, width: W, overflow: 'hidden', backgroundColor: '#0f172a' },
  
  wardrobeContainer: { flex: 1, width: W, justifyContent: 'center', alignItems: 'center', padding: 20 },
  wardrobeTitle: { fontSize: 24, fontWeight: '900', color: '#d8b4fe', letterSpacing: 3, marginBottom: 40, textShadowColor: '#9333ea', textShadowRadius: 10 },
  wardrobeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 300, gap: 15, marginBottom: 40 },
  wardrobeItem: { width: 60, height: 60, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 30, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  wardrobeItemSelected: { borderColor: '#a855f7', backgroundColor: 'rgba(168,85,247,0.3)', transform: [{scale: 1.1}] },
  wardrobeEmoji: { fontSize: 30 },
  wardrobeBtn: { backgroundColor: '#a855f7', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30, shadowColor: '#a855f7', shadowOpacity: 0.6, shadowRadius: 10, elevation: 5 },
  wardrobeBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },

  worldViewport: { flex: 1, width: '100%', height: '100%' },
  worldBg: { position: 'absolute', width: WORLD_SIZE, height: WORLD_SIZE },
  world: { width: WORLD_SIZE, height: WORLD_SIZE },
  decoration: { position: 'absolute' },
  avatarContainer: { position: 'absolute', width: AVATAR_SIZE, height: AVATAR_SIZE, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  avatarGlow: { position: 'absolute', width: AVATAR_SIZE*1.8, height: AVATAR_SIZE*1.8, borderRadius: AVATAR_SIZE, opacity: 0.4, shadowColor: '#fff', shadowOpacity: 1, shadowRadius: 20 },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE/2, justifyContent: 'center', alignItems: 'center', borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.9)', backgroundColor: 'rgba(0,0,0,0.5)' },
  avatarEmoji: { fontSize: 22 },
  avatarName: { position: 'absolute', top: AVATAR_SIZE + 5, fontSize: 11, fontWeight: '900', width: 90, textAlign: 'center', textShadowColor: '#000', textShadowRadius: 6, textShadowOffset: {width: 1, height: 1} },
  
  hud: { position: 'absolute', top: Platform.OS==='ios'?50:30, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hudBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  hudBtnText: { color: '#f8fafc', fontSize: 12, fontWeight: 'bold' },
  hudInfo: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(192,132,252,0.4)' },
  hudInfoText: { color: '#d8b4fe', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  hudSubText: { color: '#cbd5e1', fontSize: 12, marginTop: 2 },
  
  chatBubbleFloat: { position: 'absolute', bottom: AVATAR_SIZE + 20, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 15, minWidth: 80, maxWidth: 150, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5, zIndex: 20 },
  chatBubbleText: { color: '#000', fontSize: 13, fontWeight: '600', textAlign: 'center' },

  chatBarContainer: { position: 'absolute', bottom: 20, width: '90%', alignSelf: 'center' },
  chatInputRow: { flexDirection: 'row', padding: 10, borderRadius: 30, backgroundColor: 'rgba(30,41,59,0.9)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  chatInput: { flex: 1, color: '#fff', fontSize: 15, paddingHorizontal: 15 },
  chatSendBtn: { backgroundColor: '#a855f7', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  chatSendIcon: { fontSize: 18 }
});
