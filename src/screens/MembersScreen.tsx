import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { BarChart } from '../components/charts';
import { Member } from '../lib/types';
import { ageFromDob } from '../lib/calc';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

const ACTIVE_WINDOW_DAYS = 30;

function countActive(members: Member[]): number {
  const cutoff = Date.now() - ACTIVE_WINDOW_DAYS * 86_400_000;
  return members.filter((m) => m.last_measured_at && new Date(m.last_measured_at).getTime() >= cutoff).length;
}

function buildMonthBuckets(dates: string[]): { label: string; value: number }[] {
  const now = new Date();
  const buckets = [];
  const map: Record<string, { label: string; value: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const b = { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString(undefined, { month: 'short' }), value: 0 };
    buckets.push(b);
    map[b.key] = b;
  }
  for (const iso of dates) {
    const d = new Date(iso);
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    if (map[k]) map[k].value++;
  }
  return buckets.map((b) => ({ label: b.label, value: b.value }));
}

type SortKey = 'name' | 'recent' | 'added';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'recent', label: 'Recent' },
  { key: 'added', label: 'Newest' },
];

function lastSeen(iso: string | null): string {
  if (!iso) return 'no readings yet';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'seen today';
  if (days === 1) return 'seen yesterday';
  if (days < 30) return `seen ${days}d ago`;
  return `seen ${new Date(iso).toLocaleDateString()}`;
}

export default function MembersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [readingsThisMonth, setReadingsThisMonth] = useState<number | null>(null);
  const [monthly, setMonthly] = useState<{ label: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('name');

  const load = useCallback(async () => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [membersRes, countRes, trendRes] = await Promise.all([
      supabase.from('members').select('*').order('full_name', { ascending: true }),
      supabase
        .from('measurements')
        .select('id', { count: 'exact', head: true })
        .gte('measured_at', startOfMonth.toISOString()),
      supabase.from('measurements').select('measured_at').gte('measured_at', sixMonthsAgo.toISOString()),
    ]);

    if (!membersRes.error) setMembers((membersRes.data as Member[]) ?? []);
    setReadingsThisMonth(countRes.count ?? 0);
    setMonthly(buildMonthBuckets((trendRes.data ?? []).map((r: { measured_at: string }) => r.measured_at)));
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
    const base = q ? members.filter((m) => m.full_name.toLowerCase().includes(q)) : members;
    const sorted = [...base];
    if (sort === 'name') {
      sorted.sort((a, b) => a.full_name.localeCompare(b.full_name));
    } else if (sort === 'added') {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      // recently measured first; members with no readings sink to the bottom
      sorted.sort((a, b) => {
        const ta = a.last_measured_at ? new Date(a.last_measured_at).getTime() : 0;
        const tb = b.last_measured_at ? new Date(b.last_measured_at).getTime() : 0;
        return tb - ta;
      });
    }
    return sorted;
  }, [members, query, sort]);

  const activeCount = useMemo(() => countActive(members), [members]);

  const chartWidth = Dimensions.get('window').width - theme.space(8) - theme.space(8);

  const analytics = (
    <View>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Ionicons name="people" size={18} color={theme.colors.primary} />
          <Text style={styles.statValue}>{members.length}</Text>
          <Text style={styles.statLabel}>Members</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="flash" size={18} color={theme.colors.primary} />
          <Text style={styles.statValue}>{activeCount}</Text>
          <Text style={styles.statLabel}>Active (30d)</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="pulse" size={18} color={theme.colors.primary} />
          <Text style={styles.statValue}>{readingsThisMonth ?? '—'}</Text>
          <Text style={styles.statLabel}>Readings / mo</Text>
        </View>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Readings — last 6 months</Text>
        <BarChart data={monthly} width={chartWidth} height={130} />
      </View>

      <Text style={styles.listHeading}>Members</Text>
    </View>
  );

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + theme.space(2) }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hi}>
            Hi{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
          </Text>
          <Text style={styles.sub}>{profile?.role === 'admin' ? 'Admin' : 'Instructor'}</Text>
        </View>
        <Pressable onPress={() => router.push('/profile')} hitSlop={10} style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>
            {(profile?.full_name || '?').charAt(0).toUpperCase()}
          </Text>
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

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort</Text>
        {SORTS.map((s) => (
          <Pressable
            key={s.key}
            style={[styles.sortChip, sort === s.key && styles.sortChipActive]}
            onPress={() => setSort(s.key)}
          >
            <Text style={[styles.sortText, sort === s.key && styles.sortTextActive]}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListHeaderComponent={analytics}
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
              <Pressable style={styles.row} onPress={() => router.push(`/member/${item.id}`)}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.full_name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.full_name}</Text>
                  <Text style={styles.meta}>
                    {item.sex === 'male' ? 'Male' : 'Female'}
                    {age != null ? ` · ${age} yrs` : ''} · {item.height_cm} cm
                  </Text>
                  <Text style={[styles.seen, !item.last_measured_at && { color: theme.colors.textDim }]}>
                    {lastSeen(item.last_measured_at)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textDim} />
              </Pressable>
            );
          }}
        />
      )}

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + theme.space(5) }]}
        onPress={() => router.push('/member/new')}
      >
        <Ionicons name="add" size={34} color="#04210f" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: theme.colors.bg, paddingHorizontal: theme.space(4) },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.space(3) },
  hi: { color: theme.colors.text, fontSize: 24, fontWeight: '800' },
  sub: { color: theme.colors.textDim, marginTop: 2 },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: { color: '#04210f', fontWeight: '900', fontSize: 18 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: theme.space(3) },
  stat: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space(4),
    gap: 3,
  },
  statValue: { color: theme.colors.text, fontSize: 24, fontWeight: '900' },
  statLabel: { color: theme.colors.textDim, fontSize: 11 },
  chartCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space(4),
    marginBottom: theme.space(3),
  },
  chartTitle: { color: theme.colors.text, fontWeight: '800', fontSize: 14, marginBottom: theme.space(2) },
  listHeading: { color: theme.colors.text, fontWeight: '800', fontSize: 15, marginBottom: theme.space(2) },
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
  seen: { color: theme.colors.accent, marginTop: 2, fontSize: 12, fontWeight: '600' },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: theme.space(3) },
  sortLabel: { color: theme.colors.textDim, fontSize: 13, fontWeight: '600', marginRight: 2 },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sortChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  sortText: { color: theme.colors.textDim, fontWeight: '700', fontSize: 13 },
  sortTextActive: { color: '#04210f' },
  empty: { color: theme.colors.textDim, textAlign: 'center', marginTop: 60, paddingHorizontal: 20, lineHeight: 22 },
  fab: {
    position: 'absolute',
    right: theme.space(5),
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
});
