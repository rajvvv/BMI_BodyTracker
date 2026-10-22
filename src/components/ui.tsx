import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { theme } from '../theme';

export function Button({
  title,
  onPress,
  loading,
  variant = 'primary',
  disabled,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
}) {
  const bg =
    variant === 'primary' ? theme.colors.primary : variant === 'danger' ? theme.colors.danger : 'transparent';
  const border = variant === 'ghost' ? theme.colors.border : 'transparent';
  const color = variant === 'ghost' ? theme.colors.text : '#04210f';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderColor: border, borderWidth: variant === 'ghost' ? 1 : 0 },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={[styles.btnText, { color }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & TextInputProps) {
  return (
    <View style={{ marginBottom: theme.space(4) }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.colors.textDim}
        style={styles.input}
        {...props}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function StatTile({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  color?: string;
}) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={[styles.tileValue, color ? { color } : null]}>
        {value == null || value === '' ? '—' : value}
        {value != null && value !== '' && unit ? <Text style={styles.tileUnit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: theme.radius,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  btnText: { fontSize: 16, fontWeight: '700' },
  label: { color: theme.colors.textDim, marginBottom: 6, fontSize: 13, fontWeight: '600' },
  hint: { color: theme.colors.textDim, marginTop: 4, fontSize: 12 },
  input: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius,
    color: theme.colors.text,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 16,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    padding: theme.space(4),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '30%',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius,
    padding: theme.space(3),
  },
  tileLabel: { color: theme.colors.textDim, fontSize: 12, marginBottom: 4 },
  tileValue: { color: theme.colors.text, fontSize: 20, fontWeight: '800' },
  tileUnit: { fontSize: 12, fontWeight: '600', color: theme.colors.textDim },
});
