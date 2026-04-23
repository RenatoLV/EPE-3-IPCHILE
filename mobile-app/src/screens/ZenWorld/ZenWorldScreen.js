/**
 * screens/ZenWorld/ZenWorldScreen.js
 * 
 * Mundo Zen — Tap to Move, UI Glassmorphism
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, FlatList, Dimensions, KeyboardAvoidingView, Platform, TouchableWithoutFeedback
} from 'react-native';
import { LinearGradient }     from 'expo-linear-gradient';
import { useNavigation }      from '@react-navigation/native';
import { database, auth }     from '../../services/firebase';
import { ref, set, onValue, off, onDisconnect, remove } from 'firebase/database';
import { zenAPI }             from '../../services/api';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const W = isWeb ? Math.min(windowWidth, 480) : windowWidth;
const H = windowHeight;

const WORLD_SIZE  = 800;
const AVATAR_SIZE = 40;
const AVATAR_COLORS = ['#a855f7', '#22d3ee', '#f472b6', '#34d399', '#fb923c'];

export default function ZenWorldScreen() {
  const navigation = useNavigation();
  const user       = auth.currentUser;
  const playerId   = user?.uid || 'anon';
  const playerName = user?.displayName || 'Espíritu';

  const [myPos,        setMyPos]        = useState({ x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 });
  const [otherPlayers, setOtherPlayers] = useState({});
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput,    setChatInput]    = useState('');
  const [showChat,     setShowChat]     = useState(false);

  const myColor   = AVATAR_COLORS[Math.abs(playerId.charCodeAt(0)) % AVATAR_COLORS.length];
  const playerRef = useRef(null);
  const chatRef   = useRef(null);
  
  // Reanimated values para suavizar movimiento
  const animX = useSharedValue(WORLD_SIZE / 2);
  const animY = useSharedValue(WORLD_SIZE / 2);

  useEffect(() => {
    playerRef.current = ref(database, `zen/world/players/${playerId}`);
    onDisconnect(playerRef.current).remove();

    set(playerRef.current, { id: playerId, name: playerName, x: myPos.x, y: myPos.y, color: myColor, updatedAt: Date.now() });

    const worldRef = ref(database, 'zen/world/players');
    onValue(worldRef, (snap) => {
      const all = snap.val() || {};
      setOtherPlayers(Object.fromEntries(Object.entries(all).filter(([id]) => id !== playerId)));
    });

    zenAPI.getMessages().then(res => setChatMessages(res.data || [])).catch(()=>{});

    return () => {
      if (playerRef.current) remove(playerRef.current);
      off(ref(database, 'zen/world/players'));
    };
  }, []);

  const handleTapMove = (event) => {
    const { locationX, locationY } = event.nativeEvent;
    
    // Calcular posición real en el mundo basado en el viewport
    const viewX = Math.max(0, Math.min(myPos.x - W / 2, WORLD_SIZE - W));
    const viewY = Math.max(0, Math.min(myPos.y - H * 0.4, WORLD_SIZE - H));

    const targetX = Math.max(0, Math.min(WORLD_SIZE - AVATAR_SIZE, viewX + locationX - AVATAR_SIZE/2));
    const targetY = Math.max(0, Math.min(WORLD_SIZE - AVATAR_SIZE, viewY + locationY - AVATAR_SIZE/2));

    animX.value = withTiming(targetX, { duration: 800, easing: Easing.out(Easing.cubic) });
    animY.value = withTiming(targetY, { duration: 800, easing: Easing.out(Easing.cubic) });

    setMyPos({ x: targetX, y: targetY });

    if (playerRef.current) {
      set(playerRef.current, { id: playerId, name: playerName, x: targetX, y: targetY, color: myColor, updatedAt: Date.now() });
    }
  };

  const sendChatMessage = async () => {
    const msg = chatInput.trim();
    if (!msg) return;
    try {
      await zenAPI.sendMessage({ playerId, playerName, message: msg });
      setChatInput('');
      const res = await zenAPI.getMessages();
      setChatMessages(res.data || []);
    } catch (err) {}
  };

  const myAvatarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: animX.value }, { translateY: animY.value }]
  }));

  const viewX = Math.max(0, Math.min(myPos.x - W / 2, WORLD_SIZE - W));
  const viewY = Math.max(0, Math.min(myPos.y - H * 0.4, WORLD_SIZE - H));

  return (
    <View style={styles.webWrapper}>
      <View style={styles.container}>
        <TouchableWithoutFeedback onPress={handleTapMove}>
          <View style={styles.worldViewport}>
            <LinearGradient colors={['#0f172a', '#1e1b4b', '#020617']} style={styles.worldBg} />
            <View style={[styles.world, { transform: [{ translateX: -viewX }, { translateY: -viewY }] }]}>
              
              {/* Decoraciones Zen */}
              {DECORATIONS.map(d => <View key={d.id} style={[styles.decoration, { left: d.x, top: d.y }]}><Text style={{ fontSize: d.size, opacity: 0.8 }}>{d.emoji}</Text></View>)}

              {/* Otros Avatares */}
              {Object.entries(otherPlayers).map(([id, p]) => (
                <View key={id} style={[styles.avatarContainer, { transform: [{ translateX: p.x }, { translateY: p.y }] }]}>
                  <View style={[styles.avatarGlow, { backgroundColor: p.color || '#6b7280' }]} />
                  <View style={[styles.avatar, { backgroundColor: p.color || '#6b7280' }]}><Text style={styles.avatarEmoji}>👻</Text></View>
                  <Text style={[styles.avatarName, { color: p.color || '#fff' }]}>{(p.name || '').slice(0, 8)}</Text>
                </View>
              ))}

              {/* Mi Avatar (Animado) */}
              <Animated.View style={[styles.avatarContainer, myAvatarStyle]}>
                <View style={[styles.avatarGlow, { backgroundColor: myColor }]} />
                <View style={[styles.avatar, { backgroundColor: myColor }]}><Text style={styles.avatarEmoji}>🧘</Text></View>
                <Text style={[styles.avatarName, { color: myColor }]}>{playerName.slice(0, 8)}</Text>
              </Animated.View>

            </View>
          </View>
        </TouchableWithoutFeedback>

        {/* HUD Glassmorphism */}
        <View style={styles.hud}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.hudBtn}>
            <Text style={styles.hudBtnText}>✕ SALIR</Text>
          </TouchableOpacity>
          <View style={styles.hudInfo}>
            <Text style={styles.hudInfoText}>MUNDO ZEN</Text>
            <Text style={styles.hudSubText}>{Object.keys(otherPlayers).length + 1} Espíritus</Text>
          </View>
          <TouchableOpacity onPress={() => setShowChat(!showChat)} style={styles.hudBtn}>
            <Text style={styles.hudBtnText}>💬 CHAT</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hintText}>Toca cualquier parte para moverte</Text>

        {/* Panel de Chat */}
        {showChat && (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.chatPanel}>
            <LinearGradient colors={['rgba(15,23,42,0.95)', 'rgba(2,6,23,0.95)']} style={StyleSheet.absoluteFill} borderRadius={20} />
            <FlatList
              data={chatMessages}
              keyExtractor={item => item.id}
              style={styles.chatList}
              renderItem={({ item }) => (
                <View style={[styles.chatBubble, item.playerId === playerId && styles.chatBubbleMine]}>
                  <Text style={styles.chatName}>{item.playerName}</Text>
                  <Text style={styles.chatMsg}>{item.message}</Text>
                </View>
              )}
              onContentSizeChange={() => chatRef.current?.scrollToEnd()}
              ref={chatRef}
            />
            <View style={styles.chatInputRow}>
              <TextInput style={styles.chatInput} placeholder="Mensaje pacífico..." placeholderTextColor="#64748b" value={chatInput} onChangeText={setChatInput} />
              <TouchableOpacity style={styles.chatSendBtn} onPress={sendChatMessage}><Text style={styles.chatSendIcon}>➤</Text></TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
      </View>
    </View>
  );
}

const DECORATIONS = [
  { id: 1, x: 100, y: 150, emoji: '🌸', size: 40 }, { id: 2, x: 300, y: 220, emoji: '🏮', size: 50 },
  { id: 3, x: 500, y: 80, emoji: '🌿', size: 30 }, { id: 4, x: 650, y: 300, emoji: '🪷', size: 45 },
  { id: 5, x: 200, y: 400, emoji: '⛩️', size: 80 }, { id: 6, x: 450, y: 550, emoji: '🎋', size: 50 },
  { id: 7, x: 600, y: 650, emoji: '🌙', size: 40 }, { id: 8, x: 150, y: 700, emoji: '🌊', size: 60 }
];

const styles = StyleSheet.create({
  webWrapper: { flex: 1, backgroundColor: '#000', alignItems: 'center' },
  container: { flex: 1, width: W, overflow: 'hidden' },
  worldViewport: { flex: 1, width: '100%', height: '100%' },
  worldBg: { position: 'absolute', width: WORLD_SIZE, height: WORLD_SIZE },
  world: { width: WORLD_SIZE, height: WORLD_SIZE },
  decoration: { position: 'absolute' },
  avatarContainer: { position: 'absolute', width: AVATAR_SIZE, height: AVATAR_SIZE, justifyContent: 'center', alignItems: 'center' },
  avatarGlow: { position: 'absolute', width: AVATAR_SIZE*1.5, height: AVATAR_SIZE*1.5, borderRadius: AVATAR_SIZE, opacity: 0.3, shadowColor: '#fff', shadowOpacity: 1, shadowRadius: 15 },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE/2, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)' },
  avatarEmoji: { fontSize: 20 },
  avatarName: { position: 'absolute', top: AVATAR_SIZE + 5, fontSize: 10, fontWeight: '800', width: 80, textAlign: 'center', textShadowColor: '#000', textShadowRadius: 4 },
  hud: { position: 'absolute', top: Platform.OS==='ios'?50:30, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hudBtn: { backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  hudBtnText: { color: '#e2e8f0', fontSize: 12, fontWeight: 'bold' },
  hudInfo: { alignItems: 'center' },
  hudInfoText: { color: '#c084fc', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  hudSubText: { color: '#94a3b8', fontSize: 11 },
  hintText: { position: 'absolute', bottom: 40, width: '100%', textAlign: 'center', color: '#94a3b8', fontSize: 12, opacity: 0.8 },
  chatPanel: { position: 'absolute', bottom: 90, alignSelf: 'center', width: '90%', height: 350, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(192,132,252,0.3)', overflow: 'hidden', elevation: 10 },
  chatList: { flex: 1, padding: 15 },
  chatBubble: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 10, marginBottom: 8, alignSelf: 'flex-start', maxWidth: '80%' },
  chatBubbleMine: { backgroundColor: 'rgba(192,132,252,0.15)', borderColor: 'rgba(192,132,252,0.3)', borderWidth: 1, alignSelf: 'flex-end' },
  chatName: { color: '#c084fc', fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
  chatMsg: { color: '#f8fafc', fontSize: 13 },
  chatInputRow: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  chatInput: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 15, paddingHorizontal: 15, color: '#fff', fontSize: 14, height: 40 },
  chatSendBtn: { backgroundColor: '#9333ea', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  chatSendIcon: { color: '#fff', fontSize: 18 }
});
