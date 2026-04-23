/**
 * screens/LoginScreen.js
 * 
 * Pantalla de Login obligatorio con Firebase Authentication.
 * Soporte para: Email/Password y registro de nuevos usuarios.
 * Diseño oscuro premium con animaciones de entrada (Reanimated).
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  Alert, ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSpring, withDelay, Easing,
} from 'react-native-reanimated';
import { LinearGradient }   from 'expo-linear-gradient';
import { auth }             from '../services/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isRegister,  setIsRegister]  = useState(false);
  const [loading,     setLoading]     = useState(false);

  // ── Animaciones de entrada ──────────────────────────────────────────────
  const logoOpacity   = useSharedValue(0);
  const logoTranslateY = useSharedValue(-40);
  const formOpacity   = useSharedValue(0);
  const formTranslateY = useSharedValue(30);

  useEffect(() => {
    logoOpacity.value    = withTiming(1, { duration: 800 });
    logoTranslateY.value = withSpring(0, { damping: 12 });
    formOpacity.value    = withDelay(400, withTiming(1, { duration: 700 }));
    formTranslateY.value = withDelay(400, withSpring(0, { damping: 14 }));
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoTranslateY.value }],
  }));

  const formStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formTranslateY.value }],
  }));

  // ── Lógica de autenticación ──────────────────────────────────────────────
  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Campos incompletos', 'Por favor ingresa email y contraseña.');
      return;
    }
    setLoading(true);
    try {
      if (isRegister) {
        // Registro de nuevo usuario
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await updateProfile(cred.user, { displayName });
        }
        // Guarda el token para Axios
        const token = await cred.user.getIdToken();
        await AsyncStorage.setItem('@auth_token', token);
      } else {
        // Login de usuario existente
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const token = await cred.user.getIdToken();
        await AsyncStorage.setItem('@auth_token', token);
      }
      // AppNavigator detecta el cambio de sesión automáticamente vía onAuthStateChanged
    } catch (error) {
      const mensajes = {
        'auth/user-not-found':     'No existe una cuenta con ese email.',
        'auth/wrong-password':     'Contraseña incorrecta.',
        'auth/email-already-in-use': 'Ese email ya está registrado.',
        'auth/weak-password':      'La contraseña debe tener al menos 6 caracteres.',
        'auth/invalid-email':      'El formato del email no es válido.',
      };
      Alert.alert('Error', mensajes[error.code] || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0a0a1a', '#1a0a2e', '#0d1b2a']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        {/* ── Logo / Header ─────────────────────────────────────────────── */}
        <Animated.View style={[styles.logoContainer, logoStyle]}>
          <Text style={styles.logoIcon}>🌌</Text>
          <Text style={styles.logoTitle}>AppMovil</Text>
          <Text style={styles.logoSubtitle}>API Cloud Gaming</Text>
        </Animated.View>

        {/* ── Formulario ────────────────────────────────────────────────── */}
        <Animated.View style={[styles.formCard, formStyle]}>
          <Text style={styles.formTitle}>
            {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
          </Text>

          {isRegister && (
            <TextInput
              style={styles.input}
              placeholder="Nombre de jugador"
              placeholderTextColor="#555"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            placeholderTextColor="#555"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor="#555"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isRegister ? '🚀 Registrarse' : '⚡ Entrar al Universo'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsRegister(!isRegister)}
            style={styles.switchBtn}
          >
            <Text style={styles.switchText}>
              {isRegister
                ? '¿Ya tienes cuenta? Inicia sesión'
                : '¿Eres nuevo? Crea tu cuenta'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1 },
  inner:         { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoIcon:      { fontSize: 64 },
  logoTitle:     { fontSize: 36, fontWeight: '900', color: '#e879f9', letterSpacing: 2, marginTop: 8 },
  logoSubtitle:  { fontSize: 14, color: '#7c3aed', letterSpacing: 4, marginTop: 4 },
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
  },
  formTitle: { fontSize: 20, fontWeight: '700', color: '#f3f4f6', marginBottom: 20, textAlign: 'center' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#f3f4f6',
    fontSize: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.2)',
  },
  button: {
    backgroundColor: '#7c3aed',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText:     { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  switchBtn:      { marginTop: 20, alignItems: 'center' },
  switchText:     { color: '#a78bfa', fontSize: 13 },
});
