import { Measurement, Member } from './types';
import { ageFromDob, bmiBand } from './calc';

// ============================================================================
//  Types
// ============================================================================

export type ReportMode = 'current' | 'overall';
export type ReportOptions = { mode?: ReportMode };

type Pill = 'good' | 'warn' | 'bad' | 'info';

// ============================================================================
//  Formatting
// ============================================================================

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmt(v: number | null | undefined, unit = ''): string {
  if (v == null) return '—';
  return `${v}${unit ? ` ${unit}` : ''}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
}

function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

function signed(n: number): string {
  const r = Math.round(n * 10) / 10;
  return `${r > 0 ? '+' : ''}${r}`;
}

function humanSpan(firstIso: string, lastIso: string): string {
  const days = Math.max(0, (new Date(lastIso).getTime() - new Date(firstIso).getTime()) / 86_400_000);
  if (days < 1) return 'today';
  if (days < 30) return `over ${Math.round(days)} days`;
  const months = Math.round(days / 30);
  return `over ${months} months`;
}

// ============================================================================
//  Visual Helpers
// ============================================================================

function pill(text: string, kind: Pill): string {
  const bg = { good: '#dcfce7', warn: '#fef3c7', bad: '#fee2e2', info: '#f1f5f9' }[kind];
  const fg = { good: '#166534', warn: '#92400e', bad: '#991b1b', info: '#475569' }[kind];
  return `<span class="pill" style="background:${bg};color:${fg}">${text}</span>`;
}

function deltaSpan(d: number | null, unit: string, lowerIsBetter: boolean): string {
  if (d == null || d === 0) return '';
  const improving = lowerIsBetter ? d < 0 : d > 0;
  const color = improving ? '#16a34a' : '#dc2626';
  return `<span class="mcard-delta" style="color:${color}">${signed(d)}${unit}</span>`;
}

function getBmiPill(bmi: number | null): Pill {
  if (bmi == null) return 'info';
  if (bmi < 18.1) return 'bad';
  if (bmi < 20.1) return 'warn';
  if (bmi <= 23.0) return 'good';
  if (bmi <= 25.0) return 'warn';
  return 'bad';
}

// ============================================================================
//  SVG chart (Only used in Overall mode)
// ============================================================================

function svgTrendChart(id: string, points: { v: number; at: string }[], color: string, unit: string): string {
  if (points.length < 2) return '';
  const W = 340, H = 140;
  const padL = 15, padR = 15, padT = 20, padB = 20;
  const values = points.map((p) => p.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const lo = min - span * 0.2;
  const hi = max + span * 0.2;
  const x = (i: number) => padL + (i * (W - padL - padR)) / (points.length - 1);
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
  const area = `${line} L ${x(points.length - 1).toFixed(1)} ${H - padB} L ${x(0).toFixed(1)} ${H - padB} Z`;
  const first = points[0], last = points[points.length - 1];

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g-${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.2" />
        <stop offset="100%" stop-color="${color}" stop-opacity="0.0" />
      </linearGradient>
    </defs>
    <path d="${area}" fill="url(#g-${id})" />
    <path d="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" />
    <circle cx="${x(points.length - 1).toFixed(1)}" cy="${y(last.v).toFixed(1)}" r="4" fill="${color}" />
    <text x="${x(0).toFixed(1)}" y="${H - 5}" text-anchor="start" font-size="9" fill="#94a3b8">${shortDate(first.at)}</text>
    <text x="${x(points.length - 1).toFixed(1)}" y="${H - 5}" text-anchor="end" font-size="9" fill="#94a3b8">${shortDate(last.at)}</text>
  </svg>`;
}

// ============================================================================
//  Sections
// ============================================================================

function buildHeader(member: Member, mode: ReportMode): string {
  const age = ageFromDob(member.date_of_birth);
  const typeBadge = mode === 'overall'
    ? `<span class="brand-type type-overall">Overall report</span>`
    : `<span class="brand-type type-current">Current report</span>`;
  return `
  <div class="brand">
    <div class="brand-mark">BODYTRACK</div>
    ${typeBadge}
  </div>
  <div class="hero">
    <div class="hero-left">
      <div class="hero-name">${esc(member.full_name)}</div>
      <div class="hero-meta">
        ${member.sex === 'male' ? 'Male' : 'Female'}${age != null ? ` · ${age} yrs` : ''} · ${member.height_cm} cm
      </div>
    </div>
    <div class="hero-right">
      <div class="hero-date">${fmtDate(new Date().toISOString())}</div>
      ${member.join_date ? `<div class="hero-join">Joined ${fmtDate(member.join_date)}</div>` : ''}
    </div>
  </div>`;
}

function buildSnapshot(latest: Measurement, deltaFrom: Measurement | null, deltaLabel: string): string {
  const band = bmiBand(latest.bmi);
  const delta = (key: keyof Measurement, unit: string, lowerIsBetter = true): string => {
    if (!deltaFrom) return '';
    const a = deltaFrom[key] as number | null;
    const b = latest[key] as number | null;
    if (a == null || b == null) return '';
    return deltaSpan(Math.round((b - a) * 10) / 10, unit, lowerIsBetter);
  };

  const card = (label: string, val: string, unit: string, deltaHtml: string, p?: string) => `
    <div class="mcard">
      <div class="mcard-label">${label}</div>
      <div class="mcard-value">${val}${unit ? `<span class="mcard-unit">${unit}</span>` : ''}</div>
      ${p ? `<div class="mcard-pill">${p}</div>` : '<div class="mcard-pill"></div>'}
      ${deltaHtml || '<div class="mcard-delta" style="opacity:0">-</div>'}
    </div>`;

  const cards = [
    card('Weight', String(latest.weight_kg), 'kg', delta('weight_kg', ' kg')),
    card('BMI', fmt(latest.bmi), '', delta('bmi', ''), pill(band.label, getBmiPill(latest.bmi))),
    card('Body fat', fmt(latest.body_fat_pct), '%', delta('body_fat_pct', '%')),
    card('Muscle mass', fmt(latest.muscle_mass_kg), 'kg', delta('muscle_mass_kg', ' kg', false)),
    card('Visceral fat', fmt(latest.visceral_fat), '', delta('visceral_fat', '')),
    card('BMR', fmt(latest.bmr), 'kcal', ''),
    card('Body age', fmt(latest.body_age), 'yrs', ''),
    card('TSF', fmt(latest.tsf), 'mm', ''),
  ].join('');

  return `
  <div class="section" style="margin-top:12px;">
    <div class="section-title">Latest reading <span class="muted" style="font-weight:400;text-transform:none;letter-spacing:0">· ${fmtDate(latest.measured_at)}${deltaLabel ? ` (${deltaLabel})` : ''}</span></div>
    <div class="snapshot">${cards}</div>
  </div>`;
}

// The minimal, 2-table advisory section modeled exactly from your image
function buildAdvisory(): string {
  return `
  <div class="section">
    <div class="section-title">Reference ranges</div>
    
    <div class="tables-row">
      <!-- LEFT TABLE: BMI -->
      <table class="ref-table bmi-table">
        <thead>
          <tr><th colspan="3">BMI Reference</th></tr>
        </thead>
        <tbody>
          <tr><td><b>&lt; 18.0</b></td><td>Malnutrition 2</td><td>Anorexia, Bulimia, Osteoporosis, Break down of muscle mass etc.</td></tr>
          <tr><td><b>18.1 - 20.0</b></td><td>Malnutrition 1</td><td>Digestive Problems, Weakness, Chronic Fatigue, Stress, Anxiety, Reproductive/Hormonal Dysfunction</td></tr>
          <tr><td><b>20.1 - 23.0</b></td><td>Normal</td><td>Normal Menstruation, Can handle stress, Good energy levels, vitality, Resistance to illness, good physical condition etc.</td></tr>
          <tr><td><b>23.1 - 25.0</b></td><td>Overweight</td><td>Fatigue, digestive problems, Circulation problems, varicose veins etc.</td></tr>
          <tr><td><b>25.1 - 28.0</b></td><td>Obesity grade 1</td><td>Diabetes, Hypertension, Cardiovascular Diseases, Blood Clots, Strokes, Joint Problems / Arthritis in knees, Spine etc.</td></tr>
          <tr><td><b>28.1 - 30.0</b></td><td>Obesity grade 2</td><td>Diabetes, Cancer, Angina, Heart Attacks, Phlebitis, Arterial Sclerosis &amp; Strokes etc.</td></tr>
          <tr><td><b>OVER 30</b></td><td>Obesity grade 3</td><td>Maximum risk of Diabetes, Cancer, Heart Disease, premature death.</td></tr>
        </tbody>
      </table>

      <!-- RIGHT TABLE: Body Composition -->
      <table class="ref-table comp-table">
        <thead>
          <tr>
            <th></th>
            <th>NORMAL</th>
            <th>HIGH</th>
            <th>RISK</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Visceral Fat (VF)</td><td><b>2-8</b></td><td>9-14</td><td>15+</td></tr>
          <tr><td>Trunk Fat (TSF)</td><td><b>&lt;15</b></td><td>16-18</td><td>18+</td></tr>
          <tr>
            <td>B-Fat %</td>
            <td><b>M: 10-20<br/>W: 20-30</b></td>
            <td>21-25<br/>31-35</td>
            <td>25+<br/>35+</td>
          </tr>
          <tr>
            <td>Muscle Mass (MM)</td>
            <td colspan="3" style="text-align:center;">
              <b>M: 33-36% &nbsp;|&nbsp; W: 30-33%</b><br/>
              <span style="font-size:8px;color:#64748b;">BMR: M ~2000 kcal | W ~1800 kcal</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>`;
}

function buildJourney(member: Member, rows: Measurement[]): string {
  if (rows.length < 2) return '';
  const first = rows[0];
  const latest = rows[rows.length - 1];

  const stat = (label: string, value: string, color: string) => `
    <div class="jstat">
      <div class="jstat-label">${label}</div>
      <div class="jstat-value" style="color:${color}">${value}</div>
    </div>`;

  const dWeight = first.weight_kg != null && latest.weight_kg != null ? Math.round((latest.weight_kg - first.weight_kg) * 10) / 10 : null;
  const dFat = first.body_fat_pct != null && latest.body_fat_pct != null ? Math.round((latest.body_fat_pct - first.body_fat_pct) * 10) / 10 : null;
  const dMuscle = first.muscle_mass_kg != null && latest.muscle_mass_kg != null ? Math.round((latest.muscle_mass_kg - first.muscle_mass_kg) * 10) / 10 : null;
  const dVf = first.visceral_fat != null && latest.visceral_fat != null ? Math.round((latest.visceral_fat - first.visceral_fat) * 10) / 10 : null;

  const colorFor = (d: number | null, lowerIsBetter: boolean) => d == null || d === 0 ? '#475569' : (lowerIsBetter ? d < 0 : d > 0) ? '#16a34a' : '#dc2626';

  const stats = [
    dWeight != null ? stat('Weight', `${signed(dWeight)} kg`, colorFor(dWeight, true)) : '',
    dFat != null ? stat('Body fat', `${signed(dFat)}%`, colorFor(dFat, true)) : '',
    dMuscle != null ? stat('Muscle', `${signed(dMuscle)} kg`, colorFor(dMuscle, false)) : '',
    dVf != null ? stat('Visceral fat', `${signed(dVf)}`, colorFor(dVf, true)) : '',
  ].join('');

  const weightPoints = rows.map(r => ({ v: r.weight_kg, at: r.measured_at })).filter(p => p.v != null) as { v: number; at: string }[];
  const fatPoints = rows.map(r => ({ v: r.body_fat_pct as number, at: r.measured_at })).filter(p => p.v != null);

  const byMonth = new Map<string, Measurement>();
  for (const r of rows) {
    const key = `${new Date(r.measured_at).getFullYear()}-${new Date(r.measured_at).getMonth()}`;
    byMonth.set(key, r);
  }
  const monthly = [...byMonth.values()].sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()).slice(-12);

  const digestRows = monthly.map(r => `
    <tr>
      <td>${monthLabel(r.measured_at)}</td>
      <td>${fmt(r.weight_kg)}</td>
      <td>${fmt(r.body_fat_pct, '%')}</td>
      <td>${fmt(r.muscle_mass_kg)}</td>
      <td>${fmt(r.visceral_fat)}</td>
    </tr>`).join('');

  return `
  <div class="section" style="page-break-before: always;">
    <div class="section-title">Progress Summary <span class="muted" style="font-weight:400;text-transform:none;letter-spacing:0">· ${rows.length} readings ${humanSpan(first.measured_at, latest.measured_at)}</span></div>
    <div class="journey-stats">${stats}</div>
    <div class="charts">
      <div class="chart-box">
        <div class="chart-title">Weight trend</div>
        ${svgTrendChart('w', weightPoints, '#16a34a', '')}
      </div>
      <div class="chart-box">
        <div class="chart-title">Body fat trend</div>
        ${svgTrendChart('f', fatPoints, '#0ea5e9', '%')}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Monthly Digest</div>
    <table class="digest">
      <thead><tr><th>Month</th><th>Weight</th><th>Body fat</th><th>Muscle</th><th>VF</th></tr></thead>
      <tbody>${digestRows}</tbody>
    </table>
  </div>`;
}

function buildFooter(): string {
  return `
  <div class="footer">
    Body-composition values are measured by the center's analyzer. BMI is calculated from weight and height.
    Reference ranges are general wellness guidelines; they are not a medical diagnosis. Consult a qualified healthcare professional for personal medical advice.
  </div>`;
}

// ============================================================================
//  CSS
// ============================================================================

const CSS = `
  * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { color: #0f172a; margin: 0; padding: 24px 28px; background: #fff; font-size: 12px; line-height: 1.4; }
  
  .brand { display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 2px solid #0f172a; }
  .brand-mark { color: #16a34a; font-weight: 900; letter-spacing: 2px; font-size: 11px; }
  .brand-type { padding: 3px 8px; border-radius: 999px; font-size: 8px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
  .type-current { background: #dbeafe; color: #1e40af; }
  .type-overall { background: #dcfce7; color: #166534; }

  .hero { display: flex; justify-content: space-between; align-items: flex-end; margin: 12px 0 16px; }
  .hero-name { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.1; }
  .hero-meta { color: #64748b; font-size: 11px; margin-top: 4px; font-weight: 600; }
  .hero-right { text-align: right; }
  .hero-date { font-size: 12px; font-weight: 700; color: #0f172a; }
  .hero-join { color: #94a3b8; font-size: 10px; margin-top: 2px; }

  .section { margin: 16px 0; page-break-inside: avoid; }
  .section-title { display: flex; align-items: center; font-size: 10px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; color: #0f172a; margin-bottom: 8px; }
  .section-title::before { content: ''; width: 4px; height: 12px; background: #16a34a; border-radius: 2px; margin-right: 6px; }
  .muted { color: #64748b; }

  /* Metric Cards */
  .snapshot { display: flex; flex-wrap: wrap; gap: 8px; }
  .mcard { flex: 1 1 calc(25% - 6px); min-width: 120px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; page-break-inside: avoid; }
  .mcard-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; }
  .mcard-value { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 4px; line-height: 1; letter-spacing: -0.5px; }
  .mcard-unit { font-size: 10px; font-weight: 700; color: #64748b; margin-left: 3px; }
  .mcard-pill { margin-top: 4px; height: 16px; }
  .mcard-delta { display: block; font-size: 10px; font-weight: 800; margin-top: 4px; }
  .pill { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: 800; text-transform: uppercase; }

  /* Reference Tables */
  .tables-row { display: flex; gap: 12px; align-items: flex-start; }
  .ref-table { border-collapse: collapse; font-size: 9px; line-height: 1.3; flex: 1; }
  .ref-table th, .ref-table td { border: 1px solid #94a3b8; padding: 4px 6px; vertical-align: middle; }
  .ref-table th { background: #f1f5f9; font-weight: 800; text-transform: uppercase; text-align: left; font-size: 8px; }
  .bmi-table { flex: 1.4; }
  .bmi-table td:nth-child(1) { text-align: center; width: 50px; }
  .bmi-table td:nth-child(2) { font-weight: 700; width: 80px; }
  .comp-table { flex: 1; text-align: center; }
  .comp-table td:nth-child(1) { text-align: left; font-weight: 700; width: 80px; }
  .comp-table td b { color: #16a34a; }

  /* Overall report specific */
  .journey-stats { display: flex; gap: 8px; margin-bottom: 12px; }
  .jstat { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center; }
  .jstat-label { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #64748b; }
  .jstat-value { font-size: 18px; font-weight: 800; margin-top: 2px; letter-spacing: -0.5px; }

  .charts { display: flex; gap: 10px; }
  .chart-box { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; }
  .chart-title { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #64748b; }

  .digest { width: 100%; border-collapse: collapse; font-size: 10px; text-align: right; }
  .digest th { background: #f1f5f9; padding: 6px; text-transform: uppercase; font-size: 8px; color: #475569; border-bottom: 2px solid #cbd5e1; }
  .digest th:first-child, .digest td:first-child { text-align: left; font-weight: 700; }
  .digest td { padding: 6px; border-bottom: 1px solid #e2e8f0; }

  .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 8px; color: #94a3b8; line-height: 1.5; text-align: justify; }
`;

// ============================================================================
//  Entry point
// ============================================================================

export function buildReportHtml(member: Member, rows: Measurement[], options: ReportOptions = {}): string {
  const mode: ReportMode = options.mode ?? 'current';
  const ordered = [...rows].sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime());
  const latest = ordered[ordered.length - 1];

  if (!latest) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>${CSS}</style></head><body>${buildHeader(member, mode)}<p class="muted">No readings yet.</p></body></html>`;
  }

  const first = ordered[0];
  const prev = ordered.length >= 2 ? ordered[ordered.length - 2] : null;

  const body = mode === 'overall'
    ? `
      ${buildHeader(member, mode)}
      ${buildSnapshot(latest, first, 'change since first reading')}
      ${buildAdvisory()}
      ${buildJourney(member, ordered)}
      ${buildFooter()}`
    : `
      ${buildHeader(member, mode)}
      ${buildSnapshot(latest, prev, prev ? 'change since previous' : '')}
      ${buildAdvisory()}
      ${buildFooter()}`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>${CSS}</style></head><body>${body}</body></html>`;
}