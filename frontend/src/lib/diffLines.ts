export type DiffRow =
  | { kind: "context"; text: string; oldNo: number; newNo: number }
  | { kind: "del"; text: string; oldNo: number }
  | { kind: "add"; text: string; newNo: number }
  | { kind: "gap" };

type Change = { kind: "eq" | "del" | "add"; text: string };

function pushChange(changes: Change[], kind: Change["kind"], text: string) {
  changes.push({ kind, text });
}

function diffByScan(before: string[], after: string[]): Change[] {
  const changes: Change[] = [];
  let i = 0;
  let j = 0;
  while (i < before.length && j < after.length) {
    if (before[i] === after[j]) {
      pushChange(changes, "eq", before[i]);
      i += 1;
      j += 1;
      continue;
    }

    let addedAt = -1;
    for (let k = 1; k <= 50 && j + k < after.length; k++) {
      if (before[i] === after[j + k]) {
        addedAt = k;
        break;
      }
    }
    if (addedAt > 0) {
      for (let k = 0; k < addedAt; k++) pushChange(changes, "add", after[j + k]);
      j += addedAt;
      continue;
    }

    let removedAt = -1;
    for (let k = 1; k <= 50 && i + k < before.length; k++) {
      if (before[i + k] === after[j]) {
        removedAt = k;
        break;
      }
    }
    if (removedAt > 0) {
      for (let k = 0; k < removedAt; k++) pushChange(changes, "del", before[i + k]);
      i += removedAt;
      continue;
    }

    pushChange(changes, "del", before[i]);
    pushChange(changes, "add", after[j]);
    i += 1;
    j += 1;
  }
  while (i < before.length) pushChange(changes, "del", before[i++]);
  while (j < after.length) pushChange(changes, "add", after[j++]);
  return changes;
}

function diffByLcs(before: string[], after: string[]): Change[] {
  const n = before.length;
  const m = after.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = before[i] === after[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const changes: Change[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (before[i] === after[j]) {
      pushChange(changes, "eq", before[i]);
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      pushChange(changes, "del", before[i]);
      i += 1;
    } else {
      pushChange(changes, "add", after[j]);
      j += 1;
    }
  }
  while (i < n) pushChange(changes, "del", before[i++]);
  while (j < m) pushChange(changes, "add", after[j++]);
  return changes;
}

function withContext(changes: Change[], context: number): DiffRow[] {
  const numbered: DiffRow[] = [];
  let oldNo = 1;
  let newNo = 1;
  for (const change of changes) {
    if (change.kind === "eq") {
      numbered.push({ kind: "context", text: change.text, oldNo, newNo });
      oldNo += 1;
      newNo += 1;
    } else if (change.kind === "del") {
      numbered.push({ kind: "del", text: change.text, oldNo });
      oldNo += 1;
    } else {
      numbered.push({ kind: "add", text: change.text, newNo });
      newNo += 1;
    }
  }

  const changed = numbered.map((row) => row.kind !== "context");
  const keep = changed.map((isChange, index) => {
    if (isChange) return true;
    for (let distance = 1; distance <= context; distance++) {
      if (changed[index - distance] || changed[index + distance]) return true;
    }
    return false;
  });

  const rows: DiffRow[] = [];
  let skipping = false;
  keep.forEach((visible, index) => {
    if (!visible) {
      skipping = true;
      return;
    }
    if (skipping) {
      rows.push({ kind: "gap" });
      skipping = false;
    }
    rows.push(numbered[index]);
  });
  return rows;
}

export function diffLines(before: string, after: string, context = 2): DiffRow[] {
  if (before === after) return [];
  const a = before.split("\n");
  const b = after.split("\n");
  const changes = a.length * b.length > 250000 ? diffByScan(a, b) : diffByLcs(a, b);
  return withContext(changes, context);
}

export function changedNewLines(rows: DiffRow[]): number[] {
  const lines: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.kind === "add") lines.push(row.newNo);
    if (row.kind === "del") {
      const next = rows.slice(i + 1).find((item) => item.kind === "add" || item.kind === "context");
      if (next) lines.push(next.newNo);
    }
  }
  return [...new Set(lines)];
}

export function rangesForLines(after: string, live: string, lineNumbers: number[]) {
  const afterLines = after.split("\n");
  const sameDoc = live === after;
  const ranges: { from: number; to: number }[] = [];

  for (const lineNo of lineNumbers) {
    const text = afterLines[lineNo - 1] ?? "";
    if (sameDoc) {
      let offset = 0;
      for (let i = 0; i < lineNo - 1 && i < afterLines.length; i++) {
        offset += afterLines[i].length + 1;
      }
      ranges.push({ from: offset, to: offset + text.length });
      continue;
    }
    if (!text.trim()) continue;
    const idx = live.indexOf(text);
    if (idx === -1) continue;
    ranges.push({ from: idx, to: idx + text.length });
  }

  return ranges;
}
