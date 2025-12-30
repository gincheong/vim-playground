import { type VimState, type VimAction, Mode } from '../../types';
import { clamp, getLineLength, getRange } from '../../utils/stringUtils';
import { getNextWordStartSimple, getPrevWordStart, getNextWordEnd } from '../../utils/vimUtils';

const handleMove = (state: VimState, direction: 'h' | 'j' | 'k' | 'l'): VimState => {
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
  // Allow cursor to be at length in Insert mode
  const maxCol = Math.max(0, currentLineLength - (state.mode === Mode.INSERT ? 0 : 1));
  newCol = clamp(newCol, 0, maxCol);

  if (direction === 'j' || direction === 'k') {
    newCol = clamp(col, 0, maxCol);
  }

  return {
    ...state,
    cursor: { line: newLine, col: newCol },
  };
};

const handleMoveWord = (state: VimState, direction: 'w' | 'b' | 'e'): VimState => {
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
  return { ...state, cursor: newCursor };
};

const handleMoveLineBoundary = (state: VimState, boundary: '$' | '_'): VimState => {
  const { line } = state.cursor;
  const lineContent = state.lines[line];
  let newCol = 0;

  if (boundary === '$') {
    newCol = Math.max(0, lineContent.length - 1);
  } else if (boundary === '_') {
    // First non-whitespace
    const match = lineContent.match(/\S/);
    newCol = match ? match.index! : Math.max(0, lineContent.length - 1);
  }

  return {
    ...state,
    cursor: { line, col: newCol },
  };
};

const handleEnterMode = (state: VimState, mode: Mode): VimState => {
  if (state.mode === mode) return state;
  return {
    ...state,
    mode,
    visualStart: mode.startsWith('VISUAL') ? { ...state.cursor } : null,
  };
};

const handleExitMode = (state: VimState): VimState => {
  let newCol = state.cursor.col;
  if (state.mode === Mode.INSERT) {
    newCol = Math.max(0, state.cursor.col - 1);
  }
  return {
    ...state,
    mode: Mode.NORMAL,
    cursor: { ...state.cursor, col: newCol },
    visualStart: null,
    waitingForChar: false,
    findDirection: null,
  };
};

const handleTypeChar = (state: VimState, char: string): VimState => {
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

const handleDeleteChar = (state: VimState): VimState => {
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

const handleNewLine = (state: VimState): VimState => {
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

const handleSubstitute = (state: VimState): VimState => {
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

const handleFindChar = (state: VimState, char: string): VimState => {
  if (!state.waitingForChar) return state;
  const { line, col } = state.cursor;
  const currentLine = state.lines[line];
  const direction = state.findDirection || 'forward';

  let foundIndex = -1;
  if (direction === 'forward') {
    foundIndex = currentLine.indexOf(char, col + 1);
  } else {
    foundIndex = currentLine.lastIndexOf(char, col - 1);
  }

  if (foundIndex !== -1) {
    return {
      ...state,
      waitingForChar: false,
      findDirection: null,
      cursor: { ...state.cursor, col: foundIndex },
    };
  }

  return { ...state, waitingForChar: false, findDirection: null };
};

const handleVisualDelete = (state: VimState): VimState => {
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

  // Clamp cursor
  newCursor.line = clamp(newCursor.line, 0, Math.max(0, newLines.length - 1));
  newCursor.col = Math.min(newCursor.col, Math.max(0, (newLines[newCursor.line]?.length || 0) - 1));

  return {
    ...state,
    lines: newLines,
    mode: Mode.NORMAL,
    cursor: newCursor,
    visualStart: null,
  };
};

const handleVisualYank = (state: VimState): VimState => {
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
      // For block yank, we usually paste as block.
      // Here we just yank as text with newlines, but technically it should be marked as block type.
      // For simplicity, we just join with newlines.
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
  };
};

const handlePaste = (state: VimState): VimState => {
  if (!state.clipboard) return state;
  const text = state.clipboard;
  const { line, col } = state.cursor;
  const lines = [...state.lines];

  // TODO: Detect if clipboard is line-wise or char-wise or block-wise?
  // We don't store that metadata yet. Assuming char-wise or line-wise based on \n at end?
  // Simple heuristic: if ends with \n, treat as line-wise.

  const isLineWise = text.endsWith('\n') && text.split('\n').length > 1; // Simplified

  if (isLineWise) {
    // Paste lines AFTER current line
    const pasteLines = text.split('\n').slice(0, -1); // remove last empty split
    lines.splice(line + 1, 0, ...pasteLines);
    return { ...state, lines, cursor: { line: line + 1, col: 0 } };
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
  };
};

export function vimReducer(state: VimState, action: VimAction): VimState {
  switch (action.type) {
    case 'MOVE':
      return handleMove(state, action.direction);
    case 'MOVE_WORD':
      return handleMoveWord(state, action.direction);
    case 'MOVE_LINE_BOUNDARY':
      return handleMoveLineBoundary(state, action.boundary);
    case 'ENTER_MODE':
      return handleEnterMode(state, action.mode);
    case 'EXIT_MODE':
      return handleExitMode(state);
    case 'TYPE_CHAR':
      return handleTypeChar(state, action.char);
    case 'DELETE_CHAR':
      return handleDeleteChar(state);
    case 'NEW_LINE':
      return handleNewLine(state);
    case 'SUBSTITUTE':
      return handleSubstitute(state);
    case 'WAIT_FOR_CHAR':
      return { ...state, waitingForChar: true, findDirection: action.direction };
    case 'FIND_CHAR':
      return handleFindChar(state, action.char);
    case 'VISUAL_DELETE':
      return handleVisualDelete(state);
    case 'VISUAL_YANK':
      return handleVisualYank(state);
    case 'PASTE':
      return handlePaste(state);
    default:
      return state;
  }
}
