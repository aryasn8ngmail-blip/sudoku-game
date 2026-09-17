// js/storage.js - Safe localStorage wrapper with key prefixing and error handling

const PREFIX = 'sudoku.';

function formatKey(key) {
  if (key.startsWith(PREFIX)) {
    return key;
  }
  return PREFIX + key;
}

export function safeGet(key, fallback = null) {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const fullKey = formatKey(key);
    const item = localStorage.getItem(fullKey);
    if (item === null) return fallback;
    return JSON.parse(item);
  } catch (err) {
    console.warn(`[storage] Error reading key "${key}":`, err);
    return fallback;
  }
}

export function safeSet(key, value) {
  try {
    if (typeof localStorage === 'undefined') return false;
    const fullKey = formatKey(key);
    const serialized = JSON.stringify(value);
    localStorage.setItem(fullKey, serialized);
    return true;
  } catch (err) {
    console.warn(`[storage] Error writing key "${key}":`, err);
    return false;
  }
}

export function safeRemove(key) {
  try {
    if (typeof localStorage === 'undefined') return false;
    const fullKey = formatKey(key);
    localStorage.removeItem(fullKey);
    return true;
  } catch (err) {
    console.warn(`[storage] Error removing key "${key}":`, err);
    return false;
  }
}
