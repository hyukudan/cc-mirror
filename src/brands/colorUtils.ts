/**
 * Color utilities for brand themes
 * Extracted to avoid duplication across brand files
 */

export type Rgb = { r: number; g: number; b: number };

export const clamp = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));

export const hexToRgb = (hex: string): Rgb => {
  const normalized = hex.replace('#', '').trim();
  if (normalized.length === 3) {
    const [r, g, b] = normalized.split('');
    return {
      r: clamp(parseInt(r + r, 16)),
      g: clamp(parseInt(g + g, 16)),
      b: clamp(parseInt(b + b, 16)),
    };
  }
  if (normalized.length !== 6) {
    throw new Error(`Unsupported hex color: ${hex}`);
  }
  return {
    r: clamp(parseInt(normalized.slice(0, 2), 16)),
    g: clamp(parseInt(normalized.slice(2, 4), 16)),
    b: clamp(parseInt(normalized.slice(4, 6), 16)),
  };
};

export const rgb = (hex: string): string => {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${r},${g},${b})`;
};

export const mix = (hexA: string, hexB: string, weight: number): string => {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const w = Math.max(0, Math.min(1, weight));
  return `rgb(${clamp(a.r + (b.r - a.r) * w)},${clamp(a.g + (b.g - a.g) * w)},${clamp(a.b + (b.b - a.b) * w)})`;
};

export const lighten = (hex: string, weight: number): string => mix(hex, '#ffffff', weight);

export const darken = (hex: string, weight: number): string => mix(hex, '#000000', weight);
