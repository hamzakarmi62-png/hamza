export const PALETTE = [
  "#2563eb",
  "#059669",
  "#dc2626",
  "#d97706",
  "#7c3aed",
  "#0d9488",
  "#db2777",
  "#65a30d",
];

export function nextColor(count) {
  return PALETTE[count % PALETTE.length];
}

export function formatTime(seconds) {
  if (seconds == null || isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${String(m).padStart(2, "0")}:${s.toFixed(1).padStart(4, "0")}`;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function uid() {
  return `s${Date.now().toString(36)}`;
}