// One pure model drives the readout, the aria text, the caption numbers and every moving part.
//
// MEASURED (Gongtian F95D teardown, blog.zeruns.top, 2026-08, oscilloscope + laser tachometer):
//   speed level   1      2      3      4
//   PWM duty      35.7%  50.6%  70.6%  100%     (19.9 kHz on the motor's low side)
//   speed         1565   2541   3613   4695 RPM
//   label         8 W max fan power, 5000 mAh 21700 cell (3.6 V, 18 Wh)
// MODELLED (not measured):
//   power ~ speed^3 (fan affinity laws, constant efficiency), anchored at the 8 W label.
//   airflow ~ speed (affinity laws), shown as a share of level 4, never as CFM.
//   runtime = usable energy / (fan power + overhead).

export const LEVELS = [
  { level: 1, duty: 0.357, rpm: 1565 },
  { level: 2, duty: 0.506, rpm: 2541 },
  { level: 3, duty: 0.706, rpm: 3613 },
  { level: 4, duty: 1.0, rpm: 4695 },
];

export const CELL = { volts: 3.6, wh: 18, mah: 5000 };
export const MAX_POWER = 8; // W, printed on the label
export const OVERHEAD = 0.5; // W: MCU, LEDs, regulator (assumed)
export const EFFICIENCY = 0.9; // battery to motor (assumed)
export const SLOW_MOTION = 30; // the drawing spins at 1/30 of real speed
export const VANE_K = 1.19; // vane lean at level 4 is atan(1.19) = 50 degrees; the lean follows pressure, which scales with speed squared

const TOP = LEVELS[LEVELS.length - 1].rpm;

export function stateOf(level) {
  const row = LEVELS[Math.min(LEVELS.length, Math.max(1, level)) - 1];
  const ratio = row.rpm / TOP;
  const fanWatts = MAX_POWER * ratio ** 3;
  const watts = fanWatts + OVERHEAD;
  return {
    level: row.level,
    rpm: row.rpm,
    duty: row.duty,
    revPerSecond: row.rpm / 60,
    airflow: ratio, // share of level 4
    vaneDeg: (Math.atan(VANE_K * ratio ** 2) * 180) / Math.PI, // modelled: pressure ~ speed^2
    fanWatts,
    watts,
    amps: watts / (CELL.volts * EFFICIENCY),
    hours: (CELL.wh * EFFICIENCY) / watts,
  };
}

export const readoutOf = (s) =>
  `L${s.level} · ${s.rpm} RPM · duty ${Math.round(s.duty * 100)}% · ${s.fanWatts.toFixed(1)} W · ~${s.hours.toFixed(1)} h`;
