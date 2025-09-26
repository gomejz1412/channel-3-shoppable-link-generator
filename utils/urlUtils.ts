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
 * Normalize pasted bulk input: decode encoded newlines and unify separators.
 */
export function normalizeBulkInput(input: string): string {
  if (!input) return "";
  let s = input;
  // Decode common percent-encoded newlines from mobile copy/paste
  s = s.replace(/%0D%0A/gi, "\n").replace(/%0A/gi, "\n").replace(/%0D/gi, "\n");
  // Normalize commas to newlines to keep one URL per line
  s = s.replace(/,/g, "\n");
  // Collapse excessive blank lines
  s = s.replace(/\n{2,}/g, "\n");
  return s;
}

/**
 * Parse a multiline string that may contain lines in either form:
 *  - "Label | https://example.com/product/123"
 *  - "https://example.com/product/123"
 * Also accepts comma-separated values; trims whitespace.
 */
export function parseLabeledLines(input: string): LabeledItem[] {
  if (!input) return [];
  const normalized = normalizeBulkInput(input);
  const lines = normalized
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const items: LabeledItem[] = [];

  for (const rawLine of lines) {
    let line = rawLine;
    let manualLabel: string | undefined;

    // Optional "Label | URL" support
    const pipeIdx = line.indexOf("|");
    if (pipeIdx !== -1) {
      manualLabel = line.slice(0, pipeIdx).trim();
      line = line.slice(pipeIdx + 1).trim();
    }

    // Extract ALL URLs present on the line (handles glued http(s) tokens)
    const matches = line.match(/https?:\/\/[^\s]+/gi) || [];
    for (const link of matches) {
      try {
        const url = new URL(link);
        if (url.protocol !== "http:" && url.protocol !== "https:") continue;
        const norm = url.toString();
        if (!seen.has(norm)) {
          seen.add(norm);
          items.push({ url: norm, label: manualLabel || undefined });
        }
      } catch {
        // ignore malformed urls
      }
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
