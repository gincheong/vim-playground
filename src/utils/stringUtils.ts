import type { Position } from '../types';

export const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

export const getLineLength = (lines: string[], lineIndex: number): number => {
  if (lineIndex < 0 || lineIndex >= lines.length) return 0;
  return lines[lineIndex].length;
};

export function getRange(p1: Position, p2: Position): { start: Position; end: Position } {
  if (p1.line < p2.line || (p1.line === p2.line && p1.col <= p2.col)) {
    return { start: p1, end: p2 };
  }
  return { start: p2, end: p1 };
}
