import { type VimState, Mode } from '../../../types';
import { clamp, getLineLength } from '../../../utils/stringUtils';
import { getNextWordStartSimple, getPrevWordStart, getNextWordEnd } from '../../../utils/vimUtils';
import { clampCursor } from './common';

// 기본 커서 이동 (h, j, k, l)
export const handleMove = (state: VimState, direction: 'h' | 'j' | 'k' | 'l'): VimState => {
  const { line, col } = state.cursor;
  let newLine = line;
  let newCol = col;

  switch (direction) {
    case 'h':
      newCol = col - 1;
      break;
    case 'l':
      newCol = col + 1;
      break;
    case 'j':
      newLine = line + 1;
      break;
    case 'k':
      newLine = line - 1;
      break;
  }

  newLine = clamp(newLine, 0, state.lines.length - 1);
  const currentLineLength = getLineLength(state.lines, newLine);
  // Insert 모드나 Visual Block Insert 모드에서는 줄 끝 다음 칸까지 커서 이동 허용
  const isInsertLike = state.mode === Mode.INSERT || state.mode === Mode.VISUAL_BLOCK_INSERT;
  const maxCol = Math.max(0, currentLineLength - (isInsertLike ? 0 : 1));
  newCol = clamp(newCol, 0, maxCol);

  // 상하 이동 시 현재 컬럼 위치 유지 (가능한 경우)
  if (direction === 'j' || direction === 'k') {
    newCol = clamp(col, 0, maxCol);
  }

  return {
    ...state,
    cursor: { line: newLine, col: newCol },
    commandBuffer: '',
  };
};

// 단어 단위 이동 (w, b, e)
export const handleMoveWord = (state: VimState, direction: 'w' | 'b' | 'e'): VimState => {
  let newCursor = state.cursor;
  switch (direction) {
    case 'w':
      newCursor = getNextWordStartSimple(state.lines, state.cursor);
      break;
    case 'b':
      newCursor = getPrevWordStart(state.lines, state.cursor);
      break;
    case 'e':
      newCursor = getNextWordEnd(state.lines, state.cursor);
      break;
  }
  return { ...state, cursor: newCursor, commandBuffer: '' };
};

// 라인 경계 이동 ($, _)
export const handleMoveLineBoundary = (state: VimState, boundary: '$' | '_'): VimState => {
  const { line } = state.cursor;
  const lineContent = state.lines[line];
  let newCol = 0;

  if (boundary === '$') {
    newCol = Math.max(0, lineContent.length - 1);
  } else if (boundary === '_') {
    const match = lineContent.match(/\S/);
    newCol = match ? match.index! : Math.max(0, lineContent.length - 1);
  }

  return {
    ...state,
    cursor: { line, col: newCol },
    commandBuffer: '',
  };
};

// 스크롤 (Ctrl+u, Ctrl+d)
export const handleScroll = (state: VimState, direction: 'up' | 'down'): VimState => {
  const SCROLL_AMOUNT = 10;
  let newLine = state.cursor.line;
  if (direction === 'up') {
    newLine -= SCROLL_AMOUNT;
  } else {
    newLine += SCROLL_AMOUNT;
  }
  newLine = clamp(newLine, 0, state.lines.length - 1);
  return {
    ...state,
    cursor: clampCursor({ ...state, cursor: { ...state.cursor, line: newLine } }),
  };
};

// 파일 내 점프 (gg, G, {count}G)
export const handleJumpFile = (state: VimState, target: 'start' | 'end', line?: number): VimState => {
  let newLine = 0;
  if (line !== undefined) {
    // 1-based index를 0-based로 변환
    newLine = Math.max(0, line - 1);
  } else if (target === 'end') {
    newLine = state.lines.length - 1;
  }
  
  newLine = clamp(newLine, 0, state.lines.length - 1);

  return {
    ...state,
    cursor: clampCursor({ ...state, cursor: { line: newLine, col: 0 } }),
    commandBuffer: '',
  };
};

// 괄호 짝 찾기 (%)
export const handleMatchBracket = (state: VimState): VimState => {
  // 현재는 미구현 상태 (추후 구현 예정)
  return state; 
};

