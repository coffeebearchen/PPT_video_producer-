import fs from 'node:fs';

const themes = {
  archive: { bg: '#F3EDE1', fg: '#101112', muted: '#5F594D' },
  terminal: { bg: '#101112', fg: '#F2EBDD', muted: '#BDB8AC' },
  editorial: { bg: '#C73520', fg: '#F6F1E7', muted: '#F1C9BC' },
  noir: { bg: '#0B0B0B', fg: '#FFD23F', muted: '#C9A227' },
  earth: { bg: '#20362C', fg: '#F2EBDD', muted: '#B7B09F' }
};
const lum = (hex) => {
  const rgb = hex.replace('#', '').match(/../g).map(x => parseInt(x, 16) / 255)
    .map(v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4));
  return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
};
const ratio = (a, b) => {
  const x = lum(a), y = lum(b);
  return Number(((Math.max(x, y) + .05) / (Math.min(x, y) + .05)).toFixed(2));
};
const rows = Object.entries(themes).map(([name, c]) => ({
  theme: name,
  bg: c.bg,
  fg: c.fg,
  fg_ratio: ratio(c.fg, c.bg),
  muted: c.muted,
  muted_ratio: ratio(c.muted, c.bg),
  pass_fg: ratio(c.fg, c.bg) >= 4.5,
  pass_muted: ratio(c.muted, c.bg) >= 3
}));
const failures = rows.filter(r => !r.pass_fg || !r.pass_muted);
const report = { generated_at: new Date().toISOString(), rows, failures };
console.log(JSON.stringify(report, null, 2));
fs.writeFileSync('data/contrast-check.json', JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
