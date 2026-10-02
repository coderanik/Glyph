export type TextMatch = {
  fileId: string;
  fileName: string;
  from: number;
  to: number;
  line: number;
  before: string;
  match: string;
  after: string;
};

export function findTextMatches(
  files: { id: string; name: string; content?: string }[],
  query: string,
  limit = 80,
): TextMatch[] {
  const needle = query.trim();
  if (!needle) return [];

  const q = needle.toLowerCase();
  const matches: TextMatch[] = [];

  for (const file of files) {
    const content = file.content || "";
    const lower = content.toLowerCase();
    let start = 0;

    while (matches.length < limit) {
      const idx = lower.indexOf(q, start);
      if (idx === -1) break;

      const lineStart = content.lastIndexOf("\n", idx - 1) + 1;
      const lineEndIdx = content.indexOf("\n", idx);
      const lineEnd = lineEndIdx === -1 ? content.length : lineEndIdx;
      const lineText = content.slice(lineStart, lineEnd);
      const col = idx - lineStart;
      const windowStart = Math.max(0, col - 24);
      const windowEnd = Math.min(lineText.length, col + needle.length + 24);

      matches.push({
        fileId: file.id,
        fileName: file.name,
        from: idx,
        to: idx + needle.length,
        line: content.slice(0, idx).split("\n").length,
        before: lineText.slice(windowStart, col),
        match: lineText.slice(col, col + needle.length),
        after: lineText.slice(col + needle.length, windowEnd),
      });

      start = idx + Math.max(needle.length, 1);
    }

    if (matches.length >= limit) break;
  }

  return matches;
}
