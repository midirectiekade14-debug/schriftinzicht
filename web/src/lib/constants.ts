import type { Commentary } from '../types/database';

export const ERA_COLORS_HEX: Record<string, string> = {
  'Kerkvaders': '#8B6840',
  'Reformatie': '#A85A3D',
  'Nadere Reformatie': '#C4956A',
  'Puriteinse periode': '#6B7B5A',
  'Puriteins': '#6B7B5A',
  '18e eeuw': '#5A8A8B',
  '19e eeuw': '#7A6B8B',
  'Modern': '#8B8680',
};

export const ERA_COLORS = ERA_COLORS_HEX;

export type CommentaryWithAuthor = Commentary;

/**
 * Dedupliceert verklaringen per author+verse, waarbij 'verse'-scope
 * voorrang krijgt op andere scopes (bijv. 'passage' of 'book').
 */
export function dedupeCommentariesByAuthorVerse(
  rows: CommentaryWithAuthor[]
): CommentaryWithAuthor[] {
  const seen = new Map<string, CommentaryWithAuthor>();
  for (const c of rows) {
    const key = `${c.author_id}-${c.verse_id}`;
    const existing = seen.get(key);
    if (!existing || (c.scope === 'verse' && existing.scope !== 'verse')) {
      seen.set(key, c);
    }
  }
  return Array.from(seen.values());
}
