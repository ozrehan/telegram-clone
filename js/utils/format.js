/* ================= utils/format.js — time & text formatting ================= */
'use strict';
window.App = window.App || {};
App.utils = App.utils || {};

const _pad = n => String(n).padStart(2, '0');

/** current time as "HH:MM" */
App.utils.nowTime = () => {
  const d = new Date();
  return _pad(d.getHours()) + ':' + _pad(d.getMinutes());
};

/**
 * Format seconds as m:ss for voice durations / recorder timer.
 */
App.utils.fmtDur = s => Math.floor(s / 60) + ':' + _pad(Math.floor(s % 60));

/**
 * Compact count formatting: 1200 -> "1.2K", 45000 -> "45K".
 */
App.utils.compact = n => {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace('.0', '') + 'K';
  return String(n);
};

/** human file size: 1536 -> "1.5 KB" */
App.utils.fmtSize = b => {
  if (b >= 1048576) return (b / 1048576).toFixed(1) + ' MB';
  if (b >= 1024) return Math.round(b / 1024) + ' KB';
  return b + ' B';
};

/** deterministic pseudo-random from a string seed (for waveforms etc.) */
App.utils.seeded = str => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h = Math.imul(h ^ (h >>> 13), 16777619); return ((h >>> 0) % 1000) / 1000; };
};
