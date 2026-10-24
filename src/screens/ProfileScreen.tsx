import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { Button, Field } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { theme } from '../theme';

export default function ProfileScreen() {
  const { session, profile, updateProfile, signOut } = useAuth();
  const toast = useToast();
  // `draft` is null until the user edits, so the field always reflects the
  // saved profile without syncing state in an effect.
  const [draft, setDraft] = useState<string | null>(null);
  const name = draft ?? profile?.full_name ?? '';
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<{ members: number; readings: number } | null>(null);

  useEffect(() => {
    const uid = session?.user.id;
    if (!uid) return;
    Promise.all([
      supabase.from('members').select('id', { count: 'exact', head: true }).eq('created_by', uid),
      supabase.from('measurements').select('id', { count: 'exact', head: true }).eq('recorded_by', uid),
    ]).then(([m, r]) => setStats({ members: m.count ?? 0, readings: r.count ?? 0 }));
  }, [session?.user.id]);

  const initials =
    (profile?.full_name || session?.user.email || '?')
      .split(' ')
      .map((p) => p.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';
  const isAdmin = profile?.role === 'admin';
  const dirty = draft != null && name.trim().length > 0 && name.trim() !== (profile?.full_name ?? '');

  async function save() {
    setSaving(true);
    try {
      await updateProfile({ full_name: name.trim() });
      setDraft(null);
      toast('Profile updated');
    } catch (e: any) {
      Alert.alert('Could not save', e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  function confirmSignOut() {
    Alert.alert('Sign out?', 'You will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={{ paddingBottom: 60 }}
    >
      <LinearGradient
        colors={[theme.colors.primaryDark, theme.colors.bg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{profile?.full_name || 'Instructor'}</Text>
        <View style={[styles.badge, isAdmin && styles.badgeAdmin]}>
          <Ionicons
            name={isAdmin ? 'shield-checkmark' : 'fitness'}
            size={13}
            color={isAdmin ? '#04210f' : theme.colors.textDim}
          />
          <Text style={[styles.badgeText, isAdmin && styles.badgeTextAdmin]}>
            {isAdmin ? 'Admin' : 'Instructor'}
          </Text>
        </View>
        <Text style={styles.email}>{session?.user.email}</Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="people" size={18} color={theme.colors.primary} />
            <Text style={styles.statValue}>{stats?.members ?? '—'}</Text>
            <Text style={styles.statLabel}>Members added</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="pulse" size={18} color={theme.colors.primary} />
            <Text style={styles.statValue}>{stats?.readings ?? '—'}</Text>
            <Text style={styles.statLabel}>Readings recorded</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Your name</Text>
        <Field label="Display name" value={name} onChangeText={setDraft} autoCapitalize="words" />
        <Button title="Save" onPress={save} loading={saving} disabled={!dirty} />

        <View style={{ height: theme.space(8) }} />
        <Button title="Sign out" variant="danger" onPress={confirmSignOut} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: theme.space(8), paddingBottom: theme.space(8), paddingHorizontal: theme.space(4) },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.space(3),
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  avatarText: { color: '#04210f', fontSize: 34, fontWeight: '900' },
  name: { color: theme.colors.text, fontSize: 24, fontWeight: '800' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: theme.space(2),
  },
  badgeAdmin: { backgroundColor: theme.colors.primary },
  badgeText: { color: theme.colors.textDim, fontWeight: '700', fontSize: 12 },
  badgeTextAdmin: { color: '#04210f' },
  email: { color: theme.colors.textDim, marginTop: theme.space(2), fontSize: 13 },
  body: { padding: theme.space(4) },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: theme.space(5) },
  stat: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space(4),
    gap: 4,
  },
  statValue: { color: theme.colors.text, fontSize: 24, fontWeight: '900' },
  statLabel: { color: theme.colors.textDim, fontSize: 12 },
  sectionLabel: { color: theme.colors.text, fontSize: 16, fontWeight: '800', marginBottom: theme.space(3) },
});
