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
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

type IconName = keyof typeof Ionicons.glyphMap;

export function Button({
  title,
  onPress,
  loading,
  variant = 'primary',
  disabled,
  icon,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  icon?: IconName;
}) {
  const danger = variant === 'danger';
  const ghost = variant === 'ghost';
  const bg = ghost ? 'transparent' : danger ? 'rgba(239,68,68,0.12)' : theme.colors.primary;
  const border = ghost ? theme.colors.border : danger ? 'rgba(239,68,68,0.5)' : 'transparent';
  const color = danger ? theme.colors.danger : ghost ? theme.colors.text : '#04210f';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderColor: border, borderWidth: ghost || danger ? 1 : 0 },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <View style={styles.btnRow}>
          {icon ? <Ionicons name={icon} size={18} color={color} /> : null}
          <Text style={[styles.btnText, { color }]}>{title}</Text>
        </View>
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
  icon,
}: {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  color?: string;
  icon?: IconName;
}) {
  return (
    <View style={styles.tile}>
      <View style={styles.tileTop}>
        <Text style={styles.tileLabel}>{label}</Text>
        {icon ? <Ionicons name={icon} size={14} color={theme.colors.textDim} /> : null}
      </View>
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
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  tileLabel: { color: theme.colors.textDim, fontSize: 12 },
  tileValue: { color: theme.colors.text, fontSize: 20, fontWeight: '800' },
  tileUnit: { fontSize: 12, fontWeight: '600', color: theme.colors.textDim },
});
