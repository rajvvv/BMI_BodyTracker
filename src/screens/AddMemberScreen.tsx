import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Button, Field } from '../components/ui';
import { DateField } from '../components/DateField';
import { num, parseDate, toYmd } from '../lib/calc';
import { Member, Sex } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { theme } from '../theme';

export default function AddMemberScreen() {
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editId = id;
  const { session } = useAuth();

  const [fullName, setFullName] = useState('');
  const [sex, setSex] = useState<Sex>('male');
  const [dob, setDob] = useState<Date | null>(null);
  const [height, setHeight] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [targetFat, setTargetFat] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editId) return;
    supabase
      .from('members')
      .select('*')
      .eq('id', editId)
      .single()
      .then(({ data }) => {
        const m = data as Member | null;
        if (!m) return;
        setFullName(m.full_name);
        setSex(m.sex);
        setDob(parseDate(m.date_of_birth));
        setHeight(String(m.height_cm));
        setPhone(m.phone ?? '');
        setNotes(m.notes ?? '');
        setTargetWeight(m.target_weight_kg != null ? String(m.target_weight_kg) : '');
        setTargetFat(m.target_body_fat_pct != null ? String(m.target_body_fat_pct) : '');
      });
  }, [editId]);

  async function save() {
    const h = num(height);
    if (!fullName.trim()) return Alert.alert('Name required', 'Enter the member’s name.');
    if (!h || h < 50 || h > 260) return Alert.alert('Check height', 'Enter height in cm (e.g. 172).');

    setSaving(true);
    const payload = {
      full_name: fullName.trim(),
      sex,
      date_of_birth: dob ? toYmd(dob) : null,
      height_cm: h,
      phone: phone.trim() || null,
      notes: notes.trim() || null,
      target_weight_kg: num(targetWeight),
      target_body_fat_pct: num(targetFat),
    };
    try {
      if (editId) {
        const { error } = await supabase.from('members').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('members')
          .insert({ ...payload, created_by: session?.user.id, instructor_id: session?.user.id });
        if (error) throw error;
      }
      toast(editId ? 'Member updated' : 'Member added');
      router.back();
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
      <Stack.Screen options={{ title: editId ? 'Edit member' : 'New member' }} />

      <Field label="Full name" placeholder="e.g. Rahul Verma" value={fullName} onChangeText={setFullName} autoCapitalize="words" />

      <Text style={styles.label}>Sex</Text>
      <View style={styles.segment}>
        {(['male', 'female'] as Sex[]).map((s) => (
          <Pressable key={s} style={[styles.segBtn, sex === s && styles.segBtnActive]} onPress={() => setSex(s)}>
            <Text style={[styles.segText, sex === s && styles.segTextActive]}>
              {s === 'male' ? 'Male' : 'Female'}
            </Text>
          </Pressable>
        ))}
      </View>

      <DateField
        label="Date of birth"
        value={dob}
        onChange={setDob}
        hint="Used to show age. Optional."
        placeholder="Tap to pick a date"
        maximumDate={new Date()}
      />
      <Field label="Height (cm)" placeholder="172" value={height} onChangeText={setHeight} keyboardType="numeric" />
      <Field label="Phone" placeholder="Optional" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

      <Text style={styles.sectionLabel}>Goals (optional)</Text>
      <Field
        label="Target weight (kg)"
        placeholder="e.g. 65"
        hint="Used to show progress toward the goal."
        value={targetWeight}
        onChangeText={setTargetWeight}
        keyboardType="numeric"
      />
      <Field
        label="Target body fat %"
        placeholder="e.g. 18"
        value={targetFat}
        onChangeText={setTargetFat}
        keyboardType="numeric"
      />

      <Field label="Notes" placeholder="Injuries, plan… (optional)" value={notes} onChangeText={setNotes} multiline />

      <View style={{ height: theme.space(2) }} />
      <Button title={editId ? 'Save changes' : 'Add member'} onPress={save} loading={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { color: theme.colors.textDim, marginBottom: 6, fontSize: 13, fontWeight: '600' },
  sectionLabel: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: theme.space(3),
    marginTop: theme.space(1),
  },
  segment: { flexDirection: 'row', gap: 10, marginBottom: theme.space(4) },
  segBtn: {
    flex: 1,
    height: 50,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  segText: { color: theme.colors.textDim, fontWeight: '700' },
  segTextActive: { color: '#04210f' },
});
