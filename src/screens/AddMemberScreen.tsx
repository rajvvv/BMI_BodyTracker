import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { Button, Field } from '../components/ui';
import { num } from '../lib/calc';
import { Member, Sex } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';
import { ScreenProps } from '../navigation';

export default function AddMemberScreen({ navigation, route }: ScreenProps<'AddMember'>) {
  const editId = route.params?.memberId;
  const { session } = useAuth();
  const [fullName, setFullName] = useState('');
  const [sex, setSex] = useState<Sex>('male');
  const [dob, setDob] = useState('');
  const [height, setHeight] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: editId ? 'Edit member' : 'New member' });
    if (editId) {
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
          setDob(m.date_of_birth ?? '');
          setHeight(String(m.height_cm));
          setPhone(m.phone ?? '');
          setNotes(m.notes ?? '');
        });
    }
  }, [editId]);

  async function save() {
    const h = num(height);
    if (!fullName.trim()) return Alert.alert('Name required', 'Enter the member’s name.');
    if (!h || h < 50 || h > 260) return Alert.alert('Check height', 'Enter height in cm (e.g. 172).');
    if (dob.trim() && isNaN(new Date(dob.trim()).getTime()))
      return Alert.alert('Check date', 'Date of birth must look like 1998-04-25.');

    setSaving(true);
    const payload = {
      full_name: fullName.trim(),
      sex,
      date_of_birth: dob.trim() || null,
      height_cm: h,
      phone: phone.trim() || null,
      notes: notes.trim() || null,
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
      <Field label="Full name" placeholder="e.g. Rahul Verma" value={fullName} onChangeText={setFullName} autoCapitalize="words" />

      <Text style={styles.label}>Sex</Text>
      <View style={styles.segment}>
        {(['male', 'female'] as Sex[]).map((s) => (
          <Pressable
            key={s}
            style={[styles.segBtn, sex === s && styles.segBtnActive]}
            onPress={() => setSex(s)}
          >
            <Text style={[styles.segText, sex === s && styles.segTextActive]}>
              {s === 'male' ? 'Male' : 'Female'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Field
        label="Date of birth"
        placeholder="YYYY-MM-DD"
        hint="Used to show age. Optional."
        value={dob}
        onChangeText={setDob}
        autoCapitalize="none"
      />
      <Field label="Height (cm)" placeholder="172" value={height} onChangeText={setHeight} keyboardType="numeric" />
      <Field label="Phone" placeholder="Optional" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="Notes" placeholder="Goals, injuries, plan… (optional)" value={notes} onChangeText={setNotes} multiline />

      <View style={{ height: theme.space(2) }} />
      <Button title={editId ? 'Save changes' : 'Add member'} onPress={save} loading={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { color: theme.colors.textDim, marginBottom: 6, fontSize: 13, fontWeight: '600' },
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
