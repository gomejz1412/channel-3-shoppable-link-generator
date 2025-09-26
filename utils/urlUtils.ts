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

// Labeled URL support --------------------------------------------------------

export type LabeledItem = { url: string; label?: string };

/**
 * Parse a multiline string that may contain lines in either form:
 *  - "Label | https://example.com/product/123"
 *  - "https://example.com/product/123"
 * Also accepts comma-separated values; trims whitespace.
 */
export function parseLabeledLines(input: string): LabeledItem[] {
  if (!input) return [];
  // First split by newlines, then further split comma-separated entries
  const lines = input
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
    .flatMap(l => l.split(","))
    .map(l => l.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const items: LabeledItem[] = [];

  for (const line of lines) {
    let label: string | undefined;
    let link = line;

    // If the line contains a pipe, split once into label | url
    const pipeIdx = line.indexOf("|");
    if (pipeIdx !== -1) {
      label = line.slice(0, pipeIdx).trim();
      link = line.slice(pipeIdx + 1).trim();
    }

    // Validate URL
    try {
      const url = new URL(link);
      if (url.protocol !== "http:" && url.protocol !== "https:") continue;
      const normalized = url.toString();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        items.push({ url: normalized, label: label || undefined });
      }
    } catch {
      // ignore non-URLs
    }
  }
  return items;
}

/**
 * Create a reasonable human-friendly label from a URL if no label was provided.
 * Uses the last path segment if present, otherwise the domain.
 */
export function inferLabelFromUrl(u: string): string {
  try {
    const url = new URL(u);
    const parts = url.pathname.split("/").filter(Boolean);
    let base = parts.length > 0 ? parts[parts.length - 1] : url.hostname;

    // Remove query/hash, decode, replace separators with spaces
    try {
      base = decodeURIComponent(base);
    } catch {}
    base = base.replace(/[_-]+/g, " ").trim();

    // Title-case basic
    const titled = base
      .split(/\s+/)
      .map(w => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");

    return titled || url.hostname;
  } catch {
    return u;
  }
}

/**
 * Format labeled items back into "Label | URL" per line.
 * If no label is present, we still include the URL alone.
 */
export function formatLabeledLines(items: LabeledItem[]): string {
  return items
    .map(it => (it.label ? `${it.label} | ${it.url}` : it.url))
    .join("\n");
}
