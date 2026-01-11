const INVALID_NAME_CHARS = /[<>:"/\\|?*]/;

const hasControlChars = (value: string): boolean => {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 32 || code === 127) return true;
  }
  return false;
};

const ENV_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export const isValidEnvKey = (key: string): boolean => ENV_KEY_PATTERN.test(key);
const WINDOWS_RESERVED_NAMES = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
]);

export const assertValidVariantName = (name: string): string => {
  if (!name || !name.trim()) {
    throw new Error('Variant name is required.');
  }
  if (name.trim() !== name) {
    throw new Error('Variant name must not include leading or trailing whitespace.');
  }
  if (name === '.' || name === '..') {
    throw new Error('Variant name must not be "." or "..".');
  }
  if (name.endsWith('.') || name.endsWith(' ')) {
    throw new Error('Variant name must not end with a dot or space.');
  }
  if (INVALID_NAME_CHARS.test(name) || hasControlChars(name)) {
    throw new Error('Variant name contains invalid characters.');
  }
  if (WINDOWS_RESERVED_NAMES.has(name.toUpperCase())) {
    throw new Error('Variant name is reserved on Windows.');
  }
  return name;
};

export const assertValidTeamName = (name: string): string => {
  if (!name || !name.trim()) {
    throw new Error('Team name is required.');
  }
  if (name.trim() !== name) {
    throw new Error('Team name must not include leading or trailing whitespace.');
  }
  if (name === '.' || name === '..') {
    throw new Error('Team name must not be "." or "..".');
  }
  if (name.endsWith('.') || name.endsWith(' ')) {
    throw new Error('Team name must not end with a dot or space.');
  }
  if (INVALID_NAME_CHARS.test(name) || hasControlChars(name)) {
    throw new Error('Team name contains invalid characters.');
  }
  if (WINDOWS_RESERVED_NAMES.has(name.toUpperCase())) {
    throw new Error('Team name is reserved on Windows.');
  }
  return name;
};
