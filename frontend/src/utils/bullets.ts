const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/**
 * Splits free text into bullet points so it reads faster, or returns null when it does not split cleanly.
 * Line breaks, semicolons and sentence ends start a new point. A single sentence that is a list of three or
 * more comma-separated items becomes one point per item.
 */
export const toBullets = (text?: string | null): string[] | null => {
  const source = (text || '').trim();
  if (!source) {
    return null;
  }

  let parts = source
    .split(/\n+|;\s+/)
    .flatMap((part) => part.split(/\.\s+(?=[A-Z])/))
    .map((part) => part.trim().replace(/\.$/, ''))
    .filter(Boolean);

  if (parts.length < 2) {
    const items = (parts[0] || '')
      .split(/,\s+(?:and\s+)?/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (items.length >= 3) {
      parts = items.map(capitalize);
    }
  }

  return parts.length >= 2 ? parts : null;
};
