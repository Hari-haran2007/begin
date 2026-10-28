/**
 * Utility functions for formatting names and text
 */

export function formatDisplayName(name?: any, fallback: string = 'User'): string {
  if (!name || typeof name !== 'string') {
    return fallback;
  }

  let trimmed = name.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null' || trimmed === '[object Object]') {
    return fallback;
  }

  // Handle email strings if mistakenly stored/passed as names
  if (trimmed.includes('@')) {
    // If it's a staff internal email like "hariharan2007@gmail.com@staff.beyondgrades.internal"
    const cleaned = trimmed.split('@')[0].trim();
    if (!cleaned) return fallback;
    trimmed = cleaned;
  }

  // If the name is completely lowercase, capitalize each word for proper display
  if (trimmed === trimmed.toLowerCase()) {
    return trimmed
      .split(/\s+/)
      .map(word => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
      .join(' ');
  }

  return trimmed;
}
