import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Member } from '../lib/types';
import { ageFromDob } from '../lib/calc';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';
import { ScreenProps } from '../navigation';

export default function MembersScreen({ navigation }: ScreenProps<'Members'>) {
  const { profile, signOut } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('full_name', { ascending: true });
    if (!error) setMembers((data as Member[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.full_name.toLowerCase().includes(q));
  }, [members, query]);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hi}>Hi{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}</Text>
          <Text style={styles.sub}>
            {members.length} member{members.length === 1 ? '' : 's'}
            {profile?.role === 'admin' ? ' · admin' : ''}
          </Text>
        </View>
        <Pressable onPress={signOut} hitSlop={10}>
          <Text style={styles.signout}>Sign out</Text>
        </Pressable>
      </View>

      <TextInput
        placeholder="Search members…"
        placeholderTextColor={theme.colors.textDim}
        value={query}
        onChangeText={setQuery}
        style={styles.search}
        autoCapitalize="none"
      />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {query ? 'No members match your search.' : 'No members yet. Tap + to add your first.'}
            </Text>
          }
          renderItem={({ item }) => {
            const age = ageFromDob(item.date_of_birth);
            return (
              <Pressable
                style={styles.row}
                onPress={() => navigation.navigate('MemberDetail', { memberId: item.id })}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.full_name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.full_name}</Text>
                  <Text style={styles.meta}>
                    {item.sex === 'male' ? 'Male' : 'Female'}
                    {age != null ? ` · ${age} yrs` : ''} · {item.height_cm} cm
                  </Text>
                </View>
                <Text style={styles.chev}>›</Text>
              </Pressable>
            );
          }}
        />
      )}

      <Pressable style={styles.fab} onPress={() => navigation.navigate('AddMember')}>
        <Text style={styles.fabText}>＋</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: theme.colors.bg, paddingHorizontal: theme.space(4) },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: theme.space(2), marginBottom: theme.space(3) },
  hi: { color: theme.colors.text, fontSize: 24, fontWeight: '800' },
  sub: { color: theme.colors.textDim, marginTop: 2 },
  signout: { color: theme.colors.accent, fontWeight: '600' },
  search: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius,
    color: theme.colors.text,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: theme.space(3),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    padding: theme.space(3),
    marginBottom: theme.space(2),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.space(3),
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  name: { color: theme.colors.text, fontSize: 16, fontWeight: '700' },
  meta: { color: theme.colors.textDim, marginTop: 2, fontSize: 13 },
  chev: { color: theme.colors.textDim, fontSize: 28, marginLeft: 8 },
  empty: { color: theme.colors.textDim, textAlign: 'center', marginTop: 60, paddingHorizontal: 20, lineHeight: 22 },
  fab: {
    position: 'absolute',
    right: theme.space(5),
    bottom: theme.space(6),
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: { color: '#04210f', fontSize: 32, fontWeight: '700', marginTop: -2 },
});
