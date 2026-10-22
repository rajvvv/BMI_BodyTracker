import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Button, Card, StatTile } from '../components/ui';
import { ageFromDob, bmiBand } from '../lib/calc';
import { Measurement, Member } from '../lib/types';
import { theme } from '../theme';
import { ScreenProps } from '../navigation';

type Metric = { key: keyof Measurement; label: string; unit: string };
const METRICS: Metric[] = [
  { key: 'weight_kg', label: 'Weight', unit: 'kg' },
  { key: 'bmi', label: 'BMI', unit: '' },
  { key: 'body_fat_pct', label: 'Body fat', unit: '%' },
  { key: 'muscle_mass_kg', label: 'Muscle', unit: 'kg' },
  { key: 'visceral_fat', label: 'Visceral fat', unit: '' },
];

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

export default function MemberDetailScreen({ navigation, route }: ScreenProps<'MemberDetail'>) {
  const { memberId } = route.params;
  const [member, setMember] = useState<Member | null>(null);
  const [rows, setRows] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<Metric>(METRICS[0]);

  const load = useCallback(async () => {
    const [{ data: m }, { data: ms }] = await Promise.all([
      supabase.from('members').select('*').eq('id', memberId).single(),
      supabase.from('measurements').select('*').eq('member_id', memberId).order('measured_at', { ascending: true }),
    ]);
    setMember(m as Member);
    setRows((ms as Measurement[]) ?? []);
    setLoading(false);
  }, [memberId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useLayoutEffect(() => {
    navigation.setOptions({
      title: member?.full_name ?? 'Member',
      headerRight: () => (
        <Pressable onPress={() => navigation.navigate('AddMember', { memberId })} hitSlop={10}>
          <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>Edit</Text>
        </Pressable>
      ),
    });
  }, [navigation, member, memberId]);

  const latest = rows.length ? rows[rows.length - 1] : null;
  const first = rows.length ? rows[0] : null;

  const chart = useMemo(() => {
    const points = rows
      .map((r) => ({ v: r[metric.key] as number | null, at: r.measured_at }))
      .filter((p) => p.v != null) as { v: number; at: string }[];
    return points;
  }, [rows, metric]);

  const delta = useMemo(() => {
    if (!first || !latest) return null;
    const a = first[metric.key] as number | null;
    const b = latest[metric.key] as number | null;
    if (a == null || b == null) return null;
    return Math.round((b - a) * 10) / 10;
  }, [first, latest, metric]);

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

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={{ padding: theme.space(4), paddingBottom: 60 }}
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
            <StatTile label="Weight" value={latest.weight_kg} unit="kg" />
            <StatTile label="BMI" value={latest.bmi} color={band.color} />
            <StatTile label="Body fat" value={latest.body_fat_pct} unit="%" />
            <StatTile label="Muscle" value={latest.muscle_mass_kg} unit="kg" />
            <StatTile label="Visceral fat" value={latest.visceral_fat} />
            <StatTile label="BMR" value={latest.bmr} unit="kcal" />
            <StatTile label="Body age" value={latest.body_age} unit="yrs" />
            <StatTile label="TSF" value={latest.tsf} />
          </View>
        </>
      ) : (
        <Card style={{ marginTop: theme.space(4) }}>
          <Text style={{ color: theme.colors.textDim, lineHeight: 22 }}>
            No readings yet. Tap “Record reading” after the member steps on the machine.
          </Text>
        </Card>
      )}

      {chart.length >= 2 && (
        <>
          <Text style={styles.section}>Progress</Text>
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

          {delta != null && (
            <Text style={styles.delta}>
              {metric.label} change since first reading:{' '}
              <Text style={{ color: delta <= 0 ? theme.colors.primary : theme.colors.accent, fontWeight: '800' }}>
                {delta > 0 ? '+' : ''}
                {delta}
                {metric.unit ? ` ${metric.unit}` : ''}
              </Text>
            </Text>
          )}

          <LineChart
            data={{
              labels: chart.map((p) => fmtDate(p.at)),
              datasets: [{ data: chart.map((p) => p.v) }],
            }}
            width={screenW - theme.space(8)}
            height={220}
            withInnerLines={false}
            chartConfig={{
              backgroundGradientFrom: theme.colors.surface,
              backgroundGradientTo: theme.colors.surface,
              decimalPlaces: 1,
              color: () => theme.colors.primary,
              labelColor: () => theme.colors.textDim,
              propsForDots: { r: '4', strokeWidth: '2', stroke: theme.colors.primary },
            }}
            bezier
            style={{ borderRadius: theme.radius, marginVertical: theme.space(2) }}
          />
        </>
      )}

      {rows.length > 0 && (
        <>
          <Text style={styles.section}>History</Text>
          {[...rows].reverse().map((r) => (
            <View key={r.id} style={styles.histRow}>
              <Text style={styles.histDate}>{new Date(r.measured_at).toLocaleDateString()}</Text>
              <Text style={styles.histVals}>
                {r.weight_kg} kg · BMI {r.bmi ?? '—'}
                {r.body_fat_pct != null ? ` · fat ${r.body_fat_pct}%` : ''}
                {r.muscle_mass_kg != null ? ` · MM ${r.muscle_mass_kg}` : ''}
              </Text>
            </View>
          ))}
        </>
      )}

      <View style={{ height: theme.space(4) }} />
      <Button title="＋  Record reading" onPress={() => navigation.navigate('AddMeasurement', { memberId })} />
    </ScrollView>
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
  delta: { color: theme.colors.textDim, marginBottom: theme.space(2) },
  histRow: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    padding: theme.space(3),
    marginBottom: theme.space(2),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  histDate: { color: theme.colors.text, fontWeight: '700', marginBottom: 2 },
  histVals: { color: theme.colors.textDim, fontSize: 13, lineHeight: 19 },
});
