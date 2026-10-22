import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { Button, Field, StatTile } from '../components/ui';
import { ageFromDob, bmiBand, calcBmi, calcBmr, num } from '../lib/calc';
import { Member } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';
import { ScreenProps } from '../navigation';

export default function AddMeasurementScreen({ navigation, route }: ScreenProps<'AddMeasurement'>) {
  const { memberId } = route.params;
  const { session } = useAuth();
  const [member, setMember] = useState<Member | null>(null);

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

  const liveBmi = useMemo(() => calcBmi(num(weight), member?.height_cm ?? null), [weight, member]);
  const band = bmiBand(liveBmi);
  const estBmr = useMemo(
    () => (member ? calcBmr(num(weight), member.height_cm, ageFromDob(member.date_of_birth), member.sex) : null),
    [weight, member],
  );

  async function save() {
    const w = num(weight);
    if (!w || w < 20 || w > 400) return Alert.alert('Check weight', 'Enter weight in kg (e.g. 68.5).');
    setSaving(true);
    try {
      const { error } = await supabase.from('measurements').insert({
        member_id: memberId,
        weight_kg: w,
        body_fat_pct: num(fat),
        visceral_fat: num(vf),
        muscle_mass_kg: num(mm),
        bmr: num(bmr) ?? estBmr,
        body_age: num(bodyAge),
        tsf: num(tsf),
        bmi: liveBmi,
        recorded_by: session?.user.id,
      });
      if (error) throw error;
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Could not save', e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={{ padding: theme.space(4), paddingBottom: 60 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.member}>{member?.full_name ?? '…'}</Text>
      <Text style={styles.hint}>
        Type the numbers shown on the machine. BMI is calculated automatically from the member’s height.
      </Text>

      <View style={{ height: theme.space(4) }} />

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
      <Button title="Save reading" onPress={save} loading={saving} />
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
