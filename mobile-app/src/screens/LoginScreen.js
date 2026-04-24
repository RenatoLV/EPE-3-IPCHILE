/**
 * screens/LoginScreen.js
 * * Pantalla de Login con animaciones mejoradas y micro-interacciones.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Pressable,
  StyleSheet, KeyboardAvoidingView, Platform,
  Alert, ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSpring, withDelay, Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '../services/firebase';
import apiClient from '../services/api';
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
  const [focusedInput, setFocusedInput] = useState(null); // Nuevo estado para interacciones

  // ── Animaciones de entrada ──────────────────────────────────────────────
  const logoOpacity    = useSharedValue(0);
  const logoTranslateY = useSharedValue(-40);
  const formOpacity    = useSharedValue(0);
  const formTranslateY = useSharedValue(30);
  const buttonScale    = useSharedValue(1); // Nueva animación para el botón

  useEffect(() => {
    logoOpacity.value    = withTiming(1, { duration: 800 });
    logoTranslateY.value = withSpring(0, { damping: 12 });
    formOpacity.value    = withDelay(400, withTiming(1, { duration: 700 }));
    formTranslateY.value = withDelay(400, withSpring(0, { damping: 14 }));

    apiClient.get('/health')
      .then(() => console.log("[Cloud] Servidor Render despertado con éxito"))
      .catch(() => console.log("[Cloud] Despertando servidor en segundo plano..."));
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoTranslateY.value }],
  }));

  const formStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formTranslateY.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }]
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
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) await updateProfile(cred.user, { displayName });
        const token = await cred.user.getIdToken();
        await AsyncStorage.setItem('@auth_token', token);
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const token = await cred.user.getIdToken();
        await AsyncStorage.setItem('@auth_token', token);
      }
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
    <LinearGradient colors={['#050510', '#1a0a2e', '#050a1f']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        {/* ── Logo / Header ─────────────────────────────────────────────── */}
        <Animated.View style={[styles.logoContainer, logoStyle]}>
          <Text style={styles.logoIcon}>🌌</Text>
          <Text style={styles.logoTitle}>AppMovil</Text>
          <Text style={styles.logoSubtitle}>API CLOUD GAMING</Text>
        </Animated.View>

        {/* ── Formulario ────────────────────────────────────────────────── */}
        <Animated.View style={[styles.formCard, formStyle]}>
          <Text style={styles.formTitle}>
            {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
          </Text>

          {isRegister && (
            <TextInput
              style={[styles.input, focusedInput === 'name' && styles.inputFocused]}
              placeholder="Nombre de jugador"
              placeholderTextColor="#777"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              onFocus={() => setFocusedInput('name')}
              onBlur={() => setFocusedInput(null)}
            />
          )}

          <TextInput
            style={[styles.input, focusedInput === 'email' && styles.inputFocused]}
            placeholder="Correo electrónico"
            placeholderTextColor="#777"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            onFocus={() => setFocusedInput('email')}
            onBlur={() => setFocusedInput(null)}
          />

          <TextInput
            style={[styles.input, focusedInput === 'password' && styles.inputFocused]}
            placeholder="Contraseña"
            placeholderTextColor="#777"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            onFocus={() => setFocusedInput('password')}
            onBlur={() => setFocusedInput(null)}
          />

          <Animated.View style={buttonAnimatedStyle}>
            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleAuth}
              disabled={loading}
              onPressIn={() => (buttonScale.value = withSpring(0.95))}
              onPressOut={() => (buttonScale.value = withSpring(1))}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {isRegister ? '🚀 Registrarse' : '⚡ Entrar al Universo'}
                </Text>
              )}
            </Pressable>
          </Animated.View>

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
  logoIcon:      { fontSize: 72, textShadowColor: '#e879f9', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20 },
  logoTitle:     { fontSize: 38, fontWeight: '900', color: '#e879f9', letterSpacing: 2, marginTop: 8 },
  logoSubtitle:  { fontSize: 14, color: '#a855f7', letterSpacing: 4, marginTop: 4, fontWeight: '600' },
  formCard: {
    backgroundColor: 'rgba(20, 10, 40, 0.4)', // Fondo de cristal más profundo
    borderRadius: 24,
    padding: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(124,58,237,0.4)',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  formTitle: { fontSize: 22, fontWeight: '700', color: '#ffffff', marginBottom: 24, textAlign: 'center' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  inputFocused: {
    borderColor: '#e879f9', // Brillo cuando el usuario hace tap
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  button: {
    backgroundColor: '#9333ea',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#e879f9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText:     { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  switchBtn:      { marginTop: 24, alignItems: 'center' },
  switchText:     { color: '#c084fc', fontSize: 14, fontWeight: '500' },
});
