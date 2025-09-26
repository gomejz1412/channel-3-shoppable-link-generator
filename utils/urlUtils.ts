export function parseUrls(input: string): string[] {
  if (!input) return [];
  // Normalize separators: treat commas as newlines, then split on any whitespace
  const tokens = input.replace(/,/g, "\n").split(/\s+/).map(s => s.trim()).filter(Boolean);

  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of tokens) {
    try {
      const url = new URL(raw);
      if (url.protocol === "http:" || url.protocol === "https:") {
        const normalized = url.toString();
        if (!seen.has(normalized)) {
          seen.add(normalized);
          result.push(normalized);
        }
      }
    } catch {
      // Ignore invalid URLs
    }
  }

  return result;
}
