import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { theme } from '../theme';
import { Button } from './ui';

type Props = {
  label: string;
  value: Date | null;
  onChange: (d: Date) => void;
  hint?: string;
  placeholder?: string;
  maximumDate?: Date;
  minimumDate?: Date;
};

/** Cross-platform date picker: Android opens the native dialog imperatively,
 *  iOS shows an inline picker inside a bottom sheet. */
export function DateField({
  label,
  value,
  onChange,
  hint,
  placeholder = 'Select date',
  maximumDate,
  minimumDate,
}: Props) {
  const [showIos, setShowIos] = useState(false);

  function open() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: value ?? new Date(),
        mode: 'date',
        maximumDate,
        minimumDate,
        onValueChange: (_event, d) => {
          if (d) onChange(d);
        },
        onDismiss: () => {},
      });
    } else {
      setShowIos(true);
    }
  }

  return (
    <View style={{ marginBottom: theme.space(4) }}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.input} onPress={open}>
        <Text style={[styles.value, !value && { color: theme.colors.textDim }]}>
          {value ? value.toLocaleDateString() : placeholder}
        </Text>
        <Text style={styles.icon}>📅</Text>
      </Pressable>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      {Platform.OS === 'ios' && showIos && (
        <Modal transparent animationType="slide" onRequestClose={() => setShowIos(false)}>
          <Pressable style={styles.backdrop} onPress={() => setShowIos(false)}>
            <View style={styles.sheet}>
              <DateTimePicker
                value={value ?? new Date()}
                mode="date"
                display="inline"
                themeVariant="dark"
                maximumDate={maximumDate}
                minimumDate={minimumDate}
                onValueChange={(_e, d) => {
                  if (d) onChange(d);
                }}
              />
              <Button title="Done" onPress={() => setShowIos(false)} />
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: theme.colors.textDim, marginBottom: 6, fontSize: 13, fontWeight: '600' },
  input: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius,
    paddingHorizontal: 14,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: { color: theme.colors.text, fontSize: 16 },
  icon: { fontSize: 16 },
  hint: { color: theme.colors.textDim, marginTop: 4, fontSize: 12 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: theme.space(4),
    gap: theme.space(3),
  },
});
