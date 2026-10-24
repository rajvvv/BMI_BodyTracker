import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Print from 'expo-print';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';
import { Button, Card, StatTile } from '../components/ui';
import { GoalBar } from '../components/GoalBar';
import { TrendChart } from '../components/charts';
import { ageFromDob, bmiBand, goalProgress, seriesStats, withinMonths } from '../lib/calc';
import { buildReportHtml } from '../lib/report';
import { Measurement, Member } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { theme } from '../theme';

type Metric = { key: keyof Measurement; label: string; unit: string; lowerIsBetter: boolean };
const METRICS: Metric[] = [
  { key: 'weight_kg', label: 'Weight', unit: 'kg', lowerIsBetter: true },
  { key: 'bmi', label: 'BMI', unit: '', lowerIsBetter: true },
  { key: 'body_fat_pct', label: 'Body fat', unit: '%', lowerIsBetter: true },
  { key: 'muscle_mass_kg', label: 'Muscle', unit: 'kg', lowerIsBetter: false },
  { key: 'visceral_fat', label: 'Visceral fat', unit: '', lowerIsBetter: true },
];

const PERIODS: { key: string; label: string; months: number | null }[] = [
  { key: '1m', label: '1M', months: 1 },
  { key: '3m', label: '3M', months: 3 },
  { key: '6m', label: '6M', months: 6 },
  { key: 'all', label: 'All', months: null },
];

export default function MemberDetailScreen() {
  const router = useRouter();
  const { id: memberId } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const toast = useToast();
  const [member, setMember] = useState<Member | null>(null);
  const [rows, setRows] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<Metric>(METRICS[0]);
  const [periodIdx, setPeriodIdx] = useState(PERIODS.length - 1); // default: All
  
  // Share states
  const [sharing, setSharing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const load = useCallback(async () => {
    const [{ data: m }, { data: ms }] = await Promise.all([
      supabase.from('members').select('*').eq('id', memberId).single(),
      supabase.from('measurements').select('*').eq('member_id', memberId).order('measured_at', { ascending: true }),
    ]);
    setMember(m as Member);
    setRows((ms as Measurement[]) ?? []);
    setLoading(false);
  }, [memberId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function shareReport(mode: 'current' | 'overall') {
    if (!member) return;
    setShowShareModal(false); // Close modal immediately
    setSharing(true);
    
    try {
      if (!(await isAvailableAsync())) {
        Alert.alert('Sharing unavailable', 'Sharing is not available on this device.');
        return;
      }
      const html = buildReportHtml(member, rows, { mode });

      const { base64 } = await Print.printToFileAsync({ html, base64: true });
      if (!base64) throw new Error('PDF came back empty');

      const safe = member.full_name.replace(/[^\w.-]+/g, '_') || 'member';
      const suffix = mode === 'overall' ? 'progress' : 'snapshot';
      const dest = `${FileSystem.cacheDirectory}${safe}-BodyTrack-${suffix}.pdf`;
      
      await FileSystem.writeAsStringAsync(dest, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await shareAsync(dest, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: `${member.full_name} — ${mode === 'overall' ? 'progress report' : 'snapshot'}`,
      });
      toast(mode === 'overall' ? 'Progress report ready' : 'Snapshot ready');
    } catch (e: any) {
      Alert.alert('Could not create report', e.message ?? String(e));
    } finally {
      setSharing(false);
    }
  }

  function pickAndShareReport() {
    if (!member) return;
    // Only one reading? Skip the modal and share the current snapshot directly.
    if (rows.length < 2) {
      shareReport('current');
      return;
    }
    setShowShareModal(true);
  }

  function confirmDelete() {
    if (!member) return;
    Alert.alert('Delete member?', `This permanently removes ${member.full_name} and all their readings.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('members').delete().eq('id', memberId);
          if (error) Alert.alert('Could not delete', error.message);
          else {
            toast('Member deleted');
            router.back();
          }
        },
      },
    ]);
  }

  const latest = rows.length ? rows[rows.length - 1] : null;
  const first = rows.length ? rows[0] : null;

  const period = PERIODS[periodIdx];
  const chart = useMemo(() => {
    return rows
      .filter((r) => withinMonths(r.measured_at, period.months))
      .map((r) => ({ v: r[metric.key] as number | null, at: r.measured_at }))
      .filter((p) => p.v != null) as { v: number; at: string }[];
  }, [rows, metric, period.months]);

  const stats = useMemo(() => seriesStats(chart), [chart]);

  const goals = useMemo(() => {
    const fatFirst = rows.find((r) => r.body_fat_pct != null);
    const fatLast = [...rows].reverse().find((r) => r.body_fat_pct != null);
    return {
      weight:
        member?.target_weight_kg != null
          ? goalProgress(first?.weight_kg ?? null, latest?.weight_kg ?? null, member.target_weight_kg)
          : null,
      fat:
        member?.target_body_fat_pct != null
          ? goalProgress(fatFirst?.body_fat_pct ?? null, fatLast?.body_fat_pct ?? null, member.target_body_fat_pct)
          : null,
    };
  }, [rows, member, first, latest]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  const age = ageFromDob(member?.date_of_birth);
  const band = bmiBand(latest?.bmi ?? null);
  const screenW = Dimensions.get('window').width;

  const trend: { color: string; arrow: keyof typeof Ionicons.glyphMap } | null = stats
    ? (() => {
        const flat = stats.change === 0;
        const improving = metric.lowerIsBetter ? stats.change < 0 : stats.change > 0;
        return {
          color: flat ? theme.colors.textDim : improving ? theme.colors.good : theme.colors.bad,
          arrow: flat ? 'remove' : stats.change < 0 ? 'arrow-down' : 'arrow-up',
        };
      })()
    : null;

    return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '700' }}>
              {member?.full_name ?? 'Member'}
            </Text>
          ),
          headerRight: () => (
            <Pressable
              onPress={() => router.push(`/member/${memberId}/edit`)}
              style={{ paddingVertical: 8, paddingHorizontal: 4 }}
            >
              <Text style={{ color: theme.colors.accent, fontWeight: '600', fontSize: 16 }}>Edit</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.bg }}
        contentContainerStyle={{ 
          paddingTop: theme.space(2), 
          paddingHorizontal: theme.space(4), 
          paddingBottom: 60 
        }}
      >
        <Text style={styles.meta}>
          {member?.sex === 'male' ? 'Male' : 'Female'}
          {age != null ? ` · ${age} yrs` : ''} · {member?.height_cm} cm
          {member?.join_date ? ` · joined ${new Date(member.join_date).toLocaleDateString()}` : ''}
        </Text>
        {member?.notes ? <Text style={styles.notes}>{member.notes}</Text> : null}

        {latest ? (
          <>
            <Text style={styles.section}>Latest reading · {new Date(latest.measured_at).toLocaleDateString()}</Text>
            <View style={styles.tiles}>
              <StatTile label="Weight" value={latest.weight_kg} unit="kg" icon="barbell-outline" />
              <StatTile label="BMI" value={latest.bmi} color={band.color} icon="body-outline" />
              <StatTile label="Body fat" value={latest.body_fat_pct} unit="%" icon="water-outline" />
              <StatTile label="Muscle" value={latest.muscle_mass_kg} unit="kg" icon="fitness-outline" />
              <StatTile label="Visceral fat" value={latest.visceral_fat} icon="ellipse-outline" />
              <StatTile label="BMR" value={latest.bmr} unit="kcal" icon="flame-outline" />
              <StatTile label="Body age" value={latest.body_age} unit="yrs" icon="hourglass-outline" />
              <StatTile label="TSF" value={latest.tsf} icon="resize-outline" />
            </View>
          </>
        ) : (
          <Card style={{ marginTop: theme.space(4) }}>
            <Text style={{ color: theme.colors.textDim, lineHeight: 22 }}>
              No readings yet. Tap “Record reading” after the member steps on the machine.
            </Text>
          </Card>
        )}

        {(goals.weight || goals.fat) && (
          <>
            <Text style={styles.section}>Goals</Text>
            {goals.weight && <GoalBar label="Weight goal" unit=" kg" progress={goals.weight} />}
            {goals.fat && <GoalBar label="Body-fat goal" unit="%" progress={goals.fat} />}
          </>
        )}

        {rows.length >= 2 && (
          <>
            <Text style={styles.section}>Progress &amp; analytics</Text>
            <View style={styles.chips}>
              {METRICS.map((m) => (
                <Pressable
                  key={m.key as string}
                  style={[styles.chip, metric.key === m.key && styles.chipActive]}
                  onPress={() => setMetric(m)}
                >
                  <Text style={[styles.chipText, metric.key === m.key && styles.chipTextActive]}>{m.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.periodRow}>
              {PERIODS.map((p, i) => (
                <Pressable
                  key={p.key}
                  style={[styles.period, periodIdx === i && styles.periodActive]}
                  onPress={() => setPeriodIdx(i)}
                >
                  <Text style={[styles.periodText, periodIdx === i && styles.periodTextActive]}>{p.label}</Text>
                </Pressable>
              ))}
            </View>

            {chart.length >= 2 ? (
              <>
                <Card style={{ padding: theme.space(2), paddingTop: theme.space(3) }}>
                  <TrendChart
                    points={chart}
                    width={screenW - theme.space(8) - theme.space(4)}
                    unit={metric.unit}
                  />
                </Card>

                {stats && trend && (
                  <View style={styles.analytics}>
                    <View style={styles.aCard}>
                      <Text style={styles.aLabel}>Current</Text>
                      <Text style={styles.aValue}>
                        {stats.last}
                        {metric.unit ? ` ${metric.unit}` : ''}
                      </Text>
                    </View>
                    <View style={styles.aCard}>
                      <Text style={styles.aLabel}>Change</Text>
                      <View style={styles.aRow}>
                        <Ionicons name={trend.arrow} size={14} color={trend.color} />
                        <Text style={[styles.aValue, { color: trend.color }]}>
                          {stats.change > 0 ? '+' : ''}
                          {stats.change}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.aCard}>
                      <Text style={styles.aLabel}>Per week</Text>
                      <Text style={styles.aValue}>
                        {stats.perWeek == null ? '—' : `${stats.perWeek > 0 ? '+' : ''}${stats.perWeek}`}
                      </Text>
                    </View>
                    <View style={styles.aCard}>
                      <Text style={styles.aLabel}>Lowest</Text>
                      <Text style={styles.aValue}>{stats.min}</Text>
                    </View>
                    <View style={styles.aCard}>
                      <Text style={styles.aLabel}>Highest</Text>
                      <Text style={styles.aValue}>{stats.max}</Text>
                    </View>
                    <View style={styles.aCard}>
                      <Text style={styles.aLabel}>Average</Text>
                      <Text style={styles.aValue}>{stats.avg}</Text>
                    </View>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.delta}>No {metric.label.toLowerCase()} readings in this period.</Text>
            )}
          </>
        )}

        {rows.length > 0 && (
          <>
            <Text style={styles.section}>History</Text>
            <Text style={styles.histHint}>Tap a reading to edit or delete it.</Text>
            {[...rows].reverse().map((r) => (
              <Pressable
                key={r.id}
                style={styles.histRow}
                onPress={() => router.push(`/member/${memberId}/measure?reading=${r.id}`)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.histDate}>{new Date(r.measured_at).toLocaleDateString()}</Text>
                  <Text style={styles.histVals}>
                    {r.weight_kg} kg · BMI {r.bmi ?? '—'}
                    {r.body_fat_pct != null ? ` · fat ${r.body_fat_pct}%` : ''}
                    {r.muscle_mass_kg != null ? ` · MM ${r.muscle_mass_kg}` : ''}
                  </Text>
                </View>
                <Ionicons name="create-outline" size={18} color={theme.colors.textDim} />
              </Pressable>
            ))}
          </>
        )}

        <View style={{ height: theme.space(4) }} />
        <Button title="Record reading" icon="add" onPress={() => router.push(`/member/${memberId}/measure`)} />

        {rows.length > 0 && (
          <>
            <View style={{ height: theme.space(3) }} />
            <Button 
              title="Share report (PDF)" 
              icon="share-outline" 
              variant="ghost" 
              onPress={pickAndShareReport} 
              loading={sharing} 
            />
          </>
        )}

        {profile?.role === 'admin' && (
          <>
            <View style={{ height: theme.space(3) }} />
            <Button title="Delete member" icon="trash-outline" variant="danger" onPress={confirmDelete} />
          </>
        )}
      </ScrollView>

      <Modal
        visible={showShareModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowShareModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowShareModal(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Share Report</Text>
            <Text style={styles.modalSub}>Choose the format you want to share.</Text>

            <Pressable style={styles.optionCard} onPress={() => shareReport('current')}>
              <View style={styles.optionIcon}>
                <Ionicons name="document-text-outline" size={24} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>Current Snapshot</Text>
                <Text style={styles.optionDesc}>One-page summary of the latest reading. Best for quick updates.</Text>
              </View>
            </Pressable>

            <Pressable style={styles.optionCard} onPress={() => shareReport('overall')}>
              <View style={styles.optionIcon}>
                <Ionicons name="trending-up-outline" size={24} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>Overall Progress</Text>
                <Text style={styles.optionDesc}>Includes history trends, goals, and monthly summary.</Text>
              </View>
            </Pressable>

            <Pressable style={styles.cancelBtn} onPress={() => setShowShareModal(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center' },
  meta: { color: theme.colors.textDim, fontSize: 14 },
  notes: { color: theme.colors.text, marginTop: theme.space(2), lineHeight: 20 },
  section: { color: theme.colors.text, fontSize: 17, fontWeight: '800', marginTop: theme.space(5), marginBottom: theme.space(3) },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.space(3) },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.textDim, fontWeight: '700', fontSize: 13 },
  chipTextActive: { color: '#04210f' },
  periodRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 4,
    marginBottom: theme.space(3),
  },
  period: { flex: 1, paddingVertical: 7, borderRadius: 999, alignItems: 'center' },
  periodActive: { backgroundColor: theme.colors.surfaceAlt },
  periodText: { color: theme.colors.textDim, fontWeight: '700', fontSize: 13 },
  periodTextActive: { color: theme.colors.text },
  analytics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: theme.space(3) },
  aCard: {
    flexGrow: 1,
    flexBasis: '29%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space(3),
  },
  aLabel: { color: theme.colors.textDim, fontSize: 12, marginBottom: 4 },
  aValue: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
  aRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  delta: { color: theme.colors.textDim, marginBottom: theme.space(2) },
  histHint: { color: theme.colors.textDim, fontSize: 12, marginTop: -theme.space(1), marginBottom: theme.space(2) },
  histRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    padding: theme.space(3),
    marginBottom: theme.space(2),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  histDate: { color: theme.colors.text, fontWeight: '700', marginBottom: 2 },
  histVals: { color: theme.colors.textDim, fontSize: 13, lineHeight: 19 },
  
  // Custom Share Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.space(5),
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: theme.space(4),
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalSub: {
    color: theme.colors.textDim,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: theme.space(5),
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius,
    padding: theme.space(4),
    marginBottom: theme.space(3),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.space(3),
  },
  optionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  optionDesc: {
    color: theme.colors.textDim,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: theme.space(4),
  },
  cancelBtnText: {
    color: theme.colors.textDim,
    fontSize: 15,
    fontWeight: '600',
  },
});