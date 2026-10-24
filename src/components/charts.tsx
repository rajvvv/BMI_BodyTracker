import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { theme } from '../theme';

export type Point = { v: number; at: string };

/** A polished analytics line chart: gradient area, average line, min/max
 *  markers and a highlighted latest point. Pure SVG — renders in Expo Go. */
export function TrendChart({
  points,
  width,
  height = 210,
  color = theme.colors.primary,
  unit = '',
}: {
  points: Point[];
  width: number;
  height?: number;
  color?: string;
  unit?: string;
}) {
  if (points.length < 2 || width <= 0) return null;

  const padL = 10;
  const padR = 10;
  const padT = 22;
  const padB = 26;
  const values = points.map((p) => p.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const span = max - min || 1;

  const x = (i: number) => padL + (i * (width - padL - padR)) / (points.length - 1);
  const y = (v: number) => padT + (1 - (v - min) / span) * (height - padT - padB);

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${x(points.length - 1).toFixed(1)} ${height - padB} L ${x(0).toFixed(1)} ${height - padB} Z`;
  const avgY = y(avg);

  const labelStep = Math.ceil(points.length / 5);
  const last = points[points.length - 1];

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.35} />
          <Stop offset="1" stopColor={color} stopOpacity={0.02} />
        </LinearGradient>
      </Defs>

      {/* average reference line */}
      <Line x1={padL} y1={avgY} x2={width - padR} y2={avgY} stroke={theme.colors.chartGrid} strokeWidth={1} strokeDasharray="4 5" />
      <SvgText x={width - padR} y={avgY - 4} fill={theme.colors.textDim} fontSize={10} textAnchor="end">
        avg {round(avg)}
      </SvgText>

      <Path d={areaPath} fill="url(#trendFill)" />
      <Path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

      {points.map((p, i) => (
        <Circle
          key={i}
          cx={x(i)}
          cy={y(p.v)}
          r={i === points.length - 1 ? 5 : 3}
          fill={i === points.length - 1 ? color : theme.colors.surface}
          stroke={color}
          strokeWidth={2}
        />
      ))}

      {/* latest value label */}
      <SvgText x={x(points.length - 1)} y={y(last.v) - 10} fill={theme.colors.text} fontSize={11} fontWeight="bold" textAnchor="end">
        {round(last.v)}
        {unit}
      </SvgText>

      {/* x-axis date labels */}
      {points.map((p, i) =>
        i % labelStep === 0 || i === points.length - 1 ? (
          <SvgText key={`x${i}`} x={x(i)} y={height - 8} fill={theme.colors.textDim} fontSize={10} textAnchor="middle">
            {shortDate(p.at)}
          </SvgText>
        ) : null,
      )}
    </Svg>
  );
}

/** Compact vertical bar chart (e.g. readings per month). Pure SVG. */
export function BarChart({
  data,
  width,
  height = 120,
  color = theme.colors.primary,
}: {
  data: { label: string; value: number }[];
  width: number;
  height?: number;
  color?: string;
}) {
  if (!data.length || width <= 0) return null;
  const padB = 18;
  const max = Math.max(1, ...data.map((d) => d.value));
  const gap = 8;
  const barW = (width - gap * (data.length - 1)) / data.length;
  const h = height - padB;

  return (
    <Svg width={width} height={height}>
      {data.map((d, i) => {
        const bh = Math.max(2, (d.value / max) * (h - 16));
        const bx = i * (barW + gap);
        const by = h - bh;
        return (
          <React.Fragment key={i}>
            <Path
              d={roundedTopRect(bx, by, barW, bh, 5)}
              fill={d.value > 0 ? color : theme.colors.surfaceAlt}
              opacity={d.value > 0 ? 1 : 0.5}
            />
            {d.value > 0 ? (
              <SvgText x={bx + barW / 2} y={by - 4} fill={theme.colors.textDim} fontSize={10} textAnchor="middle">
                {d.value}
              </SvgText>
            ) : null}
            <SvgText x={bx + barW / 2} y={height - 5} fill={theme.colors.textDim} fontSize={10} textAnchor="middle">
              {d.label}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

/** Horizontal distribution bar (stacked segments), e.g. BMI categories. */
export function StackBar({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  if (total === 0) {
    return <Text style={{ color: theme.colors.textDim, fontSize: 13 }}>No data yet.</Text>;
  }
  return (
    <View>
      <View style={styles.stackTrack}>
        {segments.map((s, i) =>
          s.value > 0 ? (
            <View key={i} style={{ flex: s.value, backgroundColor: s.color }} />
          ) : null,
        )}
      </View>
      <View style={styles.legend}>
        {segments.map((s, i) => (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text style={styles.legendText}>
              {s.label} {s.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}
function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
}
function roundedTopRect(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h);
  return `M ${x} ${y + h} L ${x} ${y + rr} Q ${x} ${y} ${x + rr} ${y} L ${x + w - rr} ${y} Q ${x + w} ${y} ${x + w} ${y + rr} L ${x + w} ${y + h} Z`;
}

const styles = StyleSheet.create({
  stackTrack: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', backgroundColor: theme.colors.surfaceAlt },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { color: theme.colors.textDim, fontSize: 12 },
});
