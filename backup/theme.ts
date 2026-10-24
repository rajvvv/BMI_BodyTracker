// Single source of truth for colors / spacing so every screen matches.
export const theme = {
  colors: {
    bg: '#0f172a',          // slate-900
    surface: '#1e293b',     // slate-800
    surfaceAlt: '#334155',  // slate-700
    border: '#334155',
    text: '#f1f5f9',        // slate-100
    textDim: '#94a3b8',     // slate-400
    primary: '#22c55e',     // green-500
    primaryDark: '#16a34a',
    danger: '#ef4444',
    accent: '#38bdf8',      // sky-400
    good: '#22c55e',        // trend improving
    bad: '#f59e0b',         // trend regressing (amber, not alarming red)
    chartGrid: 'rgba(148,163,184,0.15)',
  },
  radius: 14,
  radiusLg: 20,
  space: (n: number) => n * 4,
};
