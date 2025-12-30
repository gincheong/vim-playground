import { type VimState } from '../../../types';
import { clamp, getLineLength } from '../../../utils/stringUtils';

// 커서 위치를 유효한 범위(현재 라인 길이 내)로 제한하는 헬퍼 함수
export const clampCursor = (state: VimState, cursor = state.cursor) => {
  const line = clamp(cursor.line, 0, Math.max(0, state.lines.length - 1));
  const len = getLineLength(state.lines, line);
  const maxCol = Math.max(0, len - 1);
  const col = clamp(cursor.col, 0, maxCol);
  return { line, col };
};

