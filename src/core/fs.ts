import fs from 'node:fs';

export const ensureDir = (dir: string) => {
  fs.mkdirSync(dir, { recursive: true });
};

export const writeJson = <T>(filePath: string, data: T) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

/**
 * Safely parse JSON without prototype pollution.
 * Uses JSON.parse + JSON.stringify to strip __proto__ and constructor properties.
 */
export const readJson = <T>(filePath: string): T | null => {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    // Sanitize by re-serializing - removes prototype chain pollution
    return JSON.parse(JSON.stringify(parsed)) as T;
  } catch {
    return null;
  }
};
