import { type VimState, Mode } from '../../../types';
import { getLineLength } from '../../../utils/stringUtils';
import { handleExitMode } from './mode';

// 문자 입력 처리
export const handleTypeChar = (state: VimState, char: string): VimState => {
  // Visual Block Insert 모드에서의 멀티 커서 입력 처리
  if (state.mode === Mode.VISUAL_BLOCK_INSERT && state.visualBlock) {
    const { startLine, endLine } = state.visualBlock;
    const insertCol = state.cursor.col;
    const newLines = [...state.lines];

    for (let i = Math.min(startLine, endLine); i <= Math.max(startLine, endLine); i++) {
      const line = newLines[i];
      if (insertCol <= line.length) {
        newLines[i] = line.slice(0, insertCol) + char + line.slice(insertCol);
      } else {
        // 패딩 처리
        const padding = ' '.repeat(insertCol - line.length);
        newLines[i] = line + padding + char;
      }
    }

    return {
      ...state,
      lines: newLines,
      cursor: { ...state.cursor, col: insertCol + 1 },
    };
  }

  if (state.mode !== Mode.INSERT) return state;
  const { line, col } = state.cursor;
  const currentLine = state.lines[line];
  const newLineContent = currentLine.slice(0, col) + char + currentLine.slice(col);
  const newLines = [...state.lines];
  newLines[line] = newLineContent;

  return {
    ...state,
    lines: newLines,
    cursor: { ...state.cursor, col: col + 1 },
  };
};

// 문자 삭제 (Backspace)
export const handleDeleteChar = (state: VimState): VimState => {
  // Visual Block Insert 모드 멀티 커서 삭제
  if (state.mode === Mode.VISUAL_BLOCK_INSERT && state.visualBlock) {
    const { startLine, endLine } = state.visualBlock;
    const deleteCol = state.cursor.col;

    if (deleteCol <= 0) return state;

    const newLines = [...state.lines];

    for (let i = Math.min(startLine, endLine); i <= Math.max(startLine, endLine); i++) {
      const line = newLines[i];
      if (deleteCol <= line.length) {
        newLines[i] = line.slice(0, deleteCol - 1) + line.slice(deleteCol);
      }
    }

    return {
      ...state,
      lines: newLines,
      cursor: { ...state.cursor, col: deleteCol - 1 },
    };
  }

  if (state.mode !== Mode.INSERT) return state;
  const { line, col } = state.cursor;

  if (col > 0) {
    const currentLine = state.lines[line];
    const newLineContent = currentLine.slice(0, col - 1) + currentLine.slice(col);
    const newLines = [...state.lines];
    newLines[line] = newLineContent;
    return {
      ...state,
      lines: newLines,
      cursor: { ...state.cursor, col: col - 1 },
    };
  } else if (line > 0) {
    const prevLineLength = state.lines[line - 1].length;
    const newLines = [...state.lines];
    const currentLineContent = newLines[line];
    newLines[line - 1] += currentLineContent;
    newLines.splice(line, 1);

    return {
      ...state,
      lines: newLines,
      cursor: { line: line - 1, col: prevLineLength },
    };
  }
  return state;
};

// 개행 (Enter)
export const handleNewLine = (state: VimState): VimState => {
  if (state.mode === Mode.VISUAL_BLOCK_INSERT) {
    // Block Insert 모드에서 엔터는 모드 종료로 처리
    return handleExitMode(state);
  }

  if (state.mode !== Mode.INSERT) return state;
  const { line, col } = state.cursor;
  const currentLine = state.lines[line];
  const beforeCursor = currentLine.slice(0, col);
  const afterCursor = currentLine.slice(col);

  const newLines = [...state.lines];
  newLines.splice(line, 1, beforeCursor, afterCursor);

  return {
    ...state,
    lines: newLines,
    cursor: { line: line + 1, col: 0 },
  };
};

// 문자 치환 (s)
export const handleSubstitute = (state: VimState): VimState => {
  const { line, col } = state.cursor;
  const currentLine = state.lines[line];

  if (currentLine.length === 0) {
    return { ...state, mode: Mode.INSERT };
  }

  const newLineContent = currentLine.slice(0, col) + currentLine.slice(col + 1);
  const newLines = [...state.lines];
  newLines[line] = newLineContent;

  return {
    ...state,
    lines: newLines,
    mode: Mode.INSERT,
  };
};

// 한 글자 교체 (r)
export const handleReplaceChar = (state: VimState, char: string): VimState => {
  const { line, col } = state.cursor;
  const lines = [...state.lines];
  const currentLine = lines[line];
  if (col < currentLine.length) {
    lines[line] = currentLine.slice(0, col) + char + currentLine.slice(col + 1);
  }
  return { ...state, lines, mode: Mode.NORMAL };
};

// 라인 합치기 (J)
export const handleJoinLines = (state: VimState): VimState => {
  const { line } = state.cursor;
  if (line >= state.lines.length - 1) return state;
  const lines = [...state.lines];
  const joined = lines[line] + ' ' + lines[line + 1].trimStart();
  lines[line] = joined;
  lines.splice(line + 1, 1);
  return { ...state, lines, cursor: { line, col: lines[line].length } };
};

// 붙여넣기 (p)
export const handlePaste = (state: VimState): VimState => {
  if (!state.clipboard) return state;
  const text = state.clipboard;
  const { line, col } = state.cursor;
  const lines = [...state.lines];

  const isLineWise = text.endsWith('\n') && text.split('\n').length > 1;

  if (isLineWise) {
    const pasteLines = text.split('\n').slice(0, -1);
    lines.splice(line + 1, 0, ...pasteLines);
    return { ...state, lines, cursor: { line: line + 1, col: 0 }, commandBuffer: '' };
  }

  const insertCol = col + 1;
  const currentLine = lines[line];

  if (!text.includes('\n')) {
    lines[line] = currentLine.slice(0, insertCol) + text + currentLine.slice(insertCol);
  } else {
    const pasteLines = text.split('\n');
    const prefix = currentLine.slice(0, insertCol);
    const suffix = currentLine.slice(insertCol);

    const firstLinePaste = pasteLines[0];
    const lastLinePaste = pasteLines[pasteLines.length - 1];
    const middleLines = pasteLines.slice(1, -1);

    lines[line] = prefix + firstLinePaste;
    lines.splice(line + 1, 0, ...middleLines, lastLinePaste + suffix);
  }

  return {
    ...state,
    lines,
    commandBuffer: '',
  };
};

// 라인 단위 작업 (dd, yy, cc 등)
export const handleLineOp = (
  state: VimState,
  op: 'delete' | 'yank' | 'change' | 'open_below' | 'open_above'
): VimState => {
  const { line } = state.cursor;
  const lines = [...state.lines];
  let newCursor = { ...state.cursor };
  let newMode = state.mode;
  let clipboard = state.clipboard;

  switch (op) {
    case 'delete':
      clipboard = lines[line] + '\n';
      lines.splice(line, 1);
      if (lines.length === 0) lines.push('');
      newCursor.line = Math.min(line, lines.length - 1);
      break;
    case 'yank':
      clipboard = lines[line] + '\n';
      break;
    case 'change':
      clipboard = lines[line] + '\n';
      lines[line] = '';
      newMode = Mode.INSERT;
      newCursor.col = 0;
      break;
    case 'open_below':
      lines.splice(line + 1, 0, '');
      newCursor = { line: line + 1, col: 0 };
      newMode = Mode.INSERT;
      break;
    case 'open_above':
      lines.splice(line, 0, '');
      newCursor = { line: line, col: 0 };
      newMode = Mode.INSERT;
      break;
  }
  if (newMode === Mode.NORMAL) {
    const len = getLineLength(lines, newCursor.line);
    newCursor.col = Math.min(newCursor.col, Math.max(0, len - 1));
  }
  return { ...state, lines, cursor: newCursor, mode: newMode, clipboard, commandBuffer: '' };
};

// 커맨드 버퍼 처리 (gg, dd 등을 위해 입력된 키 누적)
export const handleCommandBuffer = (state: VimState, char: string): VimState => {
  return { ...state, commandBuffer: state.commandBuffer + char };
};

// 커맨드 버퍼 초기화
export const handleClearBuffer = (state: VimState): VimState => {
  return { ...state, commandBuffer: '' };
};
