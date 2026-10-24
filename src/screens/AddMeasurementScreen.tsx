import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Button, Field, StatTile } from '../components/ui';
import { DateField } from '../components/DateField';
import { ageFromDob, bmiBand, calcBmi, calcBmr, num } from '../lib/calc';
import { Measurement, Member } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { theme } from '../theme';

export default function AddMeasurementScreen() {
  const router = useRouter();
  const toast = useToast();
  const { id: memberId, reading } = useLocalSearchParams<{ id: string; reading?: string }>();
  const editingId = reading;
  const { session } = useAuth();
  const [member, setMember] = useState<Member | null>(null);

  const [measuredAt, setMeasuredAt] = useState<Date>(new Date());
  const [weight, setWeight] = useState('');
  const [fat, setFat] = useState('');
  const [vf, setVf] = useState('');
  const [mm, setMm] = useState('');
  const [bmr, setBmr] = useState('');
  const [bodyAge, setBodyAge] = useState('');
  const [tsf, setTsf] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single()
      .then(({ data }) => setMember(data as Member));
  }, [memberId]);

  useEffect(() => {
    if (!editingId) return;
    supabase
      .from('measurements')
      .select('*')
      .eq('id', editingId)
      .single()
      .then(({ data }) => {
        const r = data as Measurement | null;
        if (!r) return;
        setMeasuredAt(new Date(r.measured_at));
        setWeight(String(r.weight_kg));
        setFat(r.body_fat_pct != null ? String(r.body_fat_pct) : '');
        setVf(r.visceral_fat != null ? String(r.visceral_fat) : '');
        setMm(r.muscle_mass_kg != null ? String(r.muscle_mass_kg) : '');
        setBmr(r.bmr != null ? String(r.bmr) : '');
        setBodyAge(r.body_age != null ? String(r.body_age) : '');
        setTsf(r.tsf != null ? String(r.tsf) : '');
      });
  }, [editingId]);

  const liveBmi = useMemo(() => calcBmi(num(weight), member?.height_cm ?? null), [weight, member]);
  const band = bmiBand(liveBmi);
  const estBmr = useMemo(
    () => (member ? calcBmr(num(weight), member.height_cm, ageFromDob(member.date_of_birth), member.sex) : null),
    [weight, member],
  );

  function bad(label: string, v: number | null, min: number, max: number): string | null {
    if (v == null) return null;
    return v < min || v > max ? `${label} looks off — expected roughly ${min}–${max}.` : null;
  }

  async function save() {
    const w = num(weight);
    if (!w || w < 20 || w > 400) return Alert.alert('Check weight', 'Enter weight in kg (e.g. 68.5).');
    const warn =
      bad('Body fat %', num(fat), 1, 75) ||
      bad('Visceral fat', num(vf), 1, 60) ||
      bad('Muscle mass', num(mm), 5, 120) ||
      bad('Body age', num(bodyAge), 5, 120);
    if (warn) return Alert.alert('Check the values', warn);

    setSaving(true);
    const payload = {
      member_id: memberId,
      measured_at: measuredAt.toISOString(),
      weight_kg: w,
      body_fat_pct: num(fat),
      visceral_fat: num(vf),
      muscle_mass_kg: num(mm),
      bmr: num(bmr) ?? estBmr,
      body_age: num(bodyAge),
      tsf: num(tsf),
      bmi: liveBmi,
      recorded_by: session?.user.id,
    };
    try {
      if (editingId) {
        const { error } = await supabase.from('measurements').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('measurements').insert(payload);
        if (error) throw error;
      }
      toast(editingId ? 'Reading updated' : 'Reading saved');
      router.back();
    } catch (e: any) {
      Alert.alert('Could not save', e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete this reading?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('measurements').delete().eq('id', editingId);
          if (error) return Alert.alert('Could not delete', error.message);
          toast('Reading deleted');
          router.back();
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={{ padding: theme.space(4), paddingBottom: 60 }}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: editingId ? 'Edit reading' : 'Record reading' }} />
      <Text style={styles.member}>{member?.full_name ?? '…'}</Text>
      <Text style={styles.hint}>
        Type the numbers shown on the machine. BMI is calculated automatically from the member’s height.
      </Text>

      <View style={{ height: theme.space(4) }} />

      <DateField label="Measurement date" value={measuredAt} onChange={setMeasuredAt} maximumDate={new Date()} />
      <Field label="Weight (kg)" placeholder="68.5" value={weight} onChangeText={setWeight} keyboardType="numeric" />

      <View style={styles.live}>
        <StatTile label="BMI (calculated)" value={liveBmi ?? '—'} color={band.color} />
        <StatTile label="Category" value={band.label} color={band.color} />
        <StatTile label="BMR estimate" value={estBmr ?? '—'} unit="kcal" />
      </View>

      <Text style={styles.section}>From the machine</Text>
      <Field label="Body fat %" placeholder="22.4" value={fat} onChangeText={setFat} keyboardType="numeric" />
      <Field label="Visceral fat (VF)" placeholder="8" value={vf} onChangeText={setVf} keyboardType="numeric" />
      <Field label="Muscle mass (MM, kg)" placeholder="31.2" value={mm} onChangeText={setMm} keyboardType="numeric" />
      <Field
        label="BMR / RM (kcal)"
        placeholder={estBmr ? `machine value, or leave blank for ${estBmr}` : 'kcal'}
        value={bmr}
        onChangeText={setBmr}
        keyboardType="numeric"
      />
      <Field label="Body age (B-Age)" placeholder="years" value={bodyAge} onChangeText={setBodyAge} keyboardType="numeric" />
      <Field label="TSF" placeholder="mm" value={tsf} onChangeText={setTsf} keyboardType="numeric" />

      <View style={{ height: theme.space(2) }} />
      <Button title={editingId ? 'Save changes' : 'Save reading'} onPress={save} loading={saving} />

      {editingId && (
        <>
          <View style={{ height: theme.space(3) }} />
          <Button title="Delete reading" variant="danger" onPress={confirmDelete} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  member: { color: theme.colors.text, fontSize: 22, fontWeight: '800' },
  hint: { color: theme.colors.textDim, marginTop: 4, lineHeight: 20 },
  live: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: theme.space(5) },
  section: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: theme.space(3),
    marginTop: theme.space(1),
  },
});
