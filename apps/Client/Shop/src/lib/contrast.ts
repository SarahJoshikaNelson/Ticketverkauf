/**
 * Parse a CSS color string (hex, rgb, or named) to r,g,b 0-255. Returns null if unparseable.
 */
function parseColorToRgb(color: string): { r: number; g: number; b: number } | null {
  const trimmed = color.trim().toLowerCase();
  if (trimmed === 'white') return { r: 255, g: 255, b: 255 };
  if (trimmed === 'black') return { r: 0, g: 0, b: 0 };
  const hex = color.trim();
  if (/^#([0-9A-Fa-f]{3}){1,2}$/.test(hex)) {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else {
      r = parseInt(hex.slice(1, 3), 16);
      g = parseInt(hex.slice(3, 5), 16);
      b = parseInt(hex.slice(5, 7), 16);
    }
    return { r, g, b };
  }
  const rgb = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) {
    return { r: +rgb[1], g: +rgb[2], b: +rgb[3] };
  }
  return null;
}

/**
 * Relative luminance (0 = black, 1 = white). Used to choose contrasting text.
 */
function luminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** High-contrast text color for use on the given background. Never white-on-white or black-on-black. */
const DARK_TEXT = '#0f172a';
const LIGHT_TEXT = '#f1f5f9';

export function getContrastingTextColor(backgroundColor: string): string {
  const rgb = parseColorToRgb(backgroundColor);
  if (!rgb) return DARK_TEXT;
  const L = luminance(rgb.r, rgb.g, rgb.b);
  return L > 0.45 ? DARK_TEXT : LIGHT_TEXT;
}

/** Ensure foreground is never same as background (avoids invisible text). */
export function ensureContrast(
  background: string,
  requestedForeground: string
): string {
  const bgRgb = parseColorToRgb(background);
  const fgRgb = parseColorToRgb(requestedForeground);
  if (!bgRgb || !fgRgb) return requestedForeground;
  const lb = luminance(bgRgb.r, bgRgb.g, bgRgb.b);
  const lf = luminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const diff = Math.abs(lb - lf);
  if (diff < 0.2) return getContrastingTextColor(background);
  return requestedForeground;
}
