/**
 * Calculate a contrasting foreground color for QR codes based on background color.
 * Uses luminance calculation to ensure good readability for all cameras.
 * 
 * @param backgroundColor - The background color in hex format (e.g., '#ffffff')
 * @returns The contrasting foreground color in hex format ('#000000' or '#ffffff')
 */
export function getContrastingColor(backgroundColor: string): string {
  // Default to white if no background color is provided
  if (!backgroundColor) {
    return '#000000';
  }

  // Normalize the color format
  const hex = backgroundColor.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate relative luminance using WCAG formula
  // This formula accounts for human eye sensitivity to different colors
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for light backgrounds, white for dark backgrounds
  // This ensures maximum contrast for QR code readability
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Check if a color is light or dark
 * 
 * @param color - The color in hex format
 * @returns true if the color is light, false if dark
 */
export function isLightColor(color: string): boolean {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

