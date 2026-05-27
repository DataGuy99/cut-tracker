const PREFIX = "ct_";

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error("Storage save failed:", e);
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {}
}

export function exportAll(keys) {
  const data = {};
  keys.forEach(k => {
    try {
      const raw = localStorage.getItem(PREFIX + k);
      if (raw !== null) data[k] = JSON.parse(raw);
    } catch {}
  });
  return data;
}

export function importAll(data) {
  Object.entries(data).forEach(([k, v]) => {
    save(k, v);
  });
}

export function clearAll(keys) {
  keys.forEach(k => remove(k));
}

export const ALL_KEYS = [
  "targets", "tdee", "food", "work", "favs",
  "custom", "weight", "blocked", "apikey",
  "user_wt", "user_age",
];
