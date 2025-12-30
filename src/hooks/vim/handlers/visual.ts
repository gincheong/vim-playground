import { type VimState, Mode } from '../../../types';
import { clamp, getRange } from '../../../utils/stringUtils';

// 선택 영역 삭제 (d, x)
export const handleVisualDelete = (state: VimState): VimState => {
  if (!state.mode.startsWith('VISUAL') || !state.visualStart) return state;
  const { start, end } = getRange(state.visualStart, state.cursor);

  const newLines = [...state.lines];
  let newCursor = { ...start };

  if (state.mode === Mode.VISUAL_LINE) {
    newLines.splice(start.line, end.line - start.line + 1);
    if (newLines.length === 0) newLines.push('');
    newCursor = { line: Math.min(start.line, newLines.length - 1), col: 0 };
  } else if (state.mode === Mode.VISUAL_BLOCK) {
    const startCol = Math.min(start.col, end.col);
    const endCol = Math.max(start.col, end.col);

    for (let i = start.line; i <= end.line; i++) {
      const line = newLines[i];
      if (line.length > startCol) {
        newLines[i] = line.slice(0, startCol) + line.slice(endCol + 1);
      }
    }
    newCursor = { line: start.line, col: startCol };
  } else {
    // Normal Visual
    if (start.line === end.line) {
      const lineContent = newLines[start.line];
      const newLineContent = lineContent.slice(0, start.col) + lineContent.slice(end.col + 1);
      newLines[start.line] = newLineContent;
    } else {
      const startLineContent = newLines[start.line].slice(0, start.col);
      const endLineContent = newLines[end.line].slice(end.col + 1);
      newLines.splice(start.line, end.line - start.line + 1, startLineContent + endLineContent);
    }
  }

  newCursor.line = clamp(newCursor.line, 0, Math.max(0, newLines.length - 1));
  newCursor.col = Math.min(newCursor.col, Math.max(0, (newLines[newCursor.line]?.length || 0) - 1));

  return {
    ...state,
    lines: newLines,
    mode: Mode.NORMAL,
    cursor: newCursor,
    visualStart: null,
    commandBuffer: '',
  };
};

// 선택 영역 복사 (y)
export const handleVisualYank = (state: VimState): VimState => {
  if (!state.mode.startsWith('VISUAL') || !state.visualStart) return state;
  const { start, end } = getRange(state.visualStart, state.cursor);

  let yankedText = '';

  if (state.mode === Mode.VISUAL_LINE) {
    for (let i = start.line; i <= end.line; i++) {
      yankedText += state.lines[i] + '\n';
    }
  } else if (state.mode === Mode.VISUAL_BLOCK) {
    const startCol = Math.min(start.col, end.col);
    const endCol = Math.max(start.col, end.col);
    for (let i = start.line; i <= end.line; i++) {
      const line = state.lines[i];
      const segment = line.slice(startCol, endCol + 1);
      yankedText += segment + '\n';
    }
  } else {
    if (start.line === end.line) {
      yankedText = state.lines[start.line].slice(start.col, end.col + 1);
    } else {
      yankedText += state.lines[start.line].slice(start.col) + '\n';
      for (let i = start.line + 1; i < end.line; i++) {
        yankedText += state.lines[i] + '\n';
      }
      yankedText += state.lines[end.line].slice(0, end.col + 1);
    }
  }

  return {
    ...state,
    clipboard: yankedText,
    mode: Mode.NORMAL,
    visualStart: null,
    cursor: { ...start },
    commandBuffer: '',
  };
};

// 선택 영역 대소문자 변경 (~, u, U)
export const handleVisualCase = (state: VimState, caseType: 'toggle' | 'upper' | 'lower'): VimState => {
  if (!state.mode.startsWith('VISUAL') || !state.visualStart) return state;
  const { start, end } = getRange(state.visualStart, state.cursor);
  const newLines = [...state.lines];

  const transform = (char: string) => {
    if (caseType === 'upper') return char.toUpperCase();
    if (caseType === 'lower') return char.toLowerCase();
    return char === char.toUpperCase() ? char.toLowerCase() : char.toUpperCase();
  };

  if (state.mode === Mode.VISUAL_BLOCK) {
    const startCol = Math.min(start.col, end.col);
    const endCol = Math.max(start.col, end.col);
    for (let i = start.line; i <= end.line; i++) {
      const line = newLines[i];
      const before = line.slice(0, startCol);
      const target = line
        .slice(startCol, endCol + 1)
        .split('')
        .map(transform)
        .join('');
      const after = line.slice(endCol + 1);
      newLines[i] = before + target + after;
    }
  } else if (state.mode === Mode.VISUAL_LINE) {
    for (let i = start.line; i <= end.line; i++) {
      newLines[i] = newLines[i].split('').map(transform).join('');
    }
  } else {
    if (start.line === end.line) {
      const line = newLines[start.line];
      const before = line.slice(0, start.col);
      const target = line
        .slice(start.col, end.col + 1)
        .split('')
        .map(transform)
        .join('');
      const after = line.slice(end.col + 1);
      newLines[start.line] = before + target + after;
    } else {
      newLines[start.line] =
        newLines[start.line].slice(0, start.col) +
        newLines[start.line].slice(start.col).split('').map(transform).join('');
      for (let i = start.line + 1; i < end.line; i++) {
        newLines[i] = newLines[i].split('').map(transform).join('');
      }
      newLines[end.line] =
        newLines[end.line]
          .slice(0, end.col + 1)
          .split('')
          .map(transform)
          .join('') + newLines[end.line].slice(end.col + 1);
    }
  }

  return {
    ...state,
    lines: newLines,
    mode: Mode.NORMAL,
    visualStart: null,
    cursor: { ...start },
  };
};

// 들여쓰기 (<, >)
export const handleVisualIndent = (state: VimState, direction: 'in' | 'out'): VimState => {
  if (!state.mode.startsWith('VISUAL') || !state.visualStart) return state;
  const { start, end } = getRange(state.visualStart, state.cursor);
  const newLines = [...state.lines];
  const INDENT_CHAR = '  '; // 공백 2칸

  for (let i = start.line; i <= end.line; i++) {
    if (direction === 'in') {
      newLines[i] = INDENT_CHAR + newLines[i];
    } else {
      if (newLines[i].startsWith(INDENT_CHAR)) {
        newLines[i] = newLines[i].substring(INDENT_CHAR.length);
      } else {
        newLines[i] = newLines[i].trimStart(); // fallback
      }
    }
  }

  return {
    ...state,
    lines: newLines,
    mode: Mode.NORMAL,
    visualStart: null,
    cursor: { ...start },
  };
};

// 선택 영역 라인 합치기 (J)
export const handleVisualJoin = (state: VimState): VimState => {
  if (!state.mode.startsWith('VISUAL') || !state.visualStart) return state;
  const { start, end } = getRange(state.visualStart, state.cursor);
  const newLines = [...state.lines];

  if (start.line === end.line) return { ...state, mode: Mode.NORMAL, visualStart: null };

  let joinedText = newLines[start.line];
  for (let i = start.line + 1; i <= end.line; i++) {
    joinedText += ' ' + newLines[i].trimStart();
  }

  newLines.splice(start.line, end.line - start.line + 1, joinedText);

  return {
    ...state,
    lines: newLines,
    mode: Mode.NORMAL,
    visualStart: null,
    cursor: { ...start },
  };
};

// 선택 영역 문자 일괄 변경 (r)
export const handleVisualReplace = (state: VimState, char: string): VimState => {
  if (!state.mode.startsWith('VISUAL') || !state.visualStart) return state;
  const { start, end } = getRange(state.visualStart, state.cursor);
  const newLines = [...state.lines];

  const replace = () => char;

  if (state.mode === Mode.VISUAL_BLOCK) {
    const startCol = Math.min(start.col, end.col);
    const endCol = Math.max(start.col, end.col);
    for (let i = start.line; i <= end.line; i++) {
      const line = newLines[i];
      const before = line.slice(0, startCol);
      const target = line.slice(startCol, endCol + 1).replace(/./g, replace);
      const after = line.slice(endCol + 1);
      newLines[i] = before + target + after;
    }
  } else if (state.mode === Mode.VISUAL_LINE) {
    for (let i = start.line; i <= end.line; i++) {
      newLines[i] = newLines[i].replace(/./g, replace);
    }
  } else {
    // Normal Visual
    if (start.line === end.line) {
      const line = newLines[start.line];
      const before = line.slice(0, start.col);
      const target = line.slice(start.col, end.col + 1).replace(/./g, replace);
      const after = line.slice(end.col + 1);
      newLines[start.line] = before + target + after;
    } else {
      newLines[start.line] =
        newLines[start.line].slice(0, start.col) + newLines[start.line].slice(start.col).replace(/./g, replace);
      for (let i = start.line + 1; i < end.line; i++) {
        newLines[i] = newLines[i].replace(/./g, replace);
      }
      newLines[end.line] =
        newLines[end.line].slice(0, end.col + 1).replace(/./g, replace) + newLines[end.line].slice(end.col + 1);
    }
  }

  return {
    ...state,
    lines: newLines,
    mode: Mode.NORMAL,
    visualStart: null,
    cursor: { ...start },
  };
};

// Visual Block 모드에서 일괄 입력 진입 (I, A)
export const handleVisualBlockInsert = (state: VimState, side: 'before' | 'after'): VimState => {
  // Visual Line 모드일 경우 Visual Block 로직을 재사용하여 처리
  if (state.mode === Mode.VISUAL_LINE && state.visualStart) {
    if (side === 'before') {
      // 라인 시작 부분에 일괄 입력
      return {
        ...state,
        mode: Mode.VISUAL_BLOCK_INSERT,
        visualBlock: {
          startLine: Math.min(state.visualStart.line, state.cursor.line),
          endLine: Math.max(state.visualStart.line, state.cursor.line),
          col: 0,
        },
        cursor: { ...state.cursor, col: 0 },
      };
    } else {
      // 라인 끝 추가는 Insert 모드로 대체 (각 줄 길이가 다르므로 Block Insert 부적합)
      return {
        ...state,
        mode: Mode.INSERT, 
        cursor: { ...state.cursor, col: state.lines[state.cursor.line].length },
      };
    }
  }

  if (state.mode !== Mode.VISUAL_BLOCK || !state.visualStart) return state;

  const minCol = Math.min(state.visualStart.col, state.cursor.col);
  const maxCol = Math.max(state.visualStart.col, state.cursor.col);

  const insertCol = side === 'before' ? minCol : maxCol + 1;

  return {
    ...state,
    mode: Mode.VISUAL_BLOCK_INSERT,
    visualBlock: {
      startLine: Math.min(state.visualStart.line, state.cursor.line),
      endLine: Math.max(state.visualStart.line, state.cursor.line),
      col: insertCol,
    },
    cursor: { ...state.cursor, col: insertCol },
  };
};

