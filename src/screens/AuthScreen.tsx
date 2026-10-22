import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Button, Field } from '../components/ui';
import { theme } from '../theme';

export default function AuthScreen() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim() || !password) {
      Alert.alert('Missing details', 'Enter your email and password.');
      return;
    }
    if (mode === 'up' && !fullName.trim()) {
      Alert.alert('Missing details', 'Enter your name so members know who recorded their readings.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'in') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (error) throw error;
        Alert.alert(
          'Account created',
          'If email confirmation is on in Supabase, check your inbox before signing in.',
        );
      }
    } catch (e: any) {
      Alert.alert('Could not continue', e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>BodyTrack</Text>
        <Text style={styles.tagline}>Fitness center body-composition tracker</Text>

        <View style={{ height: theme.space(8) }} />

        {mode === 'up' && (
          <Field
            label="Your name"
            placeholder="e.g. Priya Sharma"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
        )}
        <Field
          label="Email"
          placeholder="you@gym.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <Field
          label="Password"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <View style={{ height: theme.space(2) }} />
        <Button
          title={mode === 'in' ? 'Sign in' : 'Create account'}
          onPress={submit}
          loading={loading}
        />
        <View style={{ height: theme.space(3) }} />
        <Button
          title={mode === 'in' ? 'New instructor? Create an account' : 'Have an account? Sign in'}
          variant="ghost"
          onPress={() => setMode(mode === 'in' ? 'up' : 'in')}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: theme.space(6), paddingTop: theme.space(20), flexGrow: 1, justifyContent: 'center' },
  logo: { color: theme.colors.primary, fontSize: 40, fontWeight: '900', textAlign: 'center' },
  tagline: { color: theme.colors.textDim, textAlign: 'center', marginTop: 6, fontSize: 14 },
});
