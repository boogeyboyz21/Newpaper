// Anonymous metered access: 3 free articles per calendar month.
const LIMIT = 3;

function monthKey() {
  const d = new Date();
  return `ew_meter_${d.getFullYear()}_${d.getMonth()}`;
}

function read() {
  try {
    return JSON.parse(localStorage.getItem(monthKey()) || "[]");
  } catch {
    return [];
  }
}

export function getMeterCount() {
  return read().length;
}

export function remainingFree() {
  return Math.max(0, LIMIT - read().length);
}

export function recordRead(articleId) {
  const list = read();
  if (!list.includes(articleId)) {
    list.push(articleId);
    localStorage.setItem(monthKey(), JSON.stringify(list));
  }
  return list.length;
}

export function hasHitLimit(articleId) {
  const list = read();
  if (list.includes(articleId)) return false; // already counted, still readable
  return list.length >= LIMIT;
}

export function resetMeter() {
  localStorage.setItem(monthKey(), JSON.stringify([]));
}

export const FREE_LIMIT = LIMIT;
