import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GoalProgress } from '../lib/calc';
import { theme } from '../theme';

export function GoalBar({
  label,
  unit,
  progress,
}: {
  label: string;
  unit: string;
  progress: GoalProgress;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.sub}>
          {progress.reached ? (
            <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>Goal reached 🎉</Text>
          ) : (
            <>
              {progress.currentValue}
              {unit} → <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{progress.target}{unit}</Text>
            </>
          )}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress.pct}%` }]} />
      </View>
      <Text style={styles.foot}>
        {progress.reached ? '100% complete' : `${progress.pct}% · ${progress.remaining}${unit} to go`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space(3),
    marginBottom: theme.space(2),
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { color: theme.colors.text, fontWeight: '700', fontSize: 14 },
  sub: { color: theme.colors.textDim, fontSize: 13 },
  track: { height: 10, borderRadius: 5, backgroundColor: theme.colors.surfaceAlt, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5, backgroundColor: theme.colors.primary },
  foot: { color: theme.colors.textDim, fontSize: 12, marginTop: 6 },
});
