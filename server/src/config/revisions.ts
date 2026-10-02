import { query } from './db.js';

const MAX_REVISIONS = 40;

export function revisionSummary(previous: string, next: string): string {
  const before = previous.split('\n');
  const after = next.split('\n');
  const limit = Math.max(before.length, after.length);
  for (let i = 0; i < limit; i++) {
    if (before[i] === after[i]) continue;
    const added = (after[i] ?? '').trim();
    if (added) return added.slice(0, 80);
    const removed = (before[i] ?? '').trim();
    if (removed) return `Removed: ${removed.slice(0, 70)}`;
  }
  return 'Edited file';
}

export async function recordFileRevision(fileId: string, previous: string, next: string) {
  if (previous === next) return;
  await query(
    `INSERT INTO file_revisions (file_id, previous_content, content, summary)
     VALUES ($1, $2, $3, $4)`,
    [fileId, previous, next, revisionSummary(previous, next)]
  );
  await query(
    `DELETE FROM file_revisions
     WHERE file_id = $1
       AND id NOT IN (
         SELECT id FROM file_revisions
         WHERE file_id = $1
         ORDER BY created_at DESC
         LIMIT $2
       )`,
    [fileId, MAX_REVISIONS]
  );
}
