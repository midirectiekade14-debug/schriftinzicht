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
